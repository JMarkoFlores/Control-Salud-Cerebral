import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import { User, Users, Shield, Plus, Power, CheckCircle2 } from 'lucide-react';

export const PerfilTitular: React.FC = () => {
  const { user } = useAuth();
  const [acompanantes, setAcompanantes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    nombre_contacto: '',
    parentesco: 'Hija',
    correo: '',
    password: '',
  });

  const fetchAcompanantes = async () => {
    try {
      setLoading(true);
      const res = await api.get('/auth/acompanantes');
      if (res.data.success) {
        setAcompanantes(res.data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAcompanantes();
  }, []);

  const handleCrearAcompanante = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/auth/acompanantes', form);
      setShowModal(false);
      setForm({ nombre_contacto: '', parentesco: 'Hija', correo: '', password: '' });
      fetchAcompanantes();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Error al autorizar acompañante.');
    }
  };

  const handleToggleAutorizado = async (cuentaId: number, actual: boolean) => {
    try {
      await api.patch(`/auth/acompanantes/${cuentaId}/autorizado`, { autorizado: !actual });
      fetchAcompanantes();
    } catch {
      alert('Error al modificar permiso.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-health-border pb-4">
        <h2 className="text-xl font-extrabold text-health-dark">Mi Perfil y Acompañantes Autorizados</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Gestiona tu información personal y los permisos de acceso para tus familiares o cuidadores.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Tarjeta de Información Personal */}
        <div className="md:col-span-1 bg-white rounded-2xl border border-health-border p-6 shadow-card space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-health-petroleo flex items-center justify-center font-extrabold text-lg">
              {user?.nombres[0]}{user?.apellidos[0]}
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">{user?.nombres} {user?.apellidos}</h3>
              <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                Código: {user?.codigo_interno}
              </span>
            </div>
          </div>

          <div className="space-y-2.5 text-xs text-slate-600">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Correo de Acceso</span>
              <span className="font-semibold text-slate-800">{user?.correo_acceso}</span>
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

        {/* Sección de Acompañantes Autorizados */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-health-border p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Acompañantes Familiares Autorizados</h3>
              <p className="text-[11px] text-slate-400">
                Los acompañantes tienen acceso en modo solo lectura a tu avance para motivarte.
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="px-3 py-1.5 rounded-xl bg-health-petroleo text-white font-bold text-xs hover:bg-teal-900 transition-colors flex items-center gap-1 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Autorizar Familiar</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {acompanantes.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">
                No tienes acompañantes autorizados registrados actualmente.
              </p>
            ) : (
              acompanantes.map((ac) => (
                <div key={ac.cuenta_id} className="py-3.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-800 text-sm block">
                      {ac.nombre_contacto || 'Familiar / Acompañante'}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Parentesco: <strong className="text-slate-700">{ac.parentesco || 'Familiar'}</strong> • {ac.correo_acceso}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      ac.autorizado ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {ac.autorizado ? 'Acceso Autorizado' : 'Acceso Revocado'}
                    </span>

                    <button
                      onClick={() => handleToggleAutorizado(ac.cuenta_id, ac.autorizado)}
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                      title={ac.autorizado ? 'Revocar acceso' : 'Habilitar acceso'}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-modal border border-health-border">
            <h3 className="text-base font-bold text-slate-800 mb-3">Autorizar Nuevo Acompañante</h3>
            <p className="text-xs text-slate-500 mb-4">
              Crea las credenciales de acceso para que tu familiar o cuidador pueda ver tus avances en tiempo real.
            </p>

            <form onSubmit={handleCrearAcompanante} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={form.nombre_contacto}
                  onChange={(e) => setForm({ ...form, nombre_contacto: e.target.value })}
                  placeholder="Ej. Ana Salazar Mendoza"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-health-petroleo"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Parentesco</label>
                <select
                  value={form.parentesco}
                  onChange={(e) => setForm({ ...form, parentesco: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-health-petroleo"
                >
                  <option value="Hija">Hija</option>
                  <option value="Hijo">Hijo</option>
                  <option value="Cónyuge">Cónyuge / Pareja</option>
                  <option value="Hermano(a)">Hermano(a)</option>
                  <option value="Cuidador">Cuidador(a)</option>
                  <option value="Otro">Otro familiar</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Correo de Acceso</label>
                <input
                  type="email"
                  required
                  value={form.correo}
                  onChange={(e) => setForm({ ...form, correo: e.target.value })}
                  placeholder="familiar@ejemplo.pe"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-health-petroleo"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Contraseña Temporal</label>
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-health-petroleo"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-health-petroleo text-white font-bold hover:bg-teal-900 transition-colors shadow-md"
                >
                  Autorizar Acompañante
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
