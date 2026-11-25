import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { Users, Search, Filter, ShieldCheck, UserCheck, UserX } from 'lucide-react';

export const UsuariosAdmin: React.FC = () => {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroRol, setFiltroRol] = useState('');
  const [filtroDistrito, setFiltroDistrito] = useState('');

  const fetchUsuarios = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filtroRol) params.append('rol', filtroRol);
      if (filtroDistrito) params.append('distrito', filtroDistrito);

      const res = await api.get(`/admin/usuarios?${params.toString()}`);
      if (res.data.success) {
        setUsuarios(res.data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, [filtroRol, filtroDistrito]);

  const filtrados = usuarios.filter((u) => {
    const texto = `${u.nombres} ${u.apellidos} ${u.codigo_interno} ${u.correo_acceso} ${u.distrito || ''}`.toLowerCase();
    return texto.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="border-b border-health-border pb-4">
        <h2 className="text-xl font-extrabold text-health-dark">Gestión de Usuarios y Roles</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Administración de cuentas con RBAC estricto, distritos de Trujillo y anonimización de participantes.
        </p>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="bg-white rounded-2xl border border-health-border p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, código P-00X o correo..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-health-petroleo"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={filtroRol}
            onChange={(e) => setFiltroRol(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-health-petroleo text-slate-700 font-semibold"
          >
            <option value="">Todos los Roles</option>
            <option value="TITULAR">Titulares</option>
            <option value="ACOMPANANTE">Acompañantes</option>
            <option value="ADMIN">Administradores</option>
          </select>

          <select
            value={filtroDistrito}
            onChange={(e) => setFiltroDistrito(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-health-petroleo text-slate-700 font-semibold"
          >
            <option value="">Todos los Distritos</option>
            <option value="Trujillo">Trujillo</option>
            <option value="Víctor Larco Herrera">Víctor Larco Herrera</option>
            <option value="Huanchaco">Huanchaco</option>
            <option value="La Esperanza">La Esperanza</option>
            <option value="El Porvenir">El Porvenir</option>
            <option value="Moche">Moche</option>
          </select>
        </div>
      </div>

      {/* Tabla de Usuarios */}
      <div className="bg-white rounded-2xl border border-health-border shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Código</th>
                <th className="py-3 px-4">Nombre / Participante</th>
                <th className="py-3 px-4">Edad / Sexo</th>
                <th className="py-3 px-4">Distrito</th>
                <th className="py-3 px-4">Correo de Acceso</th>
                <th className="py-3 px-4">Rol en Sistema</th>
                <th className="py-3 px-4">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No se encontraron usuarios con los filtros indicados.
                  </td>
                </tr>
              ) : (
                filtrados.map((u) => (
                  <tr key={u.cuenta_id || u.persona_id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono font-bold text-health-petroleo">
                      {u.codigo_interno}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-800 block">{u.nombres} {u.apellidos}</span>
                      {u.rol === 'ACOMPANANTE' && (
                        <span className="text-[10px] text-teal-600 block">
                          Acompaña como: {u.parentesco || 'Familiar'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {u.edad || '—'} años ({u.sexo})
                    </td>
                    <td className="py-3 px-4 text-slate-600">{u.distrito || 'Trujillo'}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{u.correo_acceso}</td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        u.rol === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                        u.rol === 'ACOMPANANTE' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {u.rol}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        u.activo ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700'
                      }`}>
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
