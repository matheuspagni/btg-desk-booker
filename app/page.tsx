'use client';

export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import ManageCompanyModal from '@/components/ManageCompanyModal';
type MapSummary = {
  id: string;
  name: string;
  created_at: string;
  company_id: string | null;
  company_name: string | null;
  office_id: string | null;
  office_name: string | null;
  floor_id: string | null;
  floor_name: string | null;
};

type MapFormState = {
  name: string;
};

type CompanySummary = {
  id: string;
  name: string;
};

type OfficeSummary = {
  id: string;
  name: string;
  company_id: string;
};

type FloorSummary = {
  id: string;
  name: string;
  office_id: string;
};

type InitialSelections = {
  companyId: string | null;
  officeId: string | null;
  floorId: string | null;
};

const MAP_RETURN_SELECTION_KEY = 'desk-map-return-selection';
type ReturnSelection = InitialSelections & {
  restored?: boolean;
};

const initialFormState: MapFormState = {
  name: '',
};

export default function HomePage() {
  const router = useRouter();

  const initialSelectionsRef = useRef<InitialSelections | null>(null);
  const returnSelectionRef = useRef<InitialSelections | null>(null);
  const hasRequestedReturnFloorsRef = useRef(false);
  const hasAppliedReturnSelectionRef = useRef(false);
  const selectedOfficeIdRef = useRef<string | null>(null);
  if (initialSelectionsRef.current === null) {
    if (typeof window !== 'undefined') {
      let selections: ReturnSelection = {
        companyId: null,
        officeId: null,
        floorId: null,
        restored: false,
      };

      try {
        const storedSelection = window.sessionStorage.getItem(MAP_RETURN_SELECTION_KEY);
        if (storedSelection) {
          const parsed = JSON.parse(storedSelection) as Partial<ReturnSelection>;
          selections = {
            companyId: parsed.companyId ?? null,
            officeId: parsed.officeId ?? null,
            floorId: parsed.floorId ?? null,
            restored: true,
          };
        } else {
          const params = new URLSearchParams(window.location.search);
          selections = {
            companyId: params.get('companyId'),
            officeId: params.get('officeId'),
            floorId: params.get('floorId'),
            restored: false,
          };
        }
      } catch (error) {
        console.warn('Falha ao restaurar seleção anterior do mapa:', error);
        const params = new URLSearchParams(window.location.search);
        selections = {
          companyId: params.get('companyId'),
          officeId: params.get('officeId'),
          floorId: params.get('floorId'),
          restored: false,
        };
      }

      initialSelectionsRef.current = {
        companyId: selections.companyId,
        officeId: selections.officeId,
        floorId: selections.floorId,
      };
      returnSelectionRef.current = {
        companyId: selections.companyId,
        officeId: selections.officeId,
        floorId: selections.floorId,
      };

      if (selections?.restored) {
        const initialApplyData = {
          companyId: selections.companyId,
          officeId: selections.officeId,
          floorId: selections.floorId,
        };
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('desk-map-apply-selection', { detail: initialApplyData }));
          window.sessionStorage.removeItem(MAP_RETURN_SELECTION_KEY);
        }, 0);
      }
    } else {
      initialSelectionsRef.current = {
        companyId: null,
        officeId: null,
        floorId: null,
      };
    }
  }
  const initialSelections = initialSelectionsRef.current!;

  const [maps, setMaps] = useState<MapSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [companies, setCompanies] = useState<CompanySummary[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(
    initialSelections.companyId
  );
  const [offices, setOffices] = useState<OfficeSummary[]>([]);
  const [selectedOfficeId, setSelectedOfficeId] = useState<string | null>(
    initialSelections.officeId
  );
  const [floors, setFloors] = useState<FloorSummary[]>([]);
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(initialSelections.floorId);
  const [isHierarchyLoading, setIsHierarchyLoading] = useState<boolean>(true);
const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreatingMap, setIsCreatingMap] = useState(false);
  const [formState, setFormState] = useState<MapFormState>(initialFormState);
  const [formError, setFormError] = useState<string | null>(null);

  const [openMenuMapId, setOpenMenuMapId] = useState<string | null>(null);

  useEffect(() => {
    if (!openMenuMapId) return;
    const handleClickAway = () => setOpenMenuMapId(null);
    window.addEventListener('click', handleClickAway);
    return () => window.removeEventListener('click', handleClickAway);
  }, [openMenuMapId]);

  useEffect(() => {
    const handleOpenManageStructure = () => {
      setIsCompanyModalOpen(true);
    };
    window.addEventListener('open-manage-structure', handleOpenManageStructure);
    return () => {
      window.removeEventListener('open-manage-structure', handleOpenManageStructure);
    };
  }, []);

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === selectedCompanyId) ?? null,
    [companies, selectedCompanyId]
  );
  const selectedOffice = useMemo(
    () => offices.find((office) => office.id === selectedOfficeId) ?? null,
    [offices, selectedOfficeId]
  );
  const selectedFloor = useMemo(
    () => floors.find((floor) => floor.id === selectedFloorId) ?? null,
    [floors, selectedFloorId]
  );


  useEffect(() => {
    selectedOfficeIdRef.current = selectedOfficeId;
  }, [selectedOfficeId]);

