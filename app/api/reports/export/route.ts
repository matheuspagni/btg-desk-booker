export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getBrazilToday } from '@/lib/date-utils'
import { query } from '@/lib/db'

function formatDateForFilename(dateStr: string): string {
  const [year, month, day] = dateStr.split('-')
  return `${day}${month}${year}`
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (type !== 'reservations') {
      return NextResponse.json({ error: 'Invalid export type' }, { status: 400 })
    }

    const params: any[] = []
    let whereClause = ''

    if (startDate && endDate) {
      params.push(startDate, endDate)
      whereClause = 'WHERE r.date BETWEEN $1 AND $2'
    } else if (startDate) {
      params.push(startDate)
      whereClause = 'WHERE r.date >= $1'
    } else if (endDate) {
      params.push(endDate)
      whereClause = 'WHERE r.date <= $1'
    }

    const reservationsResult = await query(
      `SELECT r.id,
              r.date,
              r.note,
              r.is_recurring,
              d.code AS desk_code,
              d.area_id,
              a.name AS area_name
       FROM reservations r
       LEFT JOIN desks d ON d.id = r.desk_id
       LEFT JOIN areas a ON a.id = d.area_id
       ${whereClause}
       ORDER BY r.date ASC, desk_code ASC` as const,
      params
    )

    const reservations = reservationsResult.rows

    const escapeCsvField = (field: string) => {
      if (field.includes(';') || field.includes('"') || field.includes('\n') || field.includes('\r')) {
        return `"${field.replace(/"/g, '""')}"`
      }
      return field
    }

    const csvHeaders = 'Data;Dia da Semana;Mesa;Área;Nome;Tipo\r\n'

    const csvRows = reservations.map((reservation: any) => {
      const [year, month, day] = reservation.date.split('-').map(Number)
      const dateObj = new Date(year, month - 1, day)

      const date = dateObj.toLocaleDateString('pt-BR')
      const rawWeekday = dateObj
        .toLocaleDateString('pt-BR', { weekday: 'long' })
        .replace('-feira', '')
        .trim()
      const dayOfWeek = rawWeekday.charAt(0).toUpperCase() + rawWeekday.slice(1)
      const deskCode = reservation.desk_code || 'N/A'
      const areaName = reservation.area_id ? reservation.area_name || 'N/A' : 'Sem Área'
      const name = reservation.note || 'N/A'
      const typeLabel = reservation.is_recurring ? 'Recorrente' : 'Individual'

      return [date, dayOfWeek, deskCode, areaName, name, typeLabel]
        .map((field) => escapeCsvField(String(field)))
        .join(';')
    })

    const csvContent = csvHeaders + csvRows.join('\r\n')

    const filename = startDate && endDate
      ? `reservas-${formatDateForFilename(startDate)}-${formatDateForFilename(endDate)}.csv`
      : `reservas-${formatDateForFilename(getBrazilToday())}.csv`

    const csvWithBOM = '\uFEFF' + csvContent

    return new NextResponse(csvWithBOM, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    })
  } catch (error) {
    console.error('Error exporting data:', error)
    return NextResponse.json(
      {
        error: 'Failed to export data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
