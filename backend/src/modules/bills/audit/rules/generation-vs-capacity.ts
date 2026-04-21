import type { AuditFinding, ExtractedBillV2 } from '../types'

/**
 * Fator médio de geração (kWh/kWp/mês) por UF, baseado em irradiação
 * média anual. Valores conservadores (usamos o piso da faixa de
 * referência) pra não gerar falso positivo em regiões de menor sol.
 */
const GEN_FACTOR_BY_UF: Record<string, number> = {
  // Norte
  AC: 130, AM: 125, AP: 135, PA: 130, RO: 130, RR: 135, TO: 140,
  // Nordeste
  AL: 145, BA: 140, CE: 150, MA: 140, PB: 150, PE: 145, PI: 150, RN: 150, SE: 145,
  // Centro-Oeste
  DF: 140, GO: 140, MS: 135, MT: 140,
  // Sudeste
  ES: 125, MG: 130, RJ: 115, SP: 125,
  // Sul
  PR: 115, RS: 110, SC: 110,
}
const GEN_FACTOR_DEFAULT = 120

/**
 * Considera que, em média, 50% da geração é autoconsumida direto (não
 * aparece como "injetada" na conta). Usamos esse piso conservador
 * pra evitar alarmar falsos positivos quando o cliente consome muito
 * durante o dia.
 */
const AUTOCONSUMPTION_FACTOR = 0.50
const ALERT_THRESHOLD = 0.60   // injetada < 60% do esperado = alerta

/**
 * Rule H — Geração injetada muito abaixo do esperado para a potência instalada.
 *
 * Sinaliza possíveis problemas técnicos (inversor com defeito, sombreamento,
 * sujeira nos painéis, falha de monitoramento). Considera autoconsumo médio.
 */
export function auditGenerationVsCapacity(bill: ExtractedBillV2): AuditFinding {
  const ruleId = 'GENERATION_UNDERPERFORM'
  const ruleName = 'Geração solar abaixo do esperado para a potência instalada'
  const legalBasis: string[] = []   // regra operacional, sem base legal

  const kwp = bill.scee?.installedCapacityKwp ?? null
  const injected = bill.scee?.injected?.totalKwh ?? null
  const uf = bill.holder?.state ?? null
  const billingDays = bill.period?.billingDays ?? 30

  if (!bill.unit.isDistributedGeneration) {
    return {
      ruleId, ruleName, status: 'OK', severity: 'INFO',
      monthlyOverchargeAmount: 0, yearlyProjection: 0,
      explanation: 'Unidade sem geração distribuída — regra não se aplica.',
      legalBasis, evidence: [],
    }
  }

  if (kwp == null || injected == null) {
    return {
      ruleId, ruleName, status: 'INSUFFICIENT_DATA', severity: 'INFO',
      monthlyOverchargeAmount: 0, yearlyProjection: 0,
      explanation:
        kwp == null
          ? 'Potência instalada (kWp) não cadastrada no sistema. Cadastre seu ponto de energia ' +
            'em "Pontos de energia" (marcando "Possui solar" e informando kWp) para habilitar esta análise.'
          : 'Energia injetada não identificada nesta conta.',
      legalBasis, evidence: [],
    }
  }

  const factor = uf ? GEN_FACTOR_BY_UF[uf.toUpperCase()] ?? GEN_FACTOR_DEFAULT : GEN_FACTOR_DEFAULT
  // Ajusta fator para o período real da conta (pode ser 28-33 dias)
  const expectedMonthly = kwp * factor * (billingDays / 30)
  const expectedInjected = expectedMonthly * (1 - AUTOCONSUMPTION_FACTOR)
  const ratio = injected / expectedInjected

  if (ratio >= ALERT_THRESHOLD) {
    return {
      ruleId, ruleName, status: 'OK', severity: 'INFO',
      monthlyOverchargeAmount: 0, yearlyProjection: 0,
      explanation:
        `Energia injetada (${injected} kWh) coerente com a potência instalada ` +
        `(${kwp} kWp · fator ${factor} kWh/kWp/mês em ${uf ?? 'UF não informada'}). ` +
        `Geração estimada: ~${expectedMonthly.toFixed(0)} kWh, injetada esperada ` +
        `(descontando ~50% de autoconsumo): ~${expectedInjected.toFixed(0)} kWh.`,
      legalBasis, evidence: [],
    }
  }

  // Subperformance detectada — não é "cobrança indevida", mas perda de valor
  // pela não geração. O valor não vai pra monthlyOvercharge (outra natureza),
  // mas é comunicado como alerta.
  const percentObserved = ratio * 100
  const severity = ratio < 0.3 ? 'CRITICAL' : 'WARNING'

  const explanation =
    `Sua usina injetou ${injected} kWh este mês, mas o esperado para ${kwp} kWp ` +
    `em ${uf ?? 'sua região'} (${factor} kWh/kWp/mês) seria ~${expectedInjected.toFixed(0)} kWh ` +
    `já descontando autoconsumo estimado (50%). Injeção observada: ` +
    `${percentObserved.toFixed(0)}% do esperado. ` +
    `Possíveis causas: inversor com defeito/desligado, sombreamento parcial, ` +
    `sujeira acumulada nos painéis, monitoramento desatualizado, ou aumento ` +
    `atípico de consumo diurno. Recomendação: verificar o monitoramento do inversor ` +
    `e, se persistir por 2+ meses, chamar a instaladora para inspeção.`

  return {
    ruleId, ruleName, status: 'OVERCHARGE_DETECTED', severity,
    monthlyOverchargeAmount: 0,       // não é cobrança indevida, é perda
    yearlyProjection: 0,
    explanation,
    legalBasis,
    evidence: [
      {
        lineDescription: 'Potência instalada cadastrada',
        field: 'installedCapacityKwp',
        value: kwp,
        note: `${kwp} kWp`,
      },
      {
        lineDescription: 'Energia injetada neste mês',
        field: 'injectedKwh',
        value: injected,
        note: `${injected} kWh`,
      },
      {
        lineDescription: 'Injeção esperada para esta potência',
        field: 'expectedInjected',
        value: +expectedInjected.toFixed(0),
        note: `Calculado: ${kwp} kWp × ${factor} kWh/kWp/mês × 50% (líquido de autoconsumo)`,
      },
    ],
  }
}
