import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import { CheckCircle2, Lock, KeyRound, Eye, EyeOff, AlertCircle, ShieldCheck } from 'lucide-react';

export const PerfilTitular: React.FC = () => {
  const { user } = useAuth();

  // Estados para cambio de contraseña
  const [passActual, setPassActual] = useState('');
  const [passNueva, setPassNueva] = useState('');
  const [passConfirm, setPassConfirm] = useState('');
  const [showPassActual, setShowPassActual] = useState(false);
  const [showPassNueva, setShowPassNueva] = useState(false);
  const [showPassConfirm, setShowPassConfirm] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);
  const [passError, setPassError] = useState<string | null>(null);

  const handleCambiarPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    setPassSuccess(null);

    if (passNueva.length < 6) {
      setPassError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (passNueva !== passConfirm) {
      setPassError('Las contraseñas no coinciden. Por favor verifícalas.');
      return;
    }

    if (passActual === passNueva) {
      setPassError('La nueva contraseña no puede ser igual a tu contraseña actual.');
      return;
    }

    try {
      setPassLoading(true);
      const res = await api.put('/auth/cambiar-password', {
        passwordActual: passActual,
        passwordNueva: passNueva,
      });

      if (res.data.success) {
        setPassSuccess(res.data.data?.message || '¡Contraseña actualizada correctamente!');
        setPassActual('');
        setPassNueva('');
        setPassConfirm('');
      } else {
        setPassError(res.data.error?.message || 'No se pudo actualizar la contraseña.');
      }
    } catch (err: any) {
      setPassError(
        err.response?.data?.error?.message ||
        'Error al cambiar la contraseña. Verifica que tu contraseña actual sea correcta.'
      );
    } finally {
      setPassLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-health-border pb-4">
        <h2 className="text-xl font-extrabold text-health-dark">Mi Perfil y Seguridad</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Gestiona tu información personal y la seguridad de tu cuenta de acceso.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Columna Izquierda: Información Personal */}
        <div className="md:col-span-1 bg-white rounded-2xl border border-health-border p-6 shadow-card space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-health-petroleo flex items-center justify-center font-extrabold text-lg">
              {user?.nombres?.[0] || 'U'}{user?.apellidos?.[0] || ''}
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">{user?.nombres} {user?.apellidos}</h3>
              <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                Código: {user?.codigo_interno}
              </span>
            </div>
          </div>

          <div className="space-y-3 text-xs text-slate-600">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Correo de Acceso</span>
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> No editable
                </span>
              </div>
              <span className="font-semibold text-slate-800 break-all">{user?.correo_acceso}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Distrito (Trujillo)</span>
              <span className="font-semibold text-slate-800">{user?.distrito || 'Trujillo'}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Rol en Plataforma</span>
              <span className="font-bold text-health-petroleo uppercase">{user?.rol}</span>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Tarjeta de Cambio de Contraseña (reemplaza a Acompañantes) */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-health-border p-6 shadow-card space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-health-petroleo flex items-center justify-center">
                <KeyRound className="w-5 h-5 text-health-petroleo" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Cambiar Contraseña</h3>
                <p className="text-[11px] text-slate-400">Actualiza tu clave de acceso a la plataforma</p>
              </div>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5" /> Seguridad de Cuenta
            </span>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Puedes actualizar tu clave de acceso en cualquier momento. Por políticas de seguridad de la plataforma, tu correo electrónico registrado no puede ser modificado.
          </p>

          {passSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{passSuccess}</div>
            </div>
          )}

          {passError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{passError}</div>
            </div>
          )}

          <form onSubmit={handleCambiarPassword} className="space-y-4 max-w-lg text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                Contraseña Actual
              </label>
              <div className="relative">
                <input
                  type={showPassActual ? 'text' : 'password'}
                  required
                  value={passActual}
                  onChange={(e) => setPassActual(e.target.value)}
                  placeholder="Ingresa tu clave actual"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-health-petroleo focus:ring-1 focus:ring-health-petroleo text-xs transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassActual(!showPassActual)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPassActual ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Nueva Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPassNueva ? 'text' : 'password'}
                    required
                    value={passNueva}
                    onChange={(e) => setPassNueva(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-health-petroleo focus:ring-1 focus:ring-health-petroleo text-xs transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassNueva(!showPassNueva)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {showPassNueva ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Confirmar Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPassConfirm ? 'text' : 'password'}
                    required
                    value={passConfirm}
                    onChange={(e) => setPassConfirm(e.target.value)}
                    placeholder="Repite la nueva clave"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-health-petroleo focus:ring-1 focus:ring-health-petroleo text-xs transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassConfirm(!showPassConfirm)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {showPassConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={passLoading || !passActual || !passNueva || !passConfirm}
                className="px-5 py-2.5 rounded-xl bg-health-petroleo text-white font-bold hover:bg-teal-900 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <KeyRound className="w-4 h-4" />
                <span>{passLoading ? 'Actualizando...' : 'Guardar Nueva Contraseña'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
