import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET() {
  try {
    const result = await query(
      `SELECT id, name, created_at, updated_at
       FROM companies
       ORDER BY name ASC`
    )
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Erro ao listar empresas:', error)
    return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''

    if (!name) {
      return NextResponse.json(
        { error: 'NAME_REQUIRED', message: 'Nome da empresa é obrigatório' },
        { status: 400 }
      )
    }

    const existing = await query<{ id: string }>(
      `SELECT id FROM companies WHERE LOWER(name) = LOWER($1) LIMIT 1`,
      [name]
    )
    if (existing.rowCount && existing.rowCount > 0) {
      return NextResponse.json(
        { error: 'COMPANY_EXISTS', message: 'Já existe uma empresa com este nome' },
        { status: 409 }
      )
    }

    const inserted = await query(
      `INSERT INTO companies (name)
       VALUES ($1)
       RETURNING id, name, created_at, updated_at`,
      [name]
    )
    return NextResponse.json(inserted.rows[0], { status: 201 })
  } catch (error) {
    console.error('Erro ao criar empresa:', error)
    return NextResponse.json({ error: 'Failed to create company' }, { status: 500 })
  }
}


