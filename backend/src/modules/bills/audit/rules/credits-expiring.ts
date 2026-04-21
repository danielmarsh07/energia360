import type { AuditFinding, ExtractedBillV2 } from '../types'

/**
 * Rule G — Créditos SCEE prestes a expirar.
 *
 * Pela Lei 14.300/2022, os créditos de energia injetada expiram em
 * 60 meses (5 anos) contados do momento da injeção. Quando a conta
 * explicita um valor de "Créditos a Expirar no próximo mês" > 0,
 * alertamos para que o cliente consuma/aumente uso antes da perda.
 *
 * Também consideramos aviso preventivo quando o saldo cresce continuamente
 * sem uso — mas esse caso requer histórico (tabela consumption_history),
 * fica para regra futura dashboard-level.
 */
export function auditCreditsExpiring(bill: ExtractedBillV2): AuditFinding {
  const ruleId = 'CREDITS_EXPIRING'
  const ruleName = 'Créditos SCEE prestes a expirar'
  const legalBasis = [
    'Lei 14.300/2022, art. 7º (prazo de 60 meses para créditos)',
    'REN ANEEL 1.059/2023, art. 656',
  ]

  if (!bill.unit.isDistributedGeneration) {
    return {
      ruleId, ruleName, status: 'OK', severity: 'INFO',
      monthlyOverchargeAmount: 0, yearlyProjection: 0,
      explanation: 'Unidade sem geração distribuída — regra não se aplica.',
      legalBasis, evidence: [],
    }
  }

  const expiringKwh = bill.scee?.creditsExpiringKwh ?? null
  const balance = bill.scee?.creditBalanceKwh ?? null

  if (expiringKwh == null) {
    return {
      ruleId, ruleName, status: 'INSUFFICIENT_DATA', severity: 'INFO',
      monthlyOverchargeAmount: 0, yearlyProjection: 0,
      explanation:
        'Conta não informa créditos prestes a expirar. Algumas distribuidoras só ' +
        'imprimem esse aviso no mês próximo ao vencimento.',
      legalBasis, evidence: [],
    }
  }

  if (expiringKwh <= 0) {
    return {
      ruleId, ruleName, status: 'OK', severity: 'INFO',
      monthlyOverchargeAmount: 0, yearlyProjection: 0,
      explanation:
        balance != null
          ? `Nenhum crédito a expirar no próximo mês. Saldo atual: ${balance.toFixed(0)} kWh.`
          : 'Nenhum crédito a expirar no próximo mês.',
      legalBasis, evidence: [],
    }
  }

  // Estima o valor em R$ usando a tarifa cheia (TUSD + TE) da energia fornecida
  const tusd = bill.scee?.supplied?.tusdUnitPrice ?? 0
  const te = bill.scee?.supplied?.teUnitPrice ?? 0
  const fullUnitPrice = Math.abs(tusd) + Math.abs(te)
  const lostValue = fullUnitPrice > 0 ? +(expiringKwh * fullUnitPrice).toFixed(2) : 0

  return {
    ruleId, ruleName,
    status: 'OVERCHARGE_DETECTED',
    severity: expiringKwh >= 200 ? 'CRITICAL' : 'WARNING',
    monthlyOverchargeAmount: lostValue,
    yearlyProjection: lostValue,     // perda pontual, não recorrente
    explanation:
      `Você tem ${expiringKwh.toFixed(0)} kWh de créditos que EXPIRAM no próximo mês ` +
      `(limite de 60 meses pela Lei 14.300). ` +
      (lostValue > 0
        ? `Se não forem usados, isso representa cerca de R$ ${lostValue.toFixed(2)} ` +
          `em perda — equivalente ao custo dessa energia a preço cheio. `
        : '') +
      `Como aproveitar: ligue equipamentos de alto consumo (ar-condicionado, aquecedor, ` +
      `carregador de veículo elétrico) antes do fim do mês, OU, se tiver outras unidades ` +
      `cadastradas no mesmo CPF/CNPJ, configure autoconsumo remoto para aproveitar os créditos.`,
    legalBasis,
    evidence: [
      {
        lineDescription: 'Créditos a expirar no próximo mês',
        field: 'creditsExpiringKwh',
        value: expiringKwh,
        note: `${expiringKwh.toFixed(0)} kWh`,
      },
      ...(balance != null
        ? [
            {
              lineDescription: 'Saldo total de créditos SCEE',
              field: 'creditBalanceKwh',
              value: balance,
              note: `${balance.toFixed(0)} kWh acumulados`,
            },
          ]
        : []),
    ],
  }
}
