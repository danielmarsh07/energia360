import type { AuditFinding, ExtractedBillV2 } from '../types'

/**
 * Tabela progressiva de Fio B cobrado na energia injetada —
 * Lei 14.300/2022, art. 27, §1º.
 *
 * Percentual do TUSD Fio B que a distribuidora PODE cobrar (ou seja:
 * parcela da injetada que NÃO recebe desconto), por ano de referência.
 */
const FIO_B_BY_YEAR: Record<number, number> = {
  2023: 0.15,
  2024: 0.30,
  2025: 0.45,
  2026: 0.60,
  2027: 0.75,
  2028: 0.90,
  2029: 1.00,
}

/** Tolerância pra evitar falsos positivos por diferença tarifária por subclasse */
const TOLERANCE_PP = 0.05     // 5 pontos percentuais
const CRITICAL_GAP_PP = 0.10  // > 10 pp = crítico

/**
 * Rule B — Fio B cobrado acima do % previsto pela Lei 14.300.
 *
 * Como funciona:
 *  - Compara o preço unitário da TUSD injetada (abatimento por kWh injetado)
 *    contra o preço da TUSD fornecida (cheia).
 *  - O % de Fio B efetivamente cobrado = 1 - (tusdInjetada / tusdFornecida).
 *    Quando tusdInjetada / tusdFornecida é menor que esperado, significa que
 *    a distribuidora deu MENOS desconto → cobrou MAIS Fio B que a lei permite.
 *  - Esperado = (1 - FIO_B_BY_YEAR[ano]). Ex: 2026, expectedRatio = 0.40.
 */
export function auditFioBPercentage(bill: ExtractedBillV2): AuditFinding {
  const ruleId = 'FIO_B_OVER_LIMIT'
  const ruleName = 'Fio B cobrado acima do limite (Lei 14.300)'
  const legalBasis = [
    'Lei 14.300/2022, art. 27 (marco legal da GD)',
    'REN ANEEL 1.059/2023 (regulamentação da transição)',
  ]

  // Só se aplica a UC com GD
  if (!bill.unit.isDistributedGeneration) {
    return {
      ruleId, ruleName, status: 'OK', severity: 'INFO',
      monthlyOverchargeAmount: 0, yearlyProjection: 0,
      explanation: 'Unidade sem geração distribuída — regra não se aplica.',
      legalBasis, evidence: [],
    }
  }

  const injectedTusd = bill.scee?.injected?.tusdUnitPrice ?? null
  const suppliedTusd = bill.scee?.supplied?.tusdUnitPrice ?? null
  const injectedKwh = bill.scee?.injected?.tusdKwh ?? bill.scee?.injected?.totalKwh ?? null
  const year = bill.period?.referenceYear ?? new Date().getFullYear()

  if (injectedTusd == null || suppliedTusd == null || suppliedTusd <= 0 || injectedKwh == null) {
    return {
      ruleId, ruleName, status: 'INSUFFICIENT_DATA', severity: 'INFO',
      monthlyOverchargeAmount: 0, yearlyProjection: 0,
      explanation:
        'Não foi possível comparar os preços unitários de TUSD injetada × fornecida. ' +
        'Distribuidoras que não separam TUSD/TE (ex: CEMIG em layout simples) não permitem ' +
        'auditar essa regra diretamente.',
      legalBasis, evidence: [],
    }
  }

  const expectedFioB = FIO_B_BY_YEAR[year] ?? 1.00     // 2029+ = 100%
  const expectedRatio = 1 - expectedFioB               // parcela que DEVE ser descontada

  // Ratio observado entre tusd injetada / tusd fornecida (em módulo — valores
  // podem vir positivos como tarifa ou negativos como valor de abatimento)
  const observedRatio = Math.abs(injectedTusd) / Math.abs(suppliedTusd)
  const observedFioB = 1 - observedRatio               // % de Fio B efetivamente cobrado

  const gapPp = observedFioB - expectedFioB            // positivo = cobrou demais

  if (gapPp <= TOLERANCE_PP) {
    return {
      ruleId, ruleName, status: 'OK', severity: 'INFO',
      monthlyOverchargeAmount: 0, yearlyProjection: 0,
      explanation:
        `Fio B aplicado (${(observedFioB * 100).toFixed(0)}%) dentro do previsto pela ` +
        `Lei 14.300 para ${year} (${(expectedFioB * 100).toFixed(0)}%).`,
      legalBasis, evidence: [],
    }
  }

  // Excesso em R$/mês = injetada_kWh × TUSD_cheia × gap_em_percentual
  const monthlyOvercharge = +(injectedKwh * Math.abs(suppliedTusd) * gapPp).toFixed(2)
  const yearlyProjection = +(monthlyOvercharge * 12).toFixed(2)
  const severity = gapPp >= CRITICAL_GAP_PP ? 'CRITICAL' : 'WARNING'

  const explanation =
    `A Lei 14.300/2022 previu ${(expectedFioB * 100).toFixed(0)}% de Fio B para ${year}, ` +
    `mas esta conta aplicou aproximadamente ${(observedFioB * 100).toFixed(0)}% ` +
    `(diferença de ${(gapPp * 100).toFixed(1)} pontos percentuais). ` +
    `Isso significa que o desconto sobre sua energia injetada foi menor do que a lei determina. ` +
    `Impacto estimado: R$ ${monthlyOvercharge.toFixed(2)}/mês · R$ ${yearlyProjection.toFixed(2)}/ano. ` +
    `Recomendação: confirmar com a tabela TUSD-B homologada pela ANEEL para a distribuidora ` +
    `(diferenças podem existir por subclasse/modalidade tarifária).`

  return {
    ruleId, ruleName, status: 'OVERCHARGE_DETECTED', severity,
    monthlyOverchargeAmount: monthlyOvercharge,
    yearlyProjection,
    explanation,
    legalBasis,
    evidence: [
      {
        lineDescription: 'TUSD — Energia Fornecida (cheia)',
        field: 'suppliedTusdUnitPrice',
        value: Math.abs(suppliedTusd),
        note: `Base tarifária de referência (R$/kWh)`,
      },
      {
        lineDescription: 'TUSD — Energia Injetada (abatimento aplicado)',
        field: 'injectedTusdUnitPrice',
        value: Math.abs(injectedTusd),
        note: `Abatimento por kWh injetado. Proporção ${(observedRatio * 100).toFixed(0)}% do TUSD cheio.`,
      },
    ],
  }
}
