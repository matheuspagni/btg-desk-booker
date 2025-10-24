'use client';
import { useState } from 'react';

type Conflict = {
  date: string;
  existingName: string;
  newName: string;
};

type RecurringConflictModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  conflicts: Conflict[];
  newReservationName: string;
};

export default function RecurringConflictModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  conflicts, 
  newReservationName 
}: RecurringConflictModalProps) {
  if (!isOpen) return null;

  const formatDate = (dateStr: string) => {
    // Criar data sem problemas de timezone
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
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
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-sm text-orange-800">
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
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-blue-800">
                    <strong>A recorrência será criada SEM esses dias</strong>, pois as reservas individuais tem prioridade sobre as recorrentes.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2 text-sm text-white bg-blue-600 border border-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              Continuar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

