import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'reservations' ou 'complete'
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 });
    }

    if (type === 'reservations') {
      // Exportar apenas reservas
      let url = `${supabaseUrl}/rest/v1/reservations?select=*,desks(code,areas(name)),areas(name)`;
      
      if (startDate && endDate) {
        url += `&date=gte.${startDate}&date=lte.${endDate}`;
      }

      const response = await fetch(url, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch reservations');
      }

      const reservations = await response.json();

      // Converter para CSV
      const csvHeaders = 'Data,Mesa,Área,Nome,Tipo,Recorrência\n';
      const csvRows = reservations.map((reservation: any) => {
        const date = new Date(reservation.date).toLocaleDateString('pt-BR');
        const deskCode = reservation.desk_id?.code || 'N/A';
        const areaName = reservation.desk_id?.area_id?.name || 'N/A';
        const name = reservation.note || 'N/A';
        const type = reservation.is_recurring ? 'Recorrente' : 'Individual';
        const recurringDays = reservation.is_recurring && reservation.recurring_days 
          ? reservation.recurring_days.join(',') 
          : '';

        return `"${date}","${deskCode}","${areaName}","${name}","${type}","${recurringDays}"`;
      }).join('\n');

      const csvContent = csvHeaders + csvRows;

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="reservas_${new Date().toISOString().split('T')[0]}.csv"`
        }
      });

    } else if (type === 'complete') {
      // Exportar relatório completo
      const [reservationsResponse, areasResponse, desksResponse] = await Promise.all([
        fetch(`${supabaseUrl}/rest/v1/reservations?select=*,desks(code,areas(name))`, {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch(`${supabaseUrl}/rest/v1/areas?select=*`, {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch(`${supabaseUrl}/rest/v1/desks?select=*,areas(name)`, {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
        })
      ]);

      if (!reservationsResponse.ok || !areasResponse.ok || !desksResponse.ok) {
        throw new Error('Failed to fetch complete data');
      }

      const [reservations, areas, desks] = await Promise.all([
        reservationsResponse.json(),
        areasResponse.json(),
        desksResponse.json()
      ]);

      // Gerar relatório completo em JSON
      const report = {
        generatedAt: new Date().toISOString(),
        period: startDate && endDate ? { startDate, endDate } : 'Todos os dados',
        summary: {
          totalAreas: areas.length,
          totalDesks: desks.length,
          totalReservations: reservations.length,
          recurringReservations: reservations.filter((r: any) => r.is_recurring).length,
          individualReservations: reservations.filter((r: any) => !r.is_recurring).length
        },
        areas: areas.map((area: any) => ({
          id: area.id,
          name: area.name,
          color: area.color,
          deskCount: desks.filter((desk: any) => desk.area_id === area.id).length
        })),
        reservations: reservations.map((reservation: any) => ({
          id: reservation.id,
          date: reservation.date,
          deskCode: reservation.desk_id?.code,
          areaName: reservation.desk_id?.area_id?.name,
          note: reservation.note,
          isRecurring: reservation.is_recurring,
          recurringDays: reservation.recurring_days,
          createdAt: reservation.created_at
        }))
      };

      return new NextResponse(JSON.stringify(report, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="relatorio_completo_${new Date().toISOString().split('T')[0]}.json"`
        }
      });

    } else {
      return NextResponse.json({ error: 'Invalid export type' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error exporting data:', error);
    return NextResponse.json({ 
      error: 'Failed to export data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
