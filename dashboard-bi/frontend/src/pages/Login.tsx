import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Brain, Eye, EyeOff, Lock, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Login() {
  const { token, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (token) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const result = await login(username.trim(), password);
    if (result.success) {
      navigate('/', { replace: true });
    } else {
      setError(result.error ?? 'Credenciales inválidas.');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-teal-50/20 to-slate-100 p-4">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl border border-health-border bg-white shadow-modal md:grid-cols-2">
        <div className="relative flex flex-col justify-between overflow-hidden bg-health-petroleo p-8 text-white">
          <div className="pointer-events-none absolute -bottom-10 -right-10 h-60 w-60 rounded-full bg-teal-600/20 blur-2xl" />
          <div className="pointer-events-none absolute -top-10 -left-10 h-48 w-48 rounded-full bg-emerald-500/20 blur-2xl" />

          <div>
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-emerald-300 shadow-md backdrop-blur-md">
              <Brain className="h-7 w-7" />
            </div>
            <span className="block text-xs font-bold uppercase tracking-widest text-teal-300">
              Proyecto Piloto Trujillo (G1)
            </span>
            <h1 className="mt-1 text-2xl font-extrabold leading-snug tracking-tight">
              Dashboard de Salud Cerebral
            </h1>
            <p className="mt-3 text-xs leading-relaxed text-slate-300">
              Tablero de seguimiento de hábitos para la prevención del deterioro cognitivo en
              adultos de 30 a 65 años. Actividad física, contacto social y factores
              cardiometabólicos.
            </p>
          </div>

          <div className="mt-8 space-y-2 border-t border-white/10 pt-5 text-2xs text-teal-100">
            <p className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
              Acceso restringido al administrador del piloto
            </p>
            <p className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
              Solo lectura del Data Mart dimensional
            </p>
            <p className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
              Sin nombres ni datos personales identificables
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-center p-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-health-dark">Iniciar sesión</h2>
            <p className="mt-1 text-xs text-slate-500">
              Ingresa las credenciales del administrador para abrir el tablero.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-slate-700">Usuario</span>
              <div className="relative">
                <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  autoComplete="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="admin"
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-xs focus:border-health-petroleo focus:outline-none focus:ring-1 focus:ring-health-petroleo"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-bold text-slate-700">Contraseña</span>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-10 text-xs focus:border-health-petroleo focus:outline-none focus:ring-1 focus:ring-health-petroleo"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-2.5 rounded p-0.5 text-slate-400 hover:text-health-petroleo"
                  title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-health-petroleo px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-health-teal disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Verificando…' : 'Entrar al dashboard'}
            </button>
          </form>

          <p className="mt-6 text-2xs leading-relaxed text-slate-400">
            Este tablero es de solo lectura y no emite diagnósticos. Si no recuerdas tus
            credenciales, contacta al responsable del piloto.
          </p>
        </div>
      </div>
    </div>
  );
}
