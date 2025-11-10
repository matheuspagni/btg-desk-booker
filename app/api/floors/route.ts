import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const officeId = searchParams.get('officeId')
    const params: any[] = []
    const conditions: string[] = []
    if (officeId) {
      conditions.push(`office_id = $1`)
      params.push(officeId)
    }
    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const result = await query(
      `SELECT id, office_id, name, created_at, updated_at
       FROM floors
       ${whereClause}
       ORDER BY NULLIF(name, '')::INT ASC`,
      params
    )
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Erro ao listar andares:', error)
    return NextResponse.json({ error: 'Failed to fetch floors' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const officeId = typeof body.officeId === 'string' ? body.officeId.trim() : ''
    const name = typeof body.name === 'string' ? body.name.trim() : ''

    if (!officeId) {
      return NextResponse.json(
        { error: 'OFFICE_REQUIRED', message: 'Selecione um escritório' },
        { status: 400 }
      )
    }
    if (!name) {
      return NextResponse.json(
        { error: 'NAME_REQUIRED', message: 'Informe o número do andar' },
        { status: 400 }
      )
    }
    if (!/^\d+$/.test(name)) {
      return NextResponse.json(
        { error: 'NAME_INVALID', message: 'Use apenas números inteiros para identificar o andar' },
        { status: 400 }
      )
    }

    const officeExists = await query(
      `SELECT id FROM offices WHERE id = $1`,
      [officeId]
    )
    if (officeExists.rowCount === 0) {
      return NextResponse.json(
        { error: 'OFFICE_NOT_FOUND', message: 'Escritório informado não existe' },
        { status: 404 }
      )
    }

    const duplicated = await query<{ id: string }>(
      `SELECT id
       FROM floors
       WHERE office_id = $1
         AND LOWER(name) = LOWER($2)
       LIMIT 1`,
      [officeId, name]
    )
    if (duplicated.rowCount && duplicated.rowCount > 0) {
      return NextResponse.json(
        { error: 'FLOOR_EXISTS', message: 'Já existe um andar com este nome neste escritório' },
        { status: 409 }
      )
    }

    const inserted = await query(
      `INSERT INTO floors (office_id, name)
       VALUES ($1, $2)
       RETURNING id, office_id, name, created_at, updated_at`,
      [officeId, name]
    )
    return NextResponse.json(inserted.rows[0], { status: 201 })
  } catch (error) {
    console.error('Erro ao criar andar:', error)
    return NextResponse.json({ error: 'Failed to create floor' }, { status: 500 })
  }
}


