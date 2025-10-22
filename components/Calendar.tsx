'use client';
import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, isToday, isBefore, startOfDay, addMonths, subMonths, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type CalendarProps = {
  selectedDate: string; // YYYY-MM-DD
  onDateSelect: (date: string) => void;
  availabilityData: Record<string, { available: number; total: number; isWeekend?: boolean }>; // date -> availability info
  onLoadMoreData?: (startDate: string, endDate: string) => void; // Callback para carregar mais dados
};

export default function Calendar({ selectedDate, onDateSelect, availabilityData, onLoadMoreData }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate));
  const [loadedRange, setLoadedRange] = useState<{ start: string; end: string } | null>(null);

  // Atualizar o mês quando a data selecionada mudar
  useEffect(() => {
    setCurrentMonth(new Date(selectedDate));
  }, [selectedDate]);

  // Carregar dados automaticamente quando o mês muda
  useEffect(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    
    // Calcular range de 6 meses centrado no mês atual
    const centerDate = new Date(monthStart);
    centerDate.setDate(15); // Meio do mês
    
    const startDate = new Date(centerDate);
    startDate.setMonth(centerDate.getMonth() - 3); // 3 meses antes
    
    const endDate = new Date(centerDate);
    endDate.setMonth(centerDate.getMonth() + 3); // 3 meses depois
    
    const startStr = format(startDate, 'yyyy-MM-dd');
    const endStr = format(endDate, 'yyyy-MM-dd');
    
    // Verificar se já temos dados para este range (com margem de segurança)
    const needsLoad = !loadedRange || 
      startStr < loadedRange.start || 
      endStr > loadedRange.end ||
      (loadedRange && (new Date(endStr).getTime() - new Date(loadedRange.end).getTime()) > 30 * 24 * 60 * 60 * 1000); // 30 dias de diferença
    
    if (needsLoad) {
      console.log('Carregando dados para range:', { start: startStr, end: endStr, current: loadedRange });
      onLoadMoreData?.(startStr, endStr);
      setLoadedRange({ start: startStr, end: endStr });
    }
  }, [currentMonth, onLoadMoreData, loadedRange]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { locale: ptBR });
  const endDate = endOfWeek(monthEnd, { locale: ptBR });

  const dateFormat = "d";
  const rows = [];

  let days = [];
  let day = startDate;

  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayData = availabilityData[dayStr];
      const isCurrentMonth = isSameMonth(day, monthStart);
      const isSelected = dayStr === selectedDate;
      const isTodayDate = isToday(day);
      const isPast = isBefore(day, startOfDay(new Date()));
      const dayOfWeek = getDay(day); // 0 = domingo, 6 = sábado
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      // Determinar cor baseada na disponibilidade
      let bgColor = '';
      let textColor = 'text-gray-500';
      
      if (isPast || isWeekend) {
        bgColor = '';
        textColor = 'text-gray-300';
      } else if (dayData) {
        if (dayData.available > 0) {
          bgColor = 'bg-green-100';
          textColor = 'text-green-800';
        } else {
          bgColor = 'bg-red-100';
          textColor = 'text-red-800';
        }
      }

      days.push(
        <div
          key={dayStr}
          className={`
            h-[52px] flex flex-col items-center justify-center cursor-pointer rounded-lg transition-all hover:scale-105
            ${isCurrentMonth ? 'opacity-100' : 'opacity-30'}
            ${isSelected ? 'bg-blue-200 border-2 border-blue-500' : bgColor}
            ${isPast || isWeekend ? 'cursor-not-allowed hover:scale-100' : ''}
          `}
          onClick={() => {
            if (!isPast) {
              onDateSelect(dayStr);
            }
          }}
        >
          <span className={`text-sm font-medium ${textColor}`}>
            {format(day, dateFormat)}
          </span>
          {dayData && !isPast && !isWeekend && (
            <span className="text-[10px] text-gray-500">
              {dayData.available}/{dayData.total}
            </span>
          )}
        </div>
      );
      day = addDays(day, 1);
    }
    rows.push(
      <div key={format(day, 'yyyy-MM-dd')} className="grid grid-cols-7 gap-1">
        {days}
      </div>
    );
    days = [];
  }

  const monthYear = format(currentMonth, 'MMMM yyyy', { locale: ptBR });

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          ←
        </button>
        <h3 className="text-lg font-semibold capitalize">{monthYear}</h3>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          →
        </button>
      </div>
      
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, index) => (
          <div key={day} className={`text-center text-sm font-medium py-2 ${index === 0 || index === 6 ? 'text-gray-300' : 'text-gray-500'}`}>
            {day}
          </div>
        ))}
      </div>
      
      <div className="space-y-0.5 h-[280px] overflow-hidden">
        {rows}
      </div>
      
    </div>
  );
}
