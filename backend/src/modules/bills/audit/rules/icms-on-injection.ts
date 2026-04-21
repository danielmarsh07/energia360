import type { AuditFinding, BillLineItem, ExtractedBillV2 } from '../types'

/**
 * Rule A — ICMS indevido sobre energia fornecida via compensação (TUSD/TE).
 *
 * Base jurídica:
 *  - LC 194/2022, art. 3º, X — exclui ICMS sobre TUSD/TE de energia elétrica.
 *  - STF Tema 176, RE 714.139 (out/2023) — não incidência de ICMS sobre
 *    energia injetada na rede pelo prosumidor.
 *  - Lei 14.300/2022 — marco legal da GD, trata injeção/compensação.
 *
 * Lógica:
 *  1. Soma o ICMS cobrado em linhas ENERGY_SUPPLIED_TUSD e ENERGY_SUPPLIED_TE
 *     (energia "fornecida" pela distribuidora em cima do crédito do cliente,
 *     que tecnicamente é a energia que ele mesmo gerou).
 *  2. Soma o ICMS já devolvido nas linhas ENERGY_INJECTED_* (icmsValue negativo).
 *     Algumas distribuidoras (ex: Enel RJ) já aplicam essa compensação
 *     parcialmente — se sim, reduz o valor potencialmente indevido.
 *  3. Diferença positiva = cobrança ICMS ainda controvertida.
 */
export function auditIcmsOnInjection(bill: ExtractedBillV2): AuditFinding {
  const ruleId = 'ICMS_OVER_INJECTED'
  const ruleName = 'ICMS sobre energia compensada (Tema 176 STF / LC 194/2022)'
  const legalBasis = [
    'LC 194/2022, art. 3º, X',
    'STF Tema 176 (RE 714.139/SC)',
    'Lei 14.300/2022',
  ]

  // Se não for UC com GD, a regra não se aplica
  if (!bill.unit.isDistributedGeneration) {
    return {
      ruleId, ruleName, status: 'OK', severity: 'INFO',
      monthlyOverchargeAmount: 0, yearlyProjection: 0,
      explanation: 'Unidade consumidora sem geração distribuída — regra não se aplica.',
      legalBasis, evidence: [],
    }
  }

  const suppliedLines = bill.lineItems.filter(
    (li) => li.lineType === 'ENERGY_SUPPLIED_TUSD' || li.lineType === 'ENERGY_SUPPLIED_TE'
  )
  const injectedLines = bill.lineItems.filter(
    (li) => li.lineType === 'ENERGY_INJECTED_TUSD' || li.lineType === 'ENERGY_INJECTED_TE'
  )

  if (suppliedLines.length === 0) {
    return {
      ruleId, ruleName, status: 'INSUFFICIENT_DATA', severity: 'INFO',
      monthlyOverchargeAmount: 0, yearlyProjection: 0,
      explanation:
        'Não foi possível identificar linhas de energia fornecida (SCEE) nesta conta. ' +
        'Pode ser um layout de distribuidora sem separação TUSD/TE (ex: CEMIG) ou ' +
        'a IA não conseguiu mapear as linhas.',
      legalBasis, evidence: [],
    }
  }

  const icmsSum = (arr: BillLineItem[]) =>
    arr.reduce((acc, li) => acc + (li.icmsValue ?? 0), 0)

  const icmsOnSupplied = icmsSum(suppliedLines)          // esperado > 0
  const icmsAlreadyCredited = icmsSum(injectedLines)     // esperado ≤ 0 (créditos)
  const netOvercharge = +(icmsOnSupplied + icmsAlreadyCredited).toFixed(2)
  // netOvercharge positivo = há ICMS residual cobrado mesmo após compensação

  const evidence = [
    ...suppliedLines
      .filter((li) => (li.icmsValue ?? 0) > 0)
      .map((li) => ({
        lineDescription: li.description,
        field: 'icmsValue',
        value: li.icmsValue ?? 0,
        note: `ICMS cobrado em cima de energia compensada (${li.quantity ?? '?'} kWh × ${li.icmsRate ?? '?'})`,
      })),
    ...injectedLines
      .filter((li) => (li.icmsValue ?? 0) < 0)
      .map((li) => ({
        lineDescription: li.description,
        field: 'icmsValue',
        value: li.icmsValue ?? 0,
        note: 'Crédito de ICMS já aplicado pela distribuidora (abatimento parcial)',
      })),
  ]

  if (netOvercharge < 0.5) {
    return {
      ruleId, ruleName, status: 'OK', severity: 'INFO',
      monthlyOverchargeAmount: 0, yearlyProjection: 0,
      explanation:
        'A distribuidora parece estar aplicando corretamente o abatimento de ICMS ' +
        'sobre a energia compensada (LC 194/2022 + Tema 176). Sem cobrança residual identificada.',
      legalBasis, evidence,
    }
  }

  const yearlyProjection = +(netOvercharge * 12).toFixed(2)
  const severity = netOvercharge >= 50 ? 'CRITICAL' : netOvercharge >= 10 ? 'WARNING' : 'INFO'

  const explanation =
    `Identificamos R$ ${netOvercharge.toFixed(2)} de ICMS cobrados nesta conta sobre ` +
    `energia que foi compensada pelo seu próprio sistema solar. ` +
    `A LC 194/2022 e a decisão do STF no Tema 176 determinam que o ICMS não incide sobre essa parcela. ` +
    (icmsAlreadyCredited < 0
      ? `A distribuidora já devolveu R$ ${Math.abs(icmsAlreadyCredited).toFixed(2)} ` +
        `em ICMS (linhas de "Energia Injetada" com valor negativo), mas ainda resta ` +
        `R$ ${netOvercharge.toFixed(2)} cobrado indevidamente na parcela TUSD/TE fornecida. `
      : `A distribuidora NÃO aplicou qualquer abatimento de ICMS sobre a energia injetada — ` +
        `o valor integral da coluna de ICMS sobre "Energia Fornecida" é potencialmente recuperável. `) +
    `Projeção anual: R$ ${yearlyProjection.toFixed(2)}.`

  return {
    ruleId, ruleName, status: 'OVERCHARGE_DETECTED', severity,
    monthlyOverchargeAmount: netOvercharge,
    yearlyProjection,
    explanation,
    legalBasis,
    evidence,
  }
}
