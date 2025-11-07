'use client';
import { useState, useEffect } from 'react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

type Area = {
  id: string;
  name: string;
  color: string;
};

type CreateDeskModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (code: string, areaId: string) => Promise<void>;
  direction?: string | 'in-place';
  areas: Area[];
  defaultAreaId?: string;
  isCreating?: boolean;
};

export default function CreateDeskModal({
  isOpen,
  onClose,
  onConfirm,
  direction,
  areas,
  defaultAreaId,
  isCreating = false
}: CreateDeskModalProps) {
  useBodyScrollLock(isOpen);
  const [code, setCode] = useState('');
  const [selectedAreaId, setSelectedAreaId] = useState(defaultAreaId || areas[0]?.id || '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCode('');
      setSelectedAreaId(defaultAreaId || areas[0]?.id || '');
      setError(null);
    }
  }, [isOpen, defaultAreaId, areas]);

  const handleConfirm = async () => {
    if (!code.trim()) {
      setError('O código da mesa não pode estar vazio');
      return;
    }

    if (!selectedAreaId) {
      setError('Selecione uma área');
      return;
    }

    setError(null);
    try {
      await onConfirm(code.trim().toUpperCase(), selectedAreaId);
    } catch (err: any) {
      if (err.message?.includes('CODE_EXISTS') || err.message?.includes('Já existe')) {
        setError('Já existe uma mesa com este código nesta área');
      } else {
        setError('Erro ao criar mesa. Tente novamente.');
      }
    }
  };

  const getDirectionText = () => {
    switch (direction) {
      case 'right': return 'à direita';
      case 'left': return 'à esquerda';
      case 'above': return 'acima';
      case 'below': return 'abaixo';
      case 'in-place': return 'neste local';
      default: return '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 max-w-md w-full">
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
              Nova Mesa
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
            {direction && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  Criando mesa {getDirectionText()} da mesa selecionada
                </p>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código da mesa
              </label>
              <input
                type="text"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-btg-blue-bright focus:border-btg-blue-bright transition-colors ${
                  error ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Ex: A1, B5, C10, D3"
                value={code}
                onChange={(e) => {
                  // Permitir letras, números e remover espaços
                  const value = e.target.value.toUpperCase().replace(/\s/g, '');
                  setCode(value);
                  setError(null);
                }}
                maxLength={10}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && code.trim() && !isCreating) {
                    handleConfirm();
                  }
                  if (e.key === 'Escape') {
                    onClose();
                  }
                }}
              />
              {error && (
                <p className="text-sm text-red-600 mt-1">{error}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Digite o código que identifica esta mesa
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Área
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-btg-blue-bright focus:border-btg-blue-bright transition-colors"
                value={selectedAreaId}
                onChange={(e) => {
                  setSelectedAreaId(e.target.value);
                  setError(null);
                }}
                disabled={isCreating}
              >
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
              <div className="flex items-center space-x-2 mt-2">
                <div
                  className="w-6 h-6 rounded border border-gray-300"
                  style={{ backgroundColor: areas.find(a => a.id === selectedAreaId)?.color || '#000000' }}
                />
                <span className="text-xs text-gray-500">
                  {areas.find(a => a.id === selectedAreaId)?.color}
                </span>
              </div>
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
                disabled={!code.trim() || !selectedAreaId || isCreating}
                className="btn flex-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isCreating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Criando...
                  </>
                ) : (
                  'Criar Mesa'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

