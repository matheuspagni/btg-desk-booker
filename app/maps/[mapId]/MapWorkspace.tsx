'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DeskMap, { Area, Desk, Reservation, Chair } from '@/components/DeskMap';
import { logReservationCreate, logReservationDelete, logError, generateSessionId, initializeIPCapture } from '@/lib/logger';
import { format, getDay, addDays } from 'date-fns';
import { toBrazilDateString } from '@/lib/date-utils';

type MapInfo = {
  id: string;
  name: string;
  company_id: string | null;
  company_name: string | null;
  office_id: string | null;
  office_name: string | null;
  floor_id: string | null;
  floor_name: string | null;
  updated_at?: string;
};

type MapWorkspaceProps = {
  mode?: 'view' | 'edit';
  hideCalendar?: boolean;
};

export default function MapWorkspace({ mode = 'view', hideCalendar = false }: MapWorkspaceProps) {
  const params = useParams<{ mapId: string }>();
  const router = useRouter();
  const mapId = params?.mapId;
  const isEditMode = mode === 'edit';

  const [mapInfo, setMapInfo] = useState<MapInfo | null>(null);
  const [isLoadingMap, setIsLoadingMap] = useState(true);

  const loadMapInfo = useCallback(async (signal?: AbortSignal) => {
    if (!mapId) return;
    const response = await fetch(`/api/maps/${mapId}`, {
      headers: { 'x-map-id': mapId },
      signal,
    });
    if (!response.ok) {
      if (response.status === 404) {
        router.replace('/');
        return;
      }
      throw new Error(await response.text());
    }
    const data = await response.json();
    setMapInfo(data);
  }, [mapId, router]);

  useEffect(() => {
    if (!mapId) return;
    const controller = new AbortController();
    (async () => {
      try {
        await loadMapInfo(controller.signal);
      } catch (error) {
        console.error('Erro ao carregar mapa:', error);
      } finally {
        setIsLoadingMap(false);
      }
    })();
    return () => controller.abort();
  }, [mapId, router, loadMapInfo]);

  const [dateISO, setDateISO] = useState<string>('');

  useEffect(() => {
    const now = new Date();
    const dayOfWeek = getDay(now);

    let targetDate = now;
    if (dayOfWeek === 0) {
      targetDate = addDays(now, 1);
    } else if (dayOfWeek === 6) {
      targetDate = addDays(now, 2);
    }

    setDateISO(toBrazilDateString(targetDate));
  }, []);

  const [areas, setAreas] = useState<Area[]>([]);
  const [desks, setDesks] = useState<Desk[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [chairs, setChairs] = useState<Chair[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionId] = useState<string>(generateSessionId());
  type CompanySummary = { id: string; name: string };
  type OfficeSummary = { id: string; name: string; company_id: string };
  type FloorSummary = { id: string; name: string; office_id: string };
  const [companies, setCompanies] = useState<CompanySummary[]>([]);
  const [offices, setOffices] = useState<OfficeSummary[]>([]);
  const [floors, setFloors] = useState<FloorSummary[]>([]);
  const [mapName, setMapName] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [selectedOfficeId, setSelectedOfficeId] = useState<string | null>(null);
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  const [isMetadataModalOpen, setIsMetadataModalOpen] = useState(false);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [isSavingMetadata, setIsSavingMetadata] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);


  const fetchWithMap = useCallback(
    (input: RequestInfo | URL, init?: RequestInit) => {
      if (!mapId) {
        throw new Error('Map ID não definido');
      }
      const headers = new Headers(init?.headers || {});
      headers.set('x-map-id', mapId);
      return fetch(input, { ...init, headers });
    },
    [mapId]
  );

  useEffect(() => {
    if (!mapId) return;
    fetchAll();
    initializeIPCapture();
  }, [mapId]);

  useEffect(() => {
    if (!mapId || !dateISO) return;
    fetchReservations(dateISO);
  }, [mapId, dateISO]);

  async function fetchAll() {
    if (!mapId) return;
    setIsLoading(true);
    try {
      const [areasRes, desksRes, chairsRes] = await Promise.all([
        fetchWithMap('/api/areas'),
        fetchWithMap('/api/desks'),
        fetchWithMap('/api/chairs'),
      ]);
      if (areasRes.ok) {
        const areasData = await areasRes.json();
        setAreas(areasData);
      } else {
        console.error('Erro ao carregar áreas:', await areasRes.text());
      }

      if (desksRes.ok) {
        const desksData = await desksRes.json();
        setDesks(desksData);
      } else {
        console.error('Erro ao carregar mesas:', await desksRes.text());
      }

      if (chairsRes.ok) {
        const chairsData = await chairsRes.json();
        setChairs(chairsData);
      } else {
        console.error('Erro ao carregar cadeiras:', await chairsRes.text());
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchReservations(currentDateISO: string) {
    if (!mapId || !currentDateISO) return;
    try {
      const response = await fetchWithMap('/api/reservations');
      if (response.ok) {
        const data = await response.json();
        setReservations(data);
      } else {
        console.error('Erro ao buscar reservas:', await response.text());
      }
    } catch (error) {
      console.error('Erro ao buscar reservas:', error);
    }
  }

  const loadCompanies = useCallback(async () => {
    try {
      const response = await fetch('/api/companies');
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const data: CompanySummary[] = await response.json();
      setCompanies(data);
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
    }
  }, []);

  const loadOffices = useCallback(async (companyId: string | null) => {
    if (!companyId) {
      setOffices([]);
      setSelectedOfficeId(null);
      setFloors([]);
      setSelectedFloorId(null);
      return;
    }
    try {
      const response = await fetch(`/api/offices?companyId=${companyId}`);
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const data: OfficeSummary[] = await response.json();
      setOffices(data);
      setSelectedOfficeId((prev) => {
        if (prev && data.some((office) => office.id === prev)) {
          return prev;
        }
        return null;
      });
    } catch (error) {
      console.error('Erro ao carregar escritórios:', error);
      setOffices([]);
      setSelectedOfficeId(null);
      setFloors([]);
      setSelectedFloorId(null);
    }
  }, []);

  const loadFloors = useCallback(async (officeId: string | null) => {
    if (!officeId) {
      setFloors([]);
      setSelectedFloorId(null);
      return;
    }
    try {
      const response = await fetch(`/api/floors?officeId=${officeId}`);
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const data: FloorSummary[] = await response.json();
      setFloors(data);
      setSelectedFloorId((prev) => {
        if (prev && data.some((floor) => floor.id === prev)) {
          return prev;
        }
        return null;
      });
    } catch (error) {
      console.error('Erro ao carregar andares:', error);
      setFloors([]);
      setSelectedFloorId(null);
    }
  }, []);

  const resetMetadataForm = useCallback(() => {
    if (!mapInfo) return;
    setMapName(mapInfo.name ?? '');
    setSelectedCompanyId(mapInfo.company_id);
    setSelectedOfficeId(mapInfo.office_id);
    setSelectedFloorId(mapInfo.floor_id);
  }, [mapInfo]);

  const closeMetadataModal = useCallback(() => {
    resetMetadataForm();
    setMetadataError(null);
    setIsMetadataModalOpen(false);
  }, [resetMetadataForm]);

  async function loadMoreData(startDate: string, endDate: string) {
    if (!mapId) return;
    const start = new Date(startDate);
    start.setMonth(start.getMonth() - 1);

    const end = new Date(endDate);
    end.setMonth(end.getMonth() + 1);

    const expandedStart = format(start, 'yyyy-MM-dd');
    const expandedEnd = format(end, 'yyyy-MM-dd');

    try {
      const response = await fetchWithMap(`/api/reservations?startDate=${expandedStart}&endDate=${expandedEnd}`);

      if (!response.ok) {
        console.error('Erro ao buscar reservas do range:', await response.text());
        return;
      }

      const r = await response.json();

      setReservations((prev) => {
        const existingReservations = prev.filter(
          (res) => res.date < expandedStart || res.date > expandedEnd
        );
        const newReservations = r || [];

        const combined = [...existingReservations, ...newReservations];
        const unique = combined.filter(
          (res, index, self) => index === self.findIndex((item) => item.id === res.id)
        );

        return unique.sort((a, b) => a.date.localeCompare(b.date));
      });
    } catch (error) {
      console.error('Erro ao buscar reservas do range:', error);
    }
  }

  async function createBulkReservations(
    reservationsPayload: Array<{ desk_id: string; date: string; note?: string; is_recurring?: boolean; recurring_days?: number[] }>
  ) {
    if (!mapId) return;
    const startTime = Date.now();

    try {
      const response = await fetchWithMap('/api/reservations/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reservations: reservationsPayload }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erro ao criar reservas em lote:', errorData);

        if (response.status === 409 && errorData.error === 'CONFLICT') {
          const conflictError = new Error('CONFLICT');
          (conflictError as any).conflicts = errorData.conflicts;
          throw conflictError;
        }

        throw new Error(errorData.error || 'Failed to create bulk reservations');
      }

      const result = await response.json();
      const processingTime = Date.now() - startTime;
      const firstReservation = reservationsPayload[0];
      await logReservationCreate(
        mapId,
        firstReservation.desk_id,
        firstReservation.date,
        firstReservation.note || '',
        firstReservation.is_recurring || false,
        firstReservation.recurring_days,
        processingTime,
        sessionId,
        reservationsPayload.length
      );

      return { success: true, count: result.count };
    } catch (error: any) {
      console.error('Erro ao criar reservas em lote:', error);
      await logError(mapId, 'CREATE', error?.message || 'Erro ao criar reservas em lote');
      throw error;
    }
  }

  async function deleteBulkReservations(ids: string[]) {
    if (!mapId) return;
    const startTime = Date.now();

    try {
      const reservationsToDelete = reservations.filter((r) => ids.includes(r.id));

      if (reservationsToDelete.length === 0) {
        throw new Error('Nenhuma reserva encontrada para deletar');
      }

      const response = await fetchWithMap(`/api/reservations/bulk?ids=${ids.join(',')}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erro ao deletar reservas em lote:', errorData);
        throw new Error(errorData.error || 'Failed to delete bulk reservations');
      }

      const result = await response.json();
      const processingTime = Date.now() - startTime;
      const firstReservation = reservationsToDelete[0];
      await logReservationDelete(
        mapId,
        firstReservation.desk_id,
        firstReservation.date,
        firstReservation.note || '',
        firstReservation.is_recurring || false,
        firstReservation.recurring_days || [],
        processingTime,
        sessionId,
        ids.length
      );

      return { success: true, count: result.count };
    } catch (error: any) {
      console.error('Erro ao deletar reservas em lote:', error);
      await logError(mapId, 'DELETE', error?.message || 'Erro ao deletar reservas em lote');
      throw error;
    }
  }

  useEffect(() => {
    if (!isEditMode || !mapInfo) return;
    resetMetadataForm();
  }, [isEditMode, mapInfo, resetMetadataForm]);

  useEffect(() => {
    if (!isEditMode || !mapInfo) return;
    loadCompanies();
  }, [isEditMode, mapInfo, loadCompanies]);

  useEffect(() => {
    if (!isEditMode) return;
    loadOffices(selectedCompanyId);
  }, [isEditMode, selectedCompanyId, loadOffices]);

  useEffect(() => {
    if (!isEditMode) return;
    loadFloors(selectedOfficeId);
  }, [isEditMode, selectedOfficeId, loadFloors]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

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

  const effectiveMapInfo = useMemo(() => {
    if (!mapInfo) return null;

    const name = mapName || mapInfo.name;

    const effectiveCompanyId = selectedCompanyId ?? mapInfo.company_id ?? null;
    const effectiveCompanyName =
      selectedCompany?.name ??
      (effectiveCompanyId === mapInfo.company_id ? mapInfo.company_name : null);

    const effectiveOfficeId = selectedOfficeId ?? mapInfo.office_id ?? null;
    const effectiveOfficeName =
      selectedOffice?.name ??
      (effectiveOfficeId === mapInfo.office_id ? mapInfo.office_name : null);

    const effectiveFloorId = selectedFloorId ?? mapInfo.floor_id ?? null;
    const effectiveFloorName =
      selectedFloor?.name ??
      (effectiveFloorId === mapInfo.floor_id ? mapInfo.floor_name : null);

    return {
      ...mapInfo,
      name,
      company_id: effectiveCompanyId,
      company_name: effectiveCompanyName,
      office_id: effectiveOfficeId,
      office_name: effectiveOfficeName,
      floor_id: effectiveFloorId,
      floor_name: effectiveFloorName,
    };
  }, [
    mapInfo,
    mapName,
    selectedCompanyId,
    selectedOfficeId,
    selectedFloorId,
    selectedCompany?.name,
    selectedOffice?.name,
    selectedFloor?.name,
  ]);

  const handleBackToHome = useCallback(() => {
    if (!effectiveMapInfo) {
      router.push('/');
      return;
    }

    const companyIdToRestore =
      selectedCompanyId ?? mapInfo?.company_id ?? effectiveMapInfo.company_id ?? null;
    const officeIdToRestore =
      selectedOfficeId ?? mapInfo?.office_id ?? effectiveMapInfo.office_id ?? null;
    const floorIdToRestore =
      selectedFloorId ?? mapInfo?.floor_id ?? effectiveMapInfo.floor_id ?? null;

    if (typeof window !== 'undefined') {
      const selectionPayload: {
        companyId: string | null;
        officeId: string | null;
        floorId: string | null;
        timestamp: number;
      } = {
        companyId: companyIdToRestore,
        officeId: officeIdToRestore,
        floorId: floorIdToRestore,
        timestamp: Date.now(),
      };
      if (!selectionPayload.floorId && mapInfo?.floor_id) {
        selectionPayload.floorId = mapInfo.floor_id;
      }
      try {
        window.sessionStorage.setItem('desk-map-return-selection', JSON.stringify(selectionPayload));
      } catch (error) {
        console.warn('Não foi possível salvar seleção ao voltar do mapa:', error);
      }
    }
    router.push('/');
  }, [
    router,
    effectiveMapInfo,
    selectedCompanyId,
    selectedOfficeId,
    selectedFloorId,
    mapInfo?.company_id,
    mapInfo?.office_id,
    mapInfo?.floor_id,
  ]);

  const handleSaveMetadata = useCallback(async () => {
    if (!isEditMode || !mapId) return;
    const trimmedName = mapName.trim();
    if (!trimmedName) {
      setMetadataError('Informe o nome do mapa.');
      return;
    }
    setMetadataError(null);
    setIsSavingMetadata(true);
    try {
      const response = await fetch(`/api/maps/${mapId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-map-id': mapId,
        },
        body: JSON.stringify({
          name: trimmedName,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setMetadataError(
          data.message || 'Não foi possível salvar as informações do mapa. Tente novamente.'
        );
        return;
      }
      const updated = await response.json();
      setMapInfo(updated);
      setMapName(updated.name ?? '');
      setSelectedCompanyId(updated.company_id);
      setSelectedOfficeId(updated.office_id);
      setSelectedFloorId(updated.floor_id);
      setToastMessage('Mapa atualizado com sucesso.');
      setIsMetadataModalOpen(false);
    } catch (error) {
      console.error('Erro ao atualizar mapa:', error);
      setMetadataError('Erro inesperado ao salvar o mapa. Tente novamente.');
    } finally {
      setIsSavingMetadata(false);
    }
  }, [isEditMode, mapId, mapName, selectedCompanyId, selectedOfficeId, selectedFloorId]);

  if (!mapId || isLoadingMap) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="bg-white rounded-lg p-4 shadow border border-gray-200 flex items-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-btg-blue-bright"></div>
          <span className="text-gray-700 text-sm">Carregando mapa...</span>
        </div>
      </div>
    );
  }

  if (!dateISO) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="bg-white rounded-lg p-4 shadow border border-gray-200 flex items-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-btg-blue-bright"></div>
          <span className="text-gray-700 text-sm">Carregando data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col px-1 sm:px-2 lg:px-3 pb-1 sm:pb-2 lg:pb-3 bg-white" style={{ minHeight: 0, overflow: 'hidden' }}>
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center" style={{ width: '100vw', height: '100vh' }}>
          <div className="bg-white rounded-lg p-3 sm:p-4 flex items-center space-x-2 shadow-lg border border-gray-200 w-auto">
            <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-btg-blue-bright"></div>
            <span className="text-gray-700 font-medium text-sm">Carregando...</span>
          </div>
        </div>
      )}


      <DeskMap
        mapId={mapId}
        fetchWithMap={fetchWithMap}
        areas={areas}
        desks={desks}
        reservations={reservations}
        chairs={chairs}
        dateISO={dateISO}
        onDateChange={setDateISO}
        onFetchReservations={() => fetchReservations(dateISO)}
        onLoadMoreData={loadMoreData}
        onCreateBulkReservations={createBulkReservations}
        onDeleteBulkReservations={deleteBulkReservations}
        onDesksChange={fetchAll}
        onAreasChange={fetchAll}
        onChairsChange={fetchAll}
        mapInfo={effectiveMapInfo || undefined}
        mode={mode}
        hideCalendar={hideCalendar}
        onEditMapMetadata={() => {
          resetMetadataForm();
          setMetadataError(null);
          setToastMessage(null);
          setIsMetadataModalOpen(true);
        }}
        onBackToHome={isEditMode ? handleBackToHome : undefined}
      />
      {isEditMode && isMetadataModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 px-4">
          <div className="w-full max-w-3xl rounded-xl bg-white shadow-2xl border border-gray-200">
            <div className="flex items-start justify-between px-5 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Editar informações do mapa</h2>
                <p className="text-xs text-gray-500">Atualize o nome e a localização deste mapa.</p>
              </div>
              <button
                type="button"
                onClick={closeMetadataModal}
                className="rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-btg-blue-bright focus:ring-offset-2"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
                  <input
                    type="text"
                    value={mapName}
                    onChange={(event) => {
                      setMapName(event.target.value);
                      setMetadataError(null);
                    setToastMessage(null);
                    }}
                    maxLength={120}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-btg-blue-bright focus:outline-none focus:ring-2 focus:ring-btg-blue-bright"
                    placeholder="Ex: Renda Fixa e Derivativos"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Empresa</label>
                  <select
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-btg-blue-bright focus:outline-none focus:ring-2 focus:ring-btg-blue-bright"
                    value={selectedCompanyId ?? ''}
                    disabled
                  >
                    <option value="" disabled>
                      {companies.length === 0 ? 'Nenhuma empresa cadastrada' : 'Selecione uma empresa'}
                    </option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Escritório</label>
                  <select
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-btg-blue-bright focus:outline-none focus:ring-2 focus:ring-btg-blue-bright"
                    value={selectedOfficeId ?? ''}
                    disabled
                  >
                    <option value="" disabled>
                      {selectedCompanyId
                        ? offices.length === 0
                          ? 'Nenhum escritório cadastrado'
                          : 'Selecione um escritório'
                        : 'Selecione uma empresa primeiro'}
                    </option>
                    {offices.map((office) => (
                      <option key={office.id} value={office.id}>
                        {office.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Andar</label>
                  <select
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-btg-blue-bright focus:outline-none focus:ring-2 focus:ring-btg-blue-bright"
                    value={selectedFloorId ?? ''}
                    disabled
                  >
                    <option value="" disabled>
                      {selectedOfficeId
                        ? floors.length === 0
                          ? 'Nenhum andar cadastrado'
                          : 'Selecione um andar'
                        : 'Selecione um escritório primeiro'}
                    </option>
                    {floors.map((floor) => (
                      <option key={floor.id} value={floor.id}>
                        {floor.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {metadataError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {metadataError}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-200">
              <button
                type="button"
                onClick={closeMetadataModal}
                className="inline-flex items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-btg-blue-bright focus:ring-offset-2"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveMetadata}
                disabled={isSavingMetadata}
                className="inline-flex items-center justify-center rounded-md bg-btg-blue-bright px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-btg-blue-deep focus:outline-none focus:ring-2 focus:ring-btg-blue-bright focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingMetadata ? (
                  <>
                    <svg className="mr-2 h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v4m0 8v4m4-4h4m-8 0H4m4-4H4m8 0h4m0-4V4m0 8h4" />
                    </svg>
                    Salvando...
                  </>
                ) : (
                  'Salvar alterações'
                )}
              </button>
            </div>
          </div>
        </div>
      )}


      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[10000] flex flex-col gap-2">
          <div className="rounded-lg bg-btg-blue-bright text-white px-4 py-3 shadow-lg flex items-center gap-2 text-sm">
            <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
            </svg>
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}


