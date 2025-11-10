import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { MapContextError, extractMapId, handleMapContextError } from '@/lib/map-context'

const MAX_MAP_NAME_LENGTH = 120

async function getMapHierarchy(mapId: string) {
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
     WHERE m.id = $1`,
    [mapId]
  )
  if (result.rowCount === 0) {
    throw new MapContextError('MAP_NOT_FOUND', 'Mapa não encontrado', 404)
  }
  return result.rows[0]
}

function resolveMapId(request: NextRequest, params: { mapId?: string }) {
  if (params?.mapId) return params.mapId
  const fromRequest = extractMapId(request)
  if (fromRequest) return fromRequest
  throw new MapContextError('MAP_ID_REQUIRED', 'É necessário informar o identificador do mapa', 400)
}

export async function GET(request: NextRequest, context: { params: { mapId: string } }) {
  try {
    const mapId = resolveMapId(request, context.params)
    const data = await getMapHierarchy(mapId)
    return NextResponse.json(data)
  } catch (error) {
    const handled = handleMapContextError(error)
    if (handled) return handled

    console.error('Erro ao buscar mapa:', error)
    return NextResponse.json({ error: 'Failed to fetch map' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: { mapId: string } }
) {
  try {
    const mapId = resolveMapId(request, context.params)
    const current = await getMapHierarchy(mapId)

    const body = await request.json()
    const updates: string[] = []
    const values: any[] = []
    let proposedName: string = current.name
    let proposedFloorId: string | null = current.floor_id ?? null

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || !body.name.trim()) {
        return NextResponse.json(
          { error: 'NAME_REQUIRED', message: 'Nome do mapa é obrigatório' },
          { status: 400 }
        )
      }
      const trimmedName = body.name.trim()
      if (trimmedName.length > MAX_MAP_NAME_LENGTH) {
        return NextResponse.json(
          { error: 'NAME_TOO_LONG', message: `Nome do mapa deve ter no máximo ${MAX_MAP_NAME_LENGTH} caracteres` },
          { status: 400 }
        )
      }

      updates.push(`name = $${updates.length + 1}`)
      values.push(trimmedName)
      proposedName = trimmedName
    }

    if (body.floorId !== undefined) {
      if (typeof body.floorId !== 'string' || !body.floorId.trim()) {
        return NextResponse.json(
          { error: 'FLOOR_REQUIRED', message: 'Selecione um andar válido' },
          { status: 400 }
        )
      }

      const trimmedFloorId = body.floorId.trim()

      const floorResult = await query(
        `SELECT f.id
         FROM floors f
         INNER JOIN offices o ON o.id = f.office_id
         INNER JOIN companies c ON c.id = o.company_id
         WHERE f.id = $1`,
        [trimmedFloorId]
      )

      if (floorResult.rowCount === 0) {
        return NextResponse.json(
          { error: 'FLOOR_NOT_FOUND', message: 'Andar informado não existe' },
          { status: 404 }
        )
      }

      updates.push(`floor_id = $${updates.length + 1}`)
      values.push(trimmedFloorId)
      proposedFloorId = trimmedFloorId
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const duplicateCheck = await query(
      `SELECT id
       FROM maps
       WHERE LOWER(name) = LOWER($1)
         AND ((floor_id IS NULL AND $2::uuid IS NULL) OR floor_id = $2::uuid)
         AND id <> $3
       LIMIT 1`,
      [proposedName, proposedFloorId, mapId]
    )

    if (duplicateCheck.rowCount && duplicateCheck.rowCount > 0) {
      return NextResponse.json(
        { error: 'MAP_EXISTS', message: 'Já existe um mapa com esse nome neste andar' },
        { status: 409 }
      )
    }

    updates.push(`updated_at = NOW()`)
    values.push(mapId)

    await query(
      `UPDATE maps
       SET ${updates.join(', ')}
       WHERE id = $${values.length}`,
      values
    )

    const updated = await getMapHierarchy(mapId)
    return NextResponse.json(updated)
  } catch (error) {
    const handled = handleMapContextError(error)
    if (handled) return handled

    console.error('Erro ao atualizar mapa:', error)
    return NextResponse.json({ error: 'Failed to update map' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: { mapId: string } }
) {
  try {
    const mapId = resolveMapId(request, context.params)
    await getMapHierarchy(mapId)

    const result = await query(
      `DELETE FROM maps
       WHERE id = $1
       RETURNING id`,
      [mapId]
    )

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Mapa não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const handled = handleMapContextError(error)
    if (handled) return handled

    console.error('Erro ao excluir mapa:', error)
    return NextResponse.json({ error: 'Failed to delete map' }, { status: 500 })
  }
}




