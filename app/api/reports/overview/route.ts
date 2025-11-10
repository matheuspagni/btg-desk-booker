export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getTodayForQuery } from '@/lib/date-utils'
import { query } from '@/lib/db'
import { handleMapContextError, requireMapId } from '@/lib/map-context'

export async function GET(request: NextRequest) {
  try {
    const mapId = requireMapId(request)
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const today = getTodayForQuery()

    const desksResult = await query<{ id: string }>(
      `SELECT id
       FROM desks
       WHERE is_active = true
         AND map_id = $1`,
      [mapId]
    )

    const reservationsParams: any[] = []
    let reservationsWhere = 'WHERE d.map_id = $1'
    reservationsParams.push(mapId)

    if (startDate && endDate) {
      reservationsParams.push(startDate, endDate)
      reservationsWhere += ` AND r.date BETWEEN $${reservationsParams.length - 1} AND $${reservationsParams.length}`
    } else if (startDate) {
      reservationsParams.push(startDate)
      reservationsWhere += ` AND r.date >= $${reservationsParams.length}`
    } else if (endDate) {
      reservationsParams.push(endDate)
      reservationsWhere += ` AND r.date <= $${reservationsParams.length}`
    }

    const reservationsResult = await query(
      `SELECT r.id, r.desk_id, r.date
       FROM reservations r
       INNER JOIN desks d ON d.id = r.desk_id
       ${reservationsWhere}`,
      reservationsParams
    )

    const todayReservationsResult = await query(
      `SELECT r.id, r.desk_id, r.date
       FROM reservations r
       INNER JOIN desks d ON d.id = r.desk_id
       WHERE r.date = $1
         AND d.map_id = $2`,
      [today, mapId]
    )

    const totalDesks = desksResult.rowCount ?? 0
    const totalReservations = reservationsResult.rowCount ?? 0
    const todayReservations = todayReservationsResult.rowCount ?? 0

    const occupancyRate =
      totalDesks > 0 ? Math.round((todayReservations / totalDesks) * 100) : 0

    let periodOccupancyRate = occupancyRate

    if (startDate && endDate) {
      if (startDate === endDate) {
        periodOccupancyRate =
          totalDesks > 0 ? Math.round((totalReservations / totalDesks) * 100) : 0
      } else {
        const parseDate = (dateStr: string) => {
          const [year, month, day] = dateStr.split('-').map(Number)
          return new Date(Date.UTC(year, month - 1, day, 3))
        }

        const startDateObj = parseDate(startDate)
        const endDateObj = parseDate(endDate)

        let totalWorkingDays = 0
        let totalOccupiedDeskDays = 0

        for (
          let current = new Date(startDateObj);
          current.getTime() <= endDateObj.getTime();
          current.setUTCDate(current.getUTCDate() + 1)
        ) {
          const dayOfWeek = current.getUTCDay()
          const dateStr = current.toISOString().split('T')[0]

          if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            totalWorkingDays++

            const reservationsOnDay = reservationsResult.rows.filter(
              (r: any) => r.date === dateStr
            )
            const uniqueDesks = new Set(reservationsOnDay.map((r: any) => r.desk_id)).size
            totalOccupiedDeskDays += uniqueDesks
          }
        }

        const totalAvailableDeskDays = totalDesks * totalWorkingDays
        periodOccupancyRate =
          totalAvailableDeskDays > 0
            ? Math.round((totalOccupiedDeskDays / totalAvailableDeskDays) * 10000) / 100
            : 0
      }
    }

    return NextResponse.json({
      totalDesks,
      totalReservations,
      todayReservations,
      occupancyRate,
      periodOccupancyRate,
      period: startDate && endDate ? { startDate, endDate } : null,
    })
  } catch (error) {
    const handled = handleMapContextError(error)
    if (handled) return handled

    console.error('Error fetching overview data:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch overview data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
