'use client';
import { useState } from 'react';

type RecurringRecurringConflict = {
  date: string;
  existingName: string;
  newName: string;
  existingDays: number[];
  newDays: number[];
};

type RecurringRecurringConflictModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  conflicts: RecurringRecurringConflict[];
  newReservationName: string;
};

export default function RecurringRecurringConflictModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  conflicts, 
  newReservationName 
}: RecurringRecurringConflictModalProps) {
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

  const formatDays = (days: number[]) => {
    const dayNames = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
    return days.map(day => dayNames[day]).join(', ');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-btg-blue-bright" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Conflito de Recorrências
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
            <p className="text-sm text-gray-700">
              <strong>Já existe uma recorrência ativa</strong> nesta mesa que conflita com a nova recorrência de <strong>{newReservationName}</strong>:
            </p>

            {/* Conflicts List */}
            <div className="space-y-3">
              {conflicts.map((conflict, index) => (
                <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div>
                    <p className="font-medium text-gray-900">
                      {formatDate(conflict.date)}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      <strong>Recorrência existente:</strong> {conflict.existingName}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Dias:</strong> {formatDays(conflict.existingDays)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-sm text-blue-700">
                <strong>Você não pode criar uma nova recorrência</strong> nos mesmos dias da semana que já existe uma recorrência ativa nesta mesa. 
                Cancele a recorrência existente primeiro ou escolha dias diferentes.
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-center mt-6">
            <button
              onClick={onConfirm}
              className="btn flex-1 max-w-xs"
            >
              Entendi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
