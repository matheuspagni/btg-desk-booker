'use client';
import { useState, useEffect } from 'react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

type Area = {
  id: string;
  name: string;
  color: string;
};

type EditDeskModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newCode: string, newAreaId: string, isBlocked: boolean) => Promise<void>;
  currentCode: string;
  currentAreaId: string | null;
  currentIsBlocked?: boolean;
  areas: Area[];
  isUpdating?: boolean;
};

export default function EditDeskModal({
  isOpen,
  onClose,
  onConfirm,
  currentCode,
  currentAreaId,
  currentIsBlocked = false,
  areas,
  isUpdating = false
}: EditDeskModalProps) {
  useBodyScrollLock(isOpen);
  const [newCode, setNewCode] = useState(currentCode);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(currentAreaId || null);
  const [isBlocked, setIsBlocked] = useState(currentIsBlocked);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setNewCode(currentCode);
      setSelectedAreaId(currentAreaId || null);
      setIsBlocked(currentIsBlocked);
      setError(null);
    }
  }, [isOpen, currentCode, currentAreaId, currentIsBlocked]);

  const handleConfirm = async () => {
    if (!newCode.trim()) {
      setError('O código da mesa não pode estar vazio');
      return;
    }

    setError(null);
    try {
      await onConfirm(newCode.trim().toUpperCase(), selectedAreaId || '', isBlocked);
    } catch (err: any) {
      if (err.message?.includes('CODE_EXISTS') || err.message?.includes('Já existe')) {
        setError('Já existe uma mesa com este código nesta área');
      } else if (err.message?.includes('HAS_RESERVATIONS')) {
        setError('Não é possível bloquear esta mesa pois existem reservas futuras associadas');
      } else {
        setError(err.message || 'Erro ao atualizar mesa. Tente novamente.');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 max-w-md w-full">
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
              Editar Mesa
            </h2>
            <button
              onClick={onClose}
              disabled={isUpdating}
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
                Código da mesa
              </label>
              <input
                type="text"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-btg-blue-bright focus:border-btg-blue-bright transition-colors ${
                  error ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Ex: A1, B5, C10"
                value={newCode}
                onChange={(e) => {
                  // Permitir letras, números e remover espaços
                  const value = e.target.value.toUpperCase().replace(/\s/g, '');
                  setNewCode(value);
                  setError(null);
                }}
                maxLength={10}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newCode.trim() && !isUpdating) {
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
                Código atual: <strong>{currentCode}</strong>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Área
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-btg-blue-bright focus:border-btg-blue-bright transition-colors"
                value={selectedAreaId || ''}
                onChange={(e) => {
                  setSelectedAreaId(e.target.value || null);
                  setError(null);
                }}
                disabled={isUpdating}
              >
                <option value="">Sem Área</option>
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
              <div className="flex items-center space-x-2 mt-2">
                <div
                  className="w-6 h-6 rounded border border-gray-300"
                  style={{ backgroundColor: selectedAreaId ? (areas.find(a => a.id === selectedAreaId)?.color || '#d1d5db') : '#d1d5db' }}
                />
                <span className="text-xs text-gray-500">
                  {selectedAreaId ? (areas.find(a => a.id === selectedAreaId)?.color || '#d1d5db') : '#d1d5db'}
                </span>
              </div>
            </div>

            <div>
              <label className="flex items-center justify-between">
                <div>
                  <span className="block text-sm font-medium text-gray-700 mb-1">
                    Bloquear Mesa
                  </span>
                  <p className="text-xs text-gray-500">
                    Bloqueia a mesa e impede novas reservas
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBlocked(!isBlocked)}
                  disabled={isUpdating}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-btg-blue-bright focus:ring-offset-2 disabled:opacity-50 ${
                    isBlocked ? 'bg-red-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isBlocked ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </label>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                onClick={onClose}
                disabled={isUpdating}
                className="btn-secondary flex-1 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={!newCode.trim() || isUpdating || (newCode.trim() === currentCode && (selectedAreaId || null) === (currentAreaId || null) && isBlocked === currentIsBlocked)}
                className="btn flex-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isUpdating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Atualizando...
                  </>
                ) : (
                  'Salvar'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

