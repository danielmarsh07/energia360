import type { AuditFinding, ExtractedBillV2 } from '../types'

/**
 * Rule F — Devolução PIS/COFINS (STF Tema 745 / RE 574.706).
 *
 * Após a decisão do STF em 2017 (e modulação em 2021), o ICMS não integra
 * a base de cálculo do PIS/COFINS. Distribuidoras passaram a devolver
 * valores cobrados indevidamente até 2017, geralmente em linhas como
 * "Devolução PIS/COFINS", "Crédito Tema 745" ou "Restituição Judicial".
 *
 * Esta regra apenas ALERTA quando NÃO encontramos linha de devolução em
 * uma conta que ainda teria direito. Não calcula o valor (depende de
 * histórico pré-2017 do cliente, que não está na conta atual).
 *
 * Uso: flag informativa pra cliente procurar advogado/verificar se a
 * distribuidora já processou a devolução.
 */
export function auditPisCofinsRefund(bill: ExtractedBillV2): AuditFinding {
  const ruleId = 'PIS_COFINS_REFUND_TEMA_745'
  const ruleName = 'Possível direito à devolução de PIS/COFINS (Tema 745)'
  const legalBasis = [
    'STF Tema 745 / RE 574.706 (2017, modulação 2021)',
    'Lei 9.718/1998 c/c RE 574.706',
  ]

  const hasRefundLine = bill.lineItems.some(
    (li) =>
      li.lineType === 'REFUND_PIS_COFINS' ||
      /devolu[çc][ãa]o.*(pis|cofins)|cr[ée]dito.*tema.*745|restitu[iç][ãa]o/i.test(li.description),
  )

  if (hasRefundLine) {
    return {
      ruleId, ruleName, status: 'OK', severity: 'INFO',
      monthlyOverchargeAmount: 0, yearlyProjection: 0,
      explanation:
        'Esta conta já contém linha de devolução de PIS/COFINS (Tema 745). ' +
        'Sua distribuidora está processando o ajuste corretamente.',
      legalBasis, evidence: [],
    }
  }

  // Se não tem linha de devolução, ALERTA — mas como INFO (exige investigação
  // do histórico pré-2017 pelo cliente/advogado, não é cobrança automática).
  return {
    ruleId, ruleName, status: 'OVERCHARGE_DETECTED', severity: 'INFO',
    monthlyOverchargeAmount: 0,   // valor não calculável sem histórico
    yearlyProjection: 0,
    explanation:
      'Não identificamos linha de devolução de PIS/COFINS nesta conta. ' +
      'Se você era titular desta unidade consumidora entre 2012 e 2017, pode ter ' +
      'direito à restituição de PIS/COFINS cobrados sobre o ICMS nesse período ' +
      '(STF Tema 745). Consulte um advogado tributarista para avaliar o direito — ' +
      'valores típicos variam de R$ 500 a R$ 15.000 dependendo do consumo histórico.',
    legalBasis, evidence: [],
  }
}
