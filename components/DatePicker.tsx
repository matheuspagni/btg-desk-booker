'use client';
import { useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, isToday, isBefore, startOfDay, addMonths, subMonths, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { isHoliday } from '@/lib/holidays';

type DatePickerProps = {
  value: string;
  onChange: (date: string) => void;
  minDate: string;
  placeholder?: string;
};

export default function DatePicker({ value, onChange, minDate, placeholder = "Selecione uma data" }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date(value || minDate));

  const selectedDate = value ? new Date(value + 'T00:00:00') : null;
  const minDateObj = new Date(minDate + 'T00:00:00');

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const dateFormat = 'd';
  const rows = [];
  let day = startDate;

  while (day <= endDate) {
    const dayStr = format(day, 'yyyy-MM-dd');
    const isCurrentMonth = isSameMonth(day, monthStart);
    const isSelected = selectedDate && isSameDay(day, selectedDate);
    const isTodayDate = isToday(day);
    const isPast = isBefore(day, startOfDay(new Date()));
    const isBeforeMin = isBefore(day, minDateObj);
    const holiday = isHoliday(dayStr);

    let bgColor = 'bg-white';
    let textColor = 'text-gray-900';

    if (isSelected) {
      bgColor = 'bg-btg-blue-bright';
      textColor = 'text-white';
    } else if (holiday) {
      bgColor = 'bg-purple-100';
      textColor = 'text-purple-800';
    } else if (isTodayDate) {
      bgColor = 'bg-blue-50';
      textColor = 'text-blue-600';
    } else if (!isCurrentMonth) {
      bgColor = 'bg-gray-50';
      textColor = 'text-gray-400';
    }

    const isDisabled = isPast || isBeforeMin;

    rows.push(
      <div
        key={dayStr}
        className={`
          h-8 w-8 flex items-center justify-center cursor-pointer rounded-lg transition-all hover:scale-105 text-xs font-medium
          ${isCurrentMonth ? 'opacity-100' : 'opacity-30'}
          ${bgColor}
          ${textColor}
          ${isDisabled ? 'cursor-not-allowed hover:scale-100 opacity-50' : ''}
        `}
        onClick={() => {
          if (!isDisabled) {
            onChange(dayStr);
            setIsOpen(false);
          }
        }}
      >
        {format(day, dateFormat)}
      </div>
    );
    day = addDays(day, 1);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-btg-blue-bright focus:border-btg-blue-bright transition-all duration-200 bg-white hover:border-gray-300 text-left flex items-center justify-between"
      >
        <span className={value ? 'text-gray-900' : 'text-gray-500'}>
          {value ? format(new Date(value + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : placeholder}
        </span>
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>

      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-10 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg z-[60] p-4 w-[280px] max-h-[400px] overflow-y-auto">
          {/* Header do calendário */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <h3 className="text-sm font-medium text-gray-900">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </h3>
            
            <button
              type="button"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Dias da semana */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, index) => (
              <div key={index} className="h-8 flex items-center justify-center text-xs font-medium text-gray-500">
                {day}
              </div>
            ))}
          </div>

          {/* Dias do mês */}
          <div className="grid grid-cols-7 gap-1">
            {rows}
          </div>
        </div>
      )}

      {/* Overlay para fechar */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
