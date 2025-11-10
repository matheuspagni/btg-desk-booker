export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getBrazilToday } from '@/lib/date-utils'
import { query } from '@/lib/db'
import { handleMapContextError, requireMapId } from '@/lib/map-context'

function formatDateForFilename(dateStr: string): string {
  const [year, month, day] = dateStr.split('-')
  return `${day}${month}${year}`
}

export async function GET(request: NextRequest) {
  try {
    const mapId = requireMapId(request)
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (type !== 'reservations') {
      return NextResponse.json({ error: 'Invalid export type' }, { status: 400 })
    }

    const params: any[] = [mapId]
    let whereClause = 'WHERE d.map_id = $1'

    if (startDate && endDate) {
      params.push(startDate, endDate)
      whereClause += ` AND r.date BETWEEN $${params.length - 1} AND $${params.length}`
    } else if (startDate) {
      params.push(startDate)
      whereClause += ` AND r.date >= $${params.length}`
    } else if (endDate) {
      params.push(endDate)
      whereClause += ` AND r.date <= $${params.length}`
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
    const handled = handleMapContextError(error)
    if (handled) return handled

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