const loadCompanies = useCallback(async () => {
  setIsHierarchyLoading(true);
  try {
    const response = await fetch('/api/companies');
    if (!response.ok) {
      throw new Error(await response.text());
    }
    const data: CompanySummary[] = await response.json();
    setCompanies(data);
    setErrorMessage(null);
    setSelectedCompanyId((prev) => {
      const selectionToApply = returnSelectionRef.current;
      const initialCompanyId =
        selectionToApply?.companyId ?? initialSelectionsRef.current?.companyId ?? null;
      const candidate = prev ?? initialCompanyId;
      if (candidate && data.some((company) => company.id === candidate)) {
        if (candidate === initialCompanyId && initialSelectionsRef.current) {
          initialSelectionsRef.current.companyId = null;
        }
        return candidate;
      }
      if (initialSelectionsRef.current?.companyId) {
        initialSelectionsRef.current.companyId = null;
      }
      return data[0]?.id ?? null;
    });
    if (data.length === 0) {
      setOffices([]);
      setSelectedOfficeId(null);
      setFloors([]);
      setSelectedFloorId(null);
      setMaps([]);
    }
  } catch (error) {
    console.error('Erro ao carregar empresas:', error);
    setErrorMessage('Não foi possível carregar as empresas. Tente novamente.');
  } finally {
    setIsHierarchyLoading(false);
  }
}, []);

const loadOffices = useCallback(
  async (companyId: string | null, options?: { force?: boolean }) => {
    if (!companyId) {
      setOffices([]);
      if (!returnSelectionRef.current?.officeId) {
        setSelectedOfficeId(null);
      }
      setFloors([]);
      if (!returnSelectionRef.current?.floorId) {
        setSelectedFloorId(null);
      }
      setMaps([]);
      return;
    }
    setIsHierarchyLoading(true);
    try {
      const response = await fetch(`/api/offices?companyId=${companyId}`);
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const data: OfficeSummary[] = await response.json();
      setOffices(data);
      setErrorMessage(null);
      const selectionToApply = returnSelectionRef.current;
      const targetOfficeId =
        selectionToApply?.companyId === companyId ? selectionToApply.officeId ?? null : null;
      const initialOfficeId = initialSelectionsRef.current?.officeId ?? null;
      const previousSelection = selectedOfficeIdRef.current ?? null;
      const officeExists = (id: string | null | undefined) =>
        !!id && data.some((office) => office.id === id);

      let nextOfficeId: string | null = previousSelection ?? null;
      let shouldResetHierarchy = true;

      if (officeExists(targetOfficeId)) {
        nextOfficeId = targetOfficeId!;
        shouldResetHierarchy = false;
        initialSelectionsRef.current!.officeId = null;
      } else if (officeExists(initialOfficeId)) {
        nextOfficeId = initialOfficeId!;
        shouldResetHierarchy = false;
        initialSelectionsRef.current.officeId = null;
      } else if (officeExists(previousSelection)) {
        nextOfficeId = previousSelection!;
        shouldResetHierarchy = false;
      } else if (options?.force && data.length > 0) {
        nextOfficeId = data[0].id ?? null;
        shouldResetHierarchy = !nextOfficeId;
      } else {
        nextOfficeId = null;
        shouldResetHierarchy = true;
      }

      if (targetOfficeId && !officeExists(targetOfficeId)) {
        initialSelectionsRef.current!.officeId = null;
      } else if (!targetOfficeId && initialOfficeId && !officeExists(initialOfficeId)) {
        initialSelectionsRef.current!.officeId = null;
      }

      setSelectedOfficeId(nextOfficeId);

      if (shouldResetHierarchy) {
        const hasReturnFloor = !!returnSelectionRef.current?.floorId;
        if (!hasReturnFloor) {
          setFloors([]);
          setSelectedFloorId(null);
        }
        setMaps([]);
      }
    } catch (error) {
      console.error('Erro ao carregar escritórios:', error);
      setErrorMessage('Não foi possível carregar os escritórios. Tente novamente.');
      if (returnSelectionRef.current?.companyId === companyId && returnSelectionRef.current?.officeId) {
        console.warn('[Home] Mantendo seleção existente após erro ao carregar escritórios');
      } else {
        setOffices([]);
        setSelectedOfficeId(null);
        setFloors([]);
        setSelectedFloorId(null);
        setMaps([]);
      }
    } finally {
      setIsHierarchyLoading(false);
    }
  },
  []
);

