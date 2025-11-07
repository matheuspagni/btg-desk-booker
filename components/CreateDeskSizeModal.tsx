'use client';
import { useState, useEffect } from 'react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

type Area = {
  id: string;
  name: string;
  color: string;
};

type Desk = {
  id: string;
  code: string;
  area_id: string | null;
  is_active: boolean;
};

type CreateDeskSizeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (code: string, areaId: string | null, widthUnits: number, heightUnits: number) => Promise<void>;
  areas: Area[];
  desks: Desk[];
  defaultAreaId?: string | null;
  isCreating?: boolean;
};

export default function CreateDeskSizeModal({
  isOpen,
  onClose,
  onConfirm,
  areas,
  desks,
  defaultAreaId,
  isCreating = false
}: CreateDeskSizeModalProps) {
  useBodyScrollLock(isOpen);
  const [code, setCode] = useState('');
  // Pré-selecionar "Sem Área" (null) por padrão
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(defaultAreaId || null);
  const [widthUnits, setWidthUnits] = useState(3); // Padrão: 3 unidades (120px)
  const [heightUnits, setHeightUnits] = useState(2); // Padrão: 2 unidades (80px)
  const [error, setError] = useState<string | null>(null);

  // Ordenar áreas alfabeticamente
  const sortedAreas = [...areas].sort((a, b) => a.name.localeCompare(b.name));

  useEffect(() => {
    if (isOpen) {
      setCode('');
      // Sempre pré-selecionar "Sem Área" ao abrir o modal
      setSelectedAreaId(defaultAreaId || null);
      setWidthUnits(3);
      setHeightUnits(2);
      setError(null);
    }
  }, [isOpen, defaultAreaId]);

  const handleConfirm = async () => {
    const trimmedCode = code.trim().toUpperCase();
    
    if (!trimmedCode) {
      setError('O código da mesa não pode estar vazio');
      return;
    }

    if (widthUnits < 1 || heightUnits < 1) {
      setError('O tamanho da mesa deve ser pelo menos 1x1');
      return;
    }

    // Verificar se já existe uma mesa com este código (independente da área)
    const existingDesk = desks.find(d => 
      d.is_active && 
      d.code.toUpperCase() === trimmedCode
    );

    if (existingDesk) {
      setError('Já existe uma mesa com este código');
      return;
    }

    setError(null);
    try {
      // Passar null se selectedAreaId for vazio, não string vazia
      await onConfirm(trimmedCode, selectedAreaId, widthUnits, heightUnits);
    } catch (err: any) {
      if (err.message?.includes('CODE_EXISTS') || err.message?.includes('Já existe')) {
        setError('Já existe uma mesa com este código nesta área');
      } else {
        setError('Erro ao criar mesa. Tente novamente.');
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
                value={code}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase().replace(/\s/g, '');
                  setCode(value);
                  // Limpar erro quando o usuário começar a digitar
                  if (error) {
                    setError(null);
                  }
                  // Verificar duplicação em tempo real (opcional, pode ser apenas no submit)
                }}
                maxLength={10}
                autoFocus
              />
              {error && (
                <p className="text-sm text-red-600 mt-1">{error}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Área
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-btg-blue-bright focus:border-btg-blue-bright transition-colors"
                value={selectedAreaId || ''}
                onChange={(e) => {
                  setSelectedAreaId(e.target.value === '' ? null : e.target.value);
                  setError(null);
                }}
                disabled={isCreating}
              >
                <option value="">Sem Área</option>
                {sortedAreas.map((area) => (
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Largura (unidades)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-btg-blue-bright focus:border-btg-blue-bright"
                  value={widthUnits}
                  onChange={(e) => {
                    const value = Math.max(1, Math.min(10, parseInt(e.target.value) || 1));
                    setWidthUnits(value);
                  }}
                  disabled={isCreating}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {widthUnits * 40}px
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Altura (unidades)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-btg-blue-bright focus:border-btg-blue-bright"
                  value={heightUnits}
                  onChange={(e) => {
                    const value = Math.max(1, Math.min(10, parseInt(e.target.value) || 1));
                    setHeightUnits(value);
                  }}
                  disabled={isCreating}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {heightUnits * 40}px
                </p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                <strong>Tamanho:</strong> {widthUnits}x{heightUnits} unidades ({widthUnits * 40}x{heightUnits * 40}px)
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Você poderá arrastar e posicionar a mesa no mapa após criá-la
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
                disabled={!code.trim() || isCreating}
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


