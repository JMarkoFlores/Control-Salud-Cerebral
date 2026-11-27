import { ViewId } from '../types';

export type ViewCell =
  | { span: number; kind: 'chart'; id: string }
  | { span: number; kind: 'table'; id: string }
  | { span: number; kind: 'tabs'; tabs: Array<{ id: string; label: string }> };

export const SPAN_CLASS: Record<number, string> = {
  3: 'lg:col-span-3',
  4: 'lg:col-span-4',
  5: 'lg:col-span-5',
  6: 'lg:col-span-6',
  7: 'lg:col-span-7',
  8: 'lg:col-span-8',
  12: 'lg:col-span-12'
};

export const VIEW_LAYOUTS: Record<ViewId, ViewCell[]> = {
  resumen: [
    { span: 8, kind: 'chart', id: 'indicadores-meta' },
    { span: 4, kind: 'chart', id: 'estados' },
    { span: 4, kind: 'chart', id: 'mapa-resumen' },
    {
      span: 8,
      kind: 'tabs',
      tabs: [
        { id: 'resumen-distrito', label: 'Distritos' },
        { id: 'seguimiento-participante', label: 'Participantes' },
        { id: 'detalle-controles', label: 'Controles' }
      ]
    }
  ],
  actividad: [
    { span: 8, kind: 'chart', id: 'minutos-semana' },
    { span: 4, kind: 'chart', id: 'estados-caf' },
    { span: 3, kind: 'chart', id: 'caf-distrito' },
    { span: 3, kind: 'chart', id: 'caf-edad-sexo' },
    { span: 6, kind: 'table', id: 'detalle-caf' }
  ],
  contacto: [
    { span: 8, kind: 'chart', id: 'dias-semana' },
    { span: 4, kind: 'chart', id: 'estados-ccs' },
    { span: 3, kind: 'chart', id: 'ccs-distrito' },
    { span: 3, kind: 'chart', id: 'ccs-edad-sexo' },
    { span: 6, kind: 'table', id: 'detalle-ccs' }
  ],
  cardiometabolicos: [
    { span: 8, kind: 'chart', id: 'factores-estado' },
    { span: 4, kind: 'chart', id: 'origen-resultados' },
    { span: 5, kind: 'chart', id: 'fcm-mensual' },
    {
      span: 7,
      kind: 'tabs',
      tabs: [
        { id: 'fcm-participante', label: 'Por participante' },
        { id: 'detalle-factor', label: 'Por factor' }
      ]
    }
  ],
  pendientes: [
    { span: 5, kind: 'chart', id: 'pendientes-distrito' },
    { span: 3, kind: 'chart', id: 'motivos' },
    { span: 4, kind: 'table', id: 'mapa-pendientes' },
    {
      span: 12,
      kind: 'tabs',
      tabs: [
        { id: 'habitos-pendientes', label: 'Hábitos' },
        { id: 'controles-pendientes', label: 'Controles' }
      ]
    }
  ],
  evolucion: [
    { span: 8, kind: 'chart', id: 'tendencia' },
    { span: 4, kind: 'table', id: 'mapa-evolucion' },
    { span: 6, kind: 'chart', id: 'comparacion' },
    { span: 6, kind: 'table', id: 'evolucion-detalle' }
  ]
};
