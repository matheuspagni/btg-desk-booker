import { NextResponse } from 'next/server';
import { getBrazilToday } from '@/lib/date-utils';
import { supabaseServer } from '@/lib/supabase-server';

// Função para formatar data para nome do arquivo (ddMMyyyy)
function formatDateForFilename(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}${month}${year}`;
}


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
        const csvContent = 'Data;Dia da Semana;Mesa;Área;Nome;Tipo\r\n';
        const filename = startDate && endDate 
          ? `reservas-${formatDateForFilename(startDate)}-${formatDateForFilename(endDate)}.csv`
          : `reservas-${formatDateForFilename(getBrazilToday())}.csv`;
        
        // Adicionar BOM para UTF-8
        const csvWithBOM = '\uFEFF' + csvContent;
        
        return new NextResponse(csvWithBOM, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
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

      // Converter para CSV com separador ponto e vírgula (padrão brasileiro)
      // Escapar aspas duplas e quebras de linha nos dados
      const escapeCsvField = (field: string) => {
        if (field.includes(';') || field.includes('"') || field.includes('\n') || field.includes('\r')) {
          return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
      };

      const csvHeaders = 'Data;Dia da Semana;Mesa;Área;Nome;Tipo\r\n';
      const csvRows = reservations.map((reservation: any) => {
        // Criar data de forma explícita para evitar problemas de timezone
        const [year, month, day] = reservation.date.split('-').map(Number);
        const dateObj = new Date(year, month - 1, day);
        
        const date = dateObj.toLocaleDateString('pt-BR');
        const rawWeekday = dateObj
          .toLocaleDateString('pt-BR', { weekday: 'long' })
          .replace('-feira', '')
          .trim();
        const dayOfWeek = rawWeekday.charAt(0).toUpperCase() + rawWeekday.slice(1);
        const desk = deskMap.get(reservation.desk_id);
        const deskCode = desk?.code || 'N/A';
        const areaName = desk?.areas?.name || 'N/A';
        const name = reservation.note || 'N/A';
        const type = reservation.is_recurring ? 'Recorrente' : 'Individual';

        // Escapar todos os campos para evitar problemas de parsing
        return `${escapeCsvField(date)};${escapeCsvField(dayOfWeek)};${escapeCsvField(deskCode)};${escapeCsvField(areaName)};${escapeCsvField(name)};${escapeCsvField(type)}`;
      }).join('\r\n');

      const csvContent = csvHeaders + csvRows;

      const filename = startDate && endDate 
        ? `reservas-${formatDateForFilename(startDate)}-${formatDateForFilename(endDate)}.csv`
        : `reservas-${formatDateForFilename(getBrazilToday())}.csv`;

      // Adicionar BOM para UTF-8 (garante que o Excel abra corretamente)
      const csvWithBOM = '\uFEFF' + csvContent;

      return new NextResponse(csvWithBOM, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
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
