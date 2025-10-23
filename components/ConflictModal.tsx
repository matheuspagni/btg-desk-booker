'use client';
import { useState } from 'react';

type Conflict = {
  date: string;
  existingName: string;
  newName: string;
};

type ConflictModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  conflicts: Conflict[];
  newReservationName: string;
};

export default function ConflictModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  conflicts, 
  newReservationName 
}: ConflictModalProps) {
  if (!isOpen) return null;

  const formatDate = (dateStr: string) => {
    // Usar UTC para evitar problemas de timezone
    const date = new Date(dateStr + 'T00:00:00');
    console.log('Formatando data:', dateStr, '->', date, '->', date.getDay());
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 max-w-md w-full max-h-[90vh] overflow-auto">
        <div className="p-6 h-full flex flex-col justify-center">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-btg-blue-light bg-opacity-20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-btg-blue-bright" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-btg-blue-deep">
                Conflito de Reservas
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="space-y-4">
            <div className="bg-btg-blue-light bg-opacity-10 border border-btg-blue-light border-opacity-30 rounded-lg p-4">
              <p className="text-sm text-btg-blue-deep">
                <strong>Já existem reservas individuais</strong> para os seguintes dias que conflitam com a recorrência de <strong>{newReservationName}</strong>:
              </p>
            </div>

            {/* Conflicts List */}
            <div className="space-y-3">
              {conflicts.map((conflict, index) => (
                <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div>
                    <p className="font-medium text-gray-900">
                      {formatDate(conflict.date)}
                    </p>
                    <p className="text-sm text-gray-600">
                      Reservado para: <span className="font-medium">{conflict.existingName}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Info Box */}
              <div className="bg-btg-blue-light bg-opacity-10 border border-btg-blue-light border-opacity-30 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-btg-blue-light bg-opacity-20 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-btg-blue-bright" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-btg-blue-deep">
                      <strong>A recorrência será criada SEM esses dias</strong>, pois já existem reservas individuais marcadas para essas datas.
                    </p>
                  </div>
                </div>
              </div>
          </div>

          {/* Actions */}
          <div className="flex justify-center mt-6">
            <button
              onClick={onConfirm}
              className="btn flex-1"
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
