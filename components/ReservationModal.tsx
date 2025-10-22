'use client';
import { useState } from 'react';

type ReservationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (note: string, isRecurring?: boolean, recurringDays?: number[]) => void;
  deskCode: string;
  areaName: string;
  date: string;
  hasRecurringReservation?: boolean;
  onCancelRecurring?: () => void;
};

export default function ReservationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  deskCode, 
  areaName, 
  date,
  hasRecurringReservation = false,
  onCancelRecurring
}: ReservationModalProps) {
  const [note, setNote] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(note, isRecurring, selectedDays);
    setNote('');
    setIsRecurring(false);
    setSelectedDays([]);
  };

  const handleClose = () => {
    onClose();
    setNote('');
    setIsRecurring(false);
    setSelectedDays([]);
  };

  const toggleDay = (day: number) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const dayNames = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-30 z-50"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div 
        className="bg-white rounded-lg shadow-lg w-96 max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-gray-900">
              {hasRecurringReservation ? 'Cancelar Recorrência' : 'Nova Reserva'}
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Mesa</span>
                  <div className="font-medium text-gray-900">{deskCode}</div>
                </div>
                <div>
                  <span className="text-gray-600">Área</span>
                  <div className="font-medium text-gray-900">{areaName}</div>
                </div>
                <div className="col-span-2 pt-2 border-t border-gray-200">
                  <span className="text-gray-600">Data</span>
                  <div className="font-medium text-gray-900">
                    {new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </div>
                </div>
              </div>
            </div>

            {hasRecurringReservation ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-red-800">
                      Esta mesa tem reserva recorrente. Cancelar removerá todas as reservas futuras desta pessoa.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">
                    Nome da reserva
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-400 focus:border-gray-400 transition-colors"
                    placeholder="Digite o nome da pessoa"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-700">Reserva recorrente</label>
                    <button
                      type="button"
                      onClick={() => setIsRecurring(!isRecurring)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        isRecurring ? 'bg-blue-600' : 'bg-gray-200'
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
                    <div className="space-y-2">
                      <label className="block text-sm text-gray-700">Dias da semana</label>
                      <div className="flex space-x-2">
                        {dayNames.map((day, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => toggleDay(index)}
                            className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${
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
                      {selectedDays.length > 0 && (
                        <p className="text-xs text-gray-500">
                          Selecionados: {selectedDays.map(d => dayLabels[d]).join(', ')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2 text-sm text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            {hasRecurringReservation ? (
              <button
                onClick={onCancelRecurring}
                className="flex-1 px-4 py-2 text-sm text-white bg-red-600 border border-red-600 rounded-md hover:bg-red-700 transition-colors"
              >
                Cancelar Recorrência
              </button>
            ) : (
              <button
                onClick={handleConfirm}
                className="flex-1 px-4 py-2 text-sm text-white bg-gray-800 border border-gray-800 rounded-md hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                disabled={!note.trim() || (isRecurring && selectedDays.length === 0)}
              >
                Confirmar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}