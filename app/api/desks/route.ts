import { NextRequest, NextResponse } from 'next/server';
import { getTodayForQuery } from '@/lib/date-utils';

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 });
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/desks?select=*&order=code.asc`, {
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
    console.error('Error fetching desks:', error);
    return NextResponse.json({ error: 'Failed to fetch desks' }, { status: 500 });
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

    const response = await fetch(`${supabaseUrl}/rest/v1/desks`, {
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
      const errorText = await response.text();
      throw new Error(`Supabase error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Atualizar slot para is_available = false
    if (body.slot_id) {
      await fetch(`${supabaseUrl}/rest/v1/slots?id=eq.${body.slot_id}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_available: false }),
      });
    }

    return NextResponse.json(data.length > 0 ? data[0] : { success: true });
  } catch (error) {
    console.error('Error creating desk:', error);
    return NextResponse.json({ error: 'Failed to create desk' }, { status: 500 });
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
    const deskId = searchParams.get('id');

    if (!deskId) {
      return NextResponse.json({ error: 'Desk ID is required' }, { status: 400 });
    }

    // Verificar se há reservas FUTURAS associadas (ignorar reservas antigas/passadas)
    const today = getTodayForQuery();
    const reservationsResponse = await fetch(
      `${supabaseUrl}/rest/v1/reservations?desk_id=eq.${deskId}&date=gte.${today}&select=id,date,note`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!reservationsResponse.ok) {
      throw new Error(`Supabase error: ${reservationsResponse.status}`);
    }

    const reservations = await reservationsResponse.json();

    if (reservations && reservations.length > 0) {
      return NextResponse.json(
        { 
          error: 'HAS_RESERVATIONS',
          message: 'Não é possível excluir esta mesa pois existem reservas futuras associadas',
          reservations: reservations
        },
        { status: 409 }
      );
    }

    // Buscar o slot_id antes de deletar
    const deskResponse = await fetch(
      `${supabaseUrl}/rest/v1/desks?id=eq.${deskId}&select=slot_id`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!deskResponse.ok) {
      throw new Error(`Supabase error: ${deskResponse.status}`);
    }

    const deskData = await deskResponse.json();
    const slotId = deskData[0]?.slot_id;

    // Deletar a mesa
    const deleteResponse = await fetch(`${supabaseUrl}/rest/v1/desks?id=eq.${deskId}`, {
      method: 'DELETE',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!deleteResponse.ok) {
      throw new Error(`Supabase error: ${deleteResponse.status}`);
    }

    // Atualizar slot para is_available = true
    if (slotId) {
      await fetch(`${supabaseUrl}/rest/v1/slots?id=eq.${slotId}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_available: true }),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting desk:', error);
    return NextResponse.json({ error: 'Failed to delete desk' }, { status: 500 });
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
    const deskId = searchParams.get('id');
    const body = await request.json();

    if (!deskId) {
      return NextResponse.json({ error: 'Desk ID is required' }, { status: 400 });
    }

    // Se estiver bloqueando a mesa (is_blocked = true), verificar se há reservas futuras
    if (body.is_blocked === true) {
      // Buscar estado atual da mesa
      const deskResponse = await fetch(
        `${supabaseUrl}/rest/v1/desks?id=eq.${deskId}&select=is_blocked`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!deskResponse.ok) {
        throw new Error(`Supabase error: ${deskResponse.status}`);
      }

      const deskData = await deskResponse.json();
      const currentIsBlocked = deskData[0]?.is_blocked || false;

      // Só validar se está mudando de não bloqueado para bloqueado
      if (!currentIsBlocked) {
        const today = getTodayForQuery();
        const reservationsResponse = await fetch(
          `${supabaseUrl}/rest/v1/reservations?desk_id=eq.${deskId}&date=gte.${today}&select=id,date,note,is_recurring,recurring_days`,
          {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!reservationsResponse.ok) {
          throw new Error(`Supabase error: ${reservationsResponse.status}`);
        }

        const reservations = await reservationsResponse.json();

        if (reservations && reservations.length > 0) {
          return NextResponse.json(
            { 
              error: 'HAS_RESERVATIONS',
              message: 'Não é possível bloquear esta mesa pois existem reservas futuras associadas',
              reservations: reservations
            },
            { status: 409 }
          );
        }
      }
    }

    // Se estiver atualizando o código ou a área, verificar se não existe outro com o mesmo código na área (nova ou atual)
    if (body.code) {
      // Buscar a mesa atual para obter o area_id atual
      const deskResponse = await fetch(
        `${supabaseUrl}/rest/v1/desks?id=eq.${deskId}&select=area_id,code`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!deskResponse.ok) {
        throw new Error(`Supabase error: ${deskResponse.status}`);
      }

      const deskData = await deskResponse.json();
      const currentAreaId = deskData[0]?.area_id;
      const currentCode = deskData[0]?.code;
      
      // Determinar qual área usar para validação (nova área se fornecida, senão a atual)
      const targetAreaId = body.area_id || currentAreaId;
      const targetCode = body.code;

      // Só verificar se o código ou área mudou
      if (targetCode !== currentCode || targetAreaId !== currentAreaId) {
        // Verificar se já existe outra mesa com o mesmo código na área alvo
        const checkResponse = await fetch(
          `${supabaseUrl}/rest/v1/desks?area_id=eq.${targetAreaId}&code=eq.${targetCode}&id=neq.${deskId}&select=id`,
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

        const existingDesks = await checkResponse.json();

        if (existingDesks && existingDesks.length > 0) {
          return NextResponse.json(
            { 
              error: 'CODE_EXISTS',
              message: `Já existe uma mesa com o código "${targetCode}" nesta área`
            },
            { status: 409 }
          );
        }
      }
    }

    // Atualizar a mesa
    const updateResponse = await fetch(`${supabaseUrl}/rest/v1/desks?id=eq.${deskId}`, {
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
    console.error('Error updating desk:', error);
    return NextResponse.json({ error: 'Failed to update desk' }, { status: 500 });
  }
}
