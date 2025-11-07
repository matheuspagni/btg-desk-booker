import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 });
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/areas?select=*&order=created_at.asc`, {
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
    console.error('Error fetching areas:', error);
    return NextResponse.json({ error: 'Failed to fetch areas' }, { status: 500 });
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

    if (!body.name || !body.color) {
      return NextResponse.json({ error: 'Name and color are required' }, { status: 400 });
    }

    // Verificar se já existe uma área com o mesmo nome
    const checkResponse = await fetch(
      `${supabaseUrl}/rest/v1/areas?name=eq.${encodeURIComponent(body.name)}&select=id`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!checkResponse.ok) {
      throw new Error(`Supabase error: ${checkResponse.status}`);
    }

    const existingAreas = await checkResponse.json();

    if (existingAreas && existingAreas.length > 0) {
      return NextResponse.json(
        { 
          error: 'NAME_EXISTS',
          message: `Já existe uma área com o nome "${body.name}"`
        },
        { status: 409 }
      );
    }

    // Validar formato da cor
    if (!body.color.match(/^#[0-9A-Fa-f]{6}$/)) {
      return NextResponse.json({ error: 'Invalid color format. Use #RRGGBB' }, { status: 400 });
    }

    // Criar a nova área
    const createResponse = await fetch(`${supabaseUrl}/rest/v1/areas`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        name: body.name.trim(),
        color: body.color,
      }),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`Supabase error: ${createResponse.status} - ${errorText}`);
    }

    const data = await createResponse.json();
    return NextResponse.json(data.length > 0 ? data[0] : { success: true }, { status: 201 });
  } catch (error) {
    console.error('Error creating area:', error);
    return NextResponse.json({ error: 'Failed to create area' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const areaId = searchParams.get('id');
    const body = await request.json();

    if (!areaId) {
      return NextResponse.json({ error: 'Area ID is required' }, { status: 400 });
    }

    // Se estiver atualizando o nome, verificar se não existe outra área com o mesmo nome
    if (body.name) {
      const checkResponse = await fetch(
        `${supabaseUrl}/rest/v1/areas?name=eq.${encodeURIComponent(body.name)}&id=neq.${areaId}&select=id`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!checkResponse.ok) {
        throw new Error(`Supabase error: ${checkResponse.status}`);
      }

      const existingAreas = await checkResponse.json();

      if (existingAreas && existingAreas.length > 0) {
        return NextResponse.json(
          { 
            error: 'NAME_EXISTS',
            message: `Já existe uma área com o nome "${body.name}"`
          },
          { status: 409 }
        );
      }
    }

    // Atualizar a área
    const updateResponse = await fetch(`${supabaseUrl}/rest/v1/areas?id=eq.${areaId}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(body),
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Supabase error: ${updateResponse.status} - ${errorText}`);
    }

    const data = await updateResponse.json();
    return NextResponse.json(data.length > 0 ? data[0] : { success: true });
  } catch (error) {
    console.error('Error updating area:', error);
    return NextResponse.json({ error: 'Failed to update area' }, { status: 500 });
  }
}
