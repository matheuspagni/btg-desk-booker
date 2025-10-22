'use client';
import { useMemo, useState, useRef, useEffect } from 'react';
import { format, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Calendar from './Calendar';
import ReservationModal from './ReservationModal';

export type Area = { id: string; name: string; color: string };
export type Slot = { id: string; area_id: string; row_number: number; col_number: number; x: number; y: number; w: number; h: number; is_available: boolean };
export type Desk = { id: string; slot_id: string; area_id: string; code: string; is_active: boolean };
export type Reservation = { id: string; desk_id: string; date: string; note: string | null; is_recurring?: boolean; recurring_days?: number[] };

type Props = {
  areas: Area[];
  slots: Slot[];
  desks: Desk[];
  reservations: Reservation[];
  dateISO: string; // YYYY-MM-DD
  onCreateReservation: (payload: { desk_id: string; date: string; note?: string; is_recurring?: boolean; recurring_days?: number[] }) => Promise<void>;
  onDeleteReservation: (id: string) => Promise<void>;
  onCreateDesk?: (payload: { slot_id: string; area_id: string; code: string }) => Promise<void>;
  onDateChange: (date: string) => void;
};

export default function DeskMap({ areas, slots, desks, reservations, dateISO, onCreateReservation, onDeleteReservation, onCreateDesk, onDateChange }: Props) {
  const [selectedDesk, setSelectedDesk] = useState<Desk | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [newDeskCode, setNewDeskCode] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasRecurringReservation, setHasRecurringReservation] = useState(false);
  

  const byDesk = useMemo(() => groupBy(reservations, (r: Reservation) => r.desk_id), [reservations]);
  const date = new Date(dateISO + "T00:00:00");

  // Calcular disponibilidade para o calendário
  const availabilityData = useMemo(() => {
    const data: Record<string, { available: number; total: number }> = {};
    
    // Para cada dia, calcular quantas mesas estão disponíveis
    const totalDesks = desks.length;
    
    // Agrupar reservas por data
    const reservationsByDate = groupBy(reservations, (r: Reservation) => r.date);
    
    // Para os próximos 90 dias, calcular disponibilidade
    for (let i = 0; i < 90; i++) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + i);
      const dateStr = format(futureDate, 'yyyy-MM-dd');
      
      const dayOfWeek = getDay(futureDate); // 0 = domingo, 6 = sábado
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      const dayReservations = reservationsByDate[dateStr] || [];
      const reservedDesks = new Set(dayReservations.map(r => r.desk_id));
      const available = totalDesks - reservedDesks.size;
      
      data[dateStr] = {
        available: Math.max(0, available),
        total: totalDesks,
        isWeekend
      };
    }
    
    return data;
  }, [reservations, desks]);


  async function reserve(note: string, isRecurring?: boolean, recurringDays?: number[]) {
    if (!selectedDesk) return;
    
    if (isRecurring && recurringDays && recurringDays.length > 0) {
      // Criar reservas para todos os dias selecionados
      for (const day of recurringDays) {
        const targetDate = new Date(dateISO + 'T00:00:00');
        const currentDay = targetDate.getDay();
        let daysToAdd = day - currentDay;
        if (daysToAdd < 0) daysToAdd += 7; // Próxima semana
        
        const recurringDate = new Date(targetDate);
        recurringDate.setDate(targetDate.getDate() + daysToAdd);
        
        await onCreateReservation({ 
          desk_id: selectedDesk.id, 
          date: recurringDate.toISOString().split('T')[0], 
          note,
          is_recurring: true,
          recurring_days: recurringDays
        });
      }
    } else {
      await onCreateReservation({ desk_id: selectedDesk.id, date: dateISO, note });
    }
    
    setSelectedDesk(null);
    setIsModalOpen(false);
    setHasRecurringReservation(false);
  }

  async function cancelRecurringReservation() {
    if (!selectedDesk) return;
    
    // Buscar todas as reservas recorrentes desta pessoa nesta mesa
    const deskReservations = byDesk[selectedDesk.id] || [];
    const recurringReservations = deskReservations.filter(r => r.is_recurring);
    
    // Deletar todas as reservas recorrentes
    for (const reservation of recurringReservations) {
      await onDeleteReservation(reservation.id);
    }
    
    setSelectedDesk(null);
    setIsModalOpen(false);
    setHasRecurringReservation(false);
  }

  // Função para criar mesa em slot
  async function createDeskInSlot() {
    if (!selectedSlot || !newDeskCode || !onCreateDesk) return;
    
    await onCreateDesk({
      slot_id: selectedSlot.id,
      area_id: selectedSlot.area_id,
      code: newDeskCode
    });
    
    setSelectedSlot(null);
    setNewDeskCode('');
  }

  // Função para obter mesa por slot
  function getDeskBySlot(slotId: string): Desk | undefined {
    return desks.find(d => d.slot_id === slotId);
  }

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-9 card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-medium">{format(date, "EEEE, dd/MM", { locale: ptBR })}</div>
        </div>
        <svg viewBox="0 -40 1360 480" className="w-full bg-white rounded-2xl shadow-inner">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" opacity="0.08" />
            </pattern>
          </defs>
          <rect x="0" y="-40" width="1360" height="480" fill="url(#grid)" />
          
          
          {areas.map(area => (
            <g key={area.id}>
              {slots.filter(s => s.area_id === area.id).map(slot => {
                const desk = getDeskBySlot(slot.id);
                const isSelected = selectedSlot?.id === slot.id;
                return (
                  <g key={slot.id}>
                  <rect
                    x={slot.x} 
                    y={slot.y} 
                    width={slot.w} 
                    height={slot.h}
                    fill={desk ? deskFill(byDesk[desk.id]) : (slot.is_available ? 'rgba(16,185,129,0.1)' : 'rgba(156,163,175,0.3)')}
                    stroke={area.color}
                    strokeWidth={isSelected ? 4 : 2}
                    strokeDasharray={slot.is_available && !desk ? "5,5" : "none"}
                    rx={8}
                    className="cursor-pointer hover:opacity-80"
                    onClick={() => {
                      if (slot.is_available && !desk) {
                        setSelectedSlot(slot);
                      } else if (desk) {
                        setSelectedDesk(desk);
                        // Verificar se há reserva recorrente
                        const deskReservations = byDesk[desk.id] || [];
                        const hasRecurring = deskReservations.some(r => r.is_recurring);
                        setHasRecurringReservation(hasRecurring);
                        setIsModalOpen(true);
                      }
                    }}
                  />
                    {desk && (
                      <>
                        {/* Nome da área acima da mesa */}
                        <text 
                          x={slot.x + slot.w/2} 
                          y={slot.y + slot.h/2 - 18} 
                          textAnchor="middle" 
                          dominantBaseline="central" 
                          fontSize="14" 
                          fill="#666"
                          pointerEvents="none"
                        >
                          {areas.find(a => a.id === desk.area_id)?.name}
                        </text>
                        {/* Código da mesa */}
                        <text 
                          x={slot.x + slot.w/2} 
                          y={slot.y + slot.h/2 + 8} 
                          textAnchor="middle" 
                          dominantBaseline="central" 
                          fontSize="16" 
                          fill="#111"
                          pointerEvents="none"
                        >
                          {desk.code}
                        </text>
                        {/* Nome da reserva */}
                        {byDesk[desk.id] && byDesk[desk.id].length > 0 && (
                          <text 
                            x={slot.x + slot.w/2} 
                            y={slot.y + slot.h/2 + 22} 
                            textAnchor="middle" 
                            dominantBaseline="central" 
                            fontSize="12" 
                            fill="#666"
                            pointerEvents="none"
                          >
                            {byDesk[desk.id][0].note}
                          </text>
                        )}
                      </>
                    )}
                    {!desk && slot.is_available && (
                      <text 
                        x={slot.x + slot.w/2} 
                        y={slot.y + slot.h/2} 
                        textAnchor="middle" 
                        dominantBaseline="central" 
                        fontSize="10" 
                        fill="#6b7280"
                        pointerEvents="none"
                      >
                        {slot.row_number}-{slot.col_number}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          ))}
        </svg>
      </div>

      <div className="col-span-3 card p-4 space-y-4">
        <Calendar 
          selectedDate={dateISO}
          onDateSelect={onDateChange}
          availabilityData={availabilityData}
        />


        {selectedSlot && (
          <div className="border-t pt-2">
            <div className="font-semibold mb-2">Criar Mesa no Slot</div>
            <div className="space-y-2">
              <div className="text-sm text-gray-600">
                Slot: {selectedSlot.row_number}-{selectedSlot.col_number}
              </div>
              <input 
                className="input w-full" 
                placeholder="Código da mesa (ex: F-15)"
                value={newDeskCode}
                onChange={e => setNewDeskCode(e.target.value)}
              />
              <div className="flex gap-2">
                <button 
                  className="btn flex-1" 
                  onClick={createDeskInSlot}
                  disabled={!newDeskCode.trim()}
                >
                  Criar Mesa
                </button>
                <button 
                  className="btn-outline flex-1" 
                  onClick={() => {
                    setSelectedSlot(null);
                    setNewDeskCode('');
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}



      </div>

      <ReservationModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedDesk(null);
          setHasRecurringReservation(false);
        }}
        onConfirm={reserve}
        deskCode={selectedDesk?.code || ''}
        areaName={selectedDesk ? areas.find(a => a.id === selectedDesk.area_id)?.name || '' : ''}
        date={dateISO}
        hasRecurringReservation={hasRecurringReservation}
        onCancelRecurring={cancelRecurringReservation}
      />
    </div>
  );
}

function groupBy<T>(arr: T[], keyFn: (item: T) => string) {
  return arr.reduce((acc, item) => { const k = keyFn(item); (acc[k] ||= []).push(item); return acc; }, {} as Record<string, T[]>);
}
function deskFill(res: Reservation[]) {
  if (!res || res.length === 0) return 'rgba(16,185,129,0.15)'; // livre (verde claro)
  return 'rgba(239,68,68,0.18)'; // ocupado em algum horário
}
function deskName(desks: Desk[], id: string) {
  const d = desks.find(x => x.id === id); return d ? d.code : id;
}
function fmtHour(iso: string) {
  const d = new Date(iso); return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}
