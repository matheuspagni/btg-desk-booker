import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 });
    }

    const body = await request.json();
    const { reservations } = body;

    if (!Array.isArray(reservations) || reservations.length === 0) {
      return NextResponse.json({ error: 'Reservations array is required' }, { status: 400 });
    }

    // Usar Supabase para inserção em lote
    const response = await fetch(`${supabaseUrl}/rest/v1/reservations`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(reservations),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Supabase bulk insert error:', errorText);
      throw new Error(`Supabase error: ${response.status}`);
    }

    return NextResponse.json({ 
      success: true, 
      count: reservations.length 
    });
  } catch (error) {
    console.error('Error creating bulk reservations:', error);
    return NextResponse.json({ error: 'Failed to create bulk reservations' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const ids = searchParams.get('ids');

    if (!ids) {
      return NextResponse.json({ error: 'IDs parameter is required' }, { status: 400 });
    }

    // Converter string de IDs para array
    const idArray = ids.split(',');

    // Usar Supabase para deleção em lote
    const response = await fetch(`${supabaseUrl}/rest/v1/reservations?id=in.(${idArray.join(',')})`, {
      method: 'DELETE',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Supabase bulk delete error:', errorText);
      throw new Error(`Supabase error: ${response.status}`);
    }

    return NextResponse.json({ 
      success: true, 
      count: idArray.length 
    });
  } catch (error) {
    console.error('Error deleting bulk reservations:', error);
    return NextResponse.json({ error: 'Failed to delete bulk reservations' }, { status: 500 });
  }
}
