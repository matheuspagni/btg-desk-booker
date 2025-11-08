import { NextRequest, NextResponse } from 'next/server'
import { query, transaction } from '@/lib/db'

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
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    let sql = `SELECT id, desk_id, date, note, is_recurring, recurring_days, created_at
               FROM reservations`
    const params: any[] = []
    const conditions: string[] = []

    if (id) {
      conditions.push(`id = $${params.length + 1}`)
      params.push(id)
    }

    if (startDate) {
      conditions.push(`date >= $${params.length + 1}`)
      params.push(startDate)
    }

    if (endDate) {
      conditions.push(`date <= $${params.length + 1}`)
      params.push(endDate)
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`
    }

    sql += ` ORDER BY date ASC`

    const result = await query<ReservationRow>(sql, params)

    if (id) {
      return NextResponse.json(result.rows[0] ?? null)
    }

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Error fetching reservations:', error)
    return NextResponse.json({ error: 'Failed to fetch reservations' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
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
    console.error('Error creating reservation:', error)
    return NextResponse.json({ error: 'Failed to create reservation' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const result = await query(
      `DELETE FROM reservations
       WHERE id = $1
       RETURNING id`,
      [id]
    )

    if ((result.rowCount ?? 0) === 0) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting reservation:', error)
    return NextResponse.json({ error: 'Failed to delete reservation' }, { status: 500 })
  }
}