const loadMapsForFloor = useCallback(
  async (floorId: string | null, options?: { force?: boolean }) => {
    if (!floorId) {
      setMaps([]);
      setIsLoading(false);
      return;
    }
    if (typeof window !== 'undefined' && options?.force) {
      window.dispatchEvent(
        new CustomEvent('desk-map-selected-hierarchy', {
          detail: {
            companyId: selectedCompanyId ?? null,
            officeId: selectedOfficeId ?? null,
            floorId,
          },
        })
      );
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch(`/api/maps?floorId=${floorId}`);
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const data: MapSummary[] = await response.json();
      setMaps(data);
    } catch (error) {
      console.error('Erro ao carregar mapas:', error);
      setErrorMessage('Não foi possível carregar os mapas. Tente novamente.');
      setMaps([]);
    } finally {
      setIsLoading(false);
    }
  },
  [selectedCompanyId, selectedOfficeId]
);

const loadFloors = useCallback(
  async (
    officeId: string | null,
    options?: { force?: boolean; skipMapReload?: boolean }
  ) => {
    if (!officeId) {
      setFloors([]);
      if (!returnSelectionRef.current?.floorId) {
        setSelectedFloorId(null);
      }
      setMaps([]);
      return;
    }
    setIsHierarchyLoading(true);
    try {
      const response = await fetch(`/api/floors?officeId=${officeId}`);
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const data: FloorSummary[] = await response.json();
      setFloors(data);
      setErrorMessage(null);

      const availableFloorIds = new Set(data.map((floor) => floor.id));

      const selectionToApply = returnSelectionRef.current;
      const targetFloorId =
        selectionToApply?.officeId === officeId ? selectionToApply.floorId ?? null : null;
      const initialFloorId = initialSelectionsRef.current?.floorId ?? null;

      let nextFloorId: string | null = null;

      if (targetFloorId && availableFloorIds.has(targetFloorId)) {
        nextFloorId = targetFloorId;
      } else if (initialFloorId && availableFloorIds.has(initialFloorId)) {
        nextFloorId = initialFloorId;
        initialSelectionsRef.current.floorId = null;
      } else if (selectedFloorId && availableFloorIds.has(selectedFloorId)) {
        nextFloorId = selectedFloorId;
      } else if (options?.force) {
        nextFloorId = data[0]?.id ?? null;
      } else if (!selectedFloorId || !availableFloorIds.has(selectedFloorId)) {
        nextFloorId = null;
      } else {
        nextFloorId = selectedFloorId;
      }

      if (selectionToApply?.officeId === officeId && selectionToApply.floorId === nextFloorId) {
        hasRequestedReturnFloorsRef.current = false;
      }

      const finalFloorId = nextFloorId ?? null;
      if (finalFloorId !== selectedFloorId) {
        setSelectedFloorId(finalFloorId);
      } else if (
        finalFloorId &&
        (!maps.length || options?.force) &&
        !options?.skipMapReload
      ) {
        loadMapsForFloor(finalFloorId, { force: options?.force });
      }

      // Não limpar mapas aqui para evitar loop; leave to callers if needed
    } catch (error) {
      console.error('Erro ao carregar andares:', error);
      setErrorMessage('Não foi possível carregar os andares. Tente novamente.');
      if (returnSelectionRef.current?.officeId === officeId && returnSelectionRef.current?.floorId) {
        console.warn('[Home] Mantendo seleção existente após erro ao carregar andares');
      } else {
        setFloors([]);
        setSelectedFloorId(null);
        setMaps([]);
      }
    } finally {
      setIsHierarchyLoading(false);
    }
  },
  [selectedFloorId, maps.length, selectedCompanyId, selectedOfficeId, loadMapsForFloor]
);

