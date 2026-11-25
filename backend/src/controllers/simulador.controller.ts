import { Request, Response, NextFunction } from 'express';
import { SimuladorService } from '../services/simulador.service';

export class SimuladorController {
  private simuladorService = new SimuladorService();

  calcular = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { edad, minutos_simulados_sem, dias_contacto_simulados, factores_controlados_sim } = req.body;

      const resultado = this.simuladorService.calcularProyeccion({
        edad: parseInt(edad, 10) || 50,
        minutos_simulados_sem: parseInt(minutos_simulados_sem, 10) || 0,
        dias_contacto_simulados: parseInt(dias_contacto_simulados, 10) || 0,
        factores_controlados_sim: parseInt(factores_controlados_sim, 10) || 0,
      });

      res.json({ success: true, data: resultado });
    } catch (error) {
      next(error);
    }
  };

  guardar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const personaId = req.user!.persona_id;
      const { edad, minutos_simulados_sem, dias_contacto_simulados, factores_controlados_sim, nombre_escenario } = req.body;

      const resultado = await this.simuladorService.simularYGuardar({
        persona_id: personaId,
        edad: parseInt(edad, 10) || 50,
        minutos_simulados_sem: parseInt(minutos_simulados_sem, 10) || 0,
        dias_contacto_simulados: parseInt(dias_contacto_simulados, 10) || 0,
        factores_controlados_sim: parseInt(factores_controlados_sim, 10) || 0,
        nombre_escenario: nombre_escenario || 'Escenario simulado',
      });

      res.status(201).json({
        success: true,
        data: { message: 'Simulación guardada con éxito en tu historial.', ...resultado },
      });
    } catch (error) {
      next(error);
    }
  };

  getHistorial = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const personaId = req.user!.persona_id;
      const historial = await this.simuladorService.getHistorial(personaId);
      res.json({ success: true, data: historial });
    } catch (error) {
      next(error);
    }
  };
}
