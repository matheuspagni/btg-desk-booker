'use client';
import { useState, useEffect } from 'react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

type NewRowModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (rowName: string) => void;
  isCreating?: boolean;
};

export default function NewRowModal({
  isOpen,
  onClose,
  onConfirm,
  isCreating = false
}: NewRowModalProps) {
  useBodyScrollLock(isOpen);
  const [rowName, setRowName] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setRowName('');
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (rowName.trim()) {
      onConfirm(rowName.trim().toUpperCase());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 max-w-md w-full">
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
              Nova Linha
            </h2>
            <button
              onClick={onClose}
              disabled={isCreating}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome da linha (ex: D, E, F)
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-btg-blue-bright focus:border-btg-blue-bright transition-colors"
                placeholder="Digite o nome da linha"
                value={rowName}
                onChange={(e) => {
                  // Apenas letras, máximo 1 caractere
                  const value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 1);
                  setRowName(value);
                }}
                maxLength={1}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && rowName.trim()) {
                    handleConfirm();
                  }
                }}
              />
              <p className="text-xs text-gray-500 mt-1">
                Use uma única letra para identificar a linha (ex: D para linha D)
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                onClick={onClose}
                disabled={isCreating}
                className="btn-secondary flex-1 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={!rowName.trim() || isCreating}
                className="btn flex-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isCreating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Criando...
                  </>
                ) : (
                  'Confirmar'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


