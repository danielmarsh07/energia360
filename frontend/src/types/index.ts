// =============================================
// TIPOS DO SISTEMA ENERGIA360
// =============================================

export type UserRole = 'CLIENT' | 'ADMIN' | 'ADMIN_MASTER' | 'CLIENT_ADMIN' | 'OPERATOR' | 'TECHNICIAN' | 'VIEWER'
export type SubscriptionStatus = 'ACTIVE' | 'CANCELLED' | 'EXPIRED'
export type DocumentType = 'CPF' | 'CNPJ'
export type ContactType = 'EMAIL' | 'PHONE' | 'WHATSAPP'
export type EnergyPointType = 'RESIDENTIAL' | 'COMMERCIAL' | 'RURAL' | 'INDUSTRIAL'
export type BillStatus = 'PENDING' | 'UPLOADED' | 'PROCESSING' | 'EXTRACTED' | 'VALIDATED' | 'FAILED'
export type AlertType =
  | 'HIGH_CONSUMPTION' | 'HIGH_BILL' | 'GENERATION_DROP' | 'SOLAR_ISSUE'
  | 'INCONSISTENT_READING' | 'MISSING_BILL'
  | 'ICMS_OVERCHARGE' | 'FIO_B_OVER_LIMIT' | 'CREDITS_EXPIRING' | 'PIS_COFINS_REFUND'
  | 'GENERAL'
export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL'
export type TutorialCategory = 'SOLAR_BASICS' | 'BILLING' | 'MONITORING' | 'MAINTENANCE' | 'FAQ' | 'SAVINGS'

export interface User {
  id: string
  email: string
  role: UserRole
  fullName?: string
  profile?: ClientProfile
}

export interface ClientProfile {
  id: string
  userId: string
  fullName: string
  documentType: DocumentType
  document?: string
  responsibleName?: string
  observations?: string
  contacts: Contact[]
  createdAt: string
  updatedAt: string
  _count?: { addressUnits: number }
}

export interface Contact {
  id: string
  clientProfileId: string
  type: ContactType
  value: string
  label?: string
  isPrimary: boolean
}

export interface AddressUnit {
  id: string
  clientProfileId: string
  name: string
  consumerUnitCode?: string
  utility?: string
  zipCode?: string
  street?: string
  number?: string
  complement?: string
  neighborhood?: string
  city?: string
  state?: string
  observations?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  energyPoints?: EnergyPoint[]
  _count?: { energyPoints: number; utilityBills: number }
}

export interface EnergyPoint {
  id: string
  addressUnitId: string
  name: string
  pointType: EnergyPointType
  hasSolar: boolean
  solarPowerKwp?: number
  panelsCount?: number
  installDate?: string
  inverterModel?: string
  technicalNotes?: string
  isActive: boolean
  createdAt: string
}

export interface UtilityBill {
  id: string
  addressUnitId: string
  referenceMonth: number
  referenceYear: number
  dueDate?: string
  status: BillStatus
  createdAt: string
  files?: UtilityBillFile[]
  extractedData?: UtilityBillExtractedData
  addressUnit?: AddressUnit
}

export interface UtilityBillFile {
  id: string
  billId: string
  fileName: string
  originalName: string
  mimeType: string
  fileSize: number
  filePath: string
  uploadedAt: string
}

export interface UtilityBillExtractedData {
  id: string
  billId: string
  utilityName?: string
  consumerUnitCode?: string
  consumptionKwh?: number
  totalAmount?: number
  energyAmount?: number
  networkUsageFee?: number
  injectedEnergyKwh?: number
  energyCreditsKwh?: number
  previousReading?: number
  currentReading?: number
  avgConsumption?: number
  dueDate?: string
  isManuallyReviewed: boolean
  confidence?: number
}

export interface ConsumptionHistory {
  id: string
  addressUnitId: string
  month: number
  year: number
  consumptionKwh?: number
  totalAmount?: number
  injectedKwh?: number
  creditsKwh?: number
  estimatedSavings?: number
}

export interface Alert {
  id: string
  addressUnitId: string
  type: AlertType
  severity: AlertSeverity
  title: string
  message: string
  isRead: boolean
  referenceMonth?: number
  referenceYear?: number
  createdAt: string
  addressUnit?: { name: string }
  // Auditoria automática
  billId?: string | null
  ruleId?: string | null
  monthlyImpact?: number | null
  yearlyImpact?: number | null
  actionUrl?: string | null
}

export interface TutorialArticle {
  id: string
  slug: string
  title: string
  summary: string
  content?: string
  category: TutorialCategory
  readingTime?: number
  icon?: string
  order: number
}

export interface DashboardData {
  totalUnits: number
  totalBills: number
  activeAlerts: number
  currentMonthConsumption: number | null
  currentMonthAmount: number | null
  totalSavings: number | null
  monthlyHistory: MonthlyHistoryItem[]
  recentAlerts: Alert[]
  lastBill: UtilityBill | null
}

export interface MonthlyHistoryItem {
  month: number
  year: number
  consumption: number
  amount: number
  savings: number
}

// Meses em português
export const MONTHS_PT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
]

export const MONTHS_FULL_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

export const ENERGY_POINT_TYPE_LABELS: Record<EnergyPointType, string> = {
  RESIDENTIAL: 'Residencial',
  COMMERCIAL: 'Comercial',
  RURAL: 'Rural',
  INDUSTRIAL: 'Industrial',
}

export const BILL_STATUS_LABELS: Record<BillStatus, string> = {
  PENDING: 'Pendente',
  UPLOADED: 'Enviada',
  PROCESSING: 'Processando',
  EXTRACTED: 'Extraída',
  VALIDATED: 'Validada',
  FAILED: 'Falhou',
}

export const ALERT_SEVERITY_LABELS: Record<AlertSeverity, string> = {
  INFO: 'Informação',
  WARNING: 'Atenção',
  CRITICAL: 'Crítico',
}

export interface PlanModule {
  module: { slug: string; name: string }
}

export interface Plan {
  id: string
  slug: string
  name: string
  description: string
  features: string[]
  maxUnits: number
  maxUsers: number
  isActive: boolean
  order: number
  modules: PlanModule[]
}

export interface Subscription {
  id: string
  userId: string
  planId: string
  plan: Plan
  status: SubscriptionStatus
  startedAt: string
  expiresAt?: string
}

export const TUTORIAL_CATEGORY_LABELS: Record<TutorialCategory, string> = {
  SOLAR_BASICS: 'Fundamentos Solar',
  BILLING: 'Entendendo a Conta',
  MONITORING: 'Monitoramento',
  MAINTENANCE: 'Manutenção',
  FAQ: 'Dúvidas Frequentes',
  SAVINGS: 'Economia e Retorno',
}
