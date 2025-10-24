'use client';
import { useState } from 'react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

type ConflictModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  existingName: string;
  newName: string;
  date: string;
  deskCode: string;
};

export default function ConflictModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  existingName, 
  newName, 
  date, 
  deskCode 
}: ConflictModalProps) {
  // Bloquear scroll do body quando modal estiver aberto
  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Conflito de Reserva
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-yellow-800">
                    Já existe uma reserva para a mesa <strong>{deskCode}</strong> no dia <strong>{(() => {
                      const [year, month, day] = date.split('-').map(Number);
                      return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
                    })()}</strong>.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium text-gray-600">Reserva existente:</span>
                  <p className="text-sm text-gray-900">{existingName}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Nova reserva:</span>
                  <p className="text-sm text-gray-900">{newName}</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                Deseja substituir a reserva existente pela nova?
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 px-4 rounded-lg transition-colors text-center"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="btn-danger flex-1"
            >
              Substituir Reserva
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}