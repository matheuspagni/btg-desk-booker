'use client';
import { useState, useEffect } from 'react';
import DatePicker from './DatePicker';

type ReservationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (note: string, isRecurring?: boolean, recurringDays?: number[], startDate?: string, endDate?: string) => Promise<boolean>;
  deskCode: string;
  areaName: string;
  date: string;
  hasRecurringReservation?: boolean;
  onCancelRecurring?: () => void;
  existingReservation?: { id: string; note: string | null; is_recurring?: boolean };
  onDeleteReservation?: (id: string) => void;
  isCreatingReservation?: boolean;
  isDeletingReservation?: boolean;
};

export default function ReservationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  deskCode, 
  areaName, 
  date,
  hasRecurringReservation = false,
  onCancelRecurring,
  existingReservation,
  onDeleteReservation,
  isCreatingReservation = false,
  isDeletingReservation = false
}: ReservationModalProps) {
  const [note, setNote] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [startDate, setStartDate] = useState(date);
  const [endDate, setEndDate] = useState('');

  // Atualizar startDate sempre que a prop date mudar
  useEffect(() => {
    setStartDate(date);
  }, [date]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    const success = await onConfirm(note, isRecurring, selectedDays, startDate, endDate || undefined);
    if (success) {
      setNote('');
      setIsRecurring(false);
      setSelectedDays([]);
      setStartDate(date);
      setEndDate('');
    }
  };

  const handleClose = () => {
    onClose();
    setNote('');
    setIsRecurring(false);
    setSelectedDays([]);
    setStartDate(date);
    setEndDate('');
  };

  const toggleDay = (day: number) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const dayNames = ['S', 'T', 'Q', 'Q', 'S'];
  const dayLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {(isCreatingReservation || isDeletingReservation) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 flex items-center space-x-3 shadow-lg border border-gray-200 max-w-sm w-full">
            <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-btg-blue-bright"></div>
            <span className="text-gray-700 font-medium">
              {isCreatingReservation ? 'Criando reserva...' : 'Cancelando reserva...'}
            </span>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-xl border border-gray-200 max-w-md w-full max-h-[90vh] overflow-y-auto overflow-x-visible">
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
              {existingReservation ? 'Cancelar Reserva' : 'Nova Reserva'}
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {existingReservation ? (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Mesa</span>
                    <div className="font-medium text-gray-900">{deskCode}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Área</span>
                    <div className="font-medium text-gray-900">{areaName}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Data</span>
                    <div className="font-medium text-gray-900">
                      {new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { 
                        day: '2-digit', 
                        month: '2-digit', 
                        year: 'numeric' 
                      })}
                    </div>
                  </div>
                  {existingReservation.note && (
                    <div>
                      <span className="text-gray-600">Nome</span>
                      <div className="font-medium text-gray-900">{existingReservation.note}</div>
                    </div>
                  )}
                </div>
              </div>

              {existingReservation.is_recurring && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-blue-800 font-medium">
                      Esta é uma reserva recorrente
                    </span>
                  </div>
                  <div className="text-sm text-blue-700 space-y-1">
                    <div><strong>Cancelar Recorrência:</strong> cancela todos os agendamentos</div>
                    <div><strong>Cancelar Reserva:</strong> cancela apenas este dia</div>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                {hasRecurringReservation && onCancelRecurring && (
                  <button
                    onClick={onCancelRecurring}
                    className="btn-danger flex-1"
                  >
                    Cancelar Recorrência
                  </button>
                )}
                {onDeleteReservation && (
                  <button
                    onClick={() => onDeleteReservation(existingReservation.id)}
                    className="btn-danger flex-1"
                  >
                    Cancelar Reserva
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Mesa</span>
                    <div className="font-medium text-gray-900">{deskCode}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Área</span>
                    <div className="font-medium text-gray-900">{areaName}</div>
                  </div>
                  <div className="sm:col-span-2 pt-2 border-t border-gray-200">
                    <span className="text-gray-600">Data</span>
                    <div className="font-medium text-gray-900 text-xs sm:text-sm">
                      {isRecurring ? (
                        selectedDays.length > 0 ? (
                        <div className="text-blue-600">
                          {selectedDays.sort((a, b) => a - b).map(d => dayLabels[d]).join(', ')} - Recorrência semanal
                        </div>
                        ) : (
                          <div className="text-gray-500 italic">
                            Selecione os dias da semana
                          </div>
                        )
                      ) : (
                        new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          year: 'numeric' 
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Nome
                    </label>
                    <span className="text-xs text-gray-500">
                      {note.length}/16
                    </span>
                  </div>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-btg-blue-bright focus:border-btg-blue-bright transition-colors"
                    placeholder="Digite o nome da pessoa"
                    value={note}
                    onChange={(e) => setNote(e.target.value.slice(0, 16))}
                    maxLength={16}
                    autoFocus
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label htmlFor="recurring" className="text-sm font-medium text-gray-700">
                    Reserva recorrente
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsRecurring(!isRecurring)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-btg-blue-bright focus:ring-offset-2 ${
                      isRecurring ? 'bg-btg-blue-bright' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isRecurring ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {isRecurring && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Dias da semana
                      </label>
                      <div className="flex space-x-2">
                        {dayNames.map((day, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => toggleDay(index)}
                            className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                              selectedDays.includes(index)
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                            title={dayLabels[index]}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {selectedDays.length > 0 && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Início
                            </label>
                            <div className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-700">
                              {new Date(startDate + 'T00:00:00').toLocaleDateString('pt-BR', { 
                                day: '2-digit', 
                                month: '2-digit', 
                                year: 'numeric' 
                              })}
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Fim
                            </label>
                            <DatePicker
                              value={endDate}
                              onChange={setEndDate}
                              minDate={startDate}
                              placeholder="Selecione uma data"
                            />
                            <div className="text-xs text-gray-500">
                              <span>Deixe vazio para 1 ano</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  onClick={handleConfirm}
                  disabled={!note.trim() || isCreatingReservation || (isRecurring && selectedDays.length === 0)}
                  className="btn flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRecurring ? 'Criar Recorrência' : 'Confirmar Reserva'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}