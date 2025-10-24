'use client';
import { useState, useEffect } from 'react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

type RecurringCancelModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedDays: number[]) => void;
  recurringDays: number[];
  deskCode: string;
  areaName: string;
  reservationName: string;
  isDeletingReservation?: boolean;
};

const dayLabels = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];

export default function RecurringCancelModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  recurringDays,
  deskCode,
  areaName,
  reservationName,
  isDeletingReservation = false
}: RecurringCancelModalProps) {
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  // Bloquear scroll do body quando modal estiver aberto
  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (isOpen) {
      // Inicializar com todos os dias da recorrência selecionados
      setSelectedDays([...recurringDays]);
    }
  }, [isOpen, recurringDays]);

  const toggleDay = (dayIndex: number) => {
    setSelectedDays(prev => 
      prev.includes(dayIndex) 
        ? prev.filter(d => d !== dayIndex)
        : [...prev, dayIndex]
    );
  };

  const handleConfirm = () => {
    if (selectedDays.length > 0) {
      onConfirm(selectedDays);
    }
  };

  const handleSelectAll = () => {
    setSelectedDays([...recurringDays]);
  };

  const handleSelectNone = () => {
    setSelectedDays([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      {isDeletingReservation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 flex items-center space-x-3 shadow-lg border border-gray-200">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-btg-blue-bright"></div>
            <span className="text-btg-blue-deep font-medium">Cancelando reservas...</span>
          </div>
        </div>
      )}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 max-w-md w-full max-h-[90vh] overflow-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Cancelar Reserva Recorrente
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-6">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Mesa</span>
                  <div className="font-medium text-gray-900">{deskCode}</div>
                </div>
                <div>
                  <span className="text-gray-600">Área</span>
                  <div className="font-medium text-gray-900">{areaName}</div>
                </div>
                <div>
                  <span className="text-gray-600">Reservado para</span>
                  <div className="font-medium text-gray-900"><strong>{reservationName}</strong></div>
                </div>
              </div>
            </div>
          </div>


          <div className="mb-6">
            <p className="text-sm text-gray-700 mb-4">
              Selecione quais dias da semana você deseja cancelar da recorrência:
            </p>
            
            <div className="space-y-3">
              <div className="flex space-x-2">
                {recurringDays.map((dayIndex) => (
                  <button
                    key={dayIndex}
                    type="button"
                    onClick={() => toggleDay(dayIndex)}
                    className={`flex-1 px-2 py-2 rounded-md text-xs font-medium transition-colors ${
                      selectedDays.includes(dayIndex)
                        ? 'bg-btg-blue-light bg-opacity-20 text-btg-blue-deep border-2 border-btg-blue-light'
                        : 'bg-gray-100 text-gray-700 border-2 border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    {dayLabels[dayIndex]}
                  </button>
                ))}
              </div>
              
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-3 py-1 text-xs text-btg-blue-bright hover:text-btg-blue-medium transition-colors"
              >
                Selecionar Todos
              </button>
              <button
                type="button"
                onClick={handleSelectNone}
                className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800 transition-colors"
              >
                Desmarcar Todos
              </button>
            </div>
            </div>
          </div>

          {selectedDays.length > 0 && (
            <div className="mb-6 bg-btg-blue-light bg-opacity-10 border border-btg-blue-light border-opacity-30 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-btg-blue-bright" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <p className="text-sm text-btg-blue-deep">
                  <strong>Serão canceladas {selectedDays.length} recorrências:</strong> {selectedDays.sort((a, b) => a - b).map(d => dayLabels[d]).join(', ')}
                </p>
              </div>
            </div>
          )}

          <div className="flex space-x-3">
            <button
              onClick={handleConfirm}
              disabled={selectedDays.length === 0}
              className="btn-danger flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar Selecionados
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
