import { KpiService } from './kpi.service';
import { EvaluacionRepository } from '../repositories/evaluacion.repository';
import { ControlRepository } from '../repositories/control.repository';
import { getFirstDayOfMonth } from '../utils/dateUtils';
import { env } from '../config/env';

export class ChatbotService {
  private kpiService = new KpiService();
  private evalRepo = new EvaluacionRepository();
  private controlRepo = new ControlRepository();

  async responderConsulta(personaId: number, titularNombre: string, mensajeUsuario: string): Promise<{ respuesta: string; contexto: any }> {
    const [caf, ccs, fcm, ultimaEval, controlesMes] = await Promise.all([
      this.kpiService.calcularCAF(personaId),
      this.kpiService.calcularCCS(personaId),
      this.kpiService.calcularFCM(personaId),
      this.evalRepo.getUltimaEvaluacion(personaId),
      this.controlRepo.getControlesProgramadosMes(personaId, getFirstDayOfMonth()),
    ]);

    const contexto = {
      titularNombre,
      puntajeSaludCerebral: ultimaEval?.puntaje_total ?? (caf.porcentaje && ccs.porcentaje ? Math.round(((caf.porcentaje*0.35)+(ccs.porcentaje*0.35)+(fcm.porcentaje||0)*0.30)*10)/10 : 75),
      categoriaRiesgo: ultimaEval?.categoria_riesgo ?? 'MODERADO',
      caf: {
        porcentaje: caf.porcentajeTexto,
        minutos: caf.numerador,
        meta: caf.denominador,
        estado: caf.estado.label,
        diasPendientes: caf.diasPendientes ?? 0,
      },
      ccs: {
        porcentaje: ccs.porcentajeTexto,
        diasConContacto: ccs.numerador,
        meta: ccs.denominador,
        estado: ccs.estado.label,
        diasPendientes: ccs.diasPendientes ?? 0,
      },
      fcm: {
        porcentaje: fcm.porcentajeTexto,
        enMeta: fcm.numerador,
        total: fcm.denominador,
        estado: fcm.estado.label,
      },
      controlesPendientes: controlesMes.filter(c => !c.resultado_id).map(c => c.tipo_control),
    };

    // Si hay GEMINI_API_KEY configurada, intentar llamada con IA generativa contextualizada
    if (env.GEMINI_API_KEY) {
      try {
        const respuestaAI = await this.consultarGemini(mensajeUsuario, contexto);
        if (respuestaAI) {
          return { respuesta: respuestaAI, contexto };
        }
      } catch (err: any) {
        console.warn('[ChatbotService] Fallback a motor determinista por error en Gemini:', err.message);
      }
    }

    // Motor determinista inteligente y seguro (sin alucinaciones)
    const texto = mensajeUsuario.toLowerCase();
    let respuesta = '';

    if (texto.includes('puntaje') || texto.includes('salud cerebral') || texto.includes('score')) {
      respuesta = `Tu Puntaje de Salud Cerebral actual es de **${contexto.puntajeSaludCerebral}/100** (Riesgo **${contexto.categoriaRiesgo}**).\n` +
        `Se compone de: Actividad Física (${contexto.caf.porcentaje}), Contacto Social (${contexto.ccs.porcentaje}) y Control Cardiometabólico (${contexto.fcm.porcentaje}). ` +
        `¡Mantenerte en más de 80 puntos protege fuertemente tu memoria y agilidad mental!`;
    } else if (texto.includes('actividad') || texto.includes('ejercicio') || texto.includes('caminar') || texto.includes('minuto') || texto.includes('caf')) {
      respuesta = `En Actividad Física llevas **${contexto.caf.minutos} de ${contexto.caf.meta} minutos** (${contexto.caf.porcentaje}) con estado: *"${contexto.caf.estado}"*.\n` +
        (contexto.caf.diasPendientes > 0 ? `⚠️ Tienes ${contexto.caf.diasPendientes} día(s) con confirmación pendiente esta semana. ` : '') +
        (contexto.caf.minutos >= contexto.caf.meta ? '🎉 ¡Ya alcanzaste tu meta semanal! Excelente disciplina.' : `Te faltan ${contexto.caf.meta - contexto.caf.minutos} minutos para lograr tu meta dorada.`);
    } else if (texto.includes('social') || texto.includes('amigo') || texto.includes('familia') || texto.includes('contacto') || texto.includes('ccs')) {
      respuesta = `En Contacto Social has registrado **${contexto.ccs.diasConContacto} de ${contexto.ccs.meta} días** planificados (${contexto.ccs.porcentaje}) con estado: *"${contexto.ccs.estado}"*.\n` +
        `Recuerda que las interacciones sociales activan áreas del lóbulo frontal y fortalecen la reserva cognitiva.`;
    } else if (texto.includes('control') || texto.includes('presion') || texto.includes('glucosa') || texto.includes('fcm') || texto.includes('medico')) {
      if (contexto.controlesPendientes.length > 0) {
        respuesta = `Tienes **${contexto.controlesPendientes.length} control(es) pendiente(s)** este mes: ${contexto.controlesPendientes.join(', ')}.\n` +
          `Actualmente tienes ${contexto.fcm.enMeta} de ${contexto.fcm.total} controles dentro de meta (${contexto.fcm.porcentaje}).`;
      } else {
        respuesta = `¡Muy bien! Tus controles programados del mes están al día: ${contexto.fcm.enMeta}/${contexto.fcm.total} en meta (${contexto.fcm.porcentaje}).`;
      }
    } else if (texto.includes('pendiente') || texto.includes('confirmar') || texto.includes('falta')) {
      respuesta = `Revisión de pendientes para ${titularNombre}:\n` +
        `- Días de hábito por confirmar: ${contexto.caf.diasPendientes} día(s).\n` +
        `- Controles médicos pendientes: ${contexto.controlesPendientes.length > 0 ? contexto.controlesPendientes.join(', ') : 'Ninguno'}.\n` +
        `Recuerda confirmar tus días en la pestaña de Hábitos para ver tus porcentajes 100% actualizados.`;
    } else {
      respuesta = `¡Hola ${titularNombre}! Soy tu Asistente de Salud Cerebral. ` +
        `Puedo informarte sobre tu avance real:\n` +
        `• Tu Puntaje Cerebral: **${contexto.puntajeSaludCerebral}/100**\n` +
        `• Actividad Física: **${contexto.caf.minutos}/${contexto.caf.meta} min** (${contexto.caf.porcentaje})\n` +
        `• Contacto Social: **${contexto.ccs.diasConContacto}/${contexto.ccs.meta} días** (${contexto.ccs.porcentaje})\n` +
        `• Controles en Meta: **${contexto.fcm.enMeta}/${contexto.fcm.total}**\n\n` +
        `¿En qué área te gustaría enfocarte hoy para seguir fortaleciendo tu memoria?`;
    }

    return { respuesta, contexto };
  }

