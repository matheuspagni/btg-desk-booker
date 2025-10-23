'use client';
import { useEffect, useMemo, useState } from 'react';
import DeskMap, { Area, Slot, Desk, Reservation } from '@/components/DeskMap';
import LoadingSpinner from '@/components/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { logReservationCreate, logReservationDelete, logError, generateSessionId } from '@/lib/logger';
import LogsViewer from '@/components/LogsViewer';

type Tab = 'map';

export default function Page() {
  const [dateISO, setDateISO] = useState<string>(new Date().toISOString().slice(0,10));

  const [areas, setAreas] = useState<Area[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [desks, setDesks] = useState<Desk[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionId] = useState<string>(generateSessionId());
  const [isLogsViewerOpen, setIsLogsViewerOpen] = useState(false);

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { fetchReservations(dateISO); }, [dateISO]);

  async function fetchAll() {
    setIsLoading(true);
    try {
      const { data: a, error: areasError } = await supabase.from('areas').select('*').order('created_at');
      if (areasError) console.error('Erro ao carregar áreas:', areasError);
      setAreas(a || []);
      
      const { data: s, error: slotsError } = await supabase.from('slots').select('*').order('row_number, col_number');
      if (slotsError) console.error('Erro ao carregar slots:', slotsError);
      setSlots(s || []);
      
      const { data: d, error: desksError } = await supabase.from('desks').select('*').order('code');
      if (desksError) console.error('Erro ao carregar mesas:', desksError);
      setDesks(d || []);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchReservations(dateISO: string) {
    // Buscar reservas de todos os dias para mostrar na interface
    const { data: r, error } = await supabase
      .from('reservations')
      .select('*')
      .order('date');
    
    if (error) {
      console.error('Erro ao buscar reservas:', error);
    }
    
    setReservations(r || []);
  }

  async function loadMoreData(startDate: string, endDate: string) {
    console.log('Carregando dados para range:', { startDate, endDate });
    
    // Expandir o range para carregar mais dados
    const start = new Date(startDate);
    start.setMonth(start.getMonth() - 1); // 1 mês antes
    
    const end = new Date(endDate);
    end.setMonth(end.getMonth() + 1); // 1 mês depois
    
    const expandedStart = start.toISOString().split('T')[0];
    const expandedEnd = end.toISOString().split('T')[0];
    
    // Buscar reservas para o range expandido
    const { data: r, error } = await supabase
      .from('reservations')
      .select('*')
      .gte('date', expandedStart)
      .lte('date', expandedEnd)
      .order('date');
    
    if (error) {
      console.error('Erro ao buscar reservas do range:', error);
      return;
    }
    
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
  }

  async function createReservation(payload: { desk_id: string; date: string; note?: string; is_recurring?: boolean; recurring_days?: number[] }) {
    const startTime = Date.now();
    
    try {
      // Tentar inserir a reserva
      const { data, error } = await supabase.from('reservations').insert(payload).select();
      if (error) {
        console.error('Erro ao criar reserva:', error);
        
        // Log do erro
        await logError('CREATE', error.message, payload.desk_id, sessionId);
        
        throw new Error(error.message);
      }
      
      // Log da criação bem-sucedida
      const processingTime = Date.now() - startTime;
      await logReservationCreate(
        payload.desk_id,
        payload.date,
        payload.note || '',
        payload.is_recurring || false,
        payload.recurring_days,
        processingTime,
        sessionId
      );
      
      return data;
    } catch (error) {
      // Log do erro se não foi logado acima
      if (!(error instanceof Error) || !error.message.includes('Erro ao criar reserva')) {
        await logError('CREATE', error instanceof Error ? error.message : 'Erro desconhecido', payload.desk_id, sessionId);
      }
      throw error;
    }
  }
  async function deleteReservation(id: string) {
    const startTime = Date.now();
    
    try {
      // Buscar dados da reserva antes de deletar para o log
      const { data: reservationData, error: fetchError } = await supabase
        .from('reservations')
        .select('desk_id, date, note, is_recurring, recurring_days')
        .eq('id', id)
        .single();
      
      if (fetchError) {
        console.error('Erro ao buscar dados da reserva:', fetchError);
        await logError('DELETE', fetchError.message, undefined, sessionId);
        throw new Error(fetchError.message);
      }
      
      // Deletar a reserva
      const { error } = await supabase.from('reservations').delete().eq('id', id);
      if (error) {
        console.error('Erro ao deletar reserva:', error);
        await logError('DELETE', error.message, reservationData?.desk_id, sessionId);
        throw new Error(error.message);
      }
      
      // Log da exclusão bem-sucedida
      const processingTime = Date.now() - startTime;
      await logReservationDelete(
        reservationData.desk_id,
        reservationData.date,
        reservationData.note || '',
        reservationData.is_recurring || false,
        reservationData.recurring_days,
        processingTime,
        sessionId
      );
      
      // Atualizar as reservas após deletar
      await fetchReservations(dateISO);
    } catch (error) {
      // Log do erro se não foi logado acima
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      if (!errorMessage.includes('Erro ao deletar reserva') && !errorMessage.includes('Erro ao buscar dados da reserva')) {
        await logError('DELETE', errorMessage, undefined, sessionId);
      }
      throw error;
    }
  }


  async function createDeskFromSlot(payload: { slot_id: string; area_id: string; code: string }) {
    const { error } = await supabase.from('desks').insert({ ...payload, is_active: true });
    if (error) {
      alert(error.message);
      return;
    }
    // Marcar slot como ocupado
    await supabase.from('slots').update({ is_available: false }).eq('id', payload.slot_id);
    await fetchAll();
  }


  return (
    <>
      <div className="space-y-4 px-20 bg-white min-h-screen">
        <div className="flex items-center justify-between">
          {/* Botão de logs oculto temporariamente - descomente para reativar */}
          {/* <button
            onClick={() => setIsLogsViewerOpen(true)}
            className="px-4 py-2 text-sm text-white bg-gray-600 rounded-md hover:bg-gray-700 transition-colors flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Ver Logs</span>
          </button> */}
        </div>

        {isLoading && (
          <div 
            className="fixed top-0 left-0 right-0 bottom-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center" 
            style={{ 
              margin: '0 !important', 
              padding: '0 !important',
              top: '0 !important',
              left: '0 !important',
              right: '0 !important',
              bottom: '0 !important'
            }}
          >
            <div className="bg-white rounded-lg p-6 flex items-center space-x-3 shadow-lg border border-gray-200">
              <LoadingSpinner size="lg" />
              <span className="text-btg-blue-deep font-medium">Carregando...</span>
            </div>
          </div>
        )}

        <DeskMap
          areas={areas} slots={slots} desks={desks} reservations={reservations} dateISO={dateISO}
          onCreateReservation={createReservation}
          onDeleteReservation={deleteReservation}
          onCreateDesk={createDeskFromSlot}
          onDateChange={setDateISO}
          onFetchReservations={() => fetchReservations(dateISO)}
          onLoadMoreData={loadMoreData}
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
