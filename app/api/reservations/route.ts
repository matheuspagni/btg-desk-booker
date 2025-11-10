import { NextRequest, NextResponse } from 'next/server'
import { query, transaction } from '@/lib/db'
import { handleMapContextError, requireMapId } from '@/lib/map-context'

type ReservationRow = {
  id: string
  desk_id: string
  date: string
  note: string | null
  is_recurring: boolean
  recurring_days: number[] | null
  created_at: string
}

export async function GET(request: NextRequest) {
  try {
    const mapId = requireMapId(request)
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    let sql = `SELECT r.id,
                      r.desk_id,
                      r.date,
                      r.note,
                      r.is_recurring,
                      r.recurring_days,
                      r.created_at
               FROM reservations r
               INNER JOIN desks d ON d.id = r.desk_id
               WHERE d.map_id = $1`
    const params: any[] = []
    const conditions: string[] = []

    params.push(mapId)

    if (id) {
      conditions.push(`r.id = $${params.length + 1}`)
      params.push(id)
    }

    if (startDate) {
      conditions.push(`r.date >= $${params.length + 1}`)
      params.push(startDate)
    }

    if (endDate) {
      conditions.push(`r.date <= $${params.length + 1}`)
      params.push(endDate)
    }

    if (conditions.length > 0) {
      sql += ` AND ${conditions.join(' AND ')}`
    }

    sql += ` ORDER BY r.date ASC`

    const result = await query<ReservationRow>(sql, params)

    if (id) {
      return NextResponse.json(result.rows[0] ?? null)
    }

    return NextResponse.json(result.rows)
  } catch (error) {
    const handled = handleMapContextError(error)
    if (handled) return handled

    console.error('Error fetching reservations:', error)
    return NextResponse.json({ error: 'Failed to fetch reservations' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const mapId = requireMapId(request)
    const body = await request.json()
    const deskId = body.desk_id
    const date = body.date
    const note = typeof body.note === 'string' ? body.note.trim() : null
    const isRecurring = Boolean(body.is_recurring)
    const recurringDays = Array.isArray(body.recurring_days)
      ? body.recurring_days.filter((day: any) => Number.isInteger(day))
      : null

    if (!deskId || !date) {
      return NextResponse.json(
        { error: 'desk_id and date are required' },
        { status: 400 }
      )
    }

    const deskResult = await query<{ id: string }>(
      `SELECT id FROM desks WHERE id = $1 AND map_id = $2`,
      [deskId, mapId]
    )

    if (deskResult.rowCount === 0) {
      return NextResponse.json({ error: 'Desk not found in this map' }, { status: 404 })
    }

    const inserted = await transaction(async (client) => {
      if (!isRecurring) {
        const conflict = await client.query(
          `SELECT id, note
           FROM reservations
           WHERE desk_id = $1
             AND date = $2
             AND is_recurring = false
           LIMIT 1`,
          [deskId, date]
        )

        if ((conflict.rowCount ?? 0) > 0) {
          return {
            conflict: true,
            reservation: conflict.rows[0],
          }
        }
      }

      const result = await client.query<ReservationRow>(
        `INSERT INTO reservations (desk_id, date, note, is_recurring, recurring_days)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, desk_id, date, note, is_recurring, recurring_days, created_at`,
        [deskId, date, note, isRecurring, recurringDays]
      )

      return { conflict: false, reservation: result.rows[0] }
    })

    if (inserted.conflict) {
      return NextResponse.json(
        {
          error: 'CONFLICT',
          message: 'Já existe uma reserva para esta mesa nesta data',
          existingReservation: inserted.reservation,
        },
        { status: 409 }
      )
    }

    return NextResponse.json(inserted.reservation)
  } catch (error) {
    const handled = handleMapContextError(error)
    if (handled) return handled

    console.error('Error creating reservation:', error)
    return NextResponse.json({ error: 'Failed to create reservation' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const mapId = requireMapId(request)
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const result = await query(
      `DELETE FROM reservations r
       USING desks d
       WHERE r.id = $1
         AND d.id = r.desk_id
         AND d.map_id = $2
       RETURNING r.id`,
      [id, mapId]
    )

    if ((result.rowCount ?? 0) === 0) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const handled = handleMapContextError(error)
    if (handled) return handled

    console.error('Error deleting reservation:', error)
    return NextResponse.json({ error: 'Failed to delete reservation' }, { status: 500 })
  }
}
