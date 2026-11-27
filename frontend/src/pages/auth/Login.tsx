import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Brain, Lock, Mail, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

export const Login: React.FC<{ onNavigateRegister: () => void }> = ({ onNavigateRegister }) => {
  const { login } = useAuth();
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await login(correo, password);
    if (!res.success) {
      setError(res.error || 'Credenciales inválidas.');
      setLoading(false);
    }
  };

  const handleDemoLogin = (email: string, pass: string) => {
    setCorreo(email);
    setPassword(pass);
    login(email, pass);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/20 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-modal border border-health-border overflow-hidden grid grid-cols-1 md:grid-cols-2">
        {/* Lado Izquierdo: Presentación Visual */}
        <div className="bg-health-petroleo p-8 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -bottom-10 -right-10 w-60 h-60 bg-teal-600/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -top-10 -left-10 w-48 h-48 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />

          <div>
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-emerald-300 shadow-md mb-6">
              <Brain className="w-7 h-7" />
            </div>
            <span className="text-xs font-bold text-teal-300 uppercase tracking-widest block">
              Proyecto Piloto Trujillo (G1)
            </span>
            <h2 className="text-2xl font-extrabold tracking-tight mt-1 leading-snug">
              Prevención del Deterioro Cognitivo
            </h2>
            <p className="text-slate-300 text-xs mt-3 leading-relaxed">
              Plataforma digital interactiva para adultos de 30 a 65 años. Fortalece tu memoria mediante hábitos de actividad física, contacto social y control cardiometabólico.
            </p>
          </div>

          {/* Accesos Rápidos de Prueba (Demo) — solo en desarrollo; nunca en el build de producción */}
          {import.meta.env.DEV && (
          <div className="mt-8 pt-6 border-t border-white/10">
            <span className="text-[11px] font-bold text-teal-200 uppercase tracking-wider block mb-2.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
              Acceso Rápido de Prueba (Demo)
            </span>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleDemoLogin('carlos.mendoza@gmail.com', 'Titular123!')}
                className="w-full text-left px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-xs flex items-center justify-between group"
              >
                <div>
                  <span className="font-bold text-white block">Titular: Carlos Mendoza</span>
                  <span className="text-[10px] text-teal-200">carlos.mendoza@gmail.com</span>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-300 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('admin@saludcerebral.pe', 'Admin123!')}
                className="w-full text-left px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-xs flex items-center justify-between group"
              >
                <div>
                  <span className="font-bold text-white block">Administrador del Piloto</span>
                  <span className="text-[10px] text-teal-200">admin@saludcerebral.pe</span>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-300 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
          )}
        </div>

        {/* Lado Derecho: Formulario */}
        <div className="p-8 flex flex-col justify-between">
          <div>
            <div className="mb-6">
              <h3 className="text-xl font-bold text-health-dark">Iniciar Sesión</h3>
              <p className="text-xs text-slate-500 mt-1">
                Ingresa con tu correo registrado para acceder a tu plan de hábitos.
              </p>
            </div>

            {error && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    placeholder="ejemplo@correo.pe"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-health-petroleo focus:ring-1 focus:ring-health-petroleo transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-health-petroleo focus:ring-1 focus:ring-health-petroleo transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-health-petroleo text-white text-xs font-bold hover:bg-teal-900 transition-colors shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? 'Comprobando credenciales...' : 'Ingresar a mi portal'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              ¿Aún no tienes una cuenta de titular?{' '}
              <button
                onClick={onNavigateRegister}
                className="font-bold text-health-petroleo hover:underline"
              >
                Regístrate aquí
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
