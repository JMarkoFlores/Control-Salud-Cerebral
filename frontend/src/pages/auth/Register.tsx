import React, { useState } from 'react';
import { ArrowLeft, UserPlus, CheckCircle2 } from 'lucide-react';
import api from '../../api/client';

export const Register: React.FC<{ onNavigateLogin: () => void }> = ({ onNavigateLogin }) => {
  const [form, setForm] = useState({
    nombres: '',
    apellidos: '',
    fecha_nacimiento: '1980-06-15',
    sexo: 'M',
    ubicacion_id: 1, // Trujillo
    correo: '',
    password: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const distritosTrujillo = [
    { id: 1, nombre: 'Trujillo' },
    { id: 2, nombre: 'Víctor Larco Herrera' },
    { id: 3, nombre: 'Huanchaco' },
    { id: 4, nombre: 'La Esperanza' },
    { id: 5, nombre: 'El Porvenir' },
    { id: 6, nombre: 'Moche' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.post('/auth/registro', form);
      if (res.data.success) {
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Error al registrar tu cuenta.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-card border border-health-border text-center">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold text-slate-800">¡Registro Exitoso!</h3>
          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
            Tu cuenta como titular del programa ha sido creada. Ya puedes iniciar sesión para definir tus metas y comenzar a registrar tus hábitos.
          </p>
          <button
            onClick={onNavigateLogin}
            className="w-full mt-6 py-3 rounded-xl bg-health-petroleo text-white text-xs font-bold hover:bg-teal-900 transition-colors shadow-md"
          >
            Ir al Inicio de Sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-card border border-health-border p-8">
        <button
          onClick={onNavigateLogin}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al Inicio de Sesión
        </button>

        <div className="mb-6">
          <h3 className="text-xl font-bold text-health-dark">Registro de Titular (30 a 65 años)</h3>
          <p className="text-xs text-slate-500 mt-1">
            Piloto en Trujillo, Perú • Prevención del Deterioro Cognitivo
          </p>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nombres</label>
              <input
                type="text"
                required
                value={form.nombres}
                onChange={(e) => setForm({ ...form, nombres: e.target.value })}
                placeholder="Ej. Juan Carlos"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-health-petroleo"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Apellidos</label>
              <input
                type="text"
                required
                value={form.apellidos}
                onChange={(e) => setForm({ ...form, apellidos: e.target.value })}
                placeholder="Ej. Perez Silva"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-health-petroleo"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Fecha Nacimiento</label>
              <input
                type="date"
                required
                value={form.fecha_nacimiento}
                onChange={(e) => setForm({ ...form, fecha_nacimiento: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-health-petroleo"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Sexo</label>
              <select
                value={form.sexo}
                onChange={(e) => setForm({ ...form, sexo: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-health-petroleo"
              >
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
                <option value="O">Otro</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Distrito (Trujillo)</label>
            <select
              value={form.ubicacion_id}
              onChange={(e) => setForm({ ...form, ubicacion_id: parseInt(e.target.value, 10) })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-health-petroleo"
            >
              {distritosTrujillo.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Correo Electrónico</label>
            <input
              type="email"
              required
              value={form.correo}
              onChange={(e) => setForm({ ...form, correo: e.target.value })}
              placeholder="correo@ejemplo.pe"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-health-petroleo"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Contraseña</label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-health-petroleo"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-4 rounded-xl bg-health-petroleo text-white text-xs font-bold hover:bg-teal-900 transition-colors shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            {loading ? 'Creando cuenta...' : 'Completar Registro'}
          </button>
        </form>
      </div>
    </div>
  );
};
