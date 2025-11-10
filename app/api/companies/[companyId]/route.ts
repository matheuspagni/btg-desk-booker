import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

async function ensureCompany(companyId: string) {
  const result = await query<{ id: string }>(
    `SELECT id FROM companies WHERE id = $1`,
    [companyId]
  )
  if (result.rowCount === 0) {
    return false
  }
  return true
}

export async function GET(
  request: NextRequest,
  context: { params: { companyId: string } }
) {
  try {
    const companyId = context.params.companyId
    const exists = await ensureCompany(companyId)
    if (!exists) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })
    }

    const result = await query(
      `SELECT id, name, created_at, updated_at
       FROM companies
       WHERE id = $1`,
      [companyId]
    )
    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Erro ao buscar empresa:', error)
    return NextResponse.json({ error: 'Failed to fetch company' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: { companyId: string } }
) {
  try {
    const companyId = context.params.companyId
    const exists = await ensureCompany(companyId)
    if (!exists) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })
    }

    const body = await request.json()
    if (body.name === undefined) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }
    if (typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json(
        { error: 'NAME_REQUIRED', message: 'Nome da empresa é obrigatório' },
        { status: 400 }
      )
    }

    const name = body.name.trim()
    const duplicated = await query<{ id: string }>(
      `SELECT id FROM companies WHERE LOWER(name) = LOWER($1) AND id <> $2 LIMIT 1`,
      [name, companyId]
    )
    if (duplicated.rowCount && duplicated.rowCount > 0) {
      return NextResponse.json(
        { error: 'COMPANY_EXISTS', message: 'Já existe uma empresa com este nome' },
        { status: 409 }
      )
    }

    const updated = await query(
      `UPDATE companies
       SET name = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING id, name, created_at, updated_at`,
      [name, companyId]
    )
    return NextResponse.json(updated.rows[0])
  } catch (error) {
    console.error('Erro ao atualizar empresa:', error)
    return NextResponse.json({ error: 'Failed to update company' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: { companyId: string } }
) {
  try {
    const companyId = context.params.companyId
    const exists = await ensureCompany(companyId)
    if (!exists) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })
    }

    await query(`DELETE FROM companies WHERE id = $1`, [companyId])
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao excluir empresa:', error)
    return NextResponse.json({ error: 'Failed to delete company' }, { status: 500 })
  }
}


