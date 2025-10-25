import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter'); // 'ALL', 'CREATE', 'DELETE', 'UPDATE'
    const dateFilter = searchParams.get('dateFilter'); // YYYY-MM-DD
    const page = parseInt(searchParams.get('page') || '1');
    const itemsPerPage = parseInt(searchParams.get('itemsPerPage') || '10');

    let query = supabaseServer
      .from('reservation_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Aplicar filtros
    if (filter && filter !== 'ALL') {
      query = query.eq('operation_type', filter);
    }

    if (dateFilter) {
      const startDate = new Date(dateFilter);
      const endDate = new Date(dateFilter);
      endDate.setDate(endDate.getDate() + 1);
      
      query = query
        .gte('created_at', startDate.toISOString())
        .lt('created_at', endDate.toISOString());
    }

    // Paginação
    const from = (page - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching logs:', error);
      return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
    }

    const totalPages = Math.ceil((count || 0) / itemsPerPage);

    return NextResponse.json({
      logs: data || [],
      totalPages,
      currentPage: page,
      totalCount: count || 0
    });

  } catch (error) {
    console.error('Error processing logs request:', error);
    return NextResponse.json({ 
      error: 'Failed to process request', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Tentar inserir no banco de dados usando o cliente Supabase
    const { data, error } = await supabaseServer
      .from('reservation_logs')
      .insert(body)
      .select();

    if (error) {
      console.error('Supabase error:', error);
      
      // Se der erro, pelo menos logar no console
      console.log('Reservation Log (fallback to console):', {
        timestamp: new Date().toISOString(),
        operationType: body.operation_type,
        deskId: body.desk_id,
        sessionId: body.session_id,
        reservationDate: body.reservation_date,
        reservationNote: body.reservation_note,
        isRecurring: body.is_recurring,
        success: body.success,
        errorMessage: body.error_message,
        supabaseError: error.message
      });
      
      return NextResponse.json({ 
        error: 'Failed to save to database, logged to console instead',
        details: error.message
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Log saved to database successfully',
      data
    });
    
  } catch (error) {
    console.error('Error processing log:', error);
    return NextResponse.json({ 
      error: 'Failed to process log', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
