import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { FolderTree, Award, MapPin, Power } from 'lucide-react';

export const CatalogosAdmin: React.FC = () => {
  const [logros, setLogros] = useState<any[]>([]);
  const [ubicaciones, setUbicaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [logrosRes, ubicRes] = await Promise.all([
        api.get('/admin/catalogos/logros'),
        api.get('/admin/ubicaciones'),
      ]);
      if (logrosRes.data.success) setLogros(logrosRes.data.data);
      if (ubicRes.data.success) setUbicaciones(ubicRes.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleLogro = async (id: number, activo: boolean) => {
    try {
      await api.patch(`/admin/catalogos/logros/${id}/toggle`, { activo: !activo });
      fetchData();
    } catch {
      alert('Error al modificar logro.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-health-border pb-4">
        <h2 className="text-xl font-extrabold text-health-dark">Catálogos del Sistema y Ámbito Geográfico</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Gestión de logros de la aplicación y delimitación del piloto en Trujillo, Perú.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Catálogo de Logros */}
        <div className="bg-white rounded-2xl border border-health-border shadow-card overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-slate-800 text-sm">Catálogo de Medallas (catalogo_logro)</h3>
            </div>
            <span className="text-xs text-slate-400">{logros.length} medallas</span>
          </div>

          <div className="divide-y divide-slate-100">
            {logros.map((l) => (
              <div key={l.logro_id} className="p-3.5 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-health-petroleo">{l.codigo_logro}</span>
                    <span className="font-bold text-slate-800">{l.nombre}</span>
                  </div>
                  <p className="text-slate-500 mt-0.5 text-[11px]">{l.descripcion}</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    l.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {l.activo ? 'Activo' : 'Inactivo'}
                  </span>
                  <button
                    onClick={() => handleToggleLogro(l.logro_id, l.activo)}
                    className="p-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                  >
                    <Power className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Distritos del Piloto */}
        <div className="bg-white rounded-2xl border border-health-border shadow-card overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-health-petroleo" />
              <h3 className="font-bold text-slate-800 text-sm">Distritos del Piloto Trujillo (ubicacion)</h3>
            </div>
            <span className="text-xs text-slate-400">La Libertad, Perú</span>
          </div>

          <div className="divide-y divide-slate-100">
            {ubicaciones.map((u) => (
              <div key={u.ubicacion_id} className="p-3.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-800 block">{u.distrito}</span>
                  <span className="text-slate-400 text-[11px]">
                    {u.ciudad} · {u.provincia}, {u.departamento} ({u.pais})
                  </span>
                </div>
                <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-2 py-1 rounded">
                  ID: #{u.ubicacion_id}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
