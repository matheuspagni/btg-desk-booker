import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'reservations' ou 'complete'
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (type === 'reservations') {
      // Exportar apenas reservas
      let query = supabaseServer
        .from('reservations')
        .select('*');
      
      if (startDate && endDate) {
        query = query.gte('date', startDate).lte('date', endDate);
      }

      const { data: reservations, error: reservationsError } = await query;

      if (reservationsError) {
        throw new Error(`Failed to fetch reservations: ${reservationsError.message}`);
      }

      if (!reservations || reservations.length === 0) {
        // Retornar CSV vazio com headers
        const csvContent = 'Data,Mesa,Área,Nome,Tipo,Recorrência\n';
        return new NextResponse(csvContent, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="reservas_${new Date().toISOString().split('T')[0]}.csv"`
          }
        });
      }

      // Buscar informações das mesas e áreas
      const deskIds = [...new Set(reservations.map((r: any) => r.desk_id))];
      const { data: desks, error: desksError } = await supabaseServer
        .from('desks')
        .select(`
          *,
          areas(name)
        `)
        .in('id', deskIds);

      if (desksError) {
        throw new Error(`Failed to fetch desks: ${desksError.message}`);
      }

      const deskMap = new Map((desks || []).map((desk: any) => [desk.id, desk]));

      // Converter para CSV
      const csvHeaders = 'Data,Mesa,Área,Nome,Tipo,Recorrência\n';
      const csvRows = reservations.map((reservation: any) => {
        const date = new Date(reservation.date).toLocaleDateString('pt-BR');
        const desk = deskMap.get(reservation.desk_id);
        const deskCode = desk?.code || 'N/A';
        const areaName = desk?.areas?.name || 'N/A';
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
