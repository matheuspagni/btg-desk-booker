import { NextRequest, NextResponse } from 'next/server'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export class MapContextError extends Error {
  status: number
  code: string

  constructor(code: string, message: string, status = 400) {
    super(message)
    this.name = 'MapContextError'
    this.status = status
    this.code = code
  }
}

export function extractMapId(request: NextRequest): string | null {
  const headerValue = request.headers.get('x-map-id')
  if (headerValue) {
    return headerValue
  }

  try {
    const url = new URL(request.url)
    const mapId = url.searchParams.get('mapId')
    return mapId
  } catch {
    return null
  }
}

export function requireMapId(request: NextRequest): string {
  const mapId = extractMapId(request)

  if (!mapId) {
    throw new MapContextError('MAP_ID_REQUIRED', 'É necessário informar o identificador do mapa', 400)
  }

  if (!UUID_REGEX.test(mapId)) {
    throw new MapContextError('MAP_ID_INVALID', 'Identificador de mapa inválido', 400)
  }

  return mapId
}

export function handleMapContextError(error: unknown): NextResponse | null {
  if (error instanceof MapContextError) {
    return NextResponse.json(
      {
        error: error.code,
        message: error.message,
      },
      { status: error.status }
    )
  }
  return null
}



