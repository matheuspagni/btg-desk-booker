import { NextRequest, NextResponse } from 'next/server'
import { query, transaction } from '@/lib/db'
import { handleMapContextError, requireMapId } from '@/lib/map-context'

export async function GET() {
  return NextResponse.json({
    message: 'Bulk reservations API is working',
    methods: ['POST', 'DELETE'],
    timestamp: new Date().toISOString(),
  })
}

export async function DELETE(request: NextRequest) {
  try {
    const mapId = requireMapId(request)
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
      `SELECT r.id
       FROM reservations r
       INNER JOIN desks d ON d.id = r.desk_id
       WHERE r.id = ANY($1::uuid[])
         AND d.map_id = $2`,
      [ids, mapId]
    )

    if ((existing.rowCount ?? 0) === 0) {
      return NextResponse.json({ error: 'No reservations found to delete' }, { status: 404 })
    }

    const existingIds = existing.rows.map((row: { id: string }) => row.id)
    const notFoundIds = ids.filter((id) => !existingIds.includes(id))

    await query(
      `DELETE FROM reservations r
       USING desks d
       WHERE r.id = ANY($1::uuid[])
         AND d.id = r.desk_id
         AND d.map_id = $2`,
      [existingIds, mapId]
    )

    return NextResponse.json({
      success: true,
      count: existingIds.length,
      deletedIds: existingIds,
      notFoundIds,
    })
  } catch (error) {
    const handled = handleMapContextError(error)
    if (handled) return handled

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
    const mapId = requireMapId(request)
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

    const deskValidation = await query<{ id: string }>(
      `SELECT id
       FROM desks
       WHERE id = ANY($1::uuid[])
         AND map_id = $2`,
      [deskIds, mapId]
    )

    if ((deskValidation.rowCount ?? 0) !== deskIds.length) {
      const foundIds = deskValidation.rows.map((row) => row.id)
      const missing = deskIds.filter((id) => !foundIds.includes(id))
      return NextResponse.json(
        {
          error: 'DESK_NOT_FOUND',
          message: 'Algumas mesas não pertencem a este mapa',
          missingDeskIds: missing,
        },
        { status: 404 }
      )
    }

    const existingReservations = await query<{
      id: string
      desk_id: string
      date: string
      note: string | null
      is_recurring: boolean
    }>(
      `SELECT r.id, r.desk_id, r.date, r.note, r.is_recurring
       FROM reservations r
       INNER JOIN desks d ON d.id = r.desk_id
       WHERE r.desk_id = ANY($1::uuid[])
         AND r.date = ANY($2::date[])
         AND d.map_id = $3`,
      [deskIds, dates, mapId]
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
    const handled = handleMapContextError(error)
    if (handled) return handled

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