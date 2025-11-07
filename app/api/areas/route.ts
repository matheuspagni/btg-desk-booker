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

export async function DELETE(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const areaId = searchParams.get('id');

    if (!areaId) {
      return NextResponse.json({ error: 'Area ID is required' }, { status: 400 });
    }

    // IMPORTANTE: Atualizar mesas ANTES de atualizar slots, pois as mesas dependem dos slots
    // Buscar todas as mesas vinculadas a esta área
    const desksCheckResponse = await fetch(`${supabaseUrl}/rest/v1/desks?area_id=eq.${areaId}&select=id,code`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (desksCheckResponse.ok) {
      const desksData = await desksCheckResponse.json();
      if (desksData && desksData.length > 0) {
        console.log(`[DELETE AREA] Atualizando ${desksData.length} mesa(s) para area_id = null`);
        
        // Atualizar cada mesa individualmente para garantir que funcione
        const deskUpdatePromises = desksData.map((desk: any) =>
          fetch(`${supabaseUrl}/rest/v1/desks?id=eq.${desk.id}`, {
            method: 'PATCH',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify({
              area_id: null,
            }),
          })
        );

        const updateResults = await Promise.allSettled(deskUpdatePromises);
        const failed = updateResults.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok));
        if (failed.length > 0) {
          console.error(`[DELETE AREA] Erro ao atualizar ${failed.length} mesa(s) de ${desksData.length} total`);
          // Retornar erro se houver falha na atualização das mesas
          return NextResponse.json({ 
            error: `Failed to update ${failed.length} desk(s) before deleting area` 
          }, { status: 500 });
        }
        console.log(`[DELETE AREA] ${desksData.length} mesa(s) atualizadas com sucesso`);
      }
    } else {
      const errorText = await desksCheckResponse.text();
      console.error('[DELETE AREA] Error checking desks:', desksCheckResponse.status, errorText);
    }

    // Agora atualizar todos os slots vinculados a esta área para area_id = null
    // IMPORTANTE: Fazer isso DEPOIS de atualizar as mesas, mas ANTES de deletar a área
    const slotsCheckResponse = await fetch(`${supabaseUrl}/rest/v1/slots?area_id=eq.${areaId}&select=id`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (slotsCheckResponse.ok) {
      const slotsData = await slotsCheckResponse.json();
      if (slotsData && slotsData.length > 0) {
        console.log(`[DELETE AREA] Atualizando ${slotsData.length} slot(s) para area_id = null`);
        
        // Atualizar cada slot individualmente para garantir que funcione
        const slotUpdatePromises = slotsData.map((slot: any) =>
          fetch(`${supabaseUrl}/rest/v1/slots?id=eq.${slot.id}`, {
            method: 'PATCH',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify({
              area_id: null,
            }),
          })
        );

        const updateResults = await Promise.allSettled(slotUpdatePromises);
        const failed = updateResults.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok));
        if (failed.length > 0) {
          console.error(`[DELETE AREA] Erro ao atualizar ${failed.length} slot(s) de ${slotsData.length} total`);
          // Retornar erro se houver falha na atualização dos slots
          return NextResponse.json({ 
            error: `Failed to update ${failed.length} slot(s) before deleting area` 
          }, { status: 500 });
        }
        console.log(`[DELETE AREA] ${slotsData.length} slot(s) atualizados com sucesso`);
      }
    } else {
      const errorText = await slotsCheckResponse.text();
      console.error('[DELETE AREA] Error checking slots:', slotsCheckResponse.status, errorText);
    }

    // NOTA: Cadeiras não precisam ser atualizadas quando uma área é deletada
    // porque cadeiras não devem ter area_id direto - a área é inferida através da mesa (desk_id)
    // Se uma cadeira tem desk_id, a área vem da mesa. Se não tem mesa, não precisa de área.

    // Agora deletar a área
    const deleteResponse = await fetch(`${supabaseUrl}/rest/v1/areas?id=eq.${areaId}`, {
      method: 'DELETE',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
    });

    if (!deleteResponse.ok) {
      const errorText = await deleteResponse.text();
      throw new Error(`Supabase error: ${deleteResponse.status} - ${errorText}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting area:', error);
    return NextResponse.json({ error: 'Failed to delete area' }, { status: 500 });
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
