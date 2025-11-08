import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export type Chair = {
  id: string
  x: number
  y: number
  rotation: number
  is_active: boolean
  created_at?: string
}

const GRID_UNIT = 40

type DeskRow = {
  id: string
  x: number
  y: number
  width_units: number
  height_units: number
  is_active: boolean
}

export async function GET() {
  try {
    const result = await query<Chair>(
      `SELECT id, x, y, rotation, is_active, created_at
       FROM chairs
       WHERE is_active = true
       ORDER BY created_at ASC`
    )

    return NextResponse.json(result.rows)
  } catch (error: any) {
    console.error('Error fetching chairs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch chairs', message: error.message },
      { status: 500 }
    )
  }
}

function overlapsDesk(
  chairX: number,
  chairY: number,
  desks: DeskRow[]
): boolean {
  const chairCenterX = chairX + GRID_UNIT / 2
  const chairCenterY = chairY + GRID_UNIT / 2

  return desks.some((desk) => {
    if (!desk.is_active) {
      return false
    }
    const width = (desk.width_units ?? 3) * GRID_UNIT
    const height = (desk.height_units ?? 2) * GRID_UNIT

    return (
      chairCenterX >= desk.x &&
      chairCenterX <= desk.x + width &&
      chairCenterY >= desk.y &&
      chairCenterY <= desk.y + height
    )
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (typeof body.x !== 'number' || typeof body.y !== 'number') {
      return NextResponse.json(
        { error: 'x and y are required and must be numbers' },
        { status: 400 }
      )
    }

    const rotation =
      typeof body.rotation === 'number' && Number.isInteger(body.rotation)
        ? body.rotation
        : 0
    if (rotation < 0 || rotation > 3) {
      return NextResponse.json(
        { error: 'rotation must be between 0 and 3' },
        { status: 400 }
      )
    }

    const existingChairs = await query<{ id: string }>(
      `SELECT id
       FROM chairs
       WHERE x = $1
         AND y = $2
         AND is_active = true`,
      [body.x, body.y]
    )

    if ((existingChairs.rowCount ?? 0) > 0) {
      const conflictsOtherThanSelf = existingChairs.rows.some(
        (chair: { id: string }) => !body.id || chair.id !== body.id
      )

      if (conflictsOtherThanSelf) {
        return NextResponse.json(
          { error: 'OVERLAP', message: 'Já existe uma cadeira nesta posição' },
          { status: 409 }
        )
      }
    }

    const desks = await query<DeskRow>(
      `SELECT id, x, y, width_units, height_units, is_active
       FROM desks`
    )

    if (overlapsDesk(body.x, body.y, desks.rows)) {
      return NextResponse.json(
        {
          error: 'OVERLAP',
          message: 'Cadeira não pode ser posicionada sobre uma mesa',
        },
        { status: 409 }
      )
    }

    if (body.id) {
      const updated = await query(
        `UPDATE chairs
         SET x = $1,
             y = $2,
             rotation = $3
         WHERE id = $4
           AND is_active = true
         RETURNING id, x, y, rotation, is_active, created_at`,
        [body.x, body.y, rotation, body.id]
      )

      if ((updated.rowCount ?? 0) === 0) {
        return NextResponse.json({ error: 'Chair not found' }, { status: 404 })
      }

      return NextResponse.json(updated.rows[0])
    }

    const inserted = await query(
      `INSERT INTO chairs (x, y, rotation, is_active)
       VALUES ($1, $2, $3, true)
       RETURNING id, x, y, rotation, is_active, created_at`,
      [body.x, body.y, rotation]
    )

    return NextResponse.json(inserted.rows[0], { status: 201 })
  } catch (error: any) {
    console.error('Error creating/updating chair:', error)
    return NextResponse.json(
      { error: 'Failed to create/update chair', message: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const result = await query(
      `UPDATE chairs
       SET is_active = false
       WHERE id = $1
       RETURNING id`,
      [id]
    )

    if ((result.rowCount ?? 0) === 0) {
      return NextResponse.json({ error: 'Chair not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting chair:', error)
    return NextResponse.json(
      { error: 'Failed to delete chair', message: error.message },
      { status: 500 }
    )
  }
}

