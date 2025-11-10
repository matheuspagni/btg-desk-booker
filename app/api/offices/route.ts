import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const conditions: string[] = []
    const params: any[] = []

    if (companyId) {
      conditions.push(`company_id = $1`)
      params.push(companyId)
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const result = await query(
      `SELECT id, company_id, name, created_at, updated_at
       FROM offices
       ${whereClause}
       ORDER BY name ASC`,
      params
    )

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Erro ao listar escritórios:', error)
    return NextResponse.json({ error: 'Failed to fetch offices' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const companyId = typeof body.companyId === 'string' ? body.companyId.trim() : ''
    const name = typeof body.name === 'string' ? body.name.trim() : ''

    if (!companyId) {
      return NextResponse.json(
        { error: 'COMPANY_REQUIRED', message: 'Selecione uma empresa' },
        { status: 400 }
      )
    }

    if (!name) {
      return NextResponse.json(
        { error: 'NAME_REQUIRED', message: 'Nome do escritório é obrigatório' },
        { status: 400 }
      )
    }

    const companyExists = await query(
      `SELECT id FROM companies WHERE id = $1`,
      [companyId]
    )
    if (companyExists.rowCount === 0) {
      return NextResponse.json(
        { error: 'COMPANY_NOT_FOUND', message: 'Empresa informada não existe' },
        { status: 404 }
      )
    }

    const duplicated = await query<{ id: string }>(
      `SELECT id
       FROM offices
       WHERE company_id = $1
         AND LOWER(name) = LOWER($2)
       LIMIT 1`,
      [companyId, name]
    )
    if (duplicated.rowCount && duplicated.rowCount > 0) {
      return NextResponse.json(
        { error: 'OFFICE_EXISTS', message: 'Já existe um escritório com este nome nesta empresa' },
        { status: 409 }
      )
    }

    const inserted = await query(
      `INSERT INTO offices (company_id, name)
       VALUES ($1, $2)
       RETURNING id, company_id, name, created_at, updated_at`,
      [companyId, name]
    )

    return NextResponse.json(inserted.rows[0], { status: 201 })
  } catch (error) {
    console.error('Erro ao criar escritório:', error)
    return NextResponse.json({ error: 'Failed to create office' }, { status: 500 })
  }
}


