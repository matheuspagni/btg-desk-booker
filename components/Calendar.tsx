'use client';
import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, isToday, isBefore, startOfDay, addMonths, subMonths, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { isHoliday, getHolidaysInRange, Holiday } from '@/lib/holidays';


type CalendarProps = {
  selectedDate: string; // YYYY-MM-DD
  onDateSelect: (date: string) => void;
  availabilityData: Record<string, { available: number; total: number; isWeekend?: boolean }>; // date -> availability info
  onLoadMoreData?: (startDate: string, endDate: string) => void; // Callback para carregar mais dados
};

export default function Calendar({ selectedDate, onDateSelect, availabilityData, onLoadMoreData }: CalendarProps) {
  // Função para criar data sem problemas de timezone
  const createDateFromISO = (isoString: string) => {
    const [year, month, day] = isoString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const [currentMonth, setCurrentMonth] = useState(createDateFromISO(selectedDate));
  const [loadedRange, setLoadedRange] = useState<{ start: string; end: string } | null>(null);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [hoveredHoliday, setHoveredHoliday] = useState<{ holiday: Holiday; x: number; y: number } | null>(null);

  // Remover tooltip quando o usuário faz scroll
  useEffect(() => {
    const handleScroll = () => {
      setHoveredHoliday(null);
    };

    // Adicionar listener para scroll em mobile
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('touchmove', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('touchmove', handleScroll);
    };
  }, []);

  // Atualizar o mês quando a data selecionada mudar
  useEffect(() => {
    setCurrentMonth(createDateFromISO(selectedDate));
  }, [selectedDate]);

  // Carregar feriados quando o mês muda
  useEffect(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    
    // Carregar feriados para o mês atual + 1 mês antes e depois
    const startDate = new Date(monthStart);
    startDate.setMonth(monthStart.getMonth() - 1);
    
    const endDate = new Date(monthEnd);
    endDate.setMonth(monthEnd.getMonth() + 1);
    
    const startStr = format(startDate, 'yyyy-MM-dd');
    const endStr = format(endDate, 'yyyy-MM-dd');
    
    const monthHolidays = getHolidaysInRange(startStr, endStr);
    setHolidays(monthHolidays);
  }, [currentMonth]);

  // Carregar dados automaticamente quando o mês muda
  useEffect(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    
    // Calcular range limitado: mês atual + 12 meses à frente
    const today = new Date();
    const currentMonthDate = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const startDate = new Date(currentMonthDate);
    // Não permitir meses anteriores ao atual
    
    const endDate = new Date(currentMonthDate);
    endDate.setMonth(currentMonthDate.getMonth() + 12); // 12 meses à frente
    
    const startStr = format(startDate, 'yyyy-MM-dd');
    const endStr = format(endDate, 'yyyy-MM-dd');
    
    // Verificar se o mês atual está dentro do range permitido
    const currentMonthStr = format(monthStart, 'yyyy-MM-dd');
    const todayStr = format(today, 'yyyy-MM-dd');
    const isWithinRange = currentMonthStr >= todayStr && currentMonthStr <= endStr;
    
    // Verificar se já temos dados para este range (com margem de segurança)
    const needsLoad = isWithinRange && (!loadedRange || 
      startStr < loadedRange.start || 
      endStr > loadedRange.end ||
      (loadedRange && (new Date(endStr).getTime() - new Date(loadedRange.end).getTime()) > 30 * 24 * 60 * 60 * 1000)); // 30 dias de diferença
    
    if (needsLoad) {
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
      const dayStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
      const dayData = availabilityData[dayStr];
      const isCurrentMonth = isSameMonth(day, monthStart);
      const isSelected = dayStr === selectedDate;
      const isTodayDate = isToday(day);
      const isPast = isBefore(day, startOfDay(new Date()));
      const dayOfWeek = getDay(day); // 0 = domingo, 6 = sábado
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const holiday = holidays.find(h => h.date === dayStr);

      // Determinar cor baseada na disponibilidade e feriados
      let bgColor = '';
      let textColor = 'text-gray-500';
      
      if (holiday && !isWeekend) {
        bgColor = 'bg-purple-100';
        textColor = 'text-purple-800';
      } else if (isPast || isWeekend) {
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
            h-[32px] xs:h-[36px] sm:h-[44px] md:h-[52px] flex flex-col items-center justify-center cursor-pointer rounded-md sm:rounded-lg transition-all hover:scale-105
            ${isCurrentMonth ? 'opacity-100' : 'opacity-30'}
            ${isSelected ? 'bg-blue-200 border-2 border-blue-500' : bgColor}
            ${isPast || (isWeekend && !holiday) ? 'cursor-not-allowed hover:scale-100' : ''}
          `}
          onClick={() => {
            if (!isPast && (!isWeekend || holiday)) {
              onDateSelect(dayStr);
            }
          }}
          onMouseEnter={(e) => {
            if (holiday && !isWeekend) {
              const rect = e.currentTarget.getBoundingClientRect();
              setHoveredHoliday({
                holiday,
                x: rect.left + rect.width / 2,
                y: rect.top - 10
              });
            }
          }}
          onMouseLeave={() => {
            setHoveredHoliday(null);
          }}
          onTouchStart={(e) => {
            // Para mobile, mostrar tooltip no touch
            if (holiday && !isWeekend) {
              const rect = e.currentTarget.getBoundingClientRect();
              setHoveredHoliday({
                holiday,
                x: rect.left + rect.width / 2,
                y: rect.top - 10
              });
              
              // Auto-remover após 3 segundos em mobile
              setTimeout(() => {
                setHoveredHoliday(null);
              }, 3000);
            }
          }}
        >
          <span className={`text-[10px] xs:text-xs sm:text-sm font-medium ${textColor}`}>
            {format(day, dateFormat)}
          </span>
          {dayData && !isPast && !isWeekend && (
            <span className="text-[6px] xs:text-[7px] sm:text-[8px] md:text-[10px] text-gray-500 leading-none">
              {dayData.available}/{dayData.total}
            </span>
          )}
        </div>
      );
      day = addDays(day, 1);
    }
    rows.push(
      <div key={format(day, 'yyyy-MM-dd')} className="grid grid-cols-7 gap-0.5 xs:gap-1">
        {days}
      </div>
    );
    days = [];
  }

  const monthYear = format(currentMonth, 'MMMM yyyy', { locale: ptBR });

  // Calcular limites de navegação
  const today = new Date();
  const currentMonthDate = new Date(today.getFullYear(), today.getMonth(), 1);
  
  const minDate = new Date(currentMonthDate);
  // Não permitir meses anteriores ao atual
  
  const maxDate = new Date(currentMonthDate);
  maxDate.setMonth(currentMonthDate.getMonth() + 12); // 12 meses à frente
  
  // Comparar ano e mês para garantir que não pode voltar
  const currentYear = currentMonth.getFullYear();
  const currentMonthNum = currentMonth.getMonth();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  
  const canGoBack = currentYear > todayYear || (currentYear === todayYear && currentMonthNum > todayMonth);
  const canGoForward = currentMonth < maxDate;

  return (
    <div className="bg-white rounded-lg shadow-sm border p-2 xs:p-3 sm:p-4 w-full max-w-sm mx-auto lg:max-w-none">
      <div className="flex items-center justify-between mb-2 xs:mb-3 sm:mb-4">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          disabled={!canGoBack}
          className={`p-1 xs:p-1.5 sm:p-2 rounded-lg transition-colors ${
            canGoBack 
              ? 'hover:bg-gray-100 cursor-pointer' 
              : 'text-gray-300 cursor-not-allowed'
          }`}
        >
          <span className="text-sm xs:text-base">←</span>
        </button>
        <h3 className="text-xs xs:text-sm sm:text-lg font-semibold capitalize px-1">{monthYear}</h3>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          disabled={!canGoForward}
          className={`p-1 xs:p-1.5 sm:p-2 rounded-lg transition-colors ${
            canGoForward 
              ? 'hover:bg-gray-100 cursor-pointer' 
              : 'text-gray-300 cursor-not-allowed'
          }`}
        >
          <span className="text-sm xs:text-base">→</span>
        </button>
      </div>
      
      <div className="grid grid-cols-7 gap-0.5 xs:gap-1 mb-1 xs:mb-2">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, index) => (
          <div key={day} className={`text-center text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-medium py-0.5 xs:py-1 sm:py-2 ${index === 0 || index === 6 ? 'text-gray-300' : 'text-gray-500'}`}>
            {day}
          </div>
        ))}
      </div>
      
      <div className="space-y-0.5">
        {rows}
      </div>
      
      {/* Tooltip para feriados */}
      {hoveredHoliday && (
        <div
          className="fixed z-50 bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-lg pointer-events-none"
          style={{
            left: `${hoveredHoliday.x}px`,
            top: `${hoveredHoliday.y}px`,
            transform: 'translateX(-50%) translateY(-100%)'
          }}
        >
          {hoveredHoliday.holiday.name}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
      
    </div>
  );
}
