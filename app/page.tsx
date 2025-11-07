'use client';
import { useEffect, useMemo, useState } from 'react';
import DeskMap, { Area, Slot, Desk, Reservation, Chair } from '@/components/DeskMap';
import { logReservationCreate, logReservationDelete, logError, generateSessionId, initializeIPCapture } from '@/lib/logger';
import LogsViewer from '@/components/LogsViewer';
import { format, getDay, addDays } from 'date-fns';
import { toBrazilDateString } from '@/lib/date-utils';

type Tab = 'map';

export default function Page() {
  // Inicializar vazio para evitar divergência de SSR vs cliente; definir no mount
  const [dateISO, setDateISO] = useState<string>('');

  useEffect(() => {
    const now = new Date();
    const dayOfWeek = getDay(now); // 0 = domingo, 6 = sábado

    let targetDate = now;
    if (dayOfWeek === 0) {
      targetDate = addDays(now, 1); // Próxima segunda
    } else if (dayOfWeek === 6) {
      targetDate = addDays(now, 2); // Próxima segunda
    }

    setDateISO(toBrazilDateString(targetDate));
  }, []);

  const [areas, setAreas] = useState<Area[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [desks, setDesks] = useState<Desk[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [chairs, setChairs] = useState<Chair[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionId] = useState<string>(generateSessionId());
  const [isLogsViewerOpen, setIsLogsViewerOpen] = useState(false);

  useEffect(() => { 
    fetchAll(); 
    initializeIPCapture(); // Inicializar captura de IP
  }, []);
  useEffect(() => { fetchReservations(dateISO); }, [dateISO]);

  async function fetchAll() {
    setIsLoading(true);
    try {
      const [areasRes, slotsRes, desksRes, chairsRes] = await Promise.all([
        fetch('/api/areas'),
        fetch('/api/slots'),
        fetch('/api/desks'),
        fetch('/api/chairs')
      ]);

      if (areasRes.ok) {
        const areasData = await areasRes.json();
        setAreas(areasData);
      } else {
        console.error('Erro ao carregar áreas:', await areasRes.text());
      }
      
      if (slotsRes.ok) {
        const slotsData = await slotsRes.json();
        setSlots(slotsData);
      } else {
        console.error('Erro ao carregar slots:', await slotsRes.text());
      }
      
      if (desksRes.ok) {
        const desksData = await desksRes.json();
        setDesks(desksData);
      } else {
        console.error('Erro ao carregar mesas:', await desksRes.text());
      }
      
      if (chairsRes.ok) {
        const chairsData = await chairsRes.json();
        setChairs(chairsData);
      } else {
        console.error('Erro ao carregar cadeiras:', await chairsRes.text());
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchReservations(dateISO: string) {
    try {
      const response = await fetch('/api/reservations');
      if (response.ok) {
        const data = await response.json();
        setReservations(data);
      } else {
        console.error('Erro ao buscar reservas:', await response.text());
      }
    } catch (error) {
      console.error('Erro ao buscar reservas:', error);
    }
  }

  async function loadMoreData(startDate: string, endDate: string) {
    
    // Expandir o range para carregar mais dados
    const start = new Date(startDate);
    start.setMonth(start.getMonth() - 1); // 1 mês antes
    
    const end = new Date(endDate);
    end.setMonth(end.getMonth() + 1); // 1 mês depois
    
    const expandedStart = format(start, 'yyyy-MM-dd');
    const expandedEnd = format(end, 'yyyy-MM-dd');
    
    // Buscar reservas para o range expandido via API
    try {
      const response = await fetch(`/api/reservations?startDate=${expandedStart}&endDate=${expandedEnd}`);
      
      if (!response.ok) {
        console.error('Erro ao buscar reservas do range:', await response.text());
        return;
      }
      
      const r = await response.json();
      
      // Mesclar com as reservas existentes (expandir range em vez de substituir)
      setReservations(prev => {
        const existingReservations = prev.filter(res => 
          res.date < expandedStart || res.date > expandedEnd
        );
        const newReservations = r || [];
        
        // Combinar e remover duplicatas
        const combined = [...existingReservations, ...newReservations];
        const unique = combined.filter((res, index, self) => 
          index === self.findIndex(r => r.id === res.id)
        );
        
        return unique.sort((a, b) => a.date.localeCompare(b.date));
      });
    } catch (error) {
      console.error('Erro ao buscar reservas do range:', error);
    }
  }


  // Nova função para criação em lote (otimizada)
  async function createBulkReservations(reservations: Array<{ desk_id: string; date: string; note?: string; is_recurring?: boolean; recurring_days?: number[] }>) {
    const startTime = Date.now();
    
    try {
      const response = await fetch('/api/reservations/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reservations }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erro ao criar reservas em lote:', errorData);
        
        // Se for um conflito (409), lançar erro específico para ser tratado no frontend
        if (response.status === 409 && errorData.error === 'CONFLICT') {
          const conflictError = new Error('CONFLICT');
          (conflictError as any).conflicts = errorData.conflicts;
          throw conflictError;
        }
        
        throw new Error(errorData.error || 'Failed to create bulk reservations');
      }
      
      const result = await response.json();
      
      // Log otimizado - apenas um log para todo o lote
      const processingTime = Date.now() - startTime;
      const firstReservation = reservations[0];
      await logReservationCreate(
        firstReservation.desk_id,
        firstReservation.date,
        firstReservation.note || '',
        firstReservation.is_recurring || false,
        firstReservation.recurring_days,
        processingTime,
        sessionId,
        reservations.length // quantidade de reservas criadas
      );
      
      return { success: true, count: result.count };
    } catch (error) {
      console.error('Erro ao criar reservas em lote:', error);
      throw error;
    }
  }

  // Nova função para deleção em lote (otimizada)
  async function deleteBulkReservations(ids: string[]) {
    const startTime = Date.now();
    
    try {
      // Buscar dados das reservas antes de deletar para o log
      const reservationsToDelete = reservations.filter(r => ids.includes(r.id));
      
      if (reservationsToDelete.length === 0) {
        throw new Error('Nenhuma reserva encontrada para deletar');
      }
      
      const response = await fetch(`/api/reservations/bulk?ids=${ids.join(',')}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erro ao deletar reservas em lote:', errorData);
        throw new Error(errorData.error || 'Failed to delete bulk reservations');
      }
      
      const result = await response.json();
      
      // Log otimizado - usar dados da primeira reserva como representativo
      const processingTime = Date.now() - startTime;
      const firstReservation = reservationsToDelete[0];
      await logReservationDelete(
        firstReservation.desk_id,
        firstReservation.date,
        firstReservation.note || '',
        firstReservation.is_recurring || false,
        firstReservation.recurring_days || [],
        processingTime,
        sessionId,
        ids.length // quantidade de reservas deletadas
      );
      
      return { success: true, count: result.count };
    } catch (error) {
      console.error('Erro ao deletar reservas em lote:', error);
      throw error;
    }
  }




  if (!dateISO) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="bg-white rounded-lg p-4 shadow border border-gray-200 flex items-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-btg-blue-bright"></div>
          <span className="text-gray-700 text-sm">Carregando data...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {isLoading && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center"
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0,
            width: '100vw', 
            height: '100vh',
            zIndex: 9999
          }}
        >
          <div className="bg-white rounded-lg p-3 sm:p-4 flex items-center space-x-2 shadow-lg border border-gray-200 w-auto">
            <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-btg-blue-bright"></div>
            <span className="text-gray-700 font-medium text-sm">Carregando...</span>
          </div>
        </div>
      )}

      <div className="h-full flex flex-col px-1 sm:px-2 lg:px-3 pb-1 sm:pb-2 lg:pb-3 bg-white" style={{ minHeight: 0, overflow: 'hidden' }}>
        <DeskMap
          areas={areas} slots={slots} desks={desks} reservations={reservations} chairs={chairs} dateISO={dateISO}
          onDateChange={setDateISO}
          onFetchReservations={() => fetchReservations(dateISO)}
          onLoadMoreData={loadMoreData}
          onCreateBulkReservations={createBulkReservations}
          onDeleteBulkReservations={deleteBulkReservations}
          onDesksChange={fetchAll}
          onSlotsChange={fetchAll}
          onAreasChange={fetchAll}
          onChairsChange={fetchAll}
        />
      </div>

      {/* LogsViewer oculto temporariamente - descomente para reativar */}
      {/* <LogsViewer
        isOpen={isLogsViewerOpen}
        onClose={() => setIsLogsViewerOpen(false)}
      /> */}
    </>
  );
}