useEffect(() => {
  if (hasAppliedReturnSelectionRef.current) {
    return;
  }
  const selection = returnSelectionRef.current;
  if (!selection) {
    hasAppliedReturnSelectionRef.current = true;
    return;
  }
  let needsAnotherPass = false;
  if (selection.companyId && selection.companyId !== selectedCompanyId) {
    setSelectedCompanyId(selection.companyId);
    needsAnotherPass = true;
  }
  if (selection.officeId && selection.officeId !== selectedOfficeId) {
    setSelectedOfficeId(selection.officeId);
    needsAnotherPass = true;
  }
  if (selection.floorId && selection.floorId !== selectedFloorId) {
    setSelectedFloorId(selection.floorId);
    needsAnotherPass = true;
  }
  if (!needsAnotherPass) {
    hasAppliedReturnSelectionRef.current = true;
  }
}, [selectedCompanyId, selectedOfficeId, selectedFloorId]);

useEffect(() => {
  const selection = returnSelectionRef.current;
  if (!selection) {
    return;
  }
  if (hasRequestedReturnFloorsRef.current) {
    return;
  }
  if (selection.companyId && selection.companyId !== selectedCompanyId) {
    return;
  }
  if (selection.officeId && selection.officeId !== selectedOfficeId) {
    return;
  }
  if (selection.floorId && selection.officeId && floors.length === 0) {
    hasRequestedReturnFloorsRef.current = true;
    loadFloors(selection.officeId, { force: true });
  }
}, [selectedCompanyId, selectedOfficeId, floors.length, loadFloors]);

useEffect(() => {
  if (typeof window === 'undefined') {
    return;
  }
  const selection = returnSelectionRef.current;
  if (!selection) {
    return;
  }

  const companyMatches = !selection.companyId || selection.companyId === selectedCompanyId;
  const officeMatches = !selection.officeId || selection.officeId === selectedOfficeId;
  const floorLoaded = !selection.floorId || floors.some((floor) => floor.id === selection.floorId);
  const floorMatches = !selection.floorId || selection.floorId === selectedFloorId;

  if (companyMatches && officeMatches && selection.floorId && floorLoaded) {
    if (selectedFloorId !== selection.floorId) {
      hasRequestedReturnFloorsRef.current = false;
      setSelectedFloorId(selection.floorId);
      return;
    }
  }

  if (companyMatches && officeMatches && floorMatches && floorLoaded) {
    returnSelectionRef.current = null;
    try {
      window.sessionStorage.removeItem(MAP_RETURN_SELECTION_KEY);
    } catch (error) {
      console.warn('Falha ao limpar seleção retornada do mapa:', error);
    }
    hasRequestedReturnFloorsRef.current = false;
  }
}, [
  selectedCompanyId,
  selectedOfficeId,
  selectedFloorId,
  floors,
]);

useEffect(() => {
  loadCompanies();
}, [loadCompanies]);

useEffect(() => {
  loadOffices(selectedCompanyId);
}, [selectedCompanyId, loadOffices]);

useEffect(() => {
  const returningSelection = returnSelectionRef.current;
  const isRestoring =
    !!returningSelection?.officeId &&
    returningSelection.officeId === selectedOfficeId &&
    !!returningSelection.floorId;

  loadFloors(selectedOfficeId, {
    force: isRestoring,
    skipMapReload: !isRestoring,
  });
}, [selectedOfficeId, loadFloors]);

useEffect(() => {
  loadMapsForFloor(selectedFloorId, { force: true });
}, [selectedFloorId, loadMapsForFloor]);

const handleHierarchyChange = useCallback(async () => {
  if (selectedCompanyId) {
    await loadOffices(selectedCompanyId);
  }
}, [selectedCompanyId, loadOffices]);

