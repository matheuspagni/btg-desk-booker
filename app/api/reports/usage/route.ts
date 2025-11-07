import { NextResponse } from 'next/server';
import { toBrazilDateString } from '@/lib/date-utils';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 });
    }

    // Buscar dados de uso por área
    const [areasResponse, reservationsResponse, desksResponse] = await Promise.all([
      // Áreas
      fetch(`${supabaseUrl}/rest/v1/areas?select=id,name,color`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      }),
      // Reservas
      fetch(`${supabaseUrl}/rest/v1/reservations?select=desk_id,date,is_recurring`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      }),
      // Mesas com área
      fetch(`${supabaseUrl}/rest/v1/desks?select=id,area_id`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      })
    ]);

    if (!areasResponse.ok || !reservationsResponse.ok || !desksResponse.ok) {
      throw new Error('Failed to fetch data');
    }

    const [areasData, reservationsData, desksData] = await Promise.all([
      areasResponse.json(),
      reservationsResponse.json(),
      desksResponse.json()
    ]);

    // Criar mapa de desk_id -> area_id
    const deskToAreaMap = new Map();
    desksData.forEach((desk: any) => {
      deskToAreaMap.set(desk.id, desk.area_id);
    });

    // Contar mesas por área (incluindo mesas sem área)
    const desksByArea = new Map();
    desksData.forEach((desk: any) => {
      const areaId = desk.area_id || 'sem-area';
      desksByArea.set(areaId, (desksByArea.get(areaId) || 0) + 1);
    });

    // Processar dados de uso por área
    const usageByArea = areasData.map((area: any) => {
      const areaReservations = reservationsData.filter((reservation: any) => {
        const deskAreaId = deskToAreaMap.get(reservation.desk_id);
        return deskAreaId === area.id;
      });

      // Filtrar por período se especificado
      let filteredReservations = areaReservations;
      if (startDate && endDate) {
        filteredReservations = areaReservations.filter((reservation: any) => {
          // Comparar por string YYYY-MM-DD para evitar problemas de timezone
          const day = reservation.date as string;
          return day >= startDate && day <= endDate;
        });
      }

      const totalDesksInArea = desksByArea.get(area.id) || 0;
      const totalReservationsInArea = filteredReservations.length;
      
      // Separar reservas recorrentes e individuais
      const recurringReservations = filteredReservations.filter((r: any) => r.is_recurring);
      const individualReservations = filteredReservations.filter((r: any) => !r.is_recurring);
      
      // Contar mesas únicas ocupadas por tipo
      const uniqueRecurringDesks = new Set(recurringReservations.map((r: any) => r.desk_id)).size;
      const uniqueIndividualDesks = new Set(individualReservations.map((r: any) => r.desk_id)).size;
      
      // Calcular percentual de uso baseado na ocupação média diária
      let usagePercentage = 0;
      if (totalDesksInArea > 0 && startDate && endDate) {
        // Se o período é apenas um dia, usar lógica simples
        if (startDate === endDate) {
          const uniqueDesksWithReservations = new Set(
            filteredReservations.map((r: any) => r.desk_id)
          ).size;
          usagePercentage = Math.round((uniqueDesksWithReservations / totalDesksInArea) * 100 * 100) / 100;
        } else {
          // Calcular ocupação média por dia no período (apenas dias úteis)
          const startDateObj = new Date(startDate + 'T00:00:00');
          const endDateObj = new Date(endDate + 'T23:59:59');
          const daysInPeriod = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          
          // Para cada dia do período, contar quantas mesas estão ocupadas (apenas dias úteis)
          let totalOccupiedDeskDays = 0;
          let totalWorkingDays = 0;
          
          for (let d = 0; d < daysInPeriod; d++) {
            const currentDate = new Date(startDateObj);
            currentDate.setDate(startDateObj.getDate() + d);
            const dayOfWeek = currentDate.getDay(); // 0 = domingo, 1 = segunda, ..., 6 = sábado
            const dateStr = toBrazilDateString(currentDate);
            
            // Verificar se a data está dentro do período (não ultrapassar endDate)
            if (dateStr <= endDate) {
              // Considerar apenas dias úteis (segunda a sexta: 1-5)
              if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                totalWorkingDays++;
                
                // Contar mesas únicas ocupadas neste dia
                const reservationsOnThisDay = filteredReservations.filter((r: any) => r.date === dateStr);
                const uniqueDesksOnThisDay = new Set(reservationsOnThisDay.map((r: any) => r.desk_id)).size;
                totalOccupiedDeskDays += uniqueDesksOnThisDay;
              }
            }
          }
          
          // Calcular percentual médio: (total de mesa-dias ocupados) / (total de mesa-dias disponíveis em dias úteis)
          const totalAvailableDeskDays = totalDesksInArea * totalWorkingDays;
          usagePercentage = Math.round((totalOccupiedDeskDays / totalAvailableDeskDays) * 100 * 100) / 100;
        }
      } else if (totalDesksInArea > 0) {
        // Para visão geral sem período, usar mesas únicas
        const uniqueDesksWithReservations = new Set(
          filteredReservations.map((r: any) => r.desk_id)
        ).size;
        usagePercentage = Math.round((uniqueDesksWithReservations / totalDesksInArea) * 100 * 100) / 100;
      }

      return {
        areaId: area.id,
        areaName: area.name,
        areaColor: area.color,
        totalDesks: totalDesksInArea,
        totalReservations: totalReservationsInArea,
        recurringReservations: uniqueRecurringDesks, // Mesas únicas com reservas recorrentes
        individualReservations: uniqueIndividualDesks, // Mesas únicas com reservas individuais
        usagePercentage: usagePercentage
      };
    });
    
    // Adicionar dados para mesas sem área
    const desksWithoutArea = desksData.filter((desk: any) => !desk.area_id).length;
    if (desksWithoutArea > 0) {
      const noAreaReservations = reservationsData.filter((reservation: any) => {
        const deskAreaId = deskToAreaMap.get(reservation.desk_id);
        return !deskAreaId;
      });
      
      // Filtrar por período se especificado
      let filteredNoAreaReservations = noAreaReservations;
      if (startDate && endDate) {
        filteredNoAreaReservations = noAreaReservations.filter((reservation: any) => {
          const day = reservation.date as string;
          return day >= startDate && day <= endDate;
        });
      }
      
      const totalReservationsNoArea = filteredNoAreaReservations.length;
      const recurringReservationsNoArea = filteredNoAreaReservations.filter((r: any) => r.is_recurring);
      const individualReservationsNoArea = filteredNoAreaReservations.filter((r: any) => !r.is_recurring);
      
      const uniqueRecurringDesksNoArea = new Set(recurringReservationsNoArea.map((r: any) => r.desk_id)).size;
      const uniqueIndividualDesksNoArea = new Set(individualReservationsNoArea.map((r: any) => r.desk_id)).size;
      
      // Calcular percentual de uso para mesas sem área
      let usagePercentageNoArea = 0;
      if (desksWithoutArea > 0 && startDate && endDate) {
        if (startDate === endDate) {
          const uniqueDesksWithReservations = new Set(
            filteredNoAreaReservations.map((r: any) => r.desk_id)
          ).size;
          usagePercentageNoArea = Math.round((uniqueDesksWithReservations / desksWithoutArea) * 100 * 100) / 100;
        } else {
          const startDateObj = new Date(startDate + 'T00:00:00');
          const endDateObj = new Date(endDate + 'T23:59:59');
          const daysInPeriod = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          
          let totalOccupiedDeskDays = 0;
          let totalWorkingDays = 0;
          
          for (let d = 0; d < daysInPeriod; d++) {
            const currentDate = new Date(startDateObj);
            currentDate.setDate(startDateObj.getDate() + d);
            const dayOfWeek = currentDate.getDay();
            const dateStr = toBrazilDateString(currentDate);
            
            if (dateStr <= endDate) {
              if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                totalWorkingDays++;
                
                const reservationsOnThisDay = filteredNoAreaReservations.filter((r: any) => r.date === dateStr);
                const uniqueDesksOnThisDay = new Set(reservationsOnThisDay.map((r: any) => r.desk_id)).size;
                totalOccupiedDeskDays += uniqueDesksOnThisDay;
              }
            }
          }
          
          const totalAvailableDeskDays = desksWithoutArea * totalWorkingDays;
          usagePercentageNoArea = Math.round((totalOccupiedDeskDays / totalAvailableDeskDays) * 100 * 100) / 100;
        }
      } else if (desksWithoutArea > 0) {
        const uniqueDesksWithReservations = new Set(
          filteredNoAreaReservations.map((r: any) => r.desk_id)
        ).size;
        usagePercentageNoArea = Math.round((uniqueDesksWithReservations / desksWithoutArea) * 100 * 100) / 100;
      }
      
      usageByArea.push({
        areaId: 'sem-area',
        areaName: 'Sem Área',
        areaColor: '#d1d5db',
        totalDesks: desksWithoutArea,
        totalReservations: totalReservationsNoArea,
        recurringReservations: uniqueRecurringDesksNoArea,
        individualReservations: uniqueIndividualDesksNoArea,
        usagePercentage: usagePercentageNoArea
      });
    }

    // Calcular estatísticas gerais
    const totalReservations = usageByArea.reduce((sum: number, area: any) => sum + area.totalReservations, 0);
    const totalRecurring = usageByArea.reduce((sum: number, area: any) => sum + area.recurringReservations, 0);
    const totalIndividual = usageByArea.reduce((sum: number, area: any) => sum + area.individualReservations, 0);

    return NextResponse.json({
      usageByArea,
      summary: {
        totalReservations,
        totalRecurring,
        totalIndividual,
        period: startDate && endDate ? { startDate, endDate } : null
      }
    });

  } catch (error) {
    console.error('Error fetching usage data:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch usage data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