  private async consultarGemini(promptUsuario: string, contexto: any): Promise<string | null> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;
    const systemInstruction = `Eres un asistente médico virtual especializado en prevención del deterioro cognitivo en adultos de Trujillo, Perú.
Datos clínicos REALES del usuario en sesión:
- Titular: ${contexto.titularNombre}
- Puntaje de Salud Cerebral: ${contexto.puntajeSaludCerebral}/100 (Riesgo: ${contexto.categoriaRiesgo})
- CAF (Actividad Física): ${contexto.caf.minutos}/${contexto.caf.meta} min (${contexto.caf.porcentaje}), Estado: ${contexto.caf.estado}, Días pendientes: ${contexto.caf.diasPendientes}
- CCS (Contacto Social): ${contexto.ccs.diasConContacto}/${contexto.ccs.meta} días (${contexto.ccs.porcentaje}), Estado: ${contexto.ccs.estado}
- FCM (Cardiometabólico): ${contexto.fcm.enMeta}/${contexto.fcm.total} en meta (${contexto.fcm.porcentaje}), Pendientes: ${contexto.controlesPendientes.join(', ') || 'Ninguno'}

Reglas estrictas:
1. Responde de forma cálida, cercana, motivadora y en español de Perú.
2. NUNCA inventes números ni diagnósticos que no estén en los datos reales.
3. Sé conciso (máximo 2 a 3 párrafos cortos).`;

    const body = {
      contents: [{
        parts: [
          { text: `${systemInstruction}\n\nPregunta del usuario: ${promptUsuario}` }
        ]
      }]
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  }
}