useEffect(() => {
  if (!selectedCompanyId) {
    setIsCompanyModalOpen(false);
  }
}, [selectedCompanyId]);

  const orderedMaps = useMemo(() => {
    return [...maps].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [maps]);

  const resetForm = () => {
    setFormState(initialFormState);
    setFormError(null);
  };

  const handleOpenCreateModal = () => {
    if (!selectedFloorId) {
      setFormError('Selecione um andar antes de criar um mapa.');
      return;
    }
    resetForm();
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    if (isCreatingMap) return;
    setIsCreateModalOpen(false);
    resetForm();
  };

  const handleCreateMap = async () => {
    const trimmedName = formState.name.trim();
    if (!trimmedName) {
      setFormError('Informe o nome do mapa.');
      return;
    }

    setFormError(null);
    setIsCreatingMap(true);

    try {
      const response = await fetch('/api/maps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: trimmedName,
          floorId: selectedFloorId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 409) {
          setFormError(errorData.message || 'Já existe um mapa com esses dados.');
        } else if (response.status === 400) {
          setFormError(errorData.message || 'Dados inválidos. Verifique os campos e tente novamente.');
        } else {
          setFormError('Erro inesperado ao criar o mapa. Tente novamente.');
        }
        return;
      }

      const createdMap: MapSummary = await response.json();
      await loadMapsForFloor(selectedFloorId);

      setIsCreateModalOpen(false);
      resetForm();

      router.push(`/maps/${createdMap.id}/edit`);
    } catch (error) {
      console.error('Erro ao criar mapa:', error);
      setFormError('Não foi possível criar o mapa no momento. Tente novamente.');
    } finally {
      setIsCreatingMap(false);
    }
  };

const handleOpenMap = (mapId: string) => {
  setOpenMenuMapId(null);
  router.push(`/maps/${mapId}`);
};

const handleEditMap = (mapId: string) => {
  setOpenMenuMapId(null);
  router.push(`/maps/${mapId}/edit`);
};

