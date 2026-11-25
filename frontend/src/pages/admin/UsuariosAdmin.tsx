import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { 
  Users, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Power, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  Key, 
} from 'lucide-react';

interface Ubicacion {
  ubicacion_id: number;
  pais: string;
  departamento: string;
  provincia: string;
  distrito: string;
}

interface UsuarioItem {
  persona_id: number;
  codigo_interno: string;
  nombres: string;
  apellidos: string;
  fecha_nacimiento: string;
  edad: number;
  sexo: string;
  activo: boolean;
  ubicacion_id?: number;
  distrito: string;
  cuenta_id?: number | null;
  correo_acceso?: string | null;
  rol?: 'TITULAR' | 'ADMIN' | null;
  autorizado?: boolean | null;
  nombre_contacto?: string | null;
  parentesco?: string | null;
}

export const UsuariosAdmin: React.FC = () => {
  const [usuarios, setUsuarios] = useState<UsuarioItem[]>([]);
  const [resumen, setResumen] = useState<{
    total_cuentas: number;
    total_participantes: number;
    total_titulares: number;
    total_admins: number;
  } | null>(null);
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null);

  // Filtros
  const [search, setSearch] = useState('');
  const [filtroRol, setFiltroRol] = useState('');
  const [filtroDistrito, setFiltroDistrito] = useState('');

  // Modales
  const [showModalCrear, setShowModalCrear] = useState(false);
  const [showModalEditar, setShowModalEditar] = useState(false);
  const [showModalEliminar, setShowModalEliminar] = useState(false);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<UsuarioItem | null>(null);

  // Formulario Crear
  const [formCrear, setFormCrear] = useState({
    rol: 'TITULAR' as 'TITULAR' | 'ADMIN',
    nombres: '',
    apellidos: '',
    fecha_nacimiento: '1975-06-15',
    sexo: 'M' as 'M' | 'F',
    ubicacion_id: 1,
    correo_acceso: '',
    password: '',
  });

  // Formulario Editar
  const [formEditar, setFormEditar] = useState({
    persona_id: 0,
    cuenta_id: null as number | null,
    nombres: '',
    apellidos: '',
    fecha_nacimiento: '',
    sexo: 'M' as 'M' | 'F',
    ubicacion_id: 1,
    activo: true,
    correo_acceso: '',
    password: '',
    rol: 'TITULAR' as 'TITULAR' | 'ADMIN',
  });

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filtroRol) params.append('rol', filtroRol);
      if (filtroDistrito) params.append('distrito', filtroDistrito);

      const [resUsers, resUbi] = await Promise.all([
        api.get(`/admin/usuarios?${params.toString()}`),
        api.get('/admin/ubicaciones'),
      ]);

      if (resUsers.data.success) {
        setUsuarios(resUsers.data.data);
        if (resUsers.data.resumen) {
          setResumen(resUsers.data.resumen);
        }
      }
      if (resUbi.data.success) {
        setUbicaciones(resUbi.data.data);
      }
    } catch (e) {
      console.error('Error al cargar datos de administración:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [filtroRol, filtroDistrito]);

  // Mensaje flotante con autodestrucción
  const mostrarMensaje = (tipo: 'success' | 'error', texto: string) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje(null), 5000);
  };

  // Filtrado en memoria por texto
  const filtrados = usuarios.filter((u) => {
    const texto = `${u.nombres} ${u.apellidos} ${u.codigo_interno} ${u.correo_acceso || ''} ${u.distrito || ''}`.toLowerCase();
    return texto.includes(search.toLowerCase());
  });

  // Estadísticas 100% dinámicas
  const totalCuentas = resumen?.total_cuentas ?? usuarios.length;
  const totalParticipantes = resumen?.total_participantes ?? usuarios.filter((u) => u.codigo_interno !== 'P-000').length;
  const countTitulares = resumen?.total_titulares ?? usuarios.filter((u) => u.rol === 'TITULAR').length;
  const countAdmins = resumen?.total_admins ?? usuarios.filter((u) => u.rol === 'ADMIN').length;

  // Abrir Modal Crear
  const handleOpenCrear = () => {
    setFormCrear({
      rol: 'TITULAR',
      nombres: '',
      apellidos: '',
      fecha_nacimiento: '1975-06-15',
      sexo: 'M',
      ubicacion_id: ubicaciones[0]?.ubicacion_id || 1,
      correo_acceso: '',
      password: '',
    });
    setShowModalCrear(true);
  };

  // Abrir Modal Editar
  const handleOpenEditar = (u: UsuarioItem) => {
    setUsuarioSeleccionado(u);
    setFormEditar({
      persona_id: u.persona_id,
      cuenta_id: u.cuenta_id || null,
      nombres: u.nombres || '',
      apellidos: u.apellidos || '',
      fecha_nacimiento: u.fecha_nacimiento || '1975-01-01',
      sexo: (u.sexo as 'M' | 'F') || 'M',
      ubicacion_id: u.ubicacion_id || 1,
      activo: u.activo,
      correo_acceso: u.correo_acceso || '',
      password: '',
      rol: (u.rol as 'TITULAR' | 'ADMIN') || 'TITULAR',
    });
    setShowModalEditar(true);
  };

  // Abrir Modal Eliminar
  const handleOpenEliminar = (u: UsuarioItem) => {
    setUsuarioSeleccionado(u);
    setShowModalEliminar(true);
  };

  // Submit Crear
  const handleSubmitCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);

      if (!formCrear.nombres.trim() || !formCrear.apellidos.trim()) {
        mostrarMensaje('error', 'Nombres y apellidos son requeridos.');
        return;
      }
      if (!formCrear.correo_acceso.trim() || !formCrear.password) {
        mostrarMensaje('error', 'El correo y la contraseña son obligatorios.');
        return;
      }

      const payload = {
        rol: formCrear.rol,
        nombres: formCrear.nombres.trim(),
        apellidos: formCrear.apellidos.trim(),
        fecha_nacimiento: formCrear.fecha_nacimiento,
        sexo: formCrear.sexo,
        ubicacion_id: formCrear.ubicacion_id,
        correo_acceso: formCrear.correo_acceso.trim(),
        password: formCrear.password,
      };

      const res = await api.post('/admin/usuarios', payload);
      if (res.data.success) {
        mostrarMensaje('success', `Usuario ${res.data.data.codigoInterno || ''} creado exitosamente.`);
        setShowModalCrear(false);
        cargarDatos();
      }
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Error al crear usuario.';
      mostrarMensaje('error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Editar
  const handleSubmitEditar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioSeleccionado) return;

    try {
      setSubmitting(true);
      const res = await api.put(`/admin/usuarios/${usuarioSeleccionado.persona_id}`, formEditar);
      if (res.data.success) {
        mostrarMensaje('success', 'Usuario actualizado correctamente.');
        setShowModalEditar(false);
        cargarDatos();
      }
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Error al actualizar usuario.';
      mostrarMensaje('error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Activo
  const handleToggleActivo = async (u: UsuarioItem) => {
    try {
      const res = await api.patch(`/admin/usuarios/${u.persona_id}/toggle-activo`);
      if (res.data.success) {
        mostrarMensaje('success', res.data.data.message || 'Estado actualizado.');
        cargarDatos();
      }
    } catch (err: any) {
      mostrarMensaje('error', 'Error al cambiar estado.');
    }
  };

  // Confirmar Eliminar
  const handleConfirmarEliminar = async () => {
    if (!usuarioSeleccionado) return;
    try {
      setSubmitting(true);
      const res = await api.delete(`/admin/usuarios/${usuarioSeleccionado.persona_id}`);

      if (res.data.success) {
        mostrarMensaje('success', res.data.data.mensaje || 'Acción ejecutada correctamente.');
        setShowModalEliminar(false);
        cargarDatos();
      }
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Error al eliminar usuario.';
      mostrarMensaje('error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast de Notificaciones */}
      {mensaje && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 border shadow-md animate-fade-in ${
          mensaje.tipo === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {mensaje.tipo === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          )}
          <span className="text-xs font-semibold">{mensaje.texto}</span>
        </div>
      )}

      {/* Encabezado Principal */}
      <div className="border-b border-health-border pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-health-dark">Gestión de Usuarios y Roles</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Administración completa (CRUD) con RBAC estricto, distritos de Trujillo y anonimización de participantes.
          </p>
        </div>

        <button
          onClick={handleOpenCrear}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-health-petroleo text-white font-bold text-xs hover:bg-teal-900 transition-colors shadow-sm self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Usuario / Participante</span>
        </button>
      </div>

      {/* Tarjetas de Resumen & Métricas Dinámicas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-health-border p-4 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Usuarios en Sistema</span>
          <span className="text-2xl font-black text-health-dark mt-1 block">{totalCuentas}</span>
          <span className="text-[10px] text-slate-500">Cuentas activas registradas</span>
        </div>

        <div className="bg-white rounded-2xl border border-health-border p-4 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Participantes Clínicos</span>
          <span className="text-2xl font-black text-teal-700 mt-1 block">{totalParticipantes}</span>
          <span className="text-[10px] text-teal-600 font-semibold">Pacientes en tabla persona</span>
        </div>

        <div className="bg-white rounded-2xl border border-health-border p-4 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Titulares</span>
          <span className="text-2xl font-black text-emerald-600 mt-1 block">{countTitulares}</span>
          <span className="text-[10px] text-slate-500">Pacientes con rol TITULAR</span>
        </div>

        <div className="bg-white rounded-2xl border border-health-border p-4 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Administradores</span>
          <span className="text-2xl font-black text-purple-600 mt-1 block">{countAdmins}</span>
          <span className="text-[10px] text-slate-500">Gestores con rol ADMIN</span>
        </div>
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
            <option value="TITULAR">Titulares (Pacientes)</option>
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
            <option value="El Porvenir">El Porvenir</option>
            <option value="La Esperanza">La Esperanza</option>
            <option value="Florencia de Mora">Florencia de Mora</option>
          </select>
        </div>
      </div>

      {/* Tabla de Usuarios */}
      <div className="bg-white rounded-3xl border border-health-border overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-health-border text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Código</th>
                <th className="py-3.5 px-4">Nombre / Participante</th>
                <th className="py-3.5 px-4">Edad / Sexo</th>
                <th className="py-3.5 px-4">Distrito</th>
                <th className="py-3.5 px-4">Correo de Acceso</th>
                <th className="py-3.5 px-4">Rol en Sistema</th>
                <th className="py-3.5 px-4">Estado</th>
                <th className="py-3.5 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Cargando usuarios y roles...
                  </td>
                </tr>
              ) : filtrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No se encontraron usuarios con los filtros indicados.
                  </td>
                </tr>
              ) : (
                filtrados.map((u) => {
                  const nombrePrincipal = `${u.nombres} ${u.apellidos}`;
                  const estadoActivo = u.activo;

                  return (
                    <tr key={`${u.persona_id}-${u.cuenta_id || 'no-cuenta'}`} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-health-petroleo">
                        {u.codigo_interno}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span className="font-bold text-slate-800 block">
                            {nombrePrincipal}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {u.edad || '—'} años ({u.sexo})
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{u.distrito || 'Trujillo'}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {u.correo_acceso || (
                          <span className="text-slate-400 italic font-sans text-[11px]">Sin cuenta de acceso</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                          u.rol === 'ADMIN' ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                          u.rol === 'TITULAR' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                          'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {u.rol || 'PARTICIPANTE'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 ${
                          estadoActivo 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${estadoActivo ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          {estadoActivo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Toggle Activo */}
                          <button
                            onClick={() => handleToggleActivo(u)}
                            title={estadoActivo ? 'Desactivar usuario' : 'Activar usuario'}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              estadoActivo 
                                ? 'border-slate-200 text-slate-500 hover:text-amber-600 hover:bg-amber-50' 
                                : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                            }`}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>

                          {/* Editar */}
                          <button
                            onClick={() => handleOpenEditar(u)}
                            title="Editar datos de usuario"
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-health-petroleo hover:bg-teal-50 hover:border-teal-200 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Eliminar / Inactivar */}
                          <button
                            onClick={() => handleOpenEliminar(u)}
                            title="Eliminar usuario o cuenta"
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CREAR USUARIO / CUENTA */}
      {showModalCrear && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-health-border animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-health-border pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-health-petroleo" />
                <h3 className="font-extrabold text-health-dark text-base">Registrar Nuevo Usuario / Cuenta</h3>
              </div>
              <button onClick={() => setShowModalCrear(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCrear} className="space-y-4">
              {/* Rol / Tipo de Usuario */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Registro / Rol</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormCrear({ ...formCrear, rol: 'TITULAR' })}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center ${
                      formCrear.rol === 'TITULAR' 
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-200' 
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Titular (Paciente)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormCrear({ ...formCrear, rol: 'ADMIN' })}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center ${
                      formCrear.rol === 'ADMIN' 
                        ? 'bg-purple-50 border-purple-500 text-purple-800 ring-2 ring-purple-200' 
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Administrador
                  </button>
                </div>
              </div>

              {/* Campos comunes */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nombres <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Juan Carlos"
                    value={formCrear.nombres}
                    onChange={(e) => setFormCrear({ ...formCrear, nombres: e.target.value })}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-health-petroleo"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Apellidos <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Pérez García"
                    value={formCrear.apellidos}
                    onChange={(e) => setFormCrear({ ...formCrear, apellidos: e.target.value })}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-health-petroleo"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Fecha de Nacimiento <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formCrear.fecha_nacimiento}
                    onChange={(e) => setFormCrear({ ...formCrear, fecha_nacimiento: e.target.value })}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-health-petroleo"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Sexo</label>
                  <select
                    value={formCrear.sexo}
                    onChange={(e) => setFormCrear({ ...formCrear, sexo: e.target.value as 'M' | 'F' })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-health-petroleo"
                  >
                    <option value="M">Masculino (M)</option>
                    <option value="F">Femenino (F)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Distrito (Trujillo)</label>
                <select
                  value={formCrear.ubicacion_id}
                  onChange={(e) => setFormCrear({ ...formCrear, ubicacion_id: parseInt(e.target.value, 10) })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-health-petroleo"
                >
                  {ubicaciones.map((u) => (
                    <option key={u.ubicacion_id} value={u.ubicacion_id}>
                      {u.distrito} ({u.provincia}, {u.departamento})
                    </option>
                  ))}
                </select>
              </div>

              {/* Credenciales de Acceso */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-800 block mb-2 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-health-petroleo" />
                  Credenciales de Acceso al Sistema
                </span>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Correo Electrónico (Login) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      placeholder="usuario@gmail.com"
                      value={formCrear.correo_acceso}
                      onChange={(e) => setFormCrear({ ...formCrear, correo_acceso: e.target.value })}
                      required
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-health-petroleo"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Contraseña <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={formCrear.password}
                      onChange={(e) => setFormCrear({ ...formCrear, password: e.target.value })}
                      required
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-health-petroleo"
                    />
                  </div>
                </div>
              </div>

              {/* Acciones Modal */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-health-border">
                <button
                  type="button"
                  onClick={() => setShowModalCrear(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-health-petroleo text-white font-bold text-xs hover:bg-teal-900 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Guardando...' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR USUARIO */}
      {showModalEditar && usuarioSeleccionado && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-health-border animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-health-border pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-health-petroleo" />
                <h3 className="font-extrabold text-health-dark text-base">
                  Editar Usuario ({usuarioSeleccionado.codigo_interno})
                </h3>
              </div>
              <button onClick={() => setShowModalEditar(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEditar} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nombres</label>
                  <input
                    type="text"
                    value={formEditar.nombres}
                    onChange={(e) => setFormEditar({ ...formEditar, nombres: e.target.value })}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-health-petroleo"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Apellidos</label>
                  <input
                    type="text"
                    value={formEditar.apellidos}
                    onChange={(e) => setFormEditar({ ...formEditar, apellidos: e.target.value })}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-health-petroleo"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Fecha de Nacimiento</label>
                  <input
                    type="date"
                    value={formEditar.fecha_nacimiento}
                    onChange={(e) => setFormEditar({ ...formEditar, fecha_nacimiento: e.target.value })}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-health-petroleo"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Sexo</label>
                  <select
                    value={formEditar.sexo}
                    onChange={(e) => setFormEditar({ ...formEditar, sexo: e.target.value as 'M' | 'F' })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-health-petroleo"
                  >
                    <option value="M">Masculino (M)</option>
                    <option value="F">Femenino (F)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Distrito (Trujillo)</label>
                  <select
                    value={formEditar.ubicacion_id}
                    onChange={(e) => setFormEditar({ ...formEditar, ubicacion_id: parseInt(e.target.value, 10) })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-health-petroleo"
                  >
                    {ubicaciones.map((u) => (
                      <option key={u.ubicacion_id} value={u.ubicacion_id}>
                        {u.distrito} ({u.provincia})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Rol</label>
                  <select
                    value={formEditar.rol}
                    onChange={(e) => setFormEditar({ ...formEditar, rol: e.target.value as 'TITULAR' | 'ADMIN' })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-health-petroleo font-semibold"
                  >
                    <option value="TITULAR">Titular (Paciente)</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>
              </div>

              {/* Cuenta y Contraseña */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <span className="text-xs font-bold text-slate-800 block flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-health-petroleo" />
                  Credenciales de Acceso
                </span>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Correo de Acceso</label>
                  <input
                    type="email"
                    value={formEditar.correo_acceso}
                    onChange={(e) => setFormEditar({ ...formEditar, correo_acceso: e.target.value })}
                    placeholder="usuario@gmail.com"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-health-petroleo font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Nueva Contraseña <span className="text-[10px] text-slate-400 font-normal">(Dejar en blanco para conservar la actual)</span>
                  </label>
                  <input
                    type="password"
                    placeholder="Ingresa nueva contraseña si deseas cambiarla"
                    value={formEditar.password}
                    onChange={(e) => setFormEditar({ ...formEditar, password: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-health-petroleo"
                  />
                </div>
              </div>

              {/* Acciones */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-health-border">
                <button
                  type="button"
                  onClick={() => setShowModalEditar(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-health-petroleo text-white font-bold text-xs hover:bg-teal-900 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAR ELIMINAR / INACTIVAR */}
      {showModalEliminar && usuarioSeleccionado && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 animate-fade-in">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-health-dark text-base">Confirmar Eliminación</h3>
                <span className="text-xs text-slate-500 font-mono">{usuarioSeleccionado.codigo_interno}</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              ¿Estás seguro de que deseas eliminar o inactivar a{' '}
              <strong className="text-slate-900">
                {`${usuarioSeleccionado.nombres} ${usuarioSeleccionado.apellidos}`}
              </strong>?
            </p>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 mb-5">
              <strong>Control de Integridad Clínica:</strong> Si el usuario tiene registros médicos históricos (sesiones físicas, controles o alertas), el sistema realizará una <strong>inactivación segura</strong> para salvaguardar la evidencia clínica del piloto. Si no posee registros clínicos previos, se eliminará completamente del sistema.
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowModalEliminar(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarEliminar}
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Procesando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
