import { MONTHS_FULL_PT, MONTHS_PT } from '@/types'

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function formatNumber(value: number, decimals = 1): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatKwh(value: number): string {
  return `${formatNumber(value, 0)} kWh`
}

export function formatKwp(value: number): string {
  return `${formatNumber(value, 2)} kWp`
}

export function formatMonthYear(month: number, year: number, short = false): string {
  const monthLabel = short ? MONTHS_PT[month - 1] : MONTHS_FULL_PT[month - 1]
  return `${monthLabel}/${year}`
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR')
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase()
}

export function formatDocument(doc: string, type: 'CPF' | 'CNPJ'): string {
  if (type === 'CPF') {
    return doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }
  return doc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}