return (
  <div className="min-h-screen bg-gray-50">
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {errorMessage && (
          <div className="mb-4 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
            {errorMessage}
          </div>
        )}

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="grid flex-1 gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-btg-blue-bright focus:outline-none focus:ring-2 focus:ring-btg-blue-bright"
                value={selectedCompanyId ?? ''}
                onChange={(event) => setSelectedCompanyId(event.target.value || null)}
                disabled={companies.length === 0 || isHierarchyLoading}
              >
                {companies.length === 0 ? (
                  <option value="">Nenhuma empresa cadastrada</option>
                ) : (
                  companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Escritório</label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-btg-blue-bright focus:outline-none focus:ring-2 focus:ring-btg-blue-bright"
                value={selectedOfficeId ?? ''}
                onChange={(event) => setSelectedOfficeId(event.target.value || null)}
                disabled={offices.length === 0 || isHierarchyLoading}
              >
                <option value="" disabled>
                  {offices.length === 0 ? 'Nenhum escritório cadastrado' : 'Selecione um escritório'}
                </option>
                {offices.map((office) => (
                  <option key={office.id} value={office.id}>
                    {office.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Andar</label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-btg-blue-bright focus:outline-none focus:ring-2 focus:ring-btg-blue-bright"
                value={selectedFloorId ?? ''}
                onChange={(event) => setSelectedFloorId(event.target.value || null)}
                disabled={floors.length === 0 || isHierarchyLoading}
              >
                <option value="" disabled>
                  {floors.length === 0 ? 'Nenhum andar cadastrado' : 'Selecione um andar'}
                </option>
                {floors.map((floor) => (
                  <option key={floor.id} value={floor.id}>
                    {floor.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {isLoading || isHierarchyLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center space-x-2 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow">
              <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-btg-blue-bright"></div>
              <span className="text-sm text-gray-700">Carregando mapas...</span>
            </div>
          </div>
        ) : !selectedFloorId ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center text-sm text-gray-600">
            <p>Selecione uma empresa, escritório e andar para visualizar os mapas disponíveis.</p>
            <button
              type="button"
              disabled
              className="mt-6 inline-flex cursor-not-allowed items-center justify-center rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-500"
            >
              Criar mapa
            </button>
          </div>
        ) : orderedMaps.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
            <h2 className="text-base font-semibold text-gray-800">Nenhum mapa cadastrado ainda</h2>
            <p className="mt-2 text-sm text-gray-600">
              Crie o primeiro mapa para começar a organizar mesas e reservas por área, andar ou empresa.
            </p>
            <button
              onClick={handleOpenCreateModal}
              disabled={!selectedFloorId}
              className={`mt-6 inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-btg-blue-bright focus:ring-offset-2 ${
                selectedFloorId
                  ? 'bg-btg-blue-bright hover:bg-btg-blue-deep'
                  : 'cursor-not-allowed bg-gray-300 hover:bg-gray-300 focus:ring-0'
              }`}
            >
              Criar mapa
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                onClick={handleOpenCreateModal}
                disabled={!selectedFloorId}
                className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-btg-blue-bright focus:ring-offset-2 ${
                  selectedFloorId
                    ? 'bg-btg-blue-bright hover:bg-btg-blue-deep'
                    : 'cursor-not-allowed bg-gray-300 hover:bg-gray-300 focus:ring-0'
                }`}
              >
                Criar mapa
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {orderedMaps.map((map) => {
                const hierarchy = [map.company_name, map.office_name, map.floor_name]
                  .filter(Boolean)
                  .join(' • ');
                return (
                  <div
                    key={map.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleOpenMap(map.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleOpenMap(map.id);
                      }
                    }}
                    className="group relative flex cursor-pointer flex-col overflow-visible rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-btg-blue-bright hover:border-btg-blue-bright hover:shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div className="truncate">
                        <h3 className="truncate text-base font-semibold text-gray-900">
                          {map.name}
                        </h3>
                      </div>
                      <div className="ml-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setOpenMenuMapId((prev) => (prev === map.id ? null : map.id));
                          }}
                          className="rounded-full p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-btg-blue-bright"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.75a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM12 13.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM12 20.25a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    {hierarchy && (
                      <p className="mt-3 text-xs text-gray-600">
                        {hierarchy}
                      </p>
                    )}
                    
                    {openMenuMapId === map.id && (
                      <div
                        className="absolute right-4 top-12 z-20 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleEditMap(map.id);
                          }}
                          className="flex w-full items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Editar layout
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </main>

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black bg-opacity-50 px-4 py-6">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Criar novo mapa</h2>
              <p className="mt-1 text-sm text-gray-600">
                Defina as informações básicas. Você poderá configurar mesas e áreas em seguida.
              </p>
            </div>
            <div className="space-y-4 px-6 py-5">
              {formError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {formError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nome do mapa
                </label>
                <input
                  type="text"
                  value={formState.name}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, name: event.target.value }))
                  }
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-btg-blue-bright focus:outline-none focus:ring-2 focus:ring-btg-blue-bright"
                  placeholder="ex: Renda Fixa e Derivativos"
                  disabled={isCreatingMap}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Esse nome será exibido na listagem e na tela do mapa.
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                <p>
                  <span className="font-semibold text-gray-800">Empresa:</span>{' '}
                  {selectedCompany?.name || '—'}
                </p>
                <p className="mt-1">
                  <span className="font-semibold text-gray-800">Escritório:</span>{' '}
                  {selectedOffice?.name || '—'}
                </p>
                <p className="mt-1">
                  <span className="font-semibold text-gray-800">Andar:</span>{' '}
                  {selectedFloor?.name || '—'}
                </p>
                <p className="mt-3 text-xs text-gray-500">
                  Para alterar a hierarquia, feche este modal e ajuste os filtros na página inicial.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-gray-200 px-6 py-4">
              <button
                type="button"
                onClick={handleCloseCreateModal}
                disabled={isCreatingMap}
                className="inline-flex items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-btg-blue-bright focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreateMap}
                disabled={isCreatingMap || !selectedFloorId}
                className="inline-flex items-center justify-center rounded-md bg-btg-blue-bright px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-btg-blue-deep focus:outline-none focus:ring-2 focus:ring-btg-blue-bright focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreatingMap ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                    Criando...
                  </>
                ) : (
                  'Criar e editar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedCompanyId && (
        <ManageCompanyModal
          isOpen={isCompanyModalOpen}
          onClose={() => setIsCompanyModalOpen(false)}
          companyId={selectedCompanyId}
          companyName={selectedCompany?.name || 'Empresa'}
          onHierarchyChange={handleHierarchyChange}
        />
      )}
    </div>
  );
}
