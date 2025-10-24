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
    
    // Simplesmente logar no console do servidor (Vercel)
    console.log('Reservation Log:', {
      timestamp: new Date().toISOString(),
      operationType: body.operation_type,
      deskId: body.desk_id,
      sessionId: body.session_id,
      reservationDate: body.reservation_date,
      reservationNote: body.reservation_note,
      isRecurring: body.is_recurring,
      success: body.success,
      errorMessage: body.error_message
    });
    
    // Retornar sucesso - o log foi "salvo" no console do servidor
    return NextResponse.json({ 
      success: true,
      message: 'Log recorded successfully'
    });
    
  } catch (error) {
    console.error('Error processing log:', error);
    return NextResponse.json({ 
      error: 'Failed to process log', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
