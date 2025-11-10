import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { handleMapContextError, requireMapId } from '@/lib/map-context'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

export async function GET(request: NextRequest) {
  try {
    const mapId = requireMapId(request)
    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter')
    const dateFilter = searchParams.get('dateFilter')
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1)
    const itemsPerPage = Math.max(parseInt(searchParams.get('itemsPerPage') || '10', 10), 1)

    const conditions: string[] = []
    const params: any[] = []

    conditions.push(`map_id = $${params.length + 1}`)
    params.push(mapId)

    if (filter && filter !== 'ALL') {
      conditions.push(`operation_type = $${params.length + 1}`)
      params.push(filter)
    }

    if (dateFilter) {
      const startDate = new Date(dateFilter)
      const endDate = new Date(dateFilter)
      endDate.setDate(endDate.getDate() + 1)

      conditions.push(`created_at >= $${params.length + 1}`)
      params.push(startDate.toISOString())

      conditions.push(`created_at < $${params.length + 1}`)
      params.push(endDate.toISOString())
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM reservation_logs
       ${whereClause}`,
      params
    )

    const totalCount = parseInt(countResult.rows[0]?.count ?? '0', 10)
    const totalPages = Math.max(Math.ceil(totalCount / itemsPerPage), 1)
    const currentPage = Math.min(page, totalPages)
    const offset = (currentPage - 1) * itemsPerPage

    const dataResult = await query(
      `SELECT *
       FROM reservation_logs
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1}
       OFFSET $${params.length + 2}`,
      [...params, itemsPerPage, offset]
    )

    return NextResponse.json({
      logs: dataResult.rows,
      totalPages,
      currentPage,
      totalCount,
    })
  } catch (error) {
    const handled = handleMapContextError(error)
    if (handled) return handled

    console.error('Error processing logs request:', error)
    return NextResponse.json(
      {
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const mapId = requireMapId(request)
    const body = await request.json()

    const result = await query(
      `INSERT INTO reservation_logs (
        operation_type,
        reservation_id,
        desk_id,
        reservation_date,
        reservation_note,
        is_recurring,
        recurring_days,
        user_agent,
        browser_name,
        browser_version,
        operating_system,
        device_type,
        screen_resolution,
        ip_address,
        timezone,
        computer_name,
        session_id,
        referrer_url,
        page_url,
        processing_time_ms,
        success,
        error_message,
        operation_details,
        map_id
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
        $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
      )
      RETURNING *`,
      [
        body.operation_type,
        body.reservation_id ?? null,
        body.desk_id ?? null,
        body.reservation_date ?? null,
        body.reservation_note ?? null,
        body.is_recurring ?? false,
        body.recurring_days ?? null,
        body.user_agent ?? null,
        body.browser_name ?? null,
        body.browser_version ?? null,
        body.operating_system ?? null,
        body.device_type ?? null,
        body.screen_resolution ?? null,
        body.ip_address ?? null,
        body.timezone ?? null,
        body.computer_name ?? null,
        body.session_id ?? null,
        body.referrer_url ?? null,
        body.page_url ?? null,
        body.processing_time_ms ?? null,
        body.success ?? true,
        body.error_message ?? null,
        body.operation_details ?? null,
        mapId,
      ]
    )

    return NextResponse.json({
      success: true,
      message: 'Log saved to database successfully',
      data: result.rows,
    })
  } catch (error) {
    const handled = handleMapContextError(error)
    if (handled) return handled

    console.error('Error processing log:', error)
    return NextResponse.json(
      {
        error: 'Failed to process log',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
