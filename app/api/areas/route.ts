import { NextRequest, NextResponse } from 'next/server'
import { query, transaction } from '@/lib/db'
import { handleMapContextError, requireMapId } from '@/lib/map-context'

const COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/

export async function GET(request: NextRequest) {
  try {
    const mapId = requireMapId(request)

    const result = await query(
      `SELECT id, name, color, created_at, map_id
       FROM areas
       WHERE map_id = $1
       ORDER BY created_at ASC`,
      [mapId]
    )

    return NextResponse.json(result.rows)
  } catch (error) {
    const handled = handleMapContextError(error)
    if (handled) return handled

    console.error('Error fetching areas:', error)
    return NextResponse.json({ error: 'Failed to fetch areas' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const mapId = requireMapId(request)

    const body = await request.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const color = typeof body.color === 'string' ? body.color : ''

    if (!name || !color) {
      return NextResponse.json({ error: 'Name and color are required' }, { status: 400 })
    }

    if (!COLOR_REGEX.test(color)) {
      return NextResponse.json(
        { error: 'Invalid color format. Use #RRGGBB' },
        { status: 400 }
      )
    }

    const existing = await query<{ id: string }>(
      `SELECT id FROM areas WHERE map_id = $1 AND LOWER(name) = LOWER($2) LIMIT 1`,
      [mapId, name]
    )

    if ((existing.rowCount ?? 0) > 0) {
      return NextResponse.json(
        {
          error: 'NAME_EXISTS',
          message: `Já existe uma área com o nome "${name}"`,
        },
        { status: 409 }
      )
    }

    const inserted = await query(
      `INSERT INTO areas (name, color, map_id)
       VALUES ($1, $2, $3)
       RETURNING id, name, color, created_at, map_id`,
      [name, color, mapId]
    )

    return NextResponse.json(inserted.rows[0], { status: 201 })
  } catch (error) {
    const handled = handleMapContextError(error)
    if (handled) return handled

    console.error('Error creating area:', error)
    return NextResponse.json({ error: 'Failed to create area' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const mapId = requireMapId(request)

    const { searchParams } = new URL(request.url)
    const areaId = searchParams.get('id')

    if (!areaId) {
      return NextResponse.json({ error: 'Area ID is required' }, { status: 400 })
    }

    const area = await query<{ id: string }>(
      `SELECT id FROM areas WHERE id = $1 AND map_id = $2`,
      [areaId, mapId]
    )

    if (area.rowCount === 0) {
      return NextResponse.json({ error: 'Area not found' }, { status: 404 })
    }

    await transaction(async (client) => {
      await client.query(
        `UPDATE desks
         SET area_id = NULL
         WHERE area_id = $1`,
        [areaId]
      )

      await client.query(`DELETE FROM areas WHERE id = $1 AND map_id = $2`, [areaId, mapId])
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const handled = handleMapContextError(error)
    if (handled) return handled

    console.error('Error deleting area:', error)
    return NextResponse.json({ error: 'Failed to delete area' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const mapId = requireMapId(request)

    const { searchParams } = new URL(request.url)
    const areaId = searchParams.get('id')

    if (!areaId) {
      return NextResponse.json({ error: 'Area ID is required' }, { status: 400 })
    }

    const body = await request.json()
    const updates: string[] = []
    const values: any[] = []

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || !body.name.trim()) {
        return NextResponse.json({ error: 'Name must be a non-empty string' }, { status: 400 })
      }

      const trimmedName = body.name.trim()
      const existing = await query<{ id: string }>(
        `SELECT id FROM areas WHERE map_id = $1 AND LOWER(name) = LOWER($2) AND id <> $3 LIMIT 1`,
        [mapId, trimmedName, areaId]
      )

      if ((existing.rowCount ?? 0) > 0) {
        return NextResponse.json(
          {
            error: 'NAME_EXISTS',
            message: `Já existe uma área com o nome "${trimmedName}"`,
          },
          { status: 409 }
        )
      }

      updates.push(`name = $${updates.length + 1}`)
      values.push(trimmedName)
    }

    if (body.color !== undefined) {
      if (typeof body.color !== 'string' || !COLOR_REGEX.test(body.color)) {
        return NextResponse.json(
          { error: 'Invalid color format. Use #RRGGBB' },
          { status: 400 }
        )
      }
      updates.push(`color = $${updates.length + 1}`)
      values.push(body.color)
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    values.push(areaId, mapId)
    const updated = await query(
      `UPDATE areas
       SET ${updates.join(', ')}
       WHERE id = $${updates.length + 1} AND map_id = $${updates.length + 2}
       RETURNING id, name, color, created_at, map_id`,
      values
    )

    if ((updated.rowCount ?? 0) === 0) {
      return NextResponse.json({ error: 'Area not found' }, { status: 404 })
    }

    return NextResponse.json(updated.rows[0])
  } catch (error) {
    const handled = handleMapContextError(error)
    if (handled) return handled

    console.error('Error updating area:', error)
    return NextResponse.json({ error: 'Failed to update area' }, { status: 500 })
  }
}
