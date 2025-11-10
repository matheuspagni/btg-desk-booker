import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

async function ensureOffice(officeId: string) {
  const result = await query<{ id: string }>(
    `SELECT id FROM offices WHERE id = $1`,
    [officeId]
  )
  return result.rowCount && result.rowCount > 0
}

export async function GET(
  request: NextRequest,
  context: { params: { officeId: string } }
) {
  try {
    const officeId = context.params.officeId
    const exists = await ensureOffice(officeId)
    if (!exists) {
      return NextResponse.json({ error: 'Escritório não encontrado' }, { status: 404 })
    }

    const result = await query(
      `SELECT id, company_id, name, created_at, updated_at
       FROM offices
       WHERE id = $1`,
      [officeId]
    )
    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Erro ao buscar escritório:', error)
    return NextResponse.json({ error: 'Failed to fetch office' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: { officeId: string } }
) {
  try {
    const officeId = context.params.officeId
    const exists = await ensureOffice(officeId)
    if (!exists) {
      return NextResponse.json({ error: 'Escritório não encontrado' }, { status: 404 })
    }

    const body = await request.json()
    if (body.name === undefined) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }
    if (typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json(
        { error: 'NAME_REQUIRED', message: 'Nome do escritório é obrigatório' },
        { status: 400 }
      )
    }

    const current = await query<{ company_id: string }>(
      `SELECT company_id FROM offices WHERE id = $1`,
      [officeId]
    )
    const companyId = current.rows[0]?.company_id
    const name = body.name.trim()

    const duplicated = await query<{ id: string }>(
      `SELECT id
       FROM offices
       WHERE company_id = $1
         AND LOWER(name) = LOWER($2)
         AND id <> $3
       LIMIT 1`,
      [companyId, name, officeId]
    )
    if (duplicated.rowCount && duplicated.rowCount > 0) {
      return NextResponse.json(
        { error: 'OFFICE_EXISTS', message: 'Já existe um escritório com este nome nesta empresa' },
        { status: 409 }
      )
    }

    const updated = await query(
      `UPDATE offices
       SET name = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING id, company_id, name, created_at, updated_at`,
      [name, officeId]
    )
    return NextResponse.json(updated.rows[0])
  } catch (error) {
    console.error('Erro ao atualizar escritório:', error)
    return NextResponse.json({ error: 'Failed to update office' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: { officeId: string } }
) {
  try {
    const officeId = context.params.officeId
    const exists = await ensureOffice(officeId)
    if (!exists) {
      return NextResponse.json({ error: 'Escritório não encontrado' }, { status: 404 })
    }

    const hasMaps = await query<{ id: string }>(
      `SELECT m.id
       FROM maps m
       INNER JOIN floors f ON f.id = m.floor_id
       WHERE f.office_id = $1
       LIMIT 1`,
      [officeId]
    )

    if (hasMaps.rowCount && hasMaps.rowCount > 0) {
      return NextResponse.json(
        {
          error: 'OFFICE_HAS_MAPS',
          message: 'Não é possível excluir o escritório pois existem mapas associados aos seus andares.',
        },
        { status: 400 }
      )
    }

    await query(`DELETE FROM offices WHERE id = $1`, [officeId])
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao excluir escritório:', error)
    return NextResponse.json({ error: 'Failed to delete office' }, { status: 500 })
  }
}


