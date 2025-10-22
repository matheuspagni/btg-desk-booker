'use client';
import { useEffect, useMemo, useState } from 'react';
import DeskMap, { Area, Slot, Desk, Reservation } from '@/components/DeskMap';
import { supabase } from '@/lib/supabase';

type Tab = 'map';

export default function Page() {
  const [dateISO, setDateISO] = useState<string>(new Date().toISOString().slice(0,10));

  const [areas, setAreas] = useState<Area[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [desks, setDesks] = useState<Desk[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { fetchReservations(dateISO); }, [dateISO]);

  async function fetchAll() {
    const { data: a } = await supabase.from('areas').select('*').order('created_at');
    setAreas(a || []);
    const { data: s } = await supabase.from('slots').select('*').order('row_number, col_number');
    setSlots(s || []);
    const { data: d } = await supabase.from('desks').select('*').order('code');
    setDesks(d || []);
  }

  async function fetchReservations(dateISO: string) {
    const { data: r } = await supabase
      .from('reservations')
      .select('*')
      .eq('date', dateISO)
      .order('date');
    setReservations(r || []);
  }

  async function createReservation(payload: { desk_id: string; date: string; note?: string; is_recurring?: boolean; recurring_days?: number[] }) {
    const { error } = await supabase.from('reservations').insert(payload);
    if (error) alert(error.message);
    await fetchReservations(dateISO);
  }
  async function deleteReservation(id: string) {
    const { error } = await supabase.from('reservations').delete().eq('id', id);
    if (error) alert(error.message);
    await fetchReservations(dateISO);
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

      <DeskMap
        areas={areas} slots={slots} desks={desks} reservations={reservations} dateISO={dateISO}
        onCreateReservation={createReservation}
        onDeleteReservation={deleteReservation}
        onCreateDesk={createDeskFromSlot}
        onDateChange={setDateISO}
      />
    </div>
  );
}
