'use client';
import { useMemo, useState, useRef, useEffect } from 'react';
import { format, getDay, isToday, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import Calendar from './Calendar';
import ReservationModal from './ReservationModal';
import RecurringCancelModal from './RecurringCancelModal';
import ConflictModal from './ConflictModal';

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
  onCreateReservation: (payload: { desk_id: string; date: string; note?: string; is_recurring?: boolean; recurring_days?: number[] }) => Promise<any>;
  onDeleteReservation: (id: string) => Promise<void>;
  onCreateDesk?: (payload: { slot_id: string; area_id: string; code: string }) => Promise<void>;
  onDateChange: (date: string) => void;
  onFetchReservations: () => Promise<void>;
  onLoadMoreData?: (startDate: string, endDate: string) => Promise<void>;
};

export default function DeskMap({ areas, slots, desks, reservations, dateISO, onCreateReservation, onDeleteReservation, onCreateDesk, onDateChange, onFetchReservations, onLoadMoreData }: Props) {
  const [selectedDesk, setSelectedDesk] = useState<Desk | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [newDeskCode, setNewDeskCode] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasRecurringReservation, setHasRecurringReservation] = useState(false);
  const [isRecurringCancelModalOpen, setIsRecurringCancelModalOpen] = useState(false);
  const [currentRecurringDays, setCurrentRecurringDays] = useState<number[]>([]);
  const [isCreatingReservation, setIsCreatingReservation] = useState(false);
  const [isDeletingReservation, setIsDeletingReservation] = useState(false);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [conflictData, setConflictData] = useState<{ conflicts: any[], newName: string, reservationsWithoutConflicts: any[] } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  

  const byDesk = useMemo(() => {
    // Filtrar reservas apenas para a data selecionada
    const reservationsForDate = reservations.filter(r => r.date === dateISO);
    return groupBy(reservationsForDate, (r: Reservation) => r.desk_id);
  }, [reservations, dateISO]);
  const date = new Date(dateISO + "T00:00:00");

  // Função para formatação amigável de data
  const getFriendlyDateLabel = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const fullDate = format(date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    
    if (isToday(date)) {
      return `Hoje - ${fullDate}`;
    } else if (isSameDay(date, tomorrow)) {
      return `Amanhã - ${fullDate}`;
    } else {
      return fullDate;
    }
  };

  // Calcular disponibilidade para o calendário
  const availabilityData = useMemo(() => {
    const data: Record<string, { available: number; total: number; isWeekend: boolean }> = {};
    
    // Para cada dia, calcular quantas mesas estão disponíveis
    const totalDesks = desks.length;
    // Se não há mesas carregadas, retornar dados vazios
    if (totalDesks === 0) {
      return data;
    }
    
    // Agrupar reservas por data
    const reservationsByDate = groupBy(reservations, (r: Reservation) => r.date);
    
    // Calcular disponibilidade para um range amplo (12 meses para frente e para trás)
    const today = new Date();
    const startDate = new Date(today);
    startDate.setMonth(today.getMonth() - 12); // 12 meses atrás
    
    const endDate = new Date(today);
    endDate.setMonth(today.getMonth() + 12); // 12 meses à frente
    
    // Calcular disponibilidade para todos os dias no range
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const dayOfWeek = getDay(currentDate); // 0 = domingo, 6 = sábado
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      const dayReservations = reservationsByDate[dateStr] || [];
      const reservedDesks = new Set(dayReservations.map(r => r.desk_id));
      const available = totalDesks - reservedDesks.size;
      
      data[dateStr] = {
        available: Math.max(0, available),
        total: totalDesks,
        isWeekend
      };
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return data;
  }, [reservations, desks]);


  async function reserve(note: string, isRecurring?: boolean, recurringDays?: number[]): Promise<boolean> {
    if (!selectedDesk) return false;
    
    setIsCreatingReservation(true);
    try {
      if (isRecurring && recurringDays && recurringDays.length > 0) {
        // Criar recorrência para 52 semanas (1 ano)
        const weeksToCreate = 52;
        
        // Preparar todas as reservas para criação em lote
        const reservationsToCreate = [];
        
        for (let week = 0; week < weeksToCreate; week++) {
          for (const day of recurringDays) {
            const targetDate = new Date(dateISO + 'T00:00:00');
            const currentDay = targetDate.getDay();
            
            // Converter índice do modal (0-4) para dia da semana real do JavaScript
            // Modal: 0=Seg, 1=Ter, 2=Qua, 3=Qui, 4=Sex
            // JavaScript: 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb
            const realDayOfWeek = day + 1; // 0->1 (Seg), 1->2 (Ter), 2->3 (Qua), etc.
            
            let daysToAdd = realDayOfWeek - currentDay;
            if (daysToAdd < 0) daysToAdd += 7; // Próxima semana
            
            // Adicionar semanas
            daysToAdd += (week * 7);
            
            const recurringDate = new Date(targetDate);
            recurringDate.setDate(targetDate.getDate() + daysToAdd);
            const dateStr = recurringDate.toISOString().split('T')[0];
            
            
            // Verificar se a data não é no passado (comparar apenas a data, não a hora)
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const recurringDateOnly = new Date(recurringDate);
            recurringDateOnly.setHours(0, 0, 0, 0);
            
            if (recurringDateOnly >= today) {
              const reservationData = { 
                desk_id: selectedDesk.id, 
                date: dateStr, 
                note,
                is_recurring: true,
                recurring_days: [day] // Usar apenas o dia específico desta reserva
              };
              
              reservationsToCreate.push(reservationData);
            }
          }
        }
        
        // Verificar conflitos com reservas individuais existentes
        const conflicts: Array<{ date: string; existingName: string; newName: string }> = [];
        const existingReservations = reservations.filter(r => r.desk_id === selectedDesk.id && !r.is_recurring);
        
        for (const reservationData of reservationsToCreate) {
          const existingReservation = existingReservations.find(r => r.date === reservationData.date);
          if (existingReservation) {
            conflicts.push({
              date: reservationData.date,
              existingName: existingReservation.note || '',
              newName: note
            });
          }
        }
        
        // Filtrar reservas que têm conflito
        const reservationsWithoutConflicts = reservationsToCreate.filter(reservationData => 
          !conflicts.some(conflict => conflict.date === reservationData.date)
        );
        
        // Mostrar modal se houver conflitos
        if (conflicts.length > 0) {
          setConflictData({
            conflicts,
            newName: note,
            reservationsWithoutConflicts
          });
          setIsConflictModalOpen(true);
          setIsCreatingReservation(false);
          return false; // Retorna false para não limpar os dados no modal
        }
        
        // Criar todas as reservas em lotes para melhor performance
        const batchSize = 10;
        for (let i = 0; i < reservationsWithoutConflicts.length; i += batchSize) {
          const batch = reservationsWithoutConflicts.slice(i, i + batchSize);
          
          try {
            await Promise.all(batch.map(reservationData => onCreateReservation(reservationData)));
          } catch (error) {
            console.error(`Erro no lote ${Math.floor(i/batchSize) + 1}:`, error);
            throw error; // Re-throw para parar o processo se houver erro
          }
        }
        
        // Atualizar as reservas apenas uma vez no final
        await onFetchReservations();
        setSuccessMessage("Reservas criadas com sucesso!");
      } else {
        await onCreateReservation({ desk_id: selectedDesk.id, date: dateISO, note });
        await onFetchReservations();
        setSuccessMessage("Reserva criada com sucesso!");
      }
      
      // Só fechar o modal se chegou até aqui sem erro
      setSelectedDesk(null);
      setIsModalOpen(false);
      setHasRecurringReservation(false);
      
      // Limpar mensagem de sucesso após 3 segundos
      setTimeout(() => setSuccessMessage(null), 3000);
      
      return true; // Retorna true para limpar os dados no modal
      
    } catch (error) {
      console.error('Erro na função reserve:', error);
      // Não fechar o modal se houve erro, para o usuário tentar novamente
      return false; // Retorna false para não limpar os dados no modal
    } finally {
      setIsCreatingReservation(false);
    }
  }

  async function handleConflictConfirm() {
    if (!conflictData) return;
    
    setIsCreatingReservation(true);
    setIsConflictModalOpen(false);
    
    try {
      // Criar todas as reservas em lotes para melhor performance
      const batchSize = 10;
      for (let i = 0; i < conflictData.reservationsWithoutConflicts.length; i += batchSize) {
        const batch = conflictData.reservationsWithoutConflicts.slice(i, i + batchSize);
        
        try {
          await Promise.all(batch.map(reservationData => onCreateReservation(reservationData)));
        } catch (error) {
          console.error(`Erro no lote ${Math.floor(i/batchSize) + 1}:`, error);
          throw error;
        }
      }
      
      // Atualizar as reservas apenas uma vez no final
      await onFetchReservations();
      
      // Fechar modal
      setSelectedDesk(null);
      setIsModalOpen(false);
      setHasRecurringReservation(false);
      
    } catch (error) {
      console.error('Erro na função reserve:', error);
    } finally {
      setIsCreatingReservation(false);
      setConflictData(null);
    }
  }

  function handleConflictCancel() {
    setIsConflictModalOpen(false);
    setConflictData(null);
    setIsCreatingReservation(false);
    // Manter o modal de reserva aberto com os dados preenchidos
    // Não fechar o modal principal nem limpar os dados
  }

  async function cancelIndividualReservation(reservationId: string) {
    setIsDeletingReservation(true);
    try {
      // Adicionar um pequeno delay para garantir que o loading seja visível
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await onDeleteReservation(reservationId);
      
      // Mostrar mensagem de sucesso
      setSuccessMessage("Reserva cancelada com sucesso!");
      
      // Fechar modal após cancelamento bem-sucedido
      setSelectedDesk(null);
      setIsModalOpen(false);
      setHasRecurringReservation(false);
      
      // Limpar mensagem de sucesso após 3 segundos
      setTimeout(() => setSuccessMessage(null), 3000);
      
    } catch (error) {
      console.error('Erro ao cancelar reserva individual:', error);
    } finally {
      setIsDeletingReservation(false);
    }
  }

  async function cancelRecurringReservation() {
    if (!selectedDesk) return;
    
    setIsDeletingReservation(true);
    
    // Pequeno delay para garantir que o loading seja visível
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      // Buscar todas as reservas recorrentes desta mesa (todas as datas)
      const allDeskReservations = reservations.filter(r => 
        r.desk_id === selectedDesk.id && r.is_recurring
      );
      
      if (allDeskReservations.length === 0) {
        setSelectedDesk(null);
        setIsModalOpen(false);
        setIsDeletingReservation(false);
        return;
      }
      
      // Deletar todas as reservas recorrentes em lotes
      const batchSize = 10;
      for (let i = 0; i < allDeskReservations.length; i += batchSize) {
        const batch = allDeskReservations.slice(i, i + batchSize);
        await Promise.all(batch.map(reservation => onDeleteReservation(reservation.id)));
      }
      
      // Atualizar as reservas após cancelamento
      await onFetchReservations();
      
      // Mostrar mensagem de sucesso
      setSuccessMessage("Recorrência cancelada com sucesso!");
      
      setSelectedDesk(null);
      setIsModalOpen(false);
      setHasRecurringReservation(false);
      
      // Limpar mensagem de sucesso após 3 segundos
      setTimeout(() => setSuccessMessage(null), 3000);
      
    } catch (error) {
      console.error('Erro ao cancelar recorrência:', error);
      alert('Erro ao cancelar recorrência. Tente novamente.');
    } finally {
      setIsDeletingReservation(false);
    }
  }

  async function cancelPartialRecurringReservation(selectedDays: number[]) {
    if (!selectedDesk) return;
    
    setIsDeletingReservation(true);
    
    // Pequeno delay para garantir que o loading seja visível
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      // Buscar a reserva do dia atual para identificar a pessoa
      const currentDayReservation = reservations.find(r => 
        r.desk_id === selectedDesk.id && r.date === dateISO && r.is_recurring
      );
      
      if (!currentDayReservation) {
        return;
      }
      
      // Buscar todas as reservas recorrentes da mesma pessoa na mesma mesa
      const samePersonReservations = reservations.filter(r => 
        r.desk_id === selectedDesk.id && 
        r.is_recurring && 
        r.note === currentDayReservation.note
      );
      
      // Filtrar apenas as reservas que correspondem aos dias selecionados
      const reservationsToCancel = samePersonReservations.filter(reservation => {
        if (!reservation.recurring_days) return false;
        
        let days: number[] = [];
        if (Array.isArray(reservation.recurring_days)) {
          days = reservation.recurring_days;
        } else if (typeof reservation.recurring_days === 'string') {
          try {
            days = JSON.parse(reservation.recurring_days);
          } catch (e) {
            days = [];
          }
        }
        
        // Verificar se o dia da reserva está nos dias selecionados
        // Como cada reserva tem apenas 1 dia, verificamos se esse dia está na seleção
        return days.length > 0 && selectedDays.includes(days[0]);
      });
      
      if (reservationsToCancel.length === 0) {
        setSelectedDesk(null);
        setIsRecurringCancelModalOpen(false);
        setIsModalOpen(false);
        setHasRecurringReservation(false);
        setIsDeletingReservation(false);
        return;
      }
      
      // Deletar as reservas selecionadas em lotes
      const batchSize = 10;
      for (let i = 0; i < reservationsToCancel.length; i += batchSize) {
        const batch = reservationsToCancel.slice(i, i + batchSize);
        await Promise.all(batch.map(reservation => onDeleteReservation(reservation.id)));
      }
      
      // Atualizar as reservas após cancelamento
      await onFetchReservations();
      
      // Mostrar mensagem de sucesso
      setSuccessMessage("Recorrência cancelada com sucesso!");
      
      setSelectedDesk(null);
      setIsRecurringCancelModalOpen(false);
      setIsModalOpen(false);
      setHasRecurringReservation(false);
      setCurrentRecurringDays([]);
      
      // Limpar mensagem de sucesso após 3 segundos
      setTimeout(() => setSuccessMessage(null), 3000);
      
    } catch (error) {
      console.error('Erro ao cancelar recorrência parcial:', error);
      alert('Erro ao cancelar recorrência. Tente novamente.');
    } finally {
      setIsDeletingReservation(false);
    }
  }


  function openRecurringCancelModal() {
    if (!selectedDesk) return;
    
    
    // Buscar a reserva específica para o dia atual
    const currentDayReservation = reservations.find(r => 
      r.desk_id === selectedDesk.id && r.date === dateISO && r.is_recurring
    );
    
    if (currentDayReservation) {
      // Buscar todas as reservas recorrentes da mesma pessoa na mesma mesa
      const samePersonReservations = reservations.filter(r => 
        r.desk_id === selectedDesk.id && 
        r.is_recurring && 
        r.note === currentDayReservation.note
      );
      
      // Combinar todos os dias únicos das reservas da mesma pessoa
      const allRecurringDays = new Set<number>();
      
      samePersonReservations.forEach(reservation => {
        let days: number[] = [];
        
        if (Array.isArray(reservation.recurring_days)) {
          days = reservation.recurring_days;
        } else if (typeof reservation.recurring_days === 'string') {
          try {
            days = JSON.parse(reservation.recurring_days);
          } catch (e) {
            days = [];
          }
        }
        
        // Adicionar cada dia ao Set (remove duplicatas automaticamente)
        days.forEach(day => allRecurringDays.add(day));
      });
      
      // Converter Set para Array e ordenar
      const uniqueRecurringDays = Array.from(allRecurringDays).sort();
      
      setCurrentRecurringDays(uniqueRecurringDays);
      setIsRecurringCancelModalOpen(true);
    }
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
          <div className="font-medium">{getFriendlyDateLabel(date)}</div>
        </div>
        <svg viewBox="0 -40 1360 440" className="w-full bg-white rounded-2xl shadow-inner">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" opacity="0.08" />
            </pattern>
          </defs>
          <rect x="0" y="-40" width="1360" height="440" fill="url(#grid)" />
          
          
          {areas.map(area => (
            <g key={area.id}>
              {slots.filter(s => s.area_id === area.id).filter(slot => {
                // Limitar corredores (linha 2 e linha 5) para apenas 2 quadrados
                if (slot.row_number === 2 || slot.row_number === 5) {
                  return slot.col_number <= 2;
                }
                return true;
              }).map(slot => {
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
                        const deskReservations = byDesk[desk.id] || [];
                        const hasReservation = deskReservations.length > 0;
                        
                        if (hasReservation) {
                          setSelectedDesk(desk);
                          
                          // Buscar reservas recorrentes desta mesa apenas para o dia atual
                          const allDeskRecurringReservations = reservations.filter(r => 
                            r.desk_id === desk.id && r.is_recurring && r.date === dateISO
                          );
                          
                          if (allDeskRecurringReservations.length > 0) {
                            // Pegar a primeira reserva recorrente para verificar os dias
                            const recurringReservation = allDeskRecurringReservations[0];
                            
                            // Sempre abrir modal normal primeiro, mesmo para reservas recorrentes
                            // Garantir que recurring_days seja um array
                            const recurringDays = Array.isArray(recurringReservation.recurring_days) 
                              ? recurringReservation.recurring_days 
                              : JSON.parse(recurringReservation.recurring_days || '[]');
                            setCurrentRecurringDays(recurringDays);
                            setHasRecurringReservation(true);
                            setIsModalOpen(true);
                          } else {
                            // Reserva única
                            setHasRecurringReservation(false);
                            setIsModalOpen(true);
                          }
                        } else {
                          setSelectedDesk(desk);
                          setHasRecurringReservation(false);
                          setIsModalOpen(true);
                        }
                      }
                    }}
                  />
                    {desk && (
                      <>
                        {/* Nome da área acima da mesa */}
                        <text 
                          x={slot.x + slot.w/2} 
                          y={slot.y + slot.h/2 - 20} 
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
                          y={slot.y + slot.h/2} 
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
                          <g>
                            <text 
                              x={slot.x + slot.w/2} 
                              y={slot.y + slot.h/2 + 20} 
                              textAnchor="middle" 
                              dominantBaseline="central" 
                              fontSize="12" 
                              fill="#666"
                              pointerEvents="none"
                            >
                              {byDesk[desk.id][0].note}
                            </text>
                            {/* Ícone de recorrência */}
                            {byDesk[desk.id][0].is_recurring && (
                              <g transform={`translate(${slot.x + slot.w - 20}, ${slot.y + 5})`}>
                                <text 
                                  x="8" 
                                  y="8" 
                                  textAnchor="middle" 
                                  dominantBaseline="central" 
                                  fontSize="18" 
                                  fill="#333"
                                  fontWeight="bold"
                                  pointerEvents="none"
                                >
                                  ↻
                                </text>
                              </g>
                            )}
                          </g>
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
          onLoadMoreData={onLoadMoreData}
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
        onCancelRecurring={openRecurringCancelModal}
        existingReservation={selectedDesk ? (byDesk[selectedDesk.id] && byDesk[selectedDesk.id].length > 0 ? byDesk[selectedDesk.id][0] : undefined) : undefined}
        isCreatingReservation={isCreatingReservation}
        isDeletingReservation={isDeletingReservation}
        onDeleteReservation={cancelIndividualReservation}
      />

      <RecurringCancelModal
        isOpen={isRecurringCancelModalOpen}
        onClose={() => {
          setIsRecurringCancelModalOpen(false);
          setCurrentRecurringDays([]);
        }}
        onConfirm={cancelPartialRecurringReservation}
        recurringDays={currentRecurringDays}
        deskCode={selectedDesk?.code || ''}
        areaName={selectedDesk ? areas.find(a => a.id === slots.find(s => s.id === selectedDesk.slot_id)?.area_id)?.name || '' : ''}
        reservationName={selectedDesk ? (byDesk[selectedDesk.id] && byDesk[selectedDesk.id].length > 0 ? (byDesk[selectedDesk.id][0].note || '') : '') : ''}
        isDeletingReservation={isDeletingReservation}
      />

      <ConflictModal
        isOpen={isConflictModalOpen}
        onClose={handleConflictCancel}
        onConfirm={handleConflictConfirm}
        conflicts={conflictData?.conflicts || []}
        newReservationName={conflictData?.newName || ''}
      />

      {/* Notificação de Sucesso */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 bg-btg-blue-bright text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-3 animate-in slide-in-from-right duration-300">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

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
