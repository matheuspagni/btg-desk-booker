import { NextRequest, NextResponse } from 'next/server';
import { getBrazilToday } from '@/lib/date-utils';

export async function GET() {
  return NextResponse.json({ 
    message: 'Bulk reservations API is working',
    methods: ['POST', 'DELETE'],
    timestamp: new Date().toISOString() // UTC timestamp para API
  });
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('ids');
    
    if (!idsParam) {
      return NextResponse.json({ error: 'IDs parameter is required' }, { status: 400 });
    }
    
    const ids = idsParam.split(',').filter(id => id.trim());
    
    if (ids.length === 0) {
      return NextResponse.json({ error: 'No valid IDs provided' }, { status: 400 });
    }
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase configuration missing');
      return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 });
    }

    // Verificar se as reservas existem antes de deletar
    const checkResponse = await fetch(`${supabaseUrl}/rest/v1/reservations?select=id&id=in.(${ids.join(',')})`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!checkResponse.ok) {
      const errorText = await checkResponse.text();
      console.error('Erro ao verificar reservas existentes:', checkResponse.status, errorText);
      return NextResponse.json({ error: 'Failed to verify reservations' }, { status: 500 });
    }

    const existingReservations = await checkResponse.json();
    const existingIds = existingReservations?.map((r: any) => r.id) || [];
    const notFoundIds = ids.filter(id => !existingIds.includes(id));
    
    if (notFoundIds.length > 0) {
      console.warn('Alguns IDs não foram encontrados:', notFoundIds);
    }
    
    if (existingIds.length === 0) {
      return NextResponse.json({ error: 'No reservations found to delete' }, { status: 404 });
    }
    
    // Deletar as reservas
    const deleteResponse = await fetch(`${supabaseUrl}/rest/v1/reservations?id=in.(${existingIds.join(',')})`, {
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
      console.error('Erro ao deletar reservas:', deleteResponse.status, errorText);
      return NextResponse.json({ error: 'Failed to delete reservations' }, { status: 500 });
    }
    
    
    return NextResponse.json({ 
      success: true, 
      count: existingIds.length,
      deletedIds: existingIds,
      notFoundIds: notFoundIds
    });
    
  } catch (error) {
    console.error('Erro na API de deleção em lote:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reservations } = body;
    
    if (!reservations || !Array.isArray(reservations) || reservations.length === 0) {
      return NextResponse.json({ error: 'Reservations array is required' }, { status: 400 });
    }
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase configuration missing');
      return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 });
    }
    
    // Validar dados das reservas
    for (const reservation of reservations) {
      if (!reservation.desk_id || !reservation.date) {
        return NextResponse.json({ 
          error: 'Each reservation must have desk_id and date' 
        }, { status: 400 });
      }
    }
    
    // Verificar conflitos de forma otimizada - usar consultas em lote quando possível
    const conflicts = [];
    if (reservations.length > 0) {
      // Para poucas reservas, usar consultas individuais (mais confiável)
      // Para muitas reservas, tentar consulta em lote
      if (reservations.length <= 10) {
        // Consultas individuais em PARALELO para poucas reservas (muito mais rápido)
        const conflictChecks = await Promise.all(
          reservations.map(async (reservation) => {
            const checkUrl = `${supabaseUrl}/rest/v1/reservations?desk_id=eq.${reservation.desk_id}&date=eq.${reservation.date}&select=id,note,is_recurring`;
            
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
              return {
                date: reservation.date,
                desk_id: reservation.desk_id,
                existingReservation: existingReservations[0]
              };
            }
            return null;
          })
        );
        
        // Filtrar apenas os conflitos encontrados
        conflicts.push(...conflictChecks.filter(conflict => conflict !== null));
      } else {
        // Para muitas reservas, buscar todas as reservas existentes e filtrar localmente
        const allDates = [...new Set(reservations.map(r => r.date))];
        const allDeskIds = [...new Set(reservations.map(r => r.desk_id))];
        
        const checkUrl = `${supabaseUrl}/rest/v1/reservations?date=in.(${allDates.join(',')})&desk_id=in.(${allDeskIds.join(',')})&select=id,desk_id,date,note,is_recurring`;
        
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
        
        // Filtrar conflitos localmente
        for (const reservation of reservations) {
          const conflict = existingReservations.find((existing: any) => 
            existing.desk_id === reservation.desk_id && existing.date === reservation.date
          );
          
          if (conflict) {
            conflicts.push({
              date: reservation.date,
              desk_id: reservation.desk_id,
              existingReservation: conflict
            });
          }
        }
      }
    }
    
    // Se há conflitos, retornar erro com detalhes
    if (conflicts.length > 0) {
      return NextResponse.json({ 
        error: 'CONFLICT', 
        message: 'Existem conflitos com reservas já existentes',
        conflicts: conflicts
      }, { status: 409 });
    }
    
    // Inserir todas as reservas
    const response = await fetch(`${supabaseUrl}/rest/v1/reservations`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(reservations),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro ao criar reservas em lote:', response.status, errorText);
      return NextResponse.json({ error: 'Failed to create reservations' }, { status: 500 });
    }
    
    const data = await response.json();
    
    
    return NextResponse.json({ 
      success: true, 
      count: data?.length || 0,
      createdIds: data?.map((r: any) => r.id) || []
    });
    
  } catch (error) {
    console.error('Erro na API de criação em lote:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}