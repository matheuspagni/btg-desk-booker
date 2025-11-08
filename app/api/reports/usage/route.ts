export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const areasResult = await query<{ id: string; name: string; color: string }>(
      `SELECT id, name, color
       FROM areas
       ORDER BY name ASC`
    )

    const desksResult = await query<{ id: string; area_id: string | null }>(
      `SELECT id, area_id
       FROM desks
       WHERE is_active = true`
    )

    const reservationsParams: any[] = []
    let reservationsWhere = ''

    if (startDate && endDate) {
      reservationsParams.push(startDate, endDate)
      reservationsWhere = `WHERE date BETWEEN $1 AND $2`
    } else if (startDate) {
      reservationsParams.push(startDate)
      reservationsWhere = `WHERE date >= $1`
    } else if (endDate) {
      reservationsParams.push(endDate)
      reservationsWhere = `WHERE date <= $1`
    }

    const reservationsResult = await query<{ desk_id: string; date: string; is_recurring: boolean }>(
      `SELECT desk_id, date, is_recurring
       FROM reservations
       ${reservationsWhere}`,
      reservationsParams
    )

    const deskToArea = new Map<string, string | null>()
    const desksByArea = new Map<string, number>()

    desksResult.rows.forEach((desk: { id: string; area_id: string | null }) => {
      const areaKey = desk.area_id ?? 'sem-area'
      deskToArea.set(desk.id, desk.area_id)
      desksByArea.set(areaKey, (desksByArea.get(areaKey) ?? 0) + 1)
    })

    const reservationsByArea = new Map<string, any[]>()
    reservationsResult.rows.forEach((reservation: { desk_id: string; date: string; is_recurring: boolean }) => {
      const areaId = deskToArea.get(reservation.desk_id) ?? 'sem-area'
      if (!reservationsByArea.has(areaId)) {
        reservationsByArea.set(areaId, [])
      }
      reservationsByArea.get(areaId)!.push(reservation)
    })

    const computeUsagePercentage = (
      reservations: any[],
      totalDesks: number
    ): number => {
      if (totalDesks === 0) {
        return 0
      }

      if (startDate && endDate) {
        if (startDate === endDate) {
          const uniqueDesks = new Set(reservations.map((r) => r.desk_id)).size
          return Math.round((uniqueDesks / totalDesks) * 10000) / 100
        }

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
            const reservationsOnDay = reservations.filter((r) => r.date === dateStr)
            const uniqueDesks = new Set(reservationsOnDay.map((r) => r.desk_id)).size
            totalOccupiedDeskDays += uniqueDesks
          }
        }

        const totalAvailableDeskDays = totalDesks * totalWorkingDays
        return totalAvailableDeskDays > 0
          ? Math.round((totalOccupiedDeskDays / totalAvailableDeskDays) * 10000) / 100
          : 0
      }

      const uniqueDesks = new Set(reservations.map((r) => r.desk_id)).size
      return Math.round((uniqueDesks / totalDesks) * 10000) / 100
    }

    const usageByArea = areasResult.rows.map((area: { id: string; name: string; color: string }) => {
      const areaReservations = reservationsByArea.get(area.id) ?? []
      const totalDesksInArea = desksByArea.get(area.id) ?? 0

      const recurringReservations = areaReservations.filter((r) => r.is_recurring)
      const individualReservations = areaReservations.filter((r) => !r.is_recurring)

      const uniqueRecurringDesks = new Set(recurringReservations.map((r) => r.desk_id)).size
      const uniqueIndividualDesks = new Set(individualReservations.map((r) => r.desk_id)).size

      return {
        areaId: area.id,
        areaName: area.name,
        areaColor: area.color,
        totalDesks: totalDesksInArea,
        totalReservations: areaReservations.length,
        recurringReservations: uniqueRecurringDesks,
        individualReservations: uniqueIndividualDesks,
        usagePercentage: computeUsagePercentage(areaReservations, totalDesksInArea),
      }
    })

    const desksWithoutArea = desksByArea.get('sem-area') ?? 0
    if (desksWithoutArea > 0 || reservationsByArea.has('sem-area')) {
      const reservationsNoArea = reservationsByArea.get('sem-area') ?? []

      const recurringNoArea = reservationsNoArea.filter((r) => r.is_recurring)
      const individualNoArea = reservationsNoArea.filter((r) => !r.is_recurring)

      usageByArea.push({
        areaId: 'sem-area',
        areaName: 'Sem Área',
        areaColor: '#d1d5db',
        totalDesks: desksWithoutArea,
        totalReservations: reservationsNoArea.length,
        recurringReservations: new Set(recurringNoArea.map((r) => r.desk_id)).size,
        individualReservations: new Set(individualNoArea.map((r) => r.desk_id)).size,
        usagePercentage: computeUsagePercentage(reservationsNoArea, desksWithoutArea),
      })
    }

    const totalReservations = usageByArea.reduce(
      (sum: number, area: (typeof usageByArea)[number]) => sum + area.totalReservations,
      0
    )
    const totalRecurring = usageByArea.reduce(
      (sum: number, area: (typeof usageByArea)[number]) => sum + area.recurringReservations,
      0
    )
    const totalIndividual = usageByArea.reduce(
      (sum: number, area: (typeof usageByArea)[number]) => sum + area.individualReservations,
      0
    )

    return NextResponse.json({
      usageByArea,
      summary: {
        totalReservations,
        totalRecurring,
        totalIndividual,
        period: startDate && endDate ? { startDate, endDate } : null,
      },
    })
  } catch (error) {
    console.error('Error fetching usage data:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch usage data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
