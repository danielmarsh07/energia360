import type { AuditReport, ExtractedBillV2 } from './types'
import { auditIcmsOnInjection } from './rules/icms-on-injection'

export * from './types'

/**
 * Roda todas as regras de auditoria contra um JSON extraído v2.
 * Retorna um relatório consolidado — sem persistência, pode ser usado
 * em memória por endpoints ou scripts de teste.
 */
export function auditBill(bill: ExtractedBillV2, billRef: string): AuditReport {
  const findings = [
    auditIcmsOnInjection(bill),
    // próximas regras entram aqui:
    // auditFioBPercentage(bill),
    // auditFlagOnCompensated(bill),
    // auditGenerationVsCapacity(bill),
    // ...
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
