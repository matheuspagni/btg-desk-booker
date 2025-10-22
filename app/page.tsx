'use client';
import { useEffect, useMemo, useState } from 'react';
import DeskMap, { Area, Slot, Desk, Reservation } from '@/components/DeskMap';
import LoadingSpinner from '@/components/LoadingSpinner';
import { supabase } from '@/lib/supabase';

type Tab = 'map';

export default function Page() {
  const [dateISO, setDateISO] = useState<string>(new Date().toISOString().slice(0,10));

  const [areas, setAreas] = useState<Area[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [desks, setDesks] = useState<Desk[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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
    // Tentar inserir a reserva
    const { data, error } = await supabase.from('reservations').insert(payload).select();
    if (error) {
      console.error('Erro ao criar reserva:', error);
      throw new Error(error.message);
    }
    return data;
  }
  async function deleteReservation(id: string) {
    const { error } = await supabase.from('reservations').delete().eq('id', id);
    if (error) {
      console.error('Erro ao deletar reserva:', error);
      throw new Error(error.message);
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
    <div className="space-y-4 px-20">
      <h1 className="text-2xl font-semibold mb-3">BTG Desk Booker</h1>

      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
            <LoadingSpinner size="lg" />
            <span className="text-gray-700 font-medium">Carregando...</span>
          </div>
        </div>
      )}

      <DeskMap
        areas={areas} slots={slots} desks={desks} reservations={reservations} dateISO={dateISO}
        onCreateReservation={createReservation}
        onDeleteReservation={deleteReservation}
        onCreateDesk={createDeskFromSlot}
        onDateChange={setDateISO}
        onFetchReservations={fetchReservations}
        onLoadMoreData={loadMoreData}
      />
    </div>
  );
}
