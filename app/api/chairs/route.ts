import { NextRequest, NextResponse } from 'next/server';

export type Chair = {
  id: string;
  x: number;
  y: number;
  rotation: number;
  desk_id?: string | null;
  area_id?: string | null;
  is_active: boolean;
  created_at?: string;
};

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 });
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/chairs?select=*&is_active=eq.true&order=created_at.asc`, {
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
  } catch (error: any) {
    console.error('Error fetching chairs:', error);
    return NextResponse.json({ error: 'Failed to fetch chairs', message: error.message }, { status: 500 });
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
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    // Validar campos obrigatórios
    if (typeof body.x !== 'number' || typeof body.y !== 'number') {
      return NextResponse.json({ error: 'x and y are required and must be numbers' }, { status: 400 });
    }

    // rotation é opcional, padrão 0
    const rotation = typeof body.rotation === 'number' ? body.rotation : 0;
    if (rotation < 0 || rotation > 3) {
      return NextResponse.json({ error: 'rotation must be between 0 and 3' }, { status: 400 });
    }

    // Validar sobreposição com outras cadeiras e mesas
    // Primeiro, verificar outras cadeiras
    const chairsResponse = await fetch(
      `${supabaseUrl}/rest/v1/chairs?select=id,x,y&is_active=eq.true&x=eq.${body.x}&y=eq.${body.y}`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (chairsResponse.ok) {
      const existingChairs = await chairsResponse.json();
      if (existingChairs && existingChairs.length > 0) {
        // Se estiver atualizando (tem id), permitir se for a mesma cadeira
        if (!body.id || existingChairs.some((c: any) => c.id !== body.id)) {
          return NextResponse.json(
            { error: 'OVERLAP', message: 'Já existe uma cadeira nesta posição' },
            { status: 409 }
          );
        }
      }
    }

    // Verificar sobreposição com mesas
    // As mesas ocupam um espaço de 3x2 grid units (120x80px)
    const GRID_UNIT = 40;
    const SLOT_WIDTH_UNITS = 3;
    const SLOT_HEIGHT_UNITS = 2;
    const SLOT_WIDTH = SLOT_WIDTH_UNITS * GRID_UNIT; // 120px
    const SLOT_HEIGHT = SLOT_HEIGHT_UNITS * GRID_UNIT; // 80px

    // A cadeira ocupa 1 grid unit (40x40px)
    const CHAIR_SIZE = GRID_UNIT;

    // Verificar se a cadeira está dentro de alguma mesa
    const desksResponse = await fetch(
      `${supabaseUrl}/rest/v1/slots?select=id,x,y,w,h&is_available=eq.false`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (desksResponse.ok) {
      const slots = await desksResponse.json();
      const chairCenterX = body.x + CHAIR_SIZE / 2;
      const chairCenterY = body.y + CHAIR_SIZE / 2;

      for (const slot of slots) {
        // Verificar se o centro da cadeira está dentro da área da mesa
        if (
          chairCenterX >= slot.x &&
          chairCenterX <= slot.x + slot.w &&
          chairCenterY >= slot.y &&
          chairCenterY <= slot.y + slot.h
        ) {
          return NextResponse.json(
            { error: 'OVERLAP', message: 'Cadeira não pode ser posicionada sobre uma mesa' },
            { status: 409 }
          );
        }
      }
    }

    // Se tem id, atualizar (usando PATCH via PUT)
    if (body.id) {
      const updateResponse = await fetch(
        `${supabaseUrl}/rest/v1/chairs?id=eq.${body.id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify({
            x: body.x,
            y: body.y,
            rotation: rotation,
            desk_id: body.desk_id || null,
            area_id: body.area_id || null,
          }),
        }
      );

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json().catch(() => ({ error: 'Failed to update chair' }));
        return NextResponse.json({ error: errorData.error || 'Failed to update chair' }, { status: updateResponse.status });
      }

      const updated = await updateResponse.json();
      return NextResponse.json(updated[0] || updated);
    }

    // Criar nova cadeira
    const createResponse = await fetch(
      `${supabaseUrl}/rest/v1/chairs`,
      {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          x: body.x,
          y: body.y,
          rotation: rotation,
          desk_id: body.desk_id || null,
          area_id: body.area_id || null,
          is_active: true,
        }),
      }
    );

    if (!createResponse.ok) {
      const errorData = await createResponse.json().catch(() => ({ error: 'Failed to create chair' }));
      return NextResponse.json({ error: errorData.error || 'Failed to create chair' }, { status: createResponse.status });
    }

    const created = await createResponse.json();
    return NextResponse.json(created[0] || created, { status: 201 });
  } catch (error: any) {
    console.error('Error creating/updating chair:', error);
    return NextResponse.json({ error: 'Failed to create/update chair', message: error.message }, { status: 500 });
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
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // Soft delete: marcar como inativo
    const response = await fetch(
      `${supabaseUrl}/rest/v1/chairs?id=eq.${id}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({ is_active: false }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to delete chair' }));
      return NextResponse.json({ error: errorData.error || 'Failed to delete chair' }, { status: response.status });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting chair:', error);
    return NextResponse.json({ error: 'Failed to delete chair', message: error.message }, { status: 500 });
  }
}

