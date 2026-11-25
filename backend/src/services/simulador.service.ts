import { SimulacionRepository } from '../repositories/simulacion.repository';

export interface SimulacionInput {
  persona_id: number;
  edad: number;
  evaluacion_base_id?: number | null;
  nombre_escenario: string;
  minutos_simulados_sem: number;
  dias_contacto_simulados: number;
  factores_controlados_sim: number;
}

export class SimuladorService {
  private simulacionRepo = new SimulacionRepository();

  calcularProyeccion(input: {
    edad: number;
    minutos_simulados_sem: number;
    dias_contacto_simulados: number;
    factores_controlados_sim: number;
  }) {
    const edad = Math.max(30, Math.min(65, input.edad || 45));
    const minutos = Math.max(0, input.minutos_simulados_sem);
    const diasSocial = Math.max(0, Math.min(7, input.dias_contacto_simulados));
    const factores = Math.max(0, Math.min(4, input.factores_controlados_sim));

    // Riesgo basal de deterioro según edad (curva actuarial CAIDE)
    // Edad 30 -> 4%, Edad 50 -> 12%, Edad 65 -> 28% a 10 años
    const riesgoBase10 = Math.max(3, (Math.pow(edad / 30, 2.2) * 3));
    const riesgoBase20 = Math.min(65, riesgoBase10 * 2.1);

    // Reducción del riesgo por hábitos saludables (Modelo multidominio FINGER)
    // 1. Actividad física (meta recomendada OMS 150 min/semana)
    const factorActividad = Math.min(0.35, (minutos / 150) * 0.25);

    // 2. Contacto social (meta recomendada >= 3 días/semana)
    const factorSocial = Math.min(0.25, (diasSocial / 3) * 0.18);

    // 3. Factores cardiometabólicos (hasta 30% de reducción con 4/4 controlados)
    const factorCardio = (factores / 4) * 0.30;

    // Multiplicador protector acumulado
    const multiplicadorRiesgo = Math.max(0.20, (1 - factorActividad) * (1 - factorSocial) * (1 - factorCardio));

    const riesgo10Anios = Math.round(riesgoBase10 * multiplicadorRiesgo * 10) / 10;
    const riesgo20Anios = Math.round(riesgoBase20 * multiplicadorRiesgo * 10) / 10;

    // Puntaje proyectado (0 a 100)
    const subActividad = Math.min(100, Math.round((minutos / 150) * 100));
    const subSocial = Math.min(100, Math.round((diasSocial / 3) * 100));
    const subCardio = Math.round((factores / 4) * 100);

    const puntajeProyectado = Math.round(((subActividad * 0.35) + (subSocial * 0.35) + (subCardio * 0.30)) * 10) / 10;

    return {
      puntajeProyectado,
      riesgoBase10: Math.round(riesgoBase10 * 10) / 10,
      riesgoBase20: Math.round(riesgoBase20 * 10) / 10,
      riesgo10Anios,
      riesgo20Anios,
      reduccionRiesgo10: Math.round((riesgoBase10 - riesgo10Anios) * 10) / 10,
      reduccionRiesgo20: Math.round((riesgoBase20 - riesgo20Anios) * 10) / 10,
      subActividad,
      subSocial,
      subCardio,
    };
  }

  async simularYGuardar(input: SimulacionInput) {
    const calculo = this.calcularProyeccion({
      edad: input.edad,
      minutos_simulados_sem: input.minutos_simulados_sem,
      dias_contacto_simulados: input.dias_contacto_simulados,
      factores_controlados_sim: input.factores_controlados_sim,
    });

    const simulacionId = await this.simulacionRepo.saveSimulacion({
      persona_id: input.persona_id,
      evaluacion_base_id: input.evaluacion_base_id ?? null,
      nombre_escenario: input.nombre_escenario || 'Simulación personalizada',
      minutos_simulados_sem: input.minutos_simulados_sem,
      dias_contacto_simulados: input.dias_contacto_simulados,
      factores_controlados_sim: input.factores_controlados_sim,
      puntaje_proyectado: calculo.puntajeProyectado,
      riesgo_10_anios_pct: calculo.riesgo10Anios,
      riesgo_20_anios_pct: calculo.riesgo20Anios,
    });

    return {
      simulacionId,
      ...calculo,
    };
  }

  async getHistorial(personaId: number) {
    return await this.simulacionRepo.getSimulaciones(personaId);
  }
}
