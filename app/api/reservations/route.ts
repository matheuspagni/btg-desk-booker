import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let url = `${supabaseUrl}/rest/v1/reservations?select=*&order=date.asc`;
    
    if (id) {
      url = `${supabaseUrl}/rest/v1/reservations?id=eq.${id}&select=*`;
    } else if (startDate && endDate) {
      // Filtrar por range de datas
      url = `${supabaseUrl}/rest/v1/reservations?select=*&date=gte.${startDate}&date=lte.${endDate}&order=date.asc`;
    } else if (startDate) {
      url = `${supabaseUrl}/rest/v1/reservations?select=*&date=gte.${startDate}&order=date.asc`;
    } else if (endDate) {
      url = `${supabaseUrl}/rest/v1/reservations?select=*&date=lte.${endDate}&order=date.asc`;
    }

    const response = await fetch(url, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Supabase error: ${response.status}`);
    }

    const data = await response.json();
    
    // Se foi solicitado um ID específico, retornar apenas o primeiro item
    if (id) {
      return NextResponse.json(data[0] || null);
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching reservations:', error);
    return NextResponse.json({ error: 'Failed to fetch reservations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 });
    }

    const body = await request.json();

    // Verificar se já existe uma reserva para a mesma mesa e data (apenas para reservas individuais)
    if (!body.is_recurring) {
      const checkUrl = `${supabaseUrl}/rest/v1/reservations?desk_id=eq.${body.desk_id}&date=eq.${body.date}&is_recurring=eq.false&select=id,note`;
      
      const checkResponse = await fetch(checkUrl, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!checkResponse.ok) {
        throw new Error(`Supabase error: ${checkResponse.status}`);
      }

      const existingReservations = await checkResponse.json();
      
      if (existingReservations && existingReservations.length > 0) {
        return NextResponse.json({ 
          error: 'CONFLICT', 
          message: 'Já existe uma reserva para esta mesa nesta data',
          existingReservation: existingReservations[0]
        }, { status: 409 });
      }
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/reservations`, {
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
      throw new Error(`Supabase error: ${response.status}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error creating reservation:', error);
    return NextResponse.json({ error: 'Failed to create reservation' }, { status: 500 });
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
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/reservations?id=eq.${id}`, {
      method: 'DELETE',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Supabase error: ${response.status}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting reservation:', error);
    return NextResponse.json({ error: 'Failed to delete reservation' }, { status: 500 });
  }
}
