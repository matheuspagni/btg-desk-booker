import { NextRequest, NextResponse } from 'next/server'
import { getTodayForQuery } from '@/lib/date-utils'
import { query } from '@/lib/db'
import { handleMapContextError, requireMapId } from '@/lib/map-context'

export async function GET(request: NextRequest) {
  try {
    const mapId = requireMapId(request)
    const result = await query(
      `SELECT id, area_id, code, x, y, width_units, height_units, is_active, is_blocked, created_at, map_id
       FROM desks
       WHERE map_id = $1
       ORDER BY code ASC`,
      [mapId]
    )
    return NextResponse.json(result.rows)
  } catch (error) {
    const handled = handleMapContextError(error)
    if (handled) return handled

    console.error('Error fetching desks:', error)
    return NextResponse.json({ error: 'Failed to fetch desks' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const mapId = requireMapId(request)
    const body = await request.json()
    const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : ''
    const posX = body.x
    const posY = body.y

    if (!code) {
      return NextResponse.json(
        { error: 'CODE_REQUIRED', message: 'Código da mesa é obrigatório' },
        { status: 400 }
      )
    }

    if (typeof posX !== 'number' || typeof posY !== 'number') {
      return NextResponse.json(
        { error: 'POSITION_REQUIRED', message: 'Coordenadas x e y são obrigatórias' },
        { status: 400 }
      )
    }

    const existing = await query<{ id: string }>(
      `SELECT id FROM desks WHERE map_id = $1 AND UPPER(code) = $2 AND is_active = true LIMIT 1`,
      [mapId, code]
    )

    if ((existing.rowCount ?? 0) > 0) {
      return NextResponse.json(
        { error: 'CODE_EXISTS', message: `Já existe uma mesa com o código "${code}"` },
        { status: 409 }
      )
    }

    const widthUnits =
      typeof body.width_units === 'number' && !Number.isNaN(body.width_units)
        ? body.width_units
        : 3
    const heightUnits =
      typeof body.height_units === 'number' && !Number.isNaN(body.height_units)
        ? body.height_units
        : 2

    const isActive = body.is_active !== undefined ? Boolean(body.is_active) : true
    const isBlocked = body.is_blocked !== undefined ? Boolean(body.is_blocked) : false
    const areaId =
      body.area_id === null || body.area_id === undefined || body.area_id === ''
        ? null
        : body.area_id

    const inserted = await query(
      `INSERT INTO desks (code, area_id, x, y, width_units, height_units, is_active, is_blocked, map_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, area_id, code, x, y, width_units, height_units, is_active, is_blocked, created_at, map_id`,
      [code, areaId, posX, posY, widthUnits, heightUnits, isActive, isBlocked, mapId]
    )

    return NextResponse.json(inserted.rows[0] ?? {})
  } catch (error) {
    const handled = handleMapContextError(error)
    if (handled) return handled

    console.error('Error creating desk:', error)
    return NextResponse.json({ error: 'Failed to create desk' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const mapId = requireMapId(request)
    const { searchParams } = new URL(request.url)
    const deskId = searchParams.get('id')

    if (!deskId) {
      return NextResponse.json({ error: 'Desk ID is required' }, { status: 400 })
    }

    const deskExists = await query<{ id: string }>(
      `SELECT id FROM desks WHERE id = $1 AND map_id = $2`,
      [deskId, mapId]
    )

    if (deskExists.rowCount === 0) {
      return NextResponse.json({ error: 'Desk not found' }, { status: 404 })
    }

    const today = getTodayForQuery()
    const reservations = await query<{
      id: string
      date: string
      note: string | null
    }>(
      `SELECT id, date, note
       FROM reservations
       WHERE desk_id = $1
         AND date >= $2
       ORDER BY date ASC`,
      [deskId, today]
    )

    if ((reservations.rowCount ?? 0) > 0) {
      return NextResponse.json(
        {
          error: 'HAS_RESERVATIONS',
          message: 'Não é possível excluir esta mesa pois existem reservas futuras associadas',
          reservations: reservations.rows,
        },
        { status: 409 }
      )
    }

    const deleted = await query(
      `DELETE FROM desks
       WHERE id = $1 AND map_id = $2
       RETURNING id`,
      [deskId, mapId]
    )

    if ((deleted.rowCount ?? 0) === 0) {
      return NextResponse.json({ error: 'Desk not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const handled = handleMapContextError(error)
    if (handled) return handled

    console.error('Error deleting desk:', error)
    return NextResponse.json({ error: 'Failed to delete desk' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const mapId = requireMapId(request)
    const { searchParams } = new URL(request.url)
    const deskId = searchParams.get('id')

    if (!deskId) {
      return NextResponse.json({ error: 'Desk ID is required' }, { status: 400 })
    }

    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
    }

    const currentDeskResult = await query<{
      id: string
      code: string
      area_id: string | null
      is_blocked: boolean
    }>(
      `SELECT id, code, area_id, is_blocked
       FROM desks
       WHERE id = $1 AND map_id = $2`,
      [deskId, mapId]
    )

    if ((currentDeskResult.rowCount ?? 0) === 0) {
      return NextResponse.json({ error: 'Desk not found' }, { status: 404 })
    }

    const currentDesk = currentDeskResult.rows[0]
    const updates: string[] = []
    const values: any[] = []

    if (body.code !== undefined) {
      if (typeof body.code !== 'string' || !body.code.trim()) {
        return NextResponse.json(
          { error: 'CODE_REQUIRED', message: 'Código da mesa é obrigatório' },
          { status: 400 }
        )
      }

      const nextCode = body.code.trim().toUpperCase()
      if (nextCode !== currentDesk.code) {
        const existing = await query<{ id: string }>(
          `SELECT id FROM desks WHERE map_id = $1 AND UPPER(code) = $2 AND id <> $3 AND is_active = true LIMIT 1`,
          [mapId, nextCode, deskId]
        )

        if ((existing.rowCount ?? 0) > 0) {
          return NextResponse.json(
            { error: 'CODE_EXISTS', message: `Já existe uma mesa com o código "${nextCode}"` },
            { status: 409 }
          )
        }
      }
      updates.push(`code = $${updates.length + 1}`)
      values.push(nextCode)
    }

    if (body.area_id !== undefined) {
      const nextArea =
        body.area_id === null || body.area_id === '' ? null : (body.area_id as string)
      updates.push(`area_id = $${updates.length + 1}`)
      values.push(nextArea)
    }

    if (body.x !== undefined) {
      if (typeof body.x !== 'number') {
        return NextResponse.json({ error: 'x must be a number' }, { status: 400 })
      }
      updates.push(`x = $${updates.length + 1}`)
      values.push(body.x)
    }

    if (body.y !== undefined) {
      if (typeof body.y !== 'number') {
        return NextResponse.json({ error: 'y must be a number' }, { status: 400 })
      }
      updates.push(`y = $${updates.length + 1}`)
      values.push(body.y)
    }

    if (body.width_units !== undefined) {
      if (typeof body.width_units !== 'number' || Number.isNaN(body.width_units)) {
        return NextResponse.json({ error: 'width_units must be a number' }, { status: 400 })
      }
      updates.push(`width_units = $${updates.length + 1}`)
      values.push(body.width_units)
    }

    if (body.height_units !== undefined) {
      if (typeof body.height_units !== 'number' || Number.isNaN(body.height_units)) {
        return NextResponse.json({ error: 'height_units must be a number' }, { status: 400 })
      }
      updates.push(`height_units = $${updates.length + 1}`)
      values.push(body.height_units)
    }

    if (body.is_active !== undefined) {
      updates.push(`is_active = $${updates.length + 1}`)
      values.push(Boolean(body.is_active))
    }

    if (body.is_blocked !== undefined) {
      const nextIsBlocked = Boolean(body.is_blocked)
      if (nextIsBlocked && !currentDesk.is_blocked) {
        const today = getTodayForQuery()
        const reservations = await query(
          `SELECT id, date, note, is_recurring, recurring_days
           FROM reservations
           WHERE desk_id = $1
             AND date >= $2
           ORDER BY date ASC`,
          [deskId, today]
        )

        if ((reservations.rowCount ?? 0) > 0) {
          return NextResponse.json(
            {
              error: 'HAS_RESERVATIONS',
              message:
                'Não é possível bloquear esta mesa pois existem reservas futuras associadas',
              reservations: reservations.rows,
            },
            { status: 409 }
          )
        }
      }

      updates.push(`is_blocked = $${updates.length + 1}`)
      values.push(nextIsBlocked)
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    values.push(deskId, mapId)
    const updated = await query(
      `UPDATE desks
       SET ${updates.join(', ')}
       WHERE id = $${updates.length + 1} AND map_id = $${updates.length + 2}
       RETURNING id, area_id, code, x, y, width_units, height_units, is_active, is_blocked, created_at, map_id`,
      values
    )

    if ((updated.rowCount ?? 0) === 0) {
      return NextResponse.json({ error: 'Desk not found' }, { status: 404 })
    }

    return NextResponse.json(updated.rows[0])
  } catch (error: any) {
    const handled = handleMapContextError(error)
    if (handled) return handled

    const message =
      typeof error?.message === 'string'
        ? error.message.slice(0, 200)
        : 'Failed to update desk'
    console.error('Error updating desk:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
