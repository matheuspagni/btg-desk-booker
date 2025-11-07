import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase configuration missing');
      return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 });
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/slots?select=*&order=row_number.asc,col_number.asc`, {
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
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching slots:', error);
    return NextResponse.json({ error: 'Failed to fetch slots' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    // Validar campos obrigatórios
    if (!body.area_id || body.row_number === undefined || body.col_number === undefined || body.x === undefined || body.y === undefined) {
      return NextResponse.json({ 
        error: 'Missing required fields: area_id, row_number, col_number, x, y are required' 
      }, { status: 400 });
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/slots`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      let errorMessage = `Supabase error: ${response.status}`;
      let errorDetails: any = {};

      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          errorDetails = errorData;
          
          // Verificar se é erro de constraint único (slot já existe nessa posição)
          if (response.status === 409 || errorData.code === '23505' || errorData.code === '23505') {
            // Tentar buscar o slot existente
            const existingSlotResponse = await fetch(
              `${supabaseUrl}/rest/v1/slots?area_id=eq.${body.area_id}&row_number=eq.${body.row_number}&col_number=eq.${body.col_number}&select=*`,
              {
                headers: {
                  'apikey': supabaseKey,
                  'Authorization': `Bearer ${supabaseKey}`,
                  'Content-Type': 'application/json',
                },
              }
            );

            if (existingSlotResponse.ok) {
              const existingSlots = await existingSlotResponse.json();
              if (existingSlots && existingSlots.length > 0) {
                // Retornar o slot existente ao invés de erro
                return NextResponse.json(existingSlots[0]);
              }
            }

            errorMessage = 'SLOT_EXISTS';
            return NextResponse.json({ 
              error: errorMessage,
              message: 'Já existe um slot nesta posição (área, linha, coluna)',
              details: errorData
            }, { status: 409 });
          }
          
          errorMessage = errorData.message || errorData.error || errorData.details || errorMessage;
        } else {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
          errorDetails = { text: errorText };
        }
      } catch (parseError) {
        const errorText = await response.text();
        errorMessage = errorText || errorMessage;
        errorDetails = { text: errorText };
      }

      return NextResponse.json({ 
        error: errorMessage,
        details: errorDetails,
        status: response.status
      }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data.length > 0 ? data[0] : { success: true });
  } catch (error: any) {
    let errorMessage = 'Failed to create slot';
    if (error?.message) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    return NextResponse.json({ 
      error: errorMessage,
      details: error
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const body = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/slots?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Supabase error: ${response.status}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating slot:', error);
    return NextResponse.json({ error: 'Failed to update slot' }, { status: 500 });
  }
}
