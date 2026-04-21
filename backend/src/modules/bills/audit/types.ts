/**
 * Tipos da extração v2 — espelho do JSON que a IA retorna.
 * Todos os campos são opcionais porque distribuidoras diferentes expõem
 * conjuntos distintos de dados e a IA pode deixar null quando não encontrar.
 */

export type LineType =
  | 'ENERGY_CONSUMED'
  | 'ENERGY_INJECTED_TE'
  | 'ENERGY_INJECTED_TUSD'
  | 'ENERGY_SUPPLIED_TE'
  | 'ENERGY_SUPPLIED_TUSD'
  | 'CIP'
  | 'FLAG'
  | 'FINE'
  | 'INTEREST'
  | 'REFUND_PIS_COFINS'
  | 'OTHER'

export interface BillLineItem {
  description: string
  lineType: LineType
  unit: string | null
  quantity: number | null
  unitPriceWithTax: number | null
  unitTariff: number | null
  totalValue: number
  pisCofinsValue: number | null
  icmsBase: number | null
  icmsRate: number | null
  icmsValue: number | null
  postoTarifario: string | null
  vintageLabel: string | null
  creditGroup: string | null
}

export interface ExtractedBillV2 {
  utility: {
    name: string | null
    legalName: string | null
    cnpj: string | null
  }
  invoice: {
    number: string | null
    series?: string | null
    accessKey?: string | null
    cfop?: string | null
    authProtocol?: string | null
    issueDate?: string | null
    dueDate: string | null
    totalAmount: number | null
    barcodeLine?: string | null
  }
  holder?: {
    name: string | null
    taxId: string | null
    address: string | null
    city: string | null
    state: string | null
    zipCode: string | null
  }
  unit: {
    consumerUnitCode: string | null
    tariffClass: string | null
    tariffSubgroup: string | null
    tariffModality: string | null
    supplyPhase: string | null
    isDistributedGeneration: boolean
  }
  period: {
    referenceMonth: number | null
    referenceYear: number | null
    referenceLabel: string | null
    billingDays: number | null
    readingDate?: string | null
    nextReadingDate?: string | null
  }
  tariffFlag?: {
    color: string | null
    additionalAmount: number | null
  }
  consumption: {
    meteredKwh: number | null
    billedKwh: number | null
    avgConsumptionKwh?: number | null
  }
  scee: {
    injected: {
      totalKwh: number | null
      tusdKwh: number | null
      tusdValue: number | null
      tusdUnitPrice?: number | null
      teKwh: number | null
      teValue: number | null
      teUnitPrice?: number | null
    }
    supplied: {
      totalKwh: number | null
      tusdKwh: number | null
      tusdValue: number | null
      tusdUnitPrice?: number | null
      teKwh: number | null
      teValue: number | null
      teUnitPrice?: number | null
    }
    creditBalanceKwh: number | null
    creditsUsedKwh?: number | null
    creditsExpiringKwh?: number | null
    creditsExpiringMonth?: string | null
    installedCapacityKwp?: number | null
  }
  paymentMethod?: string | null
  lineItems: BillLineItem[]
  taxes: {
    icms: { baseTotal: number | null; rate: number | null; valueTotal: number | null }
    pis: { base: number | null; rate: number | null; value: number | null }
    cofins: { base: number | null; rate: number | null; value: number | null }
    publicLighting?: { value: number | null; municipality: string | null }
  }
  meters?: Array<{
    serialNumber: string | null
    measurement: string | null
    postoTarifario: string | null
    previousReading: number | null
    previousReadingDate: string | null
    currentReading: number | null
    currentReadingDate: string | null
    constant: number | null
    consumptionKwh: number | null
  }>
  monthlyHistory?: Array<{
    label: string
    month: number
    year: number
    consumptionKwh: number
    billingDays: number | null
  }>
  creditLots?: Array<{
    label: string
    vintageMonth: string | null
    group: string | null
    quantityKwh: number
    teUnitPrice: number | null
    tusdUnitPrice: number | null
    teValue: number | null
    tusdValue: number | null
  }>
  notices?: {
    tariffAdjustment: string | null
    observations: string | null
  }
  meta: {
    isSampleBill: boolean
    confidence: number | null
    notes?: string | null
  }
}

export type AuditSeverity = 'INFO' | 'WARNING' | 'CRITICAL'

export interface AuditEvidence {
  lineDescription: string
  field: string
  value: number
  note?: string
}

export interface AuditFinding {
  ruleId: string
  ruleName: string
  status: 'OK' | 'OVERCHARGE_DETECTED' | 'INSUFFICIENT_DATA'
  severity: AuditSeverity
  monthlyOverchargeAmount: number
  yearlyProjection: number
  explanation: string
  legalBasis: string[]
  evidence: AuditEvidence[]
}

export interface AuditReport {
  billRef: string
  utility: string | null
  referenceLabel: string | null
  totalBillAmount: number | null
  findings: AuditFinding[]
  totalMonthlyOvercharge: number
  totalYearlyProjection: number
  generatedAt: string
}
