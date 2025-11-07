'use client';
import { useState, useEffect, useMemo } from 'react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

type Area = {
  id: string;
  name: string;
  color: string;
};

type ManageAreasModalProps = {
  isOpen: boolean;
  onClose: () => void;
  areas: Area[];
  onAreasChange: () => Promise<void>;
};

export default function ManageAreasModal({
  isOpen,
  onClose,
  areas,
  onAreasChange
}: ManageAreasModalProps) {
  useBodyScrollLock(isOpen);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newAreaName, setNewAreaName] = useState('');
  const [newAreaColor, setNewAreaColor] = useState('#3b82f6');

  useEffect(() => {
    if (!isOpen) {
      setEditingArea(null);
      setEditName('');
      setEditColor('');
      setError(null);
      setIsCreating(false);
      setNewAreaName('');
      setNewAreaColor('#3b82f6');
    }
  }, [isOpen]);

  // Ordenar áreas alfabeticamente por nome
  const sortedAreas = useMemo(() => {
    return [...areas].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
  }, [areas]);

  const handleEdit = (area: Area) => {
    setEditingArea(area);
    setEditName(area.name);
    setEditColor(area.color);
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditingArea(null);
    setEditName('');
    setEditColor('');
    setError(null);
  };

  const handleSave = async () => {
    if (!editingArea) return;

    if (!editName.trim()) {
      setError('O nome da área não pode estar vazio');
      return;
    }

    if (!editColor.match(/^#[0-9A-Fa-f]{6}$/)) {
      setError('A cor deve estar no formato hexadecimal (#RRGGBB)');
      return;
    }

    setIsUpdating(true);
    setError(null);

    try {
      const response = await fetch(`/api/areas?id=${editingArea.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editName.trim(),
          color: editColor,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.error === 'NAME_EXISTS') {
          throw new Error('Já existe uma área com este nome');
        }
        throw new Error(errorData.error || 'Failed to update area');
      }

      await onAreasChange();
      handleCancelEdit();
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar área. Tente novamente.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCreateNew = () => {
    setIsCreating(true);
    setEditingArea(null);
    setNewAreaName('');
    setNewAreaColor('#3b82f6');
    setError(null);
  };

  const handleCancelCreate = () => {
    setIsCreating(false);
    setNewAreaName('');
    setNewAreaColor('#3b82f6');
    setError(null);
  };

  const handleCreate = async () => {
    if (!newAreaName.trim()) {
      setError('O nome da área não pode estar vazio');
      return;
    }

    if (!newAreaColor.match(/^#[0-9A-Fa-f]{6}$/)) {
      setError('A cor deve estar no formato hexadecimal (#RRGGBB)');
      return;
    }

    setIsUpdating(true);
    setError(null);

    try {
      const response = await fetch('/api/areas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newAreaName.trim(),
          color: newAreaColor,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.error === 'NAME_EXISTS') {
          throw new Error('Já existe uma área com este nome');
        }
        throw new Error(errorData.error || 'Failed to create area');
      }

      await onAreasChange();
      handleCancelCreate();
    } catch (err: any) {
      setError(err.message || 'Erro ao criar área. Tente novamente.');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
              Gerenciar Áreas
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
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {isCreating && (
              <div className="border-2 border-dashed border-btg-blue-bright rounded-lg p-4 bg-blue-50">
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-900">Nova Área</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome da Área
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-btg-blue-bright focus:border-btg-blue-bright"
                      value={newAreaName}
                      onChange={(e) => setNewAreaName(e.target.value)}
                      placeholder="Nome da área"
                      disabled={isUpdating}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cor
                    </label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
                        value={newAreaColor}
                        onChange={(e) => setNewAreaColor(e.target.value)}
                        disabled={isUpdating}
                      />
                      <input
                        type="text"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-btg-blue-bright focus:border-btg-blue-bright font-mono text-sm"
                        value={newAreaColor}
                        onChange={(e) => setNewAreaColor(e.target.value)}
                        placeholder="#000000"
                        pattern="^#[0-9A-Fa-f]{6}$"
                        disabled={isUpdating}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreate}
                      disabled={isUpdating || !newAreaName.trim()}
                      className="btn flex-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {isUpdating ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Criando...
                        </>
                      ) : (
                        'Criar Área'
                      )}
                    </button>
                    <button
                      onClick={handleCancelCreate}
                      disabled={isUpdating}
                      className="btn-secondary disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {sortedAreas.map((area) => (
              <div
                key={area.id}
                className="border border-gray-200 rounded-lg p-4"
              >
                {editingArea?.id === area.id ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nome da Área
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-btg-blue-bright focus:border-btg-blue-bright"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Nome da área"
                        disabled={isUpdating}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cor
                      </label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="color"
                          className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
                          value={editColor}
                          onChange={(e) => setEditColor(e.target.value)}
                          disabled={isUpdating}
                        />
                        <input
                          type="text"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-btg-blue-bright focus:border-btg-blue-bright font-mono text-sm"
                          value={editColor}
                          onChange={(e) => setEditColor(e.target.value)}
                          placeholder="#000000"
                          pattern="^#[0-9A-Fa-f]{6}$"
                          disabled={isUpdating}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSave}
                        disabled={isUpdating || !editName.trim()}
                        className="btn flex-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        {isUpdating ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Salvando...
                          </>
                        ) : (
                          'Salvar'
                        )}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={isUpdating}
                        className="btn-secondary disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-12 h-12 rounded-lg border-2 border-gray-300"
                        style={{ backgroundColor: area.color }}
                      />
                      <div>
                        <div className="font-medium text-gray-900">{area.name}</div>
                        <div className="text-sm text-gray-500 font-mono">{area.color}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleEdit(area)}
                      className="btn-secondary text-sm"
                    >
                      Editar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200 space-y-3">
            {!isCreating && (
              <button
                onClick={handleCreateNew}
                disabled={!!editingArea}
                className="btn w-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nova Área
              </button>
            )}
            <button
              onClick={onClose}
              className="btn-secondary w-full"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

