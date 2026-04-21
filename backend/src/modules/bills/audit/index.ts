import type { AuditReport, ExtractedBillV2 } from './types'
import { auditIcmsOnInjection } from './rules/icms-on-injection'
import { auditFioBPercentage } from './rules/fio-b-percentage'
import { auditGenerationVsCapacity } from './rules/generation-vs-capacity'
import { auditPisCofinsRefund } from './rules/pis-cofins-refund'
import { auditCreditsExpiring } from './rules/credits-expiring'

export * from './types'

/**
 * Roda todas as regras de auditoria contra um JSON extraído v2.
 * Retorna um relatório consolidado — sem persistência, pode ser usado
 * em memória por endpoints ou scripts de teste.
 */
export function auditBill(bill: ExtractedBillV2, billRef: string): AuditReport {
  const findings = [
    auditIcmsOnInjection(bill),
    auditFioBPercentage(bill),
    auditGenerationVsCapacity(bill),
    auditPisCofinsRefund(bill),
    auditCreditsExpiring(bill),
  ]

  const totalMonthlyOvercharge = +findings
    .reduce((acc, f) => acc + f.monthlyOverchargeAmount, 0)
    .toFixed(2)
  const totalYearlyProjection = +findings
    .reduce((acc, f) => acc + f.yearlyProjection, 0)
    .toFixed(2)

  return {
    billRef,
    utility: bill.utility.name,
    referenceLabel: bill.period.referenceLabel,
    totalBillAmount: bill.invoice.totalAmount,
    findings,
    totalMonthlyOvercharge,
    totalYearlyProjection,
    generatedAt: new Date().toISOString(),
  }
}
