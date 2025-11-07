import { NextResponse } from 'next/server';
import { getTodayForQuery, toBrazilDateString } from '@/lib/date-utils';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const useTodayForOccupancy = searchParams.get('useTodayForOccupancy') === 'true';

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 });
    }

    // Usar função centralizada para obter data de hoje
    const today = getTodayForQuery();
    
    // Construir query para reservas com filtro de período
    let reservationsQuery = `${supabaseUrl}/rest/v1/reservations?select=*`;
    if (startDate && endDate) {
      reservationsQuery += `&date=gte.${startDate}&date=lte.${endDate}`;
    }
    
    // Buscar dados para o relatório de visão geral
    const [desksResponse, reservationsResponse, todayReservationsResponse] = await Promise.all([
      // Total de mesas ativas
      fetch(`${supabaseUrl}/rest/v1/desks?select=*&is_active=eq.true`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      }),
      // Total de reservas (filtrado por período se especificado)
      fetch(reservationsQuery, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      }),
      // Reservas de hoje
      fetch(`${supabaseUrl}/rest/v1/reservations?date=eq.${today}&select=*`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      })
    ]);

    if (!desksResponse.ok || !reservationsResponse.ok || !todayReservationsResponse.ok) {
      throw new Error('Failed to fetch data');
    }

    const [desksData, reservationsData, todayReservationsData] = await Promise.all([
      desksResponse.json(),
      reservationsResponse.json(),
      todayReservationsResponse.json()
    ]);

    // Calcular métricas
    const totalDesks = desksData.length;
    const totalReservations = reservationsData.length;
    const todayReservations = todayReservationsData.length;
    
    // Taxa de ocupação SEMPRE baseada nas reservas de hoje
    const occupancyRate = totalDesks > 0 ? Math.round((todayReservations / totalDesks) * 100) : 0;

    // Calcular ocupação do período (diferente da taxa de ocupação de hoje)
    let periodOccupancyRate = 0;
    if (startDate && endDate) {
      // Se startDate e endDate são iguais, é um período de um dia
      if (startDate === endDate) {
        // Para período de um dia: usar a ocupação desse dia específico
        periodOccupancyRate = totalDesks > 0 ? Math.round((totalReservations / totalDesks) * 100) : 0;
      } else {
        // Para período com múltiplos dias: ocupação média por dia (apenas dias úteis)
        const parseBrazilDate = (dateStr: string) => {
          const [year, month, day] = dateStr.split('-').map(Number);
          // Representar 00:00 no horário de Brasília (UTC-3) como 03:00 UTC
          return new Date(Date.UTC(year, month - 1, day, 3));
        };

        const startDateObj = parseBrazilDate(startDate);
        const endDateObj = parseBrazilDate(endDate);

        // Contar apenas dias úteis
        let totalWorkingDays = 0;
        let totalOccupiedDeskDays = 0;

        for (let current = new Date(startDateObj); current.getTime() <= endDateObj.getTime(); current.setUTCDate(current.getUTCDate() + 1)) {
          const dayOfWeek = current.getUTCDay(); // 0 = domingo, 1 = segunda, ..., 6 = sábado (considerando UTC)
          const dateStr = current.toISOString().split('T')[0];

          // Considerar apenas dias úteis (segunda a sexta: 1-5)
          if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            totalWorkingDays++;

            // Contar mesas únicas ocupadas neste dia
            const reservationsOnThisDay = reservationsData.filter((r: any) => r.date === dateStr);
            const uniqueDesksOnThisDay = new Set(reservationsOnThisDay.map((r: any) => r.desk_id)).size;
            totalOccupiedDeskDays += uniqueDesksOnThisDay;
          }
        }

        // Calcular percentual médio: (total de mesa-dias ocupados) / (total de mesa-dias disponíveis em dias úteis)
        const totalAvailableDeskDays = totalDesks * totalWorkingDays;
        periodOccupancyRate = totalAvailableDeskDays > 0 ? Math.round((totalOccupiedDeskDays / totalAvailableDeskDays) * 100 * 100) / 100 : 0;
      }
    } else {
      // Para visão geral: usar reservas de hoje
      periodOccupancyRate = totalDesks > 0 ? Math.round((todayReservations / totalDesks) * 100) : 0;
    }

    return NextResponse.json({
      totalDesks,
      totalReservations,
      todayReservations,
      occupancyRate, // Taxa de ocupação de hoje
      periodOccupancyRate, // Ocupação do período
      period: startDate && endDate ? { startDate, endDate } : null
    });

  } catch (error) {
    console.error('Error fetching overview data:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch overview data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
