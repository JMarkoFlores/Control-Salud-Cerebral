import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthRepository } from '../repositories/auth.repository';
import { AlertaService } from '../services/alerta.service';
import { env } from '../config/env';

export class AuthController {
  private authRepo = new AuthRepository();
  private alertaService = new AlertaService();

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { correo, password } = req.body;

      if (!correo || !password) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Debes ingresar tu correo y contraseña.' },
        });
        return;
      }

      const account = await this.authRepo.findByEmail(correo);

      if (!account) {
        res.status(401).json({
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Credenciales incorrectas. Verifica tu correo o contraseña.' },
        });
        return;
      }

      if (!account.autorizado || !account.activo) {
        res.status(403).json({
          success: false,
          error: { code: 'ACCOUNT_DISABLED', message: 'Esta cuenta se encuentra deshabilitada o pendiente de autorización.' },
        });
        return;
      }

      const passwordMatch = await bcrypt.compare(password, account.password_hash);
      if (!passwordMatch) {
        res.status(401).json({
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Credenciales incorrectas. Verifica tu correo o contraseña.' },
        });
        return;
      }

      // Generar JWT
      const payload = {
        cuenta_id: account.cuenta_id,
        persona_id: account.persona_id,
        persona_titular_id: account.persona_titular_id,
        correo_acceso: account.correo_acceso,
        rol: account.rol,
        nombres: account.nombres,
        apellidos: account.apellidos,
        codigo_interno: account.codigo_interno,
      };

      const token = jwt.sign(payload, env.JWT.secret, { expiresIn: '7d' });

      // Verificación ligera de alertas motivadoras al login
      if (account.rol === 'TITULAR') {
        this.alertaService.verificarAlertasAlLogin(account.persona_id, account.cuenta_id).catch(() => {});
      }

      res.json({
        success: true,
        data: {
          token,
          user: {
            cuenta_id: account.cuenta_id,
            persona_id: account.persona_id,
            persona_titular_id: account.persona_titular_id,
            correo_acceso: account.correo_acceso,
            rol: account.rol,
            nombres: account.nombres,
            apellidos: account.apellidos,
            codigo_interno: account.codigo_interno,
            distrito: account.distrito,
            nombre_contacto: account.nombre_contacto,
            parentesco: account.parentesco,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  };

  registro = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { nombres, apellidos, fecha_nacimiento, sexo, ubicacion_id, correo, password } = req.body;

      if (!nombres || !apellidos || !fecha_nacimiento || !correo || !password) {
        res.status(400).json({
          success: false,
          error: { code: 'MISSING_FIELDS', message: 'Por favor completa todos los campos requeridos.' },
        });
        return;
      }

      // Validar si correo ya existe
      const existing = await this.authRepo.findByEmail(correo);
      if (existing) {
        res.status(409).json({
          success: false,
          error: { code: 'EMAIL_ALREADY_EXISTS', message: 'El correo electrónico ya se encuentra registrado.' },
        });
        return;
      }

      // Crear persona
      const persona = await this.authRepo.createPersona({
        nombres,
        apellidos,
        fecha_nacimiento,
        sexo: sexo || 'O',
        ubicacion_id: ubicacion_id || 1, // Trujillo por defecto
      });

      // Hashear password con bcrypt
      const password_hash = await bcrypt.hash(password, 10);

      // Crear cuenta con rol TITULAR
      const cuenta_id = await this.authRepo.createAccount({
        persona_titular_id: persona.persona_id,
        correo_acceso: correo,
        password_hash,
        rol: 'TITULAR',
      });

      res.status(201).json({
        success: true,
        data: {
          message: 'Cuenta de titular registrada exitosamente.',
          cuenta_id,
          codigo_interno: persona.codigo_interno,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'No autenticado' } });
        return;
      }

      const account = await this.authRepo.findById(req.user.cuenta_id);
      if (!account) {
        res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'Usuario no encontrado' } });
        return;
      }

      res.json({
        success: true,
        data: {
          cuenta_id: account.cuenta_id,
          persona_id: account.persona_id,
          persona_titular_id: account.persona_titular_id,
          correo_acceso: account.correo_acceso,
          rol: account.rol,
          nombres: account.nombres,
          apellidos: account.apellidos,
          codigo_interno: account.codigo_interno,
          fecha_nacimiento: account.fecha_nacimiento,
          sexo: account.sexo,
          distrito: account.distrito,
          nombre_contacto: account.nombre_contacto,
          parentesco: account.parentesco,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  getAcompanantes = async (req: Request, res: Response): Promise<void> => {
    res.json({ success: true, data: [] });
  };

  crearAcompanante = async (req: Request, res: Response): Promise<void> => {
    res.status(400).json({
      success: false,
      error: { message: 'El rol ACOMPAÑANTE ha sido discontinuado del sistema. Solo se admiten roles TITULAR y ADMIN.' },
    });
  };

  toggleAcompanante = async (req: Request, res: Response): Promise<void> => {
    res.status(400).json({
      success: false,
      error: { message: 'El rol ACOMPAÑANTE ha sido discontinuado del sistema.' },
    });
  };

  cambiarPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'No autenticado.' },
        });
        return;
      }

      const { passwordActual, passwordNueva } = req.body;

      if (!passwordActual || !passwordNueva) {
        res.status(400).json({
          success: false,
          error: { code: 'MISSING_FIELDS', message: 'Debes ingresar tu contraseña actual y la nueva contraseña.' },
        });
        return;
      }

      if (passwordNueva.length < 6) {
        res.status(400).json({
          success: false,
          error: { code: 'PASSWORD_TOO_SHORT', message: 'La nueva contraseña debe tener al menos 6 caracteres.' },
        });
        return;
      }

      const account = await this.authRepo.findById(req.user.cuenta_id);
      if (!account) {
        res.status(404).json({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'Usuario no encontrado.' },
        });
        return;
      }

      const passwordMatch = await bcrypt.compare(passwordActual, account.password_hash);
      if (!passwordMatch) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_CURRENT_PASSWORD', message: 'La contraseña actual ingresada es incorrecta.' },
        });
        return;
      }

      if (passwordActual === passwordNueva) {
        res.status(400).json({
          success: false,
          error: { code: 'SAME_PASSWORD', message: 'La nueva contraseña no puede ser idéntica a la anterior.' },
        });
        return;
      }

      const passwordHash = await bcrypt.hash(passwordNueva, 10);
      await this.authRepo.updatePassword(req.user.cuenta_id, passwordHash);

      res.json({
        success: true,
        data: { message: 'Tu contraseña ha sido actualizada exitosamente.' },
      });
    } catch (error) {
      next(error);
    }
  };
}
