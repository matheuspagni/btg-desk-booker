'use client';

import { useEffect, useMemo, useState } from 'react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

type Office = {
  id: string;
  name: string;
  company_id: string;
};

type Floor = {
  id: string;
  name: string;
  office_id: string;
};

type ManageCompanyModalProps = {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  companyName: string;
  onHierarchyChange?: () => Promise<void> | void;
};

type LoadState = 'idle' | 'loading';

export default function ManageCompanyModal({
  isOpen,
  onClose,
  companyId,
  companyName,
  onHierarchyChange,
}: ManageCompanyModalProps) {
  useBodyScrollLock(isOpen);
  const [offices, setOffices] = useState<Office[]>([]);
  const [floorsByOffice, setFloorsByOffice] = useState<Record<string, Floor[]>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [newOfficeName, setNewOfficeName] = useState<string>('');
  const [newFloorNames, setNewFloorNames] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [operationState, setOperationState] = useState<LoadState>('idle');
  const [systemModal, setSystemModal] = useState<{ title: string; message: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<
    | { type: 'office'; officeId: string; name: string }
    | { type: 'floor'; officeId: string; floorId: string; name: string }
    | null
  >(null);
  const collator = useMemo(
    () => new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' }),
    []
  );

  useEffect(() => {
    if (!isOpen) {
      setSystemModal(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setNewOfficeName('');
      setNewFloorNames({});
      loadHierarchy();
    }
  }, [isOpen, companyId]);

  useEffect(() => {
    if (!isOpen) {
      setSystemModal(null);
      setConfirmAction(null);
    }
  }, [isOpen]);

  async function loadHierarchy() {
    setIsLoading(true);
    try {
      const officesRes = await fetch(`/api/offices?companyId=${companyId}`);
      if (!officesRes.ok) {
        throw new Error(await officesRes.text());
      }
      const officesData: Office[] = await officesRes.json();
      setOffices(officesData);

      const floorsMap: Record<string, Floor[]> = {};
      await Promise.all(
        officesData.map(async (office) => {
          const floorsRes = await fetch(`/api/floors?officeId=${office.id}`);
          if (floorsRes.ok) {
            const floorsData: Floor[] = await floorsRes.json();
            floorsMap[office.id] = floorsData.sort((a, b) => collator.compare(a.name, b.name));
          } else {
            floorsMap[office.id] = [];
          }
        })
      );
      setFloorsByOffice(floorsMap);
    } catch (error) {
      console.error('Erro ao carregar escritórios/andares:', error);
      setErrorMessage('Não foi possível carregar os escritórios. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }

  const sortedOffices = useMemo(() => {
    return [...offices].sort((a, b) => collator.compare(a.name, b.name));
  }, [offices, collator]);

  async function handleCreateOffice() {
    if (!newOfficeName.trim()) {
      setErrorMessage('Informe um nome para o escritório.');
      return;
    }
    setOperationState('loading');
    try {
      const response = await fetch('/api/offices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          name: newOfficeName.trim(),
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setErrorMessage(data.message || 'Não foi possível criar o escritório.');
        return;
      }
      setNewOfficeName('');
      await loadHierarchy();
      if (onHierarchyChange) await onHierarchyChange();
    } catch (error) {
      console.error('Erro ao criar escritório:', error);
      setErrorMessage('Erro inesperado ao criar escritório.');
    } finally {
      setOperationState('idle');
    }
  }

  async function handleCreateFloor(officeId: string) {
    const name = (newFloorNames[officeId] || '').trim();
    if (!name) {
      setErrorMessage('Informe o número do andar.');
      return;
    }
    if (!/^\d+$/.test(name)) {
      setErrorMessage('Use apenas números inteiros para identificar o andar.');
      return;
    }
    setOperationState('loading');
    try {
      const response = await fetch('/api/floors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          officeId,
          name,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setErrorMessage(data.message || 'Não foi possível criar o andar.');
        return;
      }
      setNewFloorNames((prev) => ({ ...prev, [officeId]: '' }));
      await loadHierarchy();
      if (onHierarchyChange) await onHierarchyChange();
    } catch (error) {
      console.error('Erro ao criar andar:', error);
      setErrorMessage('Erro inesperado ao criar andar.');
    } finally {
      setOperationState('idle');
    }
  }


  const requestDeleteOffice = (officeId: string, officeName: string) => {
    setConfirmAction({ type: 'office', officeId, name: officeName });
  };

  const requestDeleteFloor = (officeId: string, floorId: string, floorName: string) => {
    setConfirmAction({ type: 'floor', officeId, floorId, name: floorName });
  };

  async function handleDeleteOffice(officeId: string) {
    setOperationState('loading');
    try {
      const response = await fetch(`/api/offices/${officeId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (response.status === 400) {
          setSystemModal({
            title: 'Não foi possível excluir o escritório',
            message:
              data.message ||
              'Existem mapas vinculados aos andares deste escritório. Remova ou transfira os mapas antes de excluir.',
          });
        } else {
          setErrorMessage(data.message || 'Não foi possível excluir o escritório.');
        }
        return;
      }
      await loadHierarchy();
      if (onHierarchyChange) await onHierarchyChange();
      setErrorMessage(null);
      setConfirmAction(null);
    } catch (error) {
      console.error('Erro ao excluir escritório:', error);
      setErrorMessage('Erro inesperado ao excluir escritório.');
    } finally {
      setOperationState('idle');
    }
  }

  async function handleDeleteFloor(officeId: string, floorId: string) {
    setOperationState('loading');
    try {
      const response = await fetch(`/api/floors/${floorId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (response.status === 400) {
          setSystemModal({
            title: 'Não foi possível excluir o andar',
            message:
              data.message ||
              'Existem mapas associados a este andar. Remova ou mova os mapas antes de realizar a exclusão.',
          });
        } else {
          setErrorMessage(data.message || 'Não foi possível excluir o andar.');
        }
        return;
      }
      await loadHierarchy();
      if (onHierarchyChange) await onHierarchyChange();
      setErrorMessage(null);
      setConfirmAction(null);
    } catch (error) {
      console.error('Erro ao excluir andar:', error);
      setErrorMessage('Erro inesperado ao excluir andar.');
    } finally {
      setOperationState('idle');
    }
  }

  async function handleConfirmDeletion() {
    if (!confirmAction) return;
    if (confirmAction.type === 'office') {
      await handleDeleteOffice(confirmAction.officeId);
    } else {
      await handleDeleteFloor(confirmAction.officeId, confirmAction.floorId!);
    }
  }

  if (!isOpen) return null;

  return (
    <>
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-50 px-4 py-6">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Estrutura da empresa</h2>
              <p className="text-sm text-gray-600">
                Gerencie escritórios e andares da empresa <span className="font-medium">{companyName}</span>.
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-btg-blue-bright"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {errorMessage && (
            <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Adicionar escritório</h3>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={newOfficeName}
                onChange={(event) => setNewOfficeName(event.target.value)}
                placeholder="Nome do escritório"
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-btg-blue-bright focus:outline-none focus:ring-2 focus:ring-btg-blue-bright"
                disabled={operationState === 'loading'}
              />
              <button
                type="button"
                onClick={handleCreateOffice}
                disabled={operationState === 'loading'}
                className="inline-flex items-center justify-center rounded-md bg-btg-blue-bright px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-btg-blue-deep focus:outline-none focus:ring-2 focus:ring-btg-blue-bright focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Adicionar escritório
              </button>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Escritórios e Andares</h3>
            {isLoading ? (
              <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-4 text-sm text-gray-600">
                Carregando estrutura...
              </div>
            ) : sortedOffices.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 bg-white px-4 py-5 text-center text-sm text-gray-600">
                Nenhum escritório cadastrado ainda. Crie o primeiro escritório acima.
              </div>
            ) : (
              sortedOffices.map((office) => {
                const floors = floorsByOffice[office.id] || [];
                const orderedFloors = floors.slice().sort((a, b) => collator.compare(a.name, b.name));
                return (
                  <div key={office.id} className="rounded-lg border border-gray-200 bg-white px-4 py-4 shadow-sm">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-gray-900">{office.name}</h4>
                        <button
                          type="button"
                          onClick={() => requestDeleteOffice(office.id, office.name)}
                          disabled={operationState === 'loading'}
                          title="Excluir escritório"
                          className="rounded-full p-1 text-gray-400 transition hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673A2.25 2.25 0 0 1 15.916 21.75H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.02-2.09 2.2v.917m7.5 0a48.667 48.667 0 0 0-7.5 0"
                            />
                          </svg>
                        </button>
                      </div>
                      <span className="text-xs text-gray-500">
                        {floors.length} {floors.length === 1 ? 'andar' : 'andares'}
                      </span>
                    </div>
                    <ul className="space-y-1 text-sm text-gray-700">
                      {floors.length === 0 ? (
                        <li className="rounded-md border border-dashed border-gray-300 px-3 py-2 text-xs text-gray-500">
                          Nenhum andar cadastrado para este escritório.
                        </li>
                      ) : (
                        orderedFloors.map((floor) => (
                          <li
                            key={floor.id}
                        className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2"
                          >
                            <span>Andar {floor.name}</span>
                            <button
                              type="button"
                              onClick={() => requestDeleteFloor(office.id, floor.id, floor.name)}
                              disabled={operationState === 'loading'}
                              title="Excluir andar"
                              className="rounded-full p-1 text-gray-400 transition hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1.5}
                                  d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673A2.25 2.25 0 0 1 15.916 21.75H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.02-2.09 2.2v.917m7.5 0a48.667 48.667 0 0 0-7.5 0"
                                />
                              </svg>
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={newFloorNames[office.id] || ''}
                        onChange={(event) =>
                          setNewFloorNames((prev) => ({ ...prev, [office.id]: event.target.value }))
                        }
                        placeholder="Número do andar"
                        className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-btg-blue-bright focus:outline-none focus:ring-2 focus:ring-btg-blue-bright"
                        disabled={operationState === 'loading'}
                      />
                      <button
                        type="button"
                        onClick={() => handleCreateFloor(office.id)}
                        disabled={operationState === 'loading'}
                        className="inline-flex items-center justify-center rounded-md border border-btg-blue-bright px-4 py-2 text-sm font-medium text-btg-blue-bright hover:bg-btg-blue-bright hover:text-white focus:outline-none focus:ring-2 focus:ring-btg-blue-bright focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Adicionar andar
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </section>
        </div>

        <div className="border-t border-gray-200 px-6 py-4 text-right">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-btg-blue-bright focus:ring-offset-2"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 px-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl border border-gray-200">
            <div className="flex items-start justify-between px-5 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3m0 4h.01M5.455 19h13.09c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.723 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-gray-900">Confirmação necessária</h3>
              </div>
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-btg-blue-bright focus:ring-offset-2"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-5 py-4 text-sm text-gray-700 space-y-2">
              {confirmAction.type === 'office' ? (
                <p>Ao excluir o escritório <span className="font-semibold">{confirmAction.name}</span>, todos os andares relacionados serão removidos. Essa ação não pode ser desfeita.</p>
              ) : (
                <p>Ao excluir o andar <span className="font-semibold">{confirmAction.name}</span>, os mapas vinculados deixarão de apontar para ele. Deseja continuar?</p>
              )}
            </div>
            <div className="flex justify-end gap-3 px-5 pb-5 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                disabled={operationState === 'loading'}
                className="inline-flex items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-btg-blue-bright focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletion}
                disabled={operationState === 'loading'}
                className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {operationState === 'loading' ? (
                  <>
                    <svg className="mr-2 h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v4m0 8v4m4-4h4m-8 0H4m4-4H4m8 0h4m0-4V4m0 8h4" />
                    </svg>
                    Excluindo...
                  </>
                ) : (
                  'Excluir'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {systemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 px-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl border border-gray-200">
            <div className="flex items-start justify-between px-5 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m0 3h.007v.008H12v-.008ZM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-gray-900">{systemModal.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSystemModal(null)}
                className="rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-btg-blue-bright focus:ring-offset-2"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-5 py-4 text-sm text-gray-700 whitespace-pre-line">
              {systemModal.message}
            </div>
            <div className="flex justify-end gap-3 px-5 pb-5">
              <button
                type="button"
                onClick={() => setSystemModal(null)}
                className="inline-flex items-center justify-center rounded-md bg-btg-blue-bright px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-btg-blue-deep focus:outline-none focus:ring-2 focus:ring-btg-blue-bright focus:ring-offset-2"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


