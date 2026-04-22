import PDFDocument from 'pdfkit'
import type { AuditReport } from './audit/types'

interface BillInfo {
  utilityName: string | null
  utilityCnpj: string | null
  consumerUnitCode: string | null
  holderName: string | null
  holderTaxId: string | null
  supplyAddress: string | null
  supplyCity: string | null
  supplyState: string | null
  referenceMonth: number
  referenceYear: number
  totalAmount: number | null
}

const BRAND_PRIMARY = '#059669'   // verde primary-600
const COLOR_CRITICAL = '#DC2626'  // red-600
const COLOR_WARNING = '#D97706'   // amber-600

const MONTH_NAMES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

function formatCurrency(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatMonthYear(month: number, year: number): string {
  return `${MONTH_NAMES[month - 1] ?? month}/${year}`
}

/**
 * Gera um PDF de auditoria tributária para uma conta de energia.
 * Retorna um Buffer pronto pra enviar via HTTP.
 */
export function generateAuditPdf(bill: BillInfo, report: AuditReport): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      info: {
        Title: `Auditoria Tributária - ${bill.utilityName} ${bill.referenceMonth}/${bill.referenceYear}`,
        Author: 'Energia360',
        Subject: 'Relatório de auditoria de conta de energia elétrica',
      },
    })

    const chunks: Buffer[] = []
    doc.on('data', (c) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    // ============ CABEÇALHO ============
    doc.rect(0, 0, doc.page.width, 90).fill(BRAND_PRIMARY)
    doc.fillColor('#ffffff')
       .fontSize(22)
       .text('Energia360', 50, 30, { continued: false })
    doc.fontSize(12)
       .fillColor('#d1fae5')
       .text('Relatório de auditoria tributária — Conta de energia elétrica', 50, 58)

    doc.fillColor('#000000')
    doc.moveDown(5)

    // ============ IDENTIFICAÇÃO ============
    doc.fontSize(10).fillColor('#6b7280').text('CLIENTE', 50, 120)
    doc.fontSize(13).fillColor('#111827').text(bill.holderName ?? '—', 50, 135)
    doc.fontSize(9).fillColor('#6b7280').text(
      [
        bill.holderTaxId ? `CPF/CNPJ: ${bill.holderTaxId}` : null,
        bill.supplyAddress,
        bill.supplyCity && bill.supplyState ? `${bill.supplyCity}/${bill.supplyState}` : null,
      ].filter(Boolean).join(' · '),
      50, 152, { width: 495 }
    )

    doc.moveDown(2)
    const yTop = doc.y

    // Grade: UC / Distribuidora / Competência
    doc.fontSize(8).fillColor('#6b7280').text('UNIDADE CONSUMIDORA', 50, yTop)
    doc.fontSize(11).fillColor('#111827').text(bill.consumerUnitCode ?? '—', 50, yTop + 12)

    doc.fontSize(8).fillColor('#6b7280').text('DISTRIBUIDORA', 220, yTop)
    doc.fontSize(11).fillColor('#111827').text(bill.utilityName ?? '—', 220, yTop + 12)
    if (bill.utilityCnpj) {
      doc.fontSize(8).fillColor('#9ca3af').text(`CNPJ ${bill.utilityCnpj}`, 220, yTop + 28)
    }

    doc.fontSize(8).fillColor('#6b7280').text('COMPETÊNCIA', 400, yTop)
    doc.fontSize(11).fillColor('#111827').text(formatMonthYear(bill.referenceMonth, bill.referenceYear), 400, yTop + 12)
    if (bill.totalAmount) {
      doc.fontSize(8).fillColor('#9ca3af').text(`Total cobrado: ${formatCurrency(bill.totalAmount)}`, 400, yTop + 28)
    }

    doc.moveDown(3)

    // ============ RESUMO EXECUTIVO ============
    doc.rect(50, doc.y, 495, 1).fill('#e5e7eb')
    doc.moveDown(0.8)
    doc.fillColor('#111827').fontSize(16).text('Resumo executivo', 50, doc.y)
    doc.moveDown(0.5)

    const overcharge = report.totalMonthlyOvercharge
    const yearly = report.totalYearlyProjection

    if (overcharge > 0) {
      const boxY = doc.y
      doc.rect(50, boxY, 495, 70).fillAndStroke('#fef2f2', '#fecaca')
      doc.fillColor(COLOR_CRITICAL).fontSize(22).text(
        `${formatCurrency(overcharge)}/mês`,
        65, boxY + 10, { width: 465 }
      )
      doc.fillColor('#7f1d1d').fontSize(11).text(
        `Projeção anual: ${formatCurrency(yearly)} em cobranças potencialmente recuperáveis.`,
        65, boxY + 42, { width: 465 }
      )
      doc.y = boxY + 80
    } else {
      const boxY = doc.y
      doc.rect(50, boxY, 495, 50).fillAndStroke('#f0fdf4', '#bbf7d0')
      doc.fillColor('#15803d').fontSize(13).text(
        '✓ Nenhuma cobrança indevida identificada.',
        65, boxY + 12, { width: 465 }
      )
      doc.fillColor('#166534').fontSize(10).text(
        'Os tributos foram aplicados em conformidade com a LC 194/2022 e o Tema 176 do STF.',
        65, boxY + 32, { width: 465 }
      )
      doc.y = boxY + 60
    }

    doc.moveDown(1)
    doc.fillColor('#6b7280').fontSize(10).text(
      `Auditoria baseada em ${report.findings.length} regra${report.findings.length > 1 ? 's' : ''} de verificação. ` +
      `Base legal: LC 194/2022 (ICMS), STF Tema 176 (RE 714.139), Lei 14.300/2022 (marco da GD), STF Tema 745 (PIS/COFINS).`,
      50, doc.y, { width: 495 }
    )

    doc.moveDown(1.5)

    // ============ DETALHAMENTO POR REGRA ============
    doc.rect(50, doc.y, 495, 1).fill('#e5e7eb')
    doc.moveDown(0.8)
    doc.fillColor('#111827').fontSize(16).text('Achados e base jurídica', 50, doc.y)
    doc.moveDown(0.5)

    // Filtra só findings com status relevante
    const relevantFindings = report.findings.filter(
      (f) => f.status === 'OVERCHARGE_DETECTED' || f.status === 'OK'
    )

    for (let i = 0; i < relevantFindings.length; i++) {
      const f = relevantFindings[i]

      if (doc.y > 700) doc.addPage()

      const isOvercharge = f.status === 'OVERCHARGE_DETECTED'
      const color = f.severity === 'CRITICAL' ? COLOR_CRITICAL
                  : f.severity === 'WARNING' ? COLOR_WARNING
                  : '#3b82f6'
      const bgColor = f.severity === 'CRITICAL' ? '#fef2f2'
                    : f.severity === 'WARNING' ? '#fffbeb'
                    : '#eff6ff'

      // Marca lateral colorida
      const findingStartY = doc.y
      doc.rect(50, findingStartY, 4, 1).fill(color)  // placeholder, ajustado depois

      // Título
      doc.fillColor('#111827').fontSize(13).text(
        `${i + 1}. ${f.ruleName}`,
        60, findingStartY, { width: 485 }
      )

      // Badge de status
      const badgeText = isOvercharge
        ? (f.severity === 'CRITICAL' ? 'COBRANÇA INDEVIDA — CRÍTICO'
          : f.severity === 'WARNING' ? 'COBRANÇA INDEVIDA — ATENÇÃO'
          : 'INFORMATIVO')
        : 'CONFORME'
      const badgeColor = isOvercharge ? color : '#15803d'
      const badgeBg = isOvercharge ? bgColor : '#f0fdf4'
      doc.fontSize(8).fillColor(badgeColor).text(badgeText, 60, doc.y + 4)

      doc.moveDown(0.5)

      // Impacto financeiro
      if (isOvercharge && f.monthlyOverchargeAmount > 0) {
        doc.fillColor(color).fontSize(11).text(
          `Impacto estimado: ${formatCurrency(f.monthlyOverchargeAmount)}/mês · ${formatCurrency(f.yearlyProjection)}/ano`,
          60, doc.y, { width: 485 }
        )
        doc.moveDown(0.3)
      }

      // Explicação
      doc.fillColor('#374151').fontSize(10).text(f.explanation, 60, doc.y, { width: 485, align: 'justify' })
      doc.moveDown(0.5)

      // Evidências
      if (f.evidence.length > 0) {
        doc.fillColor('#6b7280').fontSize(9).text('Evidências extraídas da sua conta:', 60, doc.y)
        doc.moveDown(0.2)
        for (const e of f.evidence) {
          const sign = e.value >= 0 ? '' : '−'
          const absValue = Math.abs(e.value)
          const valueStr = absValue >= 1000
            ? formatCurrency(absValue)
            : absValue < 10 && e.field === 'icmsRate'
              ? `${(absValue * 100).toFixed(1)}%`
              : absValue.toFixed(2)

          doc.fontSize(9).fillColor('#374151').text(
            `  • ${e.lineDescription}: ${sign}${valueStr}`,
            60, doc.y, { width: 485 }
          )
          if (e.note) {
            doc.fontSize(8).fillColor('#9ca3af').text(`    ${e.note}`, 60, doc.y, { width: 485 })
          }
        }
        doc.moveDown(0.5)
      }

      // Base jurídica
      if (f.legalBasis.length > 0) {
        doc.fillColor('#6b7280').fontSize(9).text('Base jurídica:', 60, doc.y)
        for (const law of f.legalBasis) {
          doc.fontSize(9).fillColor('#374151').text(`  • ${law}`, 60, doc.y, { width: 485 })
        }
      }

      // Barra lateral colorida (desenha agora que sabemos a altura total)
      const findingEndY = doc.y
      doc.rect(50, findingStartY, 4, findingEndY - findingStartY).fill(color)

      doc.moveDown(1.2)
    }

    // ============ DISCLAIMER ============
    if (doc.y > 680) doc.addPage()
    doc.rect(50, doc.y, 495, 1).fill('#e5e7eb')
    doc.moveDown(0.8)
    doc.fillColor('#111827').fontSize(12).text('Importante', 50, doc.y)
    doc.moveDown(0.3)
    doc.fillColor('#6b7280').fontSize(9).text(
      'Este relatório é uma análise automatizada gerada por IA com base nos dados extraídos da conta de energia enviada. ' +
      'Os valores apresentados são estimativas baseadas na jurisprudência e legislação vigentes. ' +
      'Para providências administrativas (pedido de revisão junto à distribuidora) ou judiciais (ação de repetição de indébito), ' +
      'consulte um advogado tributarista. A Marsh Consultoria / Energia360 não presta assessoria jurídica nem ' +
      'se responsabiliza por valores que venham a ser efetivamente recuperados, que dependem do mérito de cada caso ' +
      'e do trâmite procedimental escolhido pelo cliente.',
      50, doc.y, { width: 495, align: 'justify' }
    )

    doc.moveDown(1.5)
    doc.fillColor('#9ca3af').fontSize(8).text(
      `Gerado em ${new Date().toLocaleString('pt-BR')} — Energia360 · marsh-consultoria.com.br`,
      50, doc.y, { width: 495, align: 'center' }
    )

    doc.end()
  })
}
