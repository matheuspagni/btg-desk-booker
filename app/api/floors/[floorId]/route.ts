import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

async function ensureFloor(floorId: string) {
  const result = await query<{ id: string }>(
    `SELECT id FROM floors WHERE id = $1`,
    [floorId]
  )
  return result.rowCount && result.rowCount > 0
}

export async function GET(
  request: NextRequest,
  context: { params: { floorId: string } }
) {
  try {
    const floorId = context.params.floorId
    const exists = await ensureFloor(floorId)
    if (!exists) {
      return NextResponse.json({ error: 'Andar não encontrado' }, { status: 404 })
    }
    const result = await query(
      `SELECT id, office_id, name, created_at, updated_at
       FROM floors
       WHERE id = $1`,
      [floorId]
    )
    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Erro ao buscar andar:', error)
    return NextResponse.json({ error: 'Failed to fetch floor' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: { floorId: string } }
) {
  try {
    const floorId = context.params.floorId
    const exists = await ensureFloor(floorId)
    if (!exists) {
      return NextResponse.json({ error: 'Andar não encontrado' }, { status: 404 })
    }

    const body = await request.json()
    if (body.name === undefined) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }
    if (typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json(
        { error: 'NAME_REQUIRED', message: 'Informe o número do andar' },
        { status: 400 }
      )
    }

    const current = await query<{ office_id: string }>(
      `SELECT office_id FROM floors WHERE id = $1`,
      [floorId]
    )
    const officeId = current.rows[0]?.office_id
    const name = body.name.trim()

    if (!/^\d+$/.test(name)) {
      return NextResponse.json(
        { error: 'NAME_INVALID', message: 'Use apenas números inteiros para identificar o andar' },
        { status: 400 }
      )
    }

    const duplicated = await query<{ id: string }>(
      `SELECT id
       FROM floors
       WHERE office_id = $1
         AND LOWER(name) = LOWER($2)
         AND id <> $3
       LIMIT 1`,
      [officeId, name, floorId]
    )
    if (duplicated.rowCount && duplicated.rowCount > 0) {
      return NextResponse.json(
        { error: 'FLOOR_EXISTS', message: 'Já existe um andar com este nome neste escritório' },
        { status: 409 }
      )
    }

    const updated = await query(
      `UPDATE floors
       SET name = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING id, office_id, name, created_at, updated_at`,
      [name, floorId]
    )
    return NextResponse.json(updated.rows[0])
  } catch (error) {
    console.error('Erro ao atualizar andar:', error)
    return NextResponse.json({ error: 'Failed to update floor' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: { floorId: string } }
) {
  try {
    const floorId = context.params.floorId
    const exists = await ensureFloor(floorId)
    if (!exists) {
      return NextResponse.json({ error: 'Andar não encontrado' }, { status: 404 })
    }

    const hasMaps = await query<{ id: string }>(
      `SELECT id
       FROM maps
       WHERE floor_id = $1
       LIMIT 1`,
      [floorId]
    )

    if (hasMaps.rowCount && hasMaps.rowCount > 0) {
      return NextResponse.json(
        {
          error: 'FLOOR_HAS_MAPS',
          message: 'Não é possível excluir o andar pois existem mapas associados.',
        },
        { status: 400 }
      )
    }

    await query(`DELETE FROM floors WHERE id = $1`, [floorId])
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao excluir andar:', error)
    return NextResponse.json({ error: 'Failed to delete floor' }, { status: 500 })
  }
}


