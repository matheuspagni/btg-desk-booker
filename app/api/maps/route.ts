import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

const MAX_MAP_NAME_LENGTH = 120

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const officeId = searchParams.get('officeId')
    const floorId = searchParams.get('floorId')

    const conditions: string[] = []
    const values: any[] = []

    if (companyId) {
      conditions.push(`c.id = $${values.length + 1}`)
      values.push(companyId)
    }
    if (officeId) {
      conditions.push(`o.id = $${values.length + 1}`)
      values.push(officeId)
    }
    if (floorId) {
      conditions.push(`m.floor_id = $${values.length + 1}`)
      values.push(floorId)
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const result = await query(
      `SELECT
         m.id,
         m.name,
         m.created_at,
         m.updated_at,
         m.floor_id,
         f.name AS floor_name,
         o.id AS office_id,
         o.name AS office_name,
         c.id AS company_id,
         c.name AS company_name
       FROM maps m
       LEFT JOIN floors f ON f.id = m.floor_id
       LEFT JOIN offices o ON o.id = f.office_id
       LEFT JOIN companies c ON c.id = o.company_id
       ${whereClause}
       ORDER BY m.created_at ASC`,
      values
    )

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Erro ao listar mapas:', error)
    return NextResponse.json({ error: 'Failed to fetch maps' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const floorId = typeof body.floorId === 'string' ? body.floorId.trim() : ''

    if (!name) {
      return NextResponse.json(
        { error: 'NAME_REQUIRED', message: 'Nome do mapa é obrigatório' },
        { status: 400 }
      )
    }

    if (name.length > MAX_MAP_NAME_LENGTH) {
      return NextResponse.json(
        { error: 'NAME_TOO_LONG', message: `Nome do mapa deve ter no máximo ${MAX_MAP_NAME_LENGTH} caracteres` },
        { status: 400 }
      )
    }

    if (!floorId) {
      return NextResponse.json(
        { error: 'FLOOR_REQUIRED', message: 'Selecione um andar para associar o mapa' },
        { status: 400 }
      )
    }

    const floorExists = await query(
      `SELECT f.id, o.id AS office_id, c.id AS company_id
       FROM floors f
       INNER JOIN offices o ON o.id = f.office_id
       INNER JOIN companies c ON c.id = o.company_id
       WHERE f.id = $1`,
      [floorId]
    )

    if ((floorExists.rowCount ?? 0) === 0) {
      return NextResponse.json(
        { error: 'FLOOR_NOT_FOUND', message: 'Andar informado não existe' },
        { status: 404 }
      )
    }

    const existing = await query<{ id: string }>(
      `SELECT m.id
       FROM maps m
       WHERE LOWER(m.name) = LOWER($1)
         AND m.floor_id = $2
       LIMIT 1`,
      [name, floorId]
    )

    if ((existing.rowCount ?? 0) > 0) {
      return NextResponse.json(
        {
          error: 'MAP_EXISTS',
          message: 'Já existe um mapa com esse nome neste andar',
        },
        { status: 409 }
      )
    }

    const inserted = await query(
      `INSERT INTO maps (name, floor_id)
       VALUES ($1, $2)
       RETURNING id, name, created_at, updated_at, floor_id`,
      [name, floorId]
    )

    return NextResponse.json(inserted.rows[0], { status: 201 })
  } catch (error) {
    console.error('Erro ao criar mapa:', error)
    return NextResponse.json({ error: 'Failed to create map' }, { status: 500 })
  }
}

