import { NextRequest, NextResponse } from 'next/server'
import { query, transaction } from '@/lib/db'

export async function GET() {
  return NextResponse.json({
    message: 'Bulk reservations API is working',
    methods: ['POST', 'DELETE'],
    timestamp: new Date().toISOString(),
  })
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const idsParam = searchParams.get('ids')

    if (!idsParam) {
      return NextResponse.json({ error: 'IDs parameter is required' }, { status: 400 })
    }

    const ids = idsParam
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)

    if (ids.length === 0) {
      return NextResponse.json({ error: 'No valid IDs provided' }, { status: 400 })
    }

    const existing = await query<{ id: string }>(
      `SELECT id
       FROM reservations
       WHERE id = ANY($1::uuid[])`,
      [ids]
    )

    if ((existing.rowCount ?? 0) === 0) {
      return NextResponse.json({ error: 'No reservations found to delete' }, { status: 404 })
    }

    const existingIds = existing.rows.map((row: { id: string }) => row.id)
    const notFoundIds = ids.filter((id) => !existingIds.includes(id))

    await query(
      `DELETE FROM reservations
       WHERE id = ANY($1::uuid[])`,
      [existingIds]
    )

    return NextResponse.json({
      success: true,
      count: existingIds.length,
      deletedIds: existingIds,
      notFoundIds,
    })
  } catch (error) {
    console.error('Erro na API de deleção em lote:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

type BulkReservationInput = {
  desk_id: string
  date: string
  note?: string | null
  is_recurring?: boolean
  recurring_days?: number[] | null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const reservations: BulkReservationInput[] = body?.reservations

    if (!Array.isArray(reservations) || reservations.length === 0) {
      return NextResponse.json({ error: 'Reservations array is required' }, { status: 400 })
    }

    for (const reservation of reservations) {
      if (!reservation?.desk_id || !reservation?.date) {
        return NextResponse.json(
          { error: 'Each reservation must have desk_id and date' },
          { status: 400 }
        )
      }
    }

    const deskIds = Array.from(new Set(reservations.map((r: BulkReservationInput) => r.desk_id)))
    const dates = Array.from(new Set(reservations.map((r: BulkReservationInput) => r.date)))

    const existingReservations = await query<{
      id: string
      desk_id: string
      date: string
      note: string | null
      is_recurring: boolean
    }>(
      `SELECT id, desk_id, date, note, is_recurring
       FROM reservations
       WHERE desk_id = ANY($1::uuid[])
         AND date = ANY($2::date[])`,
      [deskIds, dates]
    )

    const conflicts: Array<{
      date: string
      desk_id: string
      existingReservation: {
        id: string
        note: string | null
        is_recurring: boolean
      }
    }> = []

    const existingByKey = new Map<string, { id: string; note: string | null; is_recurring: boolean }>()
    for (const reservation of existingReservations.rows) {
      existingByKey.set(
        `${reservation.desk_id}_${reservation.date}`,
        {
          id: reservation.id,
          note: reservation.note,
          is_recurring: reservation.is_recurring,
        }
      )
    }

    for (const reservation of reservations) {
      const conflict = existingByKey.get(`${reservation.desk_id}_${reservation.date}`)
      if (conflict) {
        conflicts.push({
          date: reservation.date,
          desk_id: reservation.desk_id,
          existingReservation: conflict,
        })
      }
    }

    if (conflicts.length > 0) {
      return NextResponse.json(
        {
          error: 'CONFLICT',
          message: 'Existem conflitos com reservas já existentes',
          conflicts,
        },
        { status: 409 }
      )
    }

    const inserted = await transaction(async (client) => {
      const values: any[] = []
      const placeholders: string[] = []

      reservations.forEach((reservation, index) => {
        const baseIndex = index * 5
        values.push(
          reservation.desk_id,
          reservation.date,
          reservation.note ? reservation.note.trim() : null,
          reservation.is_recurring ?? false,
          reservation.recurring_days ?? null
        )
        placeholders.push(
          `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5})`
        )
      })

      const result = await client.query(
        `INSERT INTO reservations (desk_id, date, note, is_recurring, recurring_days)
         VALUES ${placeholders.join(', ')}
         RETURNING id`,
        values
      )

      return result.rows
    })

    return NextResponse.json({
      success: true,
      count: inserted.length,
      createdIds: inserted.map((row: { id: string }) => row.id),
    })
  } catch (error) {
    console.error('Erro na API de criação em lote:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}