import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    message: 'Logs API is working',
    methods: ['POST'],
    timestamp: new Date().toISOString()
  });
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
    
    // Verificar se a tabela reservation_logs existe e tem as permissões corretas
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase configuration missing');
      return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 });
    }

    // Tentar inserir no banco de dados
    const response = await fetch(`${supabaseUrl}/rest/v1/reservation_logs`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Supabase error:', response.status, errorText);
      
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
        supabaseError: errorText
      });
      
      return NextResponse.json({ 
        error: 'Failed to save to database, logged to console instead',
        details: errorText
      }, { status: 500 });
    }


    return NextResponse.json({ 
      success: true,
      message: 'Log saved to database successfully'
    });
    
  } catch (error) {
    console.error('Error processing log:', error);
    return NextResponse.json({ 
      error: 'Failed to process log', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
