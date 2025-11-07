'use client';
import { useMemo, useState, useRef, useEffect } from 'react';
import { format, getDay, isToday, isSameDay, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toBrazilDateString, getBrazilToday } from '@/lib/date-utils';
import { isHoliday, Holiday } from '@/lib/holidays';
import Calendar from './Calendar';
import ReservationModal from './ReservationModal';
import RecurringCancelModal from './RecurringCancelModal';
import RecurringConflictModal from './RecurringConflictModal';
import IndividualConflictModal from './IndividualConflictModal';
import RecurringRecurringConflictModal from './RecurringRecurringConflictModal';
import DeleteDeskModal from './DeleteDeskModal';
import NewRowModal from './NewRowModal';
import EditDeskModal from './EditDeskModal';
import CreateDeskModal from './CreateDeskModal';
import CreateDeskSizeModal from './CreateDeskSizeModal';
import ManageAreasModal from './ManageAreasModal';

export type Area = { id: string; name: string; color: string };
export type Slot = { id: string; area_id: string; row_number: number; col_number: number; x: number; y: number; w: number; h: number; is_available: boolean };
export type Desk = { id: string; slot_id: string; area_id: string; code: string; is_active: boolean; is_blocked?: boolean; width_units?: number; height_units?: number };
export type Reservation = { id: string; desk_id: string; date: string; note: string | null; is_recurring?: boolean; recurring_days?: number[] };

type Props = {
  areas: Area[];
  slots: Slot[];
  desks: Desk[];
  reservations: Reservation[];
  dateISO: string; // YYYY-MM-DD
  onDateChange: (date: string) => void;
  onFetchReservations: () => Promise<void>;
  onLoadMoreData?: (startDate: string, endDate: string) => Promise<void>;
  // Função otimizada para criação em lote (usada para todas as reservas)
  onCreateBulkReservations: (reservations: Array<{ desk_id: string; date: string; note?: string; is_recurring?: boolean; recurring_days?: number[] }>) => Promise<any>;
  // Função otimizada para deleção em lote (usada para todas as deleções)
  onDeleteBulkReservations: (ids: string[]) => Promise<any>;
  // Callbacks para atualizar dados após edição
  onDesksChange?: () => Promise<void>;
  onSlotsChange?: () => Promise<void>;
  onAreasChange?: () => Promise<void>;
};

export default function DeskMap({ areas, slots, desks, reservations, dateISO, onDateChange, onFetchReservations, onLoadMoreData, onCreateBulkReservations, onDeleteBulkReservations, onDesksChange, onSlotsChange, onAreasChange }: Props) {
  const [selectedDesk, setSelectedDesk] = useState<Desk | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isNewRowModalOpen, setIsNewRowModalOpen] = useState(false);
  const [deleteDeskData, setDeleteDeskData] = useState<{ desk: Desk; reservations: Array<{ id: string; date: string; note: string | null; is_recurring?: boolean; recurring_days?: number[] }>; isBlockingContext?: boolean } | null>(null);
  const [newRowName, setNewRowName] = useState('');
  const [isCreatingDesk, setIsCreatingDesk] = useState(false);
  const [isDeletingDesk, setIsDeletingDesk] = useState(false);
  const [selectedSlotForAction, setSelectedSlotForAction] = useState<{ slot: Slot; desk: Desk | null; direction: 'above' | 'below' } | null>(null);
  const [isEditDeskModalOpen, setIsEditDeskModalOpen] = useState(false);
  const [editingDesk, setEditingDesk] = useState<Desk | null>(null);
  const [isUpdatingDesk, setIsUpdatingDesk] = useState(false);
  const [isCreateDeskModalOpen, setIsCreateDeskModalOpen] = useState(false);
  const [creatingDeskData, setCreatingDeskData] = useState<{ slot: Slot; desk: Desk | null; direction: 'right' | 'left' | 'above' | 'below' | 'in-place' } | null>(null);
  const [isManageAreasModalOpen, setIsManageAreasModalOpen] = useState(false);
  const [hasRecurringReservation, setHasRecurringReservation] = useState(false);
  const [isRecurringCancelModalOpen, setIsRecurringCancelModalOpen] = useState(false);
  const [currentRecurringDays, setCurrentRecurringDays] = useState<number[]>([]);
  const [isCreatingReservation, setIsCreatingReservation] = useState(false);
  const [isDeletingReservation, setIsDeletingReservation] = useState(false);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [conflictData, setConflictData] = useState<{ conflicts: any[], newName: string, reservationsWithoutConflicts: any[], onConfirm?: () => void } | null>(null);
  const [isIndividualConflictModalOpen, setIsIndividualConflictModalOpen] = useState(false);
  const [individualConflictData, setIndividualConflictData] = useState<{ date: string, deskCode: string } | null>(null);
  const [isRecurringRecurringConflictModalOpen, setIsRecurringRecurringConflictModalOpen] = useState(false);
  const [recurringRecurringConflictData, setRecurringRecurringConflictData] = useState<{ conflicts: Array<{ date: string; existingName: string; newName: string; existingDays: number[]; newDays: number[] }>, newName: string } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [messageTimer, setMessageTimer] = useState<number>(0);
  const [holidayWarning, setHolidayWarning] = useState<Holiday | null>(null);
  
  // Estados para drag and drop
  const [draggingDesk, setDraggingDesk] = useState<{ desk: Desk; slot: Slot; startX: number; startY: number; offsetX: number; offsetY: number } | null>(null);
  const [draggedPosition, setDraggedPosition] = useState<{ x: number; y: number } | null>(null);
  const [isMovingDesk, setIsMovingDesk] = useState(false);
  
  // Estados para zoom e pan
  const [zoom, setZoom] = useState(1); // Zoom level (1 = 100%, 2 = 200%, etc.)
  const [panX, setPanX] = useState(0); // Pan offset X
  const [panY, setPanY] = useState(0); // Pan offset Y
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const [hasInitializedView, setHasInitializedView] = useState(false);
  
  // Estados para criação de mesa no mouse
  const [isCreatingDeskAtMouse, setIsCreatingDeskAtMouse] = useState(false);
  const [previewDeskPosition, setPreviewDeskPosition] = useState<{ x: number; y: number } | null>(null);
  const [previewDeskAreaId, setPreviewDeskAreaId] = useState<string | null>(null);
  
  // Estados para modo de rascunho (salvar apenas ao final)
  const [deskPositionsDraft, setDeskPositionsDraft] = useState<Map<string, { slotId: string; x: number; y: number }>>(new Map());
  const [isSavingChanges, setIsSavingChanges] = useState(false);
  
  // Dimensões do grid - calcular dinamicamente baseado nas mesas
  const BASE_VIEWBOX_WIDTH = 1360; // Largura base do viewBox
  const BASE_VIEWBOX_HEIGHT = 800; // Altura base do viewBox (aumentada)
  
  // Constantes do grid (40px por unidade)
  const GRID_UNIT = 40;
  const SLOT_WIDTH_UNITS = 3; // 120px = 3 * 40px
  const SLOT_HEIGHT_UNITS = 2; // 80px = 2 * 40px

  // Função para obter slot por mesa
  function getSlotByDesk(deskId: string): Slot | undefined {
    const desk = desks.find(d => d.id === deskId);
    if (!desk) return undefined;
    return slots.find(s => s.id === desk.slot_id);
  }
  
  // Dimensões do grid gigante (voltar ao tamanho original)
  const GRID_WIDTH = 10000; // 10000 unidades (muito grande)
  const GRID_HEIGHT = 10000; // 10000 unidades (muito grande)
  
  // Verificar se a data selecionada é feriado
  useEffect(() => {
    const holiday = isHoliday(dateISO);
    setHolidayWarning(holiday);
  }, [dateISO]);
  
  // Limpar rascunho ao sair do modo edição
  useEffect(() => {
    if (!isEditMode) {
      setDeskPositionsDraft(new Map());
      setIsCreatingDeskAtMouse(false);
      setPreviewDeskPosition(null);
      setPreviewDeskAreaId(null);
    }
  }, [isEditMode]);

  // Função para obter mesa por slot
  function getDeskBySlot(slotId: string): Desk | undefined {
    return desks.find(d => d.slot_id === slotId);
  }

  // Função para calcular bounding box de todas as mesas
  function calculateBoundingBox() {
    if (desks.length === 0) {
      // Se não há mesas, centralizar na origem
      return {
        minX: -200,
        minY: -200,
        maxX: 200,
        maxY: 200,
        width: 400,
        height: 400
      };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    desks.forEach(desk => {
      const slot = getSlotByDesk(desk.id);
      if (!slot) return;

      const draftPosition = deskPositionsDraft.get(desk.id);
      const x = draftPosition ? draftPosition.x : slot.x;
      const y = draftPosition ? draftPosition.y : slot.y;
      
      const widthUnits = desk.width_units || SLOT_WIDTH_UNITS;
      const heightUnits = desk.height_units || SLOT_HEIGHT_UNITS;
      const deskWidth = widthUnits * GRID_UNIT;
      const deskHeight = heightUnits * GRID_UNIT;

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + deskWidth);
      maxY = Math.max(maxY, y + deskHeight);
    });

    // Verificar se calculamos valores válidos
    if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
      return {
        minX: -200,
        minY: -200,
        maxX: 200,
        maxY: 200,
        width: 400,
        height: 400
      };
    }

    // Adicionar padding de 20% ao redor
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const paddingX = Math.max(contentWidth * 0.2, 100); // Mínimo 100px de padding
    const paddingY = Math.max(contentHeight * 0.2, 100); // Mínimo 100px de padding

    return {
      minX: minX - paddingX,
      minY: minY - paddingY,
      maxX: maxX + paddingX,
      maxY: maxY + paddingY,
      width: contentWidth + (paddingX * 2),
      height: contentHeight + (paddingY * 2)
    };
  }

  // Função para ajustar view para mostrar todas as mesas
  function fitToView() {
    if (!svgContainerRef.current) return;

    const container = svgContainerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    if (containerWidth === 0 || containerHeight === 0) {
      // Tentar novamente após um delay maior
      setTimeout(() => fitToView(), 200);
      return;
    }

    const bbox = calculateBoundingBox();
    
    // Se não há conteúdo válido, centralizar na origem
    if (!isFinite(bbox.minX) || !isFinite(bbox.minY) || bbox.width === 0 || bbox.height === 0) {
      setZoom(1);
      setPanX(0);
      setPanY(0);
      return;
    }

    const contentWidth = bbox.width;
    const contentHeight = bbox.height;

    // Calcular a escala necessária para que o conteúdo caiba no container
    // O viewBox usa BASE_VIEWBOX_WIDTH/HEIGHT como referência base
    // Mas precisamos calcular o zoom considerando as dimensões do container real
    const scaleX = BASE_VIEWBOX_WIDTH / contentWidth;
    const scaleY = BASE_VIEWBOX_HEIGHT / contentHeight;
    
    // Usar o menor dos dois para garantir que tudo caiba
    const newZoom = Math.min(scaleX, scaleY, 5); // Limitar zoom máximo a 5x

    // Calcular centro do conteúdo
    const centerX = (bbox.minX + bbox.maxX) / 2;
    const centerY = (bbox.minY + bbox.maxY) / 2;

    // Calcular dimensões do viewBox com o novo zoom
    const viewBoxWidth = BASE_VIEWBOX_WIDTH / newZoom;
    const viewBoxHeight = BASE_VIEWBOX_HEIGHT / newZoom;

    // Calcular pan para centralizar o conteúdo no viewBox
    const newPanX = centerX - viewBoxWidth / 2;
    const newPanY = centerY - viewBoxHeight / 2;

    setZoom(newZoom);
    setPanX(newPanX);
    setPanY(newPanY);
  }

  // Inicializar view quando os dados carregarem pela primeira vez
  useEffect(() => {
    if (!hasInitializedView && desks.length > 0 && slots.length > 0) {
      // Usar requestAnimationFrame para garantir que o DOM está totalmente renderizado
      const initView = () => {
        if (svgContainerRef.current) {
          const container = svgContainerRef.current;
          // Verificar se o container tem dimensões válidas
          if (container.clientWidth > 0 && container.clientHeight > 0) {
            fitToView();
            setHasInitializedView(true);
            return;
          }
        }
        // Se não está pronto, tentar novamente no próximo frame
        requestAnimationFrame(initView);
      };
      
      // Aguardar alguns frames para garantir que o layout está completo
      setTimeout(() => {
        requestAnimationFrame(initView);
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desks.length, slots.length, hasInitializedView]);

  // Recalcular quando o container for redimensionado (mas apenas se já inicializou)
  useEffect(() => {
    if (!hasInitializedView) return;

    const handleResize = () => {
      if (svgContainerRef.current) {
        fitToView();
      }
    };

    // Debounce para evitar muitas chamadas durante resize
    let resizeTimeout: NodeJS.Timeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(handleResize, 250);
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, [hasInitializedView]);

  // Timer para mensagem de sucesso
  useEffect(() => {
    if (successMessage) {
      setMessageTimer(0);
      const interval = setInterval(() => {
        setMessageTimer(prev => {
          if (prev >= 100) {
            setSuccessMessage(null);
            return 0;
          }
          return prev + 3.33; // Aumenta 3.33% a cada 50ms (1.5 segundos total)
        });
      }, 50);

      return () => clearInterval(interval);
    }
  }, [successMessage]);

  const byDesk = useMemo(() => {
    // Filtrar reservas apenas para a data selecionada
    const reservationsForDate = reservations.filter(r => r.date === dateISO);
    return groupBy(reservationsForDate, (r: Reservation) => r.desk_id);
  }, [reservations, dateISO]);
  // Criar data sem problemas de timezone
  const [year, month, day] = dateISO.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  // Função para formatação amigável de data
  const getFriendlyDateLabel = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const fullDate = format(date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    
    if (isToday(date)) {
      return `Hoje - ${fullDate}`;
    } else if (isSameDay(date, tomorrow)) {
      return `Amanhã - ${fullDate}`;
    } else {
      return fullDate;
    }
  };

  // Calcular disponibilidade para o calendário
  const availabilityData = useMemo(() => {
    const data: Record<string, { available: number; total: number; isWeekend: boolean }> = {};
    
    // Para cada dia, calcular quantas mesas estão disponíveis
    const totalDesks = desks.length;
    // Se não há mesas carregadas, retornar dados vazios
    if (totalDesks === 0) {
      return data;
    }
    
    // Agrupar reservas por data
    const reservationsByDate = groupBy(reservations, (r: Reservation) => r.date);
    
    // Calcular disponibilidade para um range amplo (12 meses para frente e para trás)
    const today = new Date();
    const startDate = new Date(today);
    startDate.setMonth(today.getMonth() - 12); // 12 meses atrás
    
    const endDate = new Date(today);
    endDate.setMonth(today.getMonth() + 12); // 12 meses à frente
    
    // Calcular disponibilidade para todos os dias no range
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = toBrazilDateString(currentDate);
      const dayOfWeek = getDay(currentDate); // 0 = domingo, 6 = sábado
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      const dayReservations = reservationsByDate[dateStr] || [];
      const reservedDesks = new Set(dayReservations.map(r => r.desk_id));
      const available = totalDesks - reservedDesks.size;
      
      data[dateStr] = {
        available: Math.max(0, available),
        total: totalDesks,
        isWeekend
      };
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return data;
  }, [reservations, desks]);


  async function reserve(note: string, isRecurring?: boolean, recurringDays?: number[], startDate?: string, endDate?: string): Promise<boolean> {
    if (!selectedDesk) return false;
    
    // Validar se a mesa está bloqueada
    if (selectedDesk.is_blocked) {
      setSuccessMessage('Esta mesa está bloqueada e não pode ser reservada.');
      return false;
    }
    
    setIsCreatingReservation(true);
    try {
      if (isRecurring && recurringDays && recurringDays.length > 0) {
        // Usar a data de início fornecida ou a data atual
        const actualStartDate = startDate || dateISO;
        
        // Debug: mostrar informações da data atual
        const [year, month, dayNum] = actualStartDate.split('-').map(Number);
        const targetDate = new Date(year, month - 1, dayNum);
        const currentDay = targetDate.getDay();
        
        // Calcular número de semanas baseado na data fim
        let weeksToCreate = 52; // Padrão: 52 semanas (1 ano)
        
        if (endDate) {
          const startDateTime = new Date(actualStartDate + 'T00:00:00');
          const endDateTime = new Date(endDate + 'T23:59:59');
          const diffTime = endDateTime.getTime() - startDateTime.getTime();
          const diffWeeks = Math.ceil(diffTime / (7 * 24 * 60 * 60 * 1000));
          weeksToCreate = Math.max(1, diffWeeks); // Mínimo 1 semana
        }
        
        // Preparar todas as reservas para criação em lote
        const reservationsToCreate = [];
        
        for (let week = 0; week < weeksToCreate; week++) {
          for (const day of recurringDays) {
            // Converter índice do modal (0-4) para dia da semana real do JavaScript
            // Modal: 0=Seg, 1=Ter, 2=Qua, 3=Qui, 4=Sex
            // JavaScript: 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb
            const realDayOfWeek = day + 1; // 0->1 (Seg), 1->2 (Ter), 2->3 (Qua), etc.
            
            let daysToAdd = realDayOfWeek - currentDay;
            
            // Se o dia da semana já passou hoje, começar na próxima semana
            // Mas se for o mesmo dia da semana, começar hoje (daysToAdd = 0)
            if (daysToAdd < 0) {
              daysToAdd += 7; // Próxima semana
            }
            
            // Adicionar semanas
            daysToAdd += (week * 7);
            
            // Para a primeira semana (week = 0), garantir que começamos hoje se for o mesmo dia da semana
            if (week === 0 && realDayOfWeek === currentDay) {
              daysToAdd = 0; // Começar hoje
            }
            
            const recurringDate = new Date(targetDate);
            recurringDate.setDate(targetDate.getDate() + daysToAdd);
            const dateStr = toBrazilDateString(recurringDate);
            
            // Verificar se a data não é no passado (comparar apenas a data, não a hora)
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const recurringDateOnly = new Date(recurringDate);
            recurringDateOnly.setHours(0, 0, 0, 0);
            
            // Verificar se a data não ultrapassa a data fim (se definida)
            let isWithinEndDate = true;
            if (endDate) {
              const endDateTime = new Date(endDate + 'T23:59:59');
              endDateTime.setHours(0, 0, 0, 0);
              isWithinEndDate = recurringDateOnly <= endDateTime;
            }
            
            if (recurringDateOnly >= today && isWithinEndDate) {
              const reservationData = { 
                desk_id: selectedDesk.id, 
                date: dateStr, 
                note,
                is_recurring: true,
                recurring_days: recurringDays.map(day => day + 1) // Converter modal (0-4) para JavaScript (1-5)
              };
              
              reservationsToCreate.push(reservationData);
            }
          }
        }
        
        // Verificar conflitos com reservas individuais existentes (otimizado)
        const conflicts: Array<{ date: string; existingName: string; newName: string }> = [];
        const existingReservationsMap = new Map<string, Reservation>();
        
        // Criar mapa para busca O(1) em vez de O(n)
        reservations
          .filter(r => r.desk_id === selectedDesk.id && !r.is_recurring)
          .forEach(r => existingReservationsMap.set(r.date, r));
        
        for (const reservationData of reservationsToCreate) {
          const existingReservation = existingReservationsMap.get(reservationData.date);
          if (existingReservation) {
            conflicts.push({
              date: reservationData.date,
              existingName: existingReservation.note || '',
              newName: note
            });
          }
        }
        
        // Verificar conflitos com recorrências existentes (qualquer pessoa)
        const recurringConflicts: Array<{ date: string; existingName: string; newName: string; existingDays: number[]; newDays: number[] }> = [];
        
        // Buscar todas as recorrências existentes na mesma mesa (qualquer pessoa)
        const existingRecurringReservations = reservations.filter(r => 
          r.desk_id === selectedDesk.id && 
          r.is_recurring
        );
        
        
        if (existingRecurringReservations.length > 0) {
          
          // Agrupar recorrências existentes por pessoa
          const existingRecurrencesByPerson = new Map<string, { days: number[], dates: string[] }>();
          
          for (const existingReservation of existingRecurringReservations) {
            const personName = existingReservation.note || 'Pessoa desconhecida';
            
            if (!existingRecurrencesByPerson.has(personName)) {
              existingRecurrencesByPerson.set(personName, {
                days: [],
                dates: []
              });
            }
            
            // Só adicionar datas que estão dentro do período da nova recorrência
            const reservationDate = new Date(existingReservation.date + 'T00:00:00');
            const newStartDate = new Date(actualStartDate + 'T00:00:00');
            const newEndDate = endDate ? new Date(endDate + 'T23:59:59') : new Date(newStartDate.getTime() + 365 * 24 * 60 * 60 * 1000);
            
            if (reservationDate >= newStartDate && reservationDate <= newEndDate) {
              existingRecurrencesByPerson.get(personName)!.dates.push(existingReservation.date);
            }
          }
          
          // Calcular os dias da semana atuais baseado nas datas reais
          for (const [personName, recurrence] of existingRecurrencesByPerson) {
            const currentDays = new Set<number>();
            
            for (const dateStr of recurrence.dates) {
              // Usar parsing mais explícito para evitar problemas de fuso horário
              const [year, month, day] = dateStr.split('-').map(Number);
              const date = new Date(year, month - 1, day); // month é 0-indexed no JavaScript
              const dayOfWeek = date.getDay();
              const modalDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Converter para índice do modal
              currentDays.add(modalDayIndex);
            }
            
            // Usar os dias reais das reservas existentes, não calcular baseado nas datas
            // Isso garante que apenas os dias que realmente existem sejam considerados
            recurrence.days = Array.from(currentDays).sort();
            
            
            
            // Verificar se há sobreposição de dias da semana
            const existingDaysSet = new Set(recurrence.days);
            const newDaysSet = new Set(recurringDays);
            const hasDayOverlap = Array.from(existingDaysSet).some(day => newDaysSet.has(day));
            
            
            if (hasDayOverlap) {
              // Verificar se há conflito real: se alguma data da nova recorrência já existe
              const existingDatesSet = new Set(recurrence.dates);
              const newStartDate = new Date(actualStartDate + 'T00:00:00');
              const newEndDate = endDate ? new Date(endDate + 'T23:59:59') : new Date(newStartDate.getTime() + 365 * 24 * 60 * 60 * 1000);
              
              // Verificar se alguma data existente está dentro do período da nova recorrência
              const conflictingDates = Array.from(existingDatesSet).filter(existingDate => {
                const date = new Date(existingDate + 'T00:00:00');
                return date >= newStartDate && date <= newEndDate;
              });
              
              if (conflictingDates.length > 0) {
                // Há conflito real de datas
                const firstConflictDate = conflictingDates.sort()[0];
                
                // Calcular apenas os dias que realmente conflitam
                const conflictingDays = recurrence.days.filter(day => recurringDays.includes(day));
                
                recurringConflicts.push({
                  date: firstConflictDate,
                  existingName: personName,
                  newName: note,
                  existingDays: conflictingDays,
                  newDays: Array.from(recurringDays).sort()
                });
              }
            }
          }
        }
        
        // Filtrar reservas que têm conflito
        const reservationsWithoutConflicts = reservationsToCreate.filter(reservationData => 
          !conflicts.some(conflict => conflict.date === reservationData.date)
        );
        
        // Mostrar modal se houver conflitos de recorrência (prioridade maior)
        if (recurringConflicts.length > 0) {
          setRecurringRecurringConflictData({
            conflicts: recurringConflicts,
            newName: note
          });
          setIsRecurringRecurringConflictModalOpen(true);
          setIsCreatingReservation(false);
          return false; // Retorna false para não limpar os dados no modal
        }
        
        // Mostrar modal se houver conflitos com reservas individuais
        if (conflicts.length > 0) {
          setConflictData({
            conflicts,
            newName: note,
            reservationsWithoutConflicts
          });
          setIsConflictModalOpen(true);
          setIsCreatingReservation(false);
          return false; // Retorna false para não limpar os dados no modal
        }
        
        // Usar criação em lote para melhor performance
        try {
          await onCreateBulkReservations(reservationsWithoutConflicts);
        } catch (error: any) {
          // Se for um conflito de recorrência, mostrar modal de conflito
          if (error.message === 'CONFLICT' && error.conflicts) {
            const recurringConflicts = error.conflicts.map((conflict: any) => ({
              date: conflict.date,
              existingName: conflict.existingReservation.note || 'Pessoa desconhecida',
              newName: note,
              existingDays: conflict.existingReservation.is_recurring ? 
                (Array.isArray(conflict.existingReservation.recurring_days) ? 
                  conflict.existingReservation.recurring_days : 
                  JSON.parse(conflict.existingReservation.recurring_days || '[]')) : [],
              newDays: Array.from(recurringDays).sort()
            }));
            
            setConflictData({
              conflicts: recurringConflicts,
              newName: note,
              reservationsWithoutConflicts: [],
              onConfirm: () => {
                // Não fazer nada - apenas fechar o modal
                setConflictData(null);
                setIsConflictModalOpen(false);
              }
            });
            setIsConflictModalOpen(true);
            return false;
          }
          throw error; // Re-lançar outros erros
        }
        
        // Atualizar as reservas apenas uma vez no final
        await onFetchReservations();
        setSuccessMessage("Reservas criadas com sucesso!");
      } else {
        // Usar método bulk mesmo para reservas individuais
        const individualReservation = { 
          desk_id: selectedDesk.id, 
          date: dateISO, 
          note,
          is_recurring: false
        };
        
        try {
          // Usar criação em lote para reserva individual também
          await onCreateBulkReservations([individualReservation]);
          await onFetchReservations();
          setSuccessMessage("Reserva criada com sucesso!");
        } catch (error: any) {
          // Se for erro de conflito do backend, mostrar modal de conflito individual
          if (error.message === 'CONFLICT' && error.conflicts && error.conflicts.length > 0) {
            const conflict = error.conflicts[0];
            setIndividualConflictData({
              date: conflict.date,
              deskCode: selectedDesk.code
            });
            setIsIndividualConflictModalOpen(true);
            setSelectedDesk(null);
            setIsModalOpen(false);
            setHasRecurringReservation(false);
            return false; // Retorna false para não limpar os dados no modal
          }
          throw error; // Re-throw outros erros
        }
      }
      
      // Só fechar o modal se chegou até aqui sem erro
      setSelectedDesk(null);
      setIsModalOpen(false);
      setHasRecurringReservation(false);
      
      return true; // Retorna true para limpar os dados no modal
      
    } catch (error) {
      console.error('Erro na função reserve:', error);
      // Não fechar o modal se houve erro, para o usuário tentar novamente
      return false; // Retorna false para não limpar os dados no modal
    } finally {
      setIsCreatingReservation(false);
    }
  }

  async function handleConflictConfirm() {
    if (!conflictData) return;
    
    setIsCreatingReservation(true);
    setIsConflictModalOpen(false);
    
    try {
      // Usar método otimizado de criação em lote
      await onCreateBulkReservations(conflictData.reservationsWithoutConflicts);
      
      // Atualizar as reservas apenas uma vez no final
      await onFetchReservations();
      
      // Fechar modal
      setSelectedDesk(null);
      setIsModalOpen(false);
      setHasRecurringReservation(false);
      
    } catch (error) {
      console.error('Erro na função reserve:', error);
    } finally {
      setIsCreatingReservation(false);
      setConflictData(null);
    }
  }

  function handleConflictCancel() {
    setIsConflictModalOpen(false);
    setConflictData(null);
    setIsCreatingReservation(false);
    // Manter o modal de reserva aberto com os dados preenchidos
    // Não fechar o modal principal nem limpar os dados
  }

  function handleRecurringRecurringConflictClose() {
    setIsRecurringRecurringConflictModalOpen(false);
    setRecurringRecurringConflictData(null);
    setIsCreatingReservation(false);
    // Manter o modal de reserva aberto com os dados preenchidos
    // Não fechar o modal principal nem limpar os dados
  }

  async function cancelIndividualReservation(reservationId: string) {
    setIsDeletingReservation(true);
    try {
      // Adicionar um pequeno delay para garantir que o loading seja visível
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Usar método bulk mesmo para deleção individual
      await onDeleteBulkReservations([reservationId]);
      
      // Fechar modal ANTES de atualizar as reservas para evitar piscar
      setSelectedDesk(null);
      setIsModalOpen(false);
      setHasRecurringReservation(false);
      
      // Atualizar a lista de reservas após cancelamento
      await onFetchReservations();
      
      // Mostrar mensagem de sucesso
      setSuccessMessage("Reserva cancelada com sucesso!");
      
    } catch (error) {
      console.error('Erro ao cancelar reserva individual:', error);
    } finally {
      setIsDeletingReservation(false);
    }
  }

  async function cancelRecurringReservation() {
    if (!selectedDesk) return;
    
    setIsDeletingReservation(true);
    
    // Pequeno delay para garantir que o loading seja visível
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      // Buscar todas as reservas recorrentes desta mesa (todas as datas)
      const allDeskReservations = reservations.filter(r => 
        r.desk_id === selectedDesk.id && r.is_recurring
      );
      
      if (allDeskReservations.length === 0) {
        setSelectedDesk(null);
        setIsModalOpen(false);
        setIsDeletingReservation(false);
        return;
      }
      
      // Usar deleção em lote para melhor performance
      const ids = allDeskReservations.map(r => r.id);
      await onDeleteBulkReservations(ids);
      
      // Fechar modal ANTES de atualizar as reservas para evitar piscar
      setSelectedDesk(null);
      setIsModalOpen(false);
      setHasRecurringReservation(false);
      
      // Atualizar as reservas após cancelamento
      await onFetchReservations();
      
      // Mostrar mensagem de sucesso
      setSuccessMessage("Recorrência cancelada com sucesso!");
      
    } catch (error) {
      console.error('Erro ao cancelar recorrência:', error);
      setSuccessMessage('Erro ao cancelar recorrência. Tente novamente.');
    } finally {
      setIsDeletingReservation(false);
    }
  }

  async function cancelPartialRecurringReservation(selectedDays: number[]) {
    if (!selectedDesk) return;
    
    setIsDeletingReservation(true);
    
    // Pequeno delay para garantir que o loading seja visível
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      // Buscar a reserva do dia atual para identificar a pessoa
      const currentDayReservation = reservations.find(r => 
        r.desk_id === selectedDesk.id && r.date === dateISO && r.is_recurring
      );
      
      if (!currentDayReservation) {
        return;
      }
      
      // Buscar todas as reservas recorrentes da mesma pessoa na mesma mesa
      const samePersonReservations = reservations.filter(r => 
        r.desk_id === selectedDesk.id && 
        r.is_recurring && 
        r.note === currentDayReservation.note
      );
      
      // Filtrar apenas as reservas que correspondem aos dias selecionados
      // Usar as datas reais em vez dos recurring_days originais
      const reservationsToCancel = samePersonReservations.filter(reservation => {
        // Calcular o dia da semana da data real da reserva
        const [year, month, day] = reservation.date.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();
        const modalDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Converter para índice do modal
        
            // Verificar se o dia da semana desta reserva está nos dias selecionados para cancelar
            return selectedDays.includes(modalDayIndex);
      });
      
      if (reservationsToCancel.length === 0) {
        setSelectedDesk(null);
        setIsRecurringCancelModalOpen(false);
        setIsModalOpen(false);
        setHasRecurringReservation(false);
        setIsDeletingReservation(false);
        return;
      }
      
      // Usar deleção em lote para melhor performance
      const ids = reservationsToCancel.map(r => r.id);
      await onDeleteBulkReservations(ids);
      
      // Atualizar as reservas após cancelamento
      await onFetchReservations();
      
      // Mostrar mensagem de sucesso
      setSuccessMessage("Recorrência cancelada com sucesso!");
      
      setSelectedDesk(null);
      setIsRecurringCancelModalOpen(false);
      setIsModalOpen(false);
      setHasRecurringReservation(false);
      setCurrentRecurringDays([]);
      
    } catch (error) {
      console.error('Erro ao cancelar recorrência parcial:', error);
      setSuccessMessage('Erro ao cancelar recorrência. Tente novamente.');
    } finally {
      setIsDeletingReservation(false);
    }
  }


  function openRecurringCancelModal() {
    if (!selectedDesk) return;
    
    
    // Buscar a reserva específica para o dia atual
    const currentDayReservation = reservations.find(r => 
      r.desk_id === selectedDesk.id && r.date === dateISO && r.is_recurring
    );
    
    if (currentDayReservation) {
      // Buscar todas as reservas recorrentes da mesma pessoa na mesma mesa que ainda existem
      const samePersonReservations = reservations.filter(r => 
        r.desk_id === selectedDesk.id && 
        r.is_recurring && 
        r.note === currentDayReservation.note
      );
      
      // Calcular os dias atuais baseado nas datas reais que existem no banco
      const currentDays = new Set<number>();
      
      samePersonReservations.forEach(reservation => {
        // Usar parsing mais explícito para evitar problemas de fuso horário
        const dateStr = reservation.date;
        const [year, month, day] = dateStr.split('-').map(Number);
        const date = new Date(year, month - 1, day); // month é 0-indexed no JavaScript
        const dayOfWeek = date.getDay();
        
        // Converter para índice do modal: 0=Segunda, 1=Terça, 2=Quarta, 3=Quinta, 4=Sexta
        // JavaScript: 0=Domingo, 1=Segunda, 2=Terça, 3=Quarta, 4=Quinta, 5=Sexta, 6=Sábado
        const modalDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Domingo vira 6, outros diminuem 1
        currentDays.add(modalDayIndex);
        
      });
      
      // Converter Set para Array e ordenar
      const uniqueRecurringDays = Array.from(currentDays).sort();
      
      
      setCurrentRecurringDays(uniqueRecurringDays);
      setIsRecurringCancelModalOpen(true);
    }
  }



  // Função para calcular snap to grid
  function snapToGrid(x: number, y: number, widthUnits: number = SLOT_WIDTH_UNITS, heightUnits: number = SLOT_HEIGHT_UNITS): { x: number; y: number; col: number; row: number } {
    // Snap para múltiplos de 40px (grid unit) - alinhamento perfeito
    // O grid é baseado em unidades de 40px, então qualquer posição deve ser um múltiplo exato
    
    let snappedX = Math.round(x / GRID_UNIT) * GRID_UNIT;
    let snappedY = Math.round(y / GRID_UNIT) * GRID_UNIT;
    
    // Permitir coordenadas negativas para permitir criação acima/esquerda das mesas existentes
    // Não forçar valores mínimos de 0
    
    // Calcular coluna e linha baseado no snap (para referência)
    // Coluna considera que cada slot padrão tem 3 unidades (120px)
    const colIndex = Math.round(snappedX / (SLOT_WIDTH_UNITS * GRID_UNIT));
    const rowIndex = Math.round(snappedY / (SLOT_HEIGHT_UNITS * GRID_UNIT));
    
    return { x: snappedX, y: snappedY, col: colIndex + 1, row: rowIndex + 1 };
  }

  // Função para validar se a mesa cabe no espaço sem colisão
  function canPlaceDesk(x: number, y: number, widthUnits: number, heightUnits: number, excludeDeskId?: string): boolean {
    const width = widthUnits * GRID_UNIT;
    const height = heightUnits * GRID_UNIT;
    
    // Verificar colisão com outras mesas (incluindo posições do rascunho)
    for (const desk of desks) {
      if (excludeDeskId && desk.id === excludeDeskId) continue;
      
      const slot = getSlotByDesk(desk.id);
      if (!slot) continue;
      
      // Usar posição do rascunho se existir, senão usar posição do slot
      const draftPos = deskPositionsDraft.get(desk.id);
      const deskX = draftPos ? draftPos.x : slot.x;
      const deskY = draftPos ? draftPos.y : slot.y;
      
      const deskWidth = (desk.width_units || SLOT_WIDTH_UNITS) * GRID_UNIT;
      const deskHeight = (desk.height_units || SLOT_HEIGHT_UNITS) * GRID_UNIT;
      
      // Verificar sobreposição
      if (
        x < deskX + deskWidth &&
        x + width > deskX &&
        y < deskY + deskHeight &&
        y + height > deskY
      ) {
        return false;
      }
    }
    
    return true;
  }

  // Função para encontrar ou criar slot na posição
  async function findOrCreateSlotAtPosition(x: number, y: number, widthUnits: number, heightUnits: number, areaId: string, deskId?: string): Promise<Slot> {
    const width = widthUnits * GRID_UNIT;
    const height = heightUnits * GRID_UNIT;
    
    // Calcular row_number e col_number baseado na posição exata (sem offset fixo)
    // Usar a posição X e Y diretamente, dividindo pelo tamanho do slot
    const col = Math.round(x / (widthUnits * GRID_UNIT)) + 1;
    const row = Math.round(y / (heightUnits * GRID_UNIT)) + 1;
    
    // Procurar slot existente na posição exata
    let existingSlot = slots.find(s => 
      s.area_id === areaId &&
      s.row_number === row &&
      s.col_number === col &&
      s.w === width &&
      s.h === height
    );
    
    if (existingSlot) {
      // Se o slot existe mas está ocupado por outra mesa, não podemos usar
      const deskInSlot = getDeskBySlot(existingSlot.id);
      if (deskInSlot && deskInSlot.id !== deskId) {
        // Slot ocupado, criar novo nas coordenadas exatas
        existingSlot = await createSlot({
          area_id: areaId,
          row_number: row,
          col_number: col,
          x: x,
          y: y,
          w: width,
          h: height,
        });
      }
      return existingSlot;
    }
    
    // Criar novo slot
    return await createSlot({
      area_id: areaId,
      row_number: row,
      col_number: col,
      x: x,
      y: y,
      w: width,
      h: height,
    });
  }

  // Função para converter coordenadas do mouse para coordenadas do SVG (considerando zoom e pan)
  function screenToSVG(clientX: number, clientY: number, svgElement: SVGSVGElement): { x: number; y: number } {
    const rect = svgElement.getBoundingClientRect();
    const viewBox = svgElement.viewBox.baseVal;
    
    // Coordenadas relativas ao SVG
    const svgX = ((clientX - rect.left) / rect.width) * viewBox.width;
    const svgY = ((clientY - rect.top) / rect.height) * viewBox.height;
    
    // Converter para coordenadas do grid (considerando pan)
    const gridX = svgX + viewBox.x;
    const gridY = svgY + viewBox.y;
    
    return { x: gridX, y: gridY };
  }

  // Handlers para zoom
  function handleZoomIn() {
    setZoom(prev => Math.min(prev * 1.2, 5)); // Max 5x zoom
  }

  function handleZoomOut() {
    setZoom(prev => Math.max(prev / 1.2, 0.2)); // Min 0.2x zoom
  }

  function handleResetZoom() {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  }


  // Handler para wheel zoom
  function handleWheel(e: React.WheelEvent<SVGSVGElement>) {
    if (!e.ctrlKey && !e.metaKey) return; // Só zoom com Ctrl/Cmd + wheel
    
    e.preventDefault();
    const svgElement = e.currentTarget;
    const rect = svgElement.getBoundingClientRect();
    const viewBox = svgElement.viewBox.baseVal;
    
    // Ponto do mouse no espaço do SVG
    const mouseX = ((e.clientX - rect.left) / rect.width) * viewBox.width + viewBox.x;
    const mouseY = ((e.clientY - rect.top) / rect.height) * viewBox.height + viewBox.y;
    
    // Calcular novo zoom
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.2, Math.min(5, zoom * delta));
    
    // Ajustar pan para manter o ponto do mouse fixo
    const newViewBoxWidth = BASE_VIEWBOX_WIDTH / newZoom;
    const newViewBoxHeight = BASE_VIEWBOX_HEIGHT / newZoom;
    const oldViewBoxWidth = BASE_VIEWBOX_WIDTH / zoom;
    const oldViewBoxHeight = BASE_VIEWBOX_HEIGHT / zoom;
    
    const newPanX = mouseX - (mouseX - viewBox.x) * (newViewBoxWidth / oldViewBoxWidth);
    const newPanY = mouseY - (mouseY - viewBox.y) * (newViewBoxHeight / oldViewBoxHeight);
    
    setZoom(newZoom);
    setPanX(newPanX);
    setPanY(newPanY);
  }

  // Handlers para pan
  function handlePanStart(e: React.MouseEvent<SVGSVGElement>) {
    // Pan com botão esquerdo (padrão) ou botão direito
    // Não fazer pan se estiver clicando em um elemento interativo (mesa, botão, etc.)
    if (e.button === 0 || e.button === 2) {
      const target = e.target as HTMLElement;
      
      // Se clicou em uma mesa no modo edição, não fazer pan (deixar drag da mesa)
      if (isEditMode && target.getAttribute('data-desk')) {
        return;
      }
      
      // Se clicou no SVG ou no grid (fundo), fazer pan
      if (target.tagName === 'svg' || target.tagName === 'rect') {
        // Verificar se não é uma mesa (não tem data-desk)
        if (!target.getAttribute('data-desk')) {
          e.preventDefault();
          setIsPanning(true);
          setPanStart({ x: e.clientX, y: e.clientY });
        }
      }
    }
  }

  function handlePanMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!isPanning || !panStart) return;
    
    e.preventDefault();
    const svgElement = e.currentTarget;
    const rect = svgElement.getBoundingClientRect();
    const viewBox = svgElement.viewBox.baseVal;
    
    // Calcular diferença em pixels
    const dx = e.clientX - panStart.x;
    const dy = e.clientY - panStart.y;
    
    // Converter para unidades do grid
    const dxGrid = (dx / rect.width) * viewBox.width;
    const dyGrid = (dy / rect.height) * viewBox.height;
    
    // Atualizar pan
    setPanX(prev => Math.max(-GRID_WIDTH, Math.min(GRID_WIDTH, prev - dxGrid)));
    setPanY(prev => Math.max(-GRID_HEIGHT, Math.min(GRID_HEIGHT, prev - dyGrid)));
    setPanStart({ x: e.clientX, y: e.clientY });
  }

  function handlePanEnd(e: React.MouseEvent<SVGSVGElement>) {
    setIsPanning(false);
    setPanStart(null);
  }

  // Handler para iniciar drag (mesa)
  function handleMouseDown(e: React.MouseEvent<SVGRectElement>, desk: Desk, slot: Slot) {
    if (!isEditMode) return;
    
    // Sempre parar propagação para evitar pan quando arrastar mesa
    e.stopPropagation();
    
    // Se estiver com botão direito, não arrastar mesa
    if (e.button === 2) return;
    
    const svgElement = e.currentTarget.ownerSVGElement;
    if (!svgElement) return;
    
    // Cancelar pan se estiver ativo
    setIsPanning(false);
    setPanStart(null);
    
    const { x: svgX, y: svgY } = screenToSVG(e.clientX, e.clientY, svgElement);
    
    const widthUnits = desk.width_units || SLOT_WIDTH_UNITS;
    const heightUnits = desk.height_units || SLOT_HEIGHT_UNITS;
    
    // Usar posição do rascunho se existir, senão usar posição do slot
    const draftPos = deskPositionsDraft.get(desk.id);
    const startX = draftPos ? draftPos.x : slot.x;
    const startY = draftPos ? draftPos.y : slot.y;
    
    setDraggingDesk({
      desk,
      slot,
      startX: startX,
      startY: startY,
      offsetX: svgX - startX,
      offsetY: svgY - startY,
    });
    
    setDraggedPosition({ x: startX, y: startY });
  }

  // Handler para movimento do mouse durante drag
  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    // Se estiver criando mesa no mouse, atualizar posição do preview
    if (isCreatingDeskAtMouse) {
      const svgElement = e.currentTarget;
      const { x: svgX, y: svgY } = screenToSVG(e.clientX, e.clientY, svgElement);
      
      // Centralizar o preview no cursor (meio da mesa no cursor)
      const snapped = snapToGrid(
        svgX - (SLOT_WIDTH_UNITS * GRID_UNIT) / 2,
        svgY - (SLOT_HEIGHT_UNITS * GRID_UNIT) / 2,
        SLOT_WIDTH_UNITS,
        SLOT_HEIGHT_UNITS
      );
      
      // Sempre atualizar a posição do preview (removendo validação de limites muito restritiva)
      // O snapToGrid já garante valores não negativos
      setPreviewDeskPosition({ x: snapped.x, y: snapped.y });
      
      // Determinar área baseada na posição (encontrar área mais próxima ou usar primeira área)
      // Por enquanto, usar a primeira área como padrão
      if (!previewDeskAreaId && areas.length > 0) {
        setPreviewDeskAreaId(areas[0].id);
      }
      return;
    }
    
    // Se estiver arrastando uma mesa, priorizar o drag da mesa
    if (draggingDesk) {
      const svgElement = e.currentTarget;
      const { x: svgX, y: svgY } = screenToSVG(e.clientX, e.clientY, svgElement);
      
      const newX = svgX - draggingDesk.offsetX;
      const newY = svgY - draggingDesk.offsetY;
      
      const widthUnits = draggingDesk.desk.width_units || SLOT_WIDTH_UNITS;
      const heightUnits = draggingDesk.desk.height_units || SLOT_HEIGHT_UNITS;
      
      const snapped = snapToGrid(newX, newY, widthUnits, heightUnits);
      
      // Validar limites do grid
      if (Math.abs(snapped.x) > GRID_WIDTH / 2 || Math.abs(snapped.y) > GRID_HEIGHT / 2) {
        // Não atualizar posição se estiver fora dos limites
        return;
      }
      
      // Validar se pode colocar
      if (canPlaceDesk(snapped.x, snapped.y, widthUnits, heightUnits, draggingDesk.desk.id)) {
        setDraggedPosition({ x: snapped.x, y: snapped.y });
      }
      return;
    }
    
    // Se não estiver arrastando mesa, fazer pan se estiver panning
    if (isPanning) {
      handlePanMove(e);
    }
  }

  // Handler para soltar - apenas atualizar rascunho, não salvar
  function handleMouseUp(e: React.MouseEvent<SVGSVGElement>) {
    if (!draggingDesk || !draggedPosition) {
      // Se não estava arrastando mesa, apenas finalizar pan se necessário
      if (isPanning) {
        setIsPanning(false);
        setPanStart(null);
      }
      return;
    }
    
    const { desk, slot } = draggingDesk;
    const { x: newX, y: newY } = draggedPosition;
    
    // Verificar se a posição realmente mudou (comparar com rascunho ou slot original)
    const draftPos = deskPositionsDraft.get(desk.id);
    const currentX = draftPos ? draftPos.x : slot.x;
    const currentY = draftPos ? draftPos.y : slot.y;
    
    if (newX === currentX && newY === currentY) {
      setDraggingDesk(null);
      setDraggedPosition(null);
      return;
    }
    
    // Validar que a posição está dentro de limites razoáveis
    if (Math.abs(newX) > GRID_WIDTH / 2 || Math.abs(newY) > GRID_HEIGHT / 2) {
      console.warn('Posição fora dos limites do grid, cancelando movimento');
      setDraggingDesk(null);
      setDraggedPosition(null);
      return;
    }
    
    // Apenas atualizar o rascunho - não salvar ainda
    setDeskPositionsDraft(prev => {
      const newMap = new Map(prev);
      newMap.set(desk.id, { slotId: slot.id, x: newX, y: newY });
      return newMap;
    });
    
    // Limpar estado de drag
    setDraggingDesk(null);
    setDraggedPosition(null);
  }
  
  // Função para salvar todas as mudanças de uma vez
  async function handleSaveChanges() {
    if (deskPositionsDraft.size === 0) {
      return; // Nada para salvar
    }
    
    setIsSavingChanges(true);
    try {
      // Salvar pan e zoom atuais antes de recarregar
      const currentPanX = panX;
      const currentPanY = panY;
      const currentZoom = zoom;
      
      // Processar cada mesa movida
      for (const [deskId, newPosition] of deskPositionsDraft.entries()) {
        const desk = desks.find(d => d.id === deskId);
        if (!desk) continue;
        
        const oldSlot = slots.find(s => s.id === desk.slot_id);
        if (!oldSlot) continue;
        
        // Validar que a posição está dentro de limites razoáveis
        if (Math.abs(newPosition.x) > GRID_WIDTH / 2 || Math.abs(newPosition.y) > GRID_HEIGHT / 2) {
          console.warn(`Posição fora dos limites para mesa ${desk.code}, pulando...`);
          continue;
        }
        
        const widthUnits = desk.width_units || SLOT_WIDTH_UNITS;
        const heightUnits = desk.height_units || SLOT_HEIGHT_UNITS;
        
        // Encontrar ou criar slot na nova posição
        const newSlot = await findOrCreateSlotAtPosition(
          newPosition.x,
          newPosition.y,
          widthUnits,
          heightUnits,
          desk.area_id,
          desk.id
        );
        
        // Liberar slot antigo (apenas se for diferente)
        if (oldSlot.id !== newSlot.id) {
          await fetch(`/api/slots?id=${oldSlot.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_available: true }),
          });
          
          // Atualizar mesa para usar o novo slot
          await fetch(`/api/desks?id=${desk.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slot_id: newSlot.id }),
          });
          
          // Marcar novo slot como ocupado
          await fetch(`/api/slots?id=${newSlot.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_available: false }),
          });
        }
      }
      
      // Recarregar dados uma única vez
      if (onSlotsChange) await onSlotsChange();
      if (onDesksChange) await onDesksChange();
      
      // Aguardar um pouco e restaurar pan/zoom
      await new Promise(resolve => setTimeout(resolve, 300));
      setPanX(currentPanX);
      setPanY(currentPanY);
      setZoom(currentZoom);
      
      // Limpar rascunho
      setDeskPositionsDraft(new Map());
      
      setSuccessMessage('Alterações salvas com sucesso!');
    } catch (error) {
      console.error('Error saving changes:', error);
      setSuccessMessage('Erro ao salvar alterações. Tente novamente.');
    } finally {
      setIsSavingChanges(false);
    }
  }

  // Handler para cancelar drag (mouse fora do SVG)
  useEffect(() => {
    function handleMouseLeave() {
      if (draggingDesk) {
        setDraggingDesk(null);
        setDraggedPosition(null);
      }
    }
    
    const svg = document.querySelector('svg');
    if (svg) {
      svg.addEventListener('mouseleave', handleMouseLeave);
      return () => svg.removeEventListener('mouseleave', handleMouseLeave);
    }
  }, [draggingDesk]);

  // Função para obter linha da mesa (ex: 'C' de 'C5')
  function getRowFromCode(code: string): string {
    return code.replace(/\d/g, '');
  }

  // Função para obter número da mesa (ex: 5 de 'C5')
  function getNumberFromCode(code: string): number {
    const match = code.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  // Função para gerar próximo código da linha
  function getNextDeskCode(rowLetter: string, existingDesksInRow: Desk[]): string {
    const maxNumber = existingDesksInRow.reduce((max, desk) => {
      const num = getNumberFromCode(desk.code);
      return num > max ? num : max;
    }, 0);
    return `${rowLetter}${maxNumber + 1}`;
  }

  // Função para criar slot
  async function createSlot(slotData: {
    area_id: string;
    row_number: number;
    col_number: number;
    x: number;
    y: number;
    w: number;
    h: number;
  }): Promise<Slot> {
    const response = await fetch('/api/slots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slotData),
    });

    if (!response.ok) {
      let error;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        error = await response.json();
      } else {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to create slot');
      }
      throw new Error(error.error || 'Failed to create slot');
    }

    return await response.json();
  }

  // Função para criar mesa
  async function createDesk(slotId: string, areaId: string, code: string, widthUnits?: number, heightUnits?: number): Promise<Desk> {
    const response = await fetch('/api/desks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slot_id: slotId,
        area_id: areaId,
        code,
        is_active: true,
        width_units: widthUnits || SLOT_WIDTH_UNITS,
        height_units: heightUnits || SLOT_HEIGHT_UNITS,
        created_at: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      let error;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        error = await response.json();
      } else {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to create desk');
      }
      throw new Error(error.error || 'Failed to create desk');
    }

    return await response.json();
  }

  // Função para deletar mesa
  async function deleteDesk(deskId: string): Promise<void> {
    const response = await fetch(`/api/desks?id=${deskId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      let error;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        error = await response.json();
      } else {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to delete desk');
      }
      if (error.error === 'HAS_RESERVATIONS') {
        throw { type: 'HAS_RESERVATIONS', reservations: error.reservations };
      }
      throw new Error(error.error || 'Failed to delete desk');
    }
  }

  // Função para verificar reservas FUTURAS da mesa (ignorar reservas antigas/passadas)
  async function checkDeskReservations(deskId: string): Promise<Array<{ id: string; date: string; note: string | null; is_recurring?: boolean; recurring_days?: number[] }>> {
    const today = toBrazilDateString(new Date());
    
    // Buscar todas as reservas futuras e filtrar por desk_id no cliente
    // (a API não aceita desk_id como parâmetro, então filtramos depois)
    const response = await fetch(`/api/reservations?startDate=${today}`);
    if (!response.ok) {
      return [];
    }
    const data = await response.json();
    if (!Array.isArray(data)) return [];
    
    // Filtrar por desk_id e apenas reservas futuras (>= hoje)
    return data
      .filter((res: Reservation) => res.desk_id === deskId && res.date >= today)
      .map((res: Reservation) => ({ 
        id: res.id, 
        date: res.date, 
        note: res.note,
        is_recurring: res.is_recurring,
        recurring_days: res.recurring_days
      }));
  }

  // Função para criar mesa à direita
  function handleCreateDeskRight(slot: Slot, desk: Desk | null) {
    if (!desk) return;
    setCreatingDeskData({ slot, desk, direction: 'right' });
    setIsCreateDeskModalOpen(true);
  }

  // Função para criar mesa à esquerda
  function handleCreateDeskLeft(slot: Slot, desk: Desk | null) {
    if (!desk) return;
    setCreatingDeskData({ slot, desk, direction: 'left' });
    setIsCreateDeskModalOpen(true);
  }

  // Função para criar mesa acima
  function handleCreateDeskAbove(slot: Slot, desk: Desk | null) {
    if (!desk) return;
    
    // Verificar se é uma linha nova ou não
    const newRowNumber = slot.row_number - 1;
    const rowDesks = desks.filter(d => {
      const deskSlot = slots.find(s => s.id === d.slot_id);
      return deskSlot?.row_number === newRowNumber;
    });
    
    if (rowDesks.length === 0) {
      // Nova linha - perguntar nome da linha primeiro
      setSelectedSlotForAction({ slot, desk, direction: 'above' });
      setIsNewRowModalOpen(true);
    } else {
      // Linha existente - perguntar código da mesa
      setCreatingDeskData({ slot, desk, direction: 'above' });
      setIsCreateDeskModalOpen(true);
    }
  }

  // Função para criar mesa abaixo
  function handleCreateDeskBelow(slot: Slot, desk: Desk | null) {
    if (!desk) return;
    
    // Verificar se é uma linha nova ou não
    const newRowNumber = slot.row_number + 1;
    const rowDesks = desks.filter(d => {
      const deskSlot = slots.find(s => s.id === d.slot_id);
      return deskSlot?.row_number === newRowNumber;
    });
    
    if (rowDesks.length === 0) {
      // Nova linha - perguntar nome da linha primeiro
      setSelectedSlotForAction({ slot, desk, direction: 'below' });
      setIsNewRowModalOpen(true);
    } else {
      // Linha existente - perguntar código da mesa
      setCreatingDeskData({ slot, desk, direction: 'below' });
      setIsCreateDeskModalOpen(true);
    }
  }

  // Função para confirmar criação da mesa com código, área e tamanho
  async function handleConfirmCreateDesk(code: string, areaId: string, widthUnits?: number, heightUnits?: number) {
    if (!creatingDeskData) return;
    
    const { slot, direction } = creatingDeskData;
    
    setIsCreatingDesk(true);
    try {
      // Se for 'in-place', usar o slot existente diretamente ou criar um novo se for temporário
      if (direction === 'in-place') {
        let finalSlot = slot;
        
        // Se for um slot temporário, criar o slot primeiro
        if (slot.id === 'temp') {
          const finalWidthUnits = widthUnits || SLOT_WIDTH_UNITS;
          const finalHeightUnits = heightUnits || SLOT_HEIGHT_UNITS;
          
          // Calcular row_number e col_number baseado na posição exata
          const col = Math.round(slot.x / (finalWidthUnits * GRID_UNIT)) + 1;
          const row = Math.round(slot.y / (finalHeightUnits * GRID_UNIT)) + 1;
          
          // Criar slot na posição correta
          finalSlot = await createSlot({
            area_id: areaId,
            row_number: row,
            col_number: col,
            x: slot.x,
            y: slot.y,
            w: finalWidthUnits * GRID_UNIT,
            h: finalHeightUnits * GRID_UNIT,
          });
        } else {
          // Se a área escolhida for diferente da área do slot, atualizar o slot também
          if (areaId !== slot.area_id) {
            await fetch(`/api/slots?id=${slot.id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ area_id: areaId }),
            });
          }
        }
        
        await createDesk(finalSlot.id, areaId, code, widthUnits, heightUnits);
      } else {
        // Caso contrário, calcular posição (mantido para compatibilidade, mas não será mais usado)
        const desk = creatingDeskData.desk;
        if (!desk) {
          throw new Error('Desk required for directional creation');
        }
        
        let newCol: number;
        let newRowNumber: number;
        let newX: number;
        let newY: number;
        
        if (direction === 'right') {
          newCol = slot.col_number + 1;
          newRowNumber = slot.row_number;
          newX = slot.x + slot.w;
          newY = slot.y;
        } else if (direction === 'left') {
          newCol = slot.col_number - 1;
          newRowNumber = slot.row_number;
          newX = slot.x - slot.w;
          newY = slot.y;
        } else if (direction === 'above') {
          newCol = slot.col_number;
          newRowNumber = slot.row_number - 1;
          newX = slot.x;
          newY = slot.y - slot.h;
        } else { // below
          newCol = slot.col_number;
          newRowNumber = slot.row_number + 1;
          newX = slot.x;
          newY = slot.y + slot.h;
        }
        
        // Verificar se o slot já existe
        const existingSlot = slots.find(s => 
          s.row_number === newRowNumber && 
          s.col_number === newCol &&
          s.area_id === areaId
        );
        
        let newSlot: Slot;
        if (existingSlot) {
          newSlot = existingSlot;
        } else {
          const width = (widthUnits || SLOT_WIDTH_UNITS) * GRID_UNIT;
          const height = (heightUnits || SLOT_HEIGHT_UNITS) * GRID_UNIT;
          newSlot = await createSlot({
            area_id: areaId,
            row_number: newRowNumber,
            col_number: newCol,
            x: newX,
            y: newY,
            w: width,
            h: height,
          });
        }

        await createDesk(newSlot.id, areaId, code, widthUnits, heightUnits);
      }
      
      setIsCreateDeskModalOpen(false);
      setCreatingDeskData(null);
      
      if (onSlotsChange) await onSlotsChange();
      if (onDesksChange) await onDesksChange();
    } catch (error: any) {
      console.error('Error creating desk:', error);
      if (error.message?.includes('CODE_EXISTS') || error.message?.includes('Já existe')) {
        throw error;
      }
      setSuccessMessage('Erro ao criar mesa. Tente novamente.');
    } finally {
      setIsCreatingDesk(false);
    }
  }


  // Função para criar mesa com nome de linha (após confirmar nome da linha, pergunta o código)
  async function handleCreateDeskWithRowName(rowName: string) {
    if (!selectedSlotForAction) return;
    
    const { slot, desk, direction } = selectedSlotForAction;
    if (!desk) return;
    
    // Fechar modal de linha
    setIsNewRowModalOpen(false);
    
    // Calcular posição da nova linha
    const newRowNumber = direction === 'above' ? slot.row_number - 1 : slot.row_number + 1;
    
    // Verificar se já existe um slot naquela posição (mesma coluna, nova linha)
    const existingSlotInNewRow = slots.find(s => 
      s.area_id === slot.area_id &&
      s.row_number === newRowNumber &&
      s.col_number === slot.col_number
    );
    
    if (existingSlotInNewRow && existingSlotInNewRow.is_available) {
      // Se existe slot vazio, usar ele diretamente
      setCreatingDeskData({ slot: existingSlotInNewRow, desk: null, direction: 'in-place' });
      setSelectedSlotForAction(null);
      setIsCreateDeskModalOpen(true);
    } else {
      // Se não existe slot, criar um novo (mas isso só deve acontecer se realmente for necessário)
      // Na prática, isso só deve acontecer se o slot ainda não foi criado no banco
      const tempSlot: Slot = {
        ...slot,
        row_number: newRowNumber,
        y: direction === 'above' ? slot.y - slot.h : slot.y + slot.h,
      };
      
      setCreatingDeskData({ slot: tempSlot, desk, direction: direction as 'above' | 'below' });
      setSelectedSlotForAction(null);
      setIsCreateDeskModalOpen(true);
    }
  }

  // Função para excluir mesa
  async function handleDeleteDesk(desk: Desk) {
    setIsDeletingDesk(true);
    try {
      const reservations = await checkDeskReservations(desk.id);
      
      if (reservations.length > 0) {
        setDeleteDeskData({ desk, reservations });
        setIsDeleteModalOpen(true);
        setIsDeletingDesk(false);
        return;
      }
      
      await deleteDesk(desk.id);
      
      if (onDesksChange) await onDesksChange();
      if (onSlotsChange) await onSlotsChange();
    } catch (error: any) {
      if (error.type === 'HAS_RESERVATIONS') {
        setDeleteDeskData({ desk, reservations: error.reservations });
        setIsDeleteModalOpen(true);
      } else {
        console.error('Error deleting desk:', error);
        setSuccessMessage('Erro ao excluir mesa. Tente novamente.');
      }
    } finally {
      setIsDeletingDesk(false);
    }
  }

  // Função para confirmar exclusão (mesmo com reservas - não permitir)
  async function handleConfirmDelete() {
    if (!deleteDeskData) return;
    
    setIsDeleteModalOpen(false);
    setDeleteDeskData(null);
  }

  // Função para atualizar código, área e bloqueio da mesa
  async function handleUpdateDeskCode(newCode: string, newAreaId: string, isBlocked: boolean) {
    if (!editingDesk) return;

    setIsUpdatingDesk(true);
    try {
      // Se estiver bloqueando, verificar reservas primeiro
      if (isBlocked && !editingDesk.is_blocked) {
        const reservations = await checkDeskReservations(editingDesk.id);
        
        if (reservations.length > 0) {
          setDeleteDeskData({ 
            desk: editingDesk, 
            reservations: reservations.map(r => ({
              id: r.id,
              date: r.date,
              note: r.note,
              is_recurring: r.is_recurring,
              recurring_days: r.recurring_days
            })),
            isBlockingContext: true
          });
          setIsDeleteModalOpen(true);
          setIsEditDeskModalOpen(false);
          setIsUpdatingDesk(false);
          throw new Error('HAS_RESERVATIONS');
        }
      }

      const updateData: { code: string; area_id?: string; is_blocked?: boolean } = { 
        code: newCode,
        is_blocked: isBlocked
      };
      
      // Se a área mudou, atualizar tanto a mesa quanto o slot
      if (newAreaId !== editingDesk.area_id) {
        updateData.area_id = newAreaId;
        
        // Atualizar também o slot para manter consistência
        const slot = slots.find(s => s.id === editingDesk.slot_id);
        if (slot) {
          await fetch(`/api/slots?id=${slot.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ area_id: newAreaId }),
          });
        }
      }

      const response = await fetch(`/api/desks?id=${editingDesk.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        let error;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          error = await response.json();
        } else {
          const errorText = await response.text();
          throw new Error(errorText || 'Failed to update desk');
        }
        
        if (error.error === 'CODE_EXISTS') {
          throw new Error('CODE_EXISTS');
        }
        if (error.error === 'HAS_RESERVATIONS') {
          // Mostrar modal de reservas
          const reservations = error.reservations || [];
          setDeleteDeskData({ 
            desk: editingDesk, 
            reservations: reservations.map((r: any) => ({
              id: r.id,
              date: r.date,
              note: r.note,
              is_recurring: r.is_recurring,
              recurring_days: r.recurring_days
            })),
            isBlockingContext: true
          });
          setIsDeleteModalOpen(true);
          setIsEditDeskModalOpen(false);
          setIsUpdatingDesk(false);
          throw new Error('HAS_RESERVATIONS');
        }
        throw new Error(error.error || 'Failed to update desk');
      }

      setIsEditDeskModalOpen(false);
      setEditingDesk(null);

      if (onDesksChange) await onDesksChange();
      if (onSlotsChange) await onSlotsChange();
    } catch (error: any) {
      throw error;
    } finally {
      setIsUpdatingDesk(false);
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-1 flex-1" style={{ minHeight: 0, overflow: 'hidden' }}>
      {/* Calendário - aparece primeiro em mobile, lado esquerdo em desktop */}
        <div className="lg:w-80 lg:flex-shrink-0 card p-1.5 space-y-1" style={{ minHeight: 0, overflowY: 'auto', maxHeight: '100%' }}>
        <Calendar 
          selectedDate={dateISO}
          onDateSelect={onDateChange}
          availabilityData={availabilityData}
          onLoadMoreData={onLoadMoreData}
        />



      </div>

      {/* Mapa de Mesas - aparece segundo em mobile, lado direito em desktop */}
      <div className="lg:flex-1 card p-1.5" style={{ minWidth: 0, minHeight: 0, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
          <div className="flex items-center justify-between mb-1">
          <div className="font-medium text-sm sm:text-base">{getFriendlyDateLabel(date)}</div>
          <div className="flex items-center space-x-3">
            {isEditMode && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingDeskAtMouse(true);
                    setPreviewDeskAreaId(areas.length > 0 ? areas[0].id : null);
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 border border-green-700 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Criar Mesa
                </button>
                {isCreatingDeskAtMouse && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingDeskAtMouse(false);
                      setPreviewDeskPosition(null);
                      setPreviewDeskAreaId(null);
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                )}
                {deskPositionsDraft.size > 0 && (
                  <button
                    type="button"
                    onClick={handleSaveChanges}
                    disabled={isSavingChanges}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 border border-blue-700 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSavingChanges ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                        Salvando...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Salvar Alterações ({deskPositionsDraft.size})
                      </>
                    )}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsManageAreasModalOpen(true)}
                  className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Gerenciar Áreas
                </button>
              </>
            )}
            <span className="text-xs text-gray-600">Modo edição</span>
            <button
              type="button"
              onClick={() => setIsEditMode(!isEditMode)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-btg-blue-bright focus:ring-offset-2 ${
                isEditMode ? 'bg-btg-blue-bright' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isEditMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
        
        {/* Aviso para datas passadas */}
        {isBefore(date, startOfDay(new Date())) && (
          <div className="mb-2 bg-gray-50 border border-gray-200 rounded-lg p-2">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-sm text-gray-600">
                Não é possível alterar reservas em datas passadas
              </span>
            </div>
          </div>
        )}
        
        {/* Aviso de Feriado */}
        {holidayWarning && (
          <div className="mb-2 bg-purple-50 border border-purple-200 rounded-lg p-2">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-purple-800">
                  {holidayWarning.name}
                </h3>
                <p className="text-sm text-purple-700 mt-1">
                  Verifique se as pessoas com recorrências ativas podem liberar suas mesas caso você precise usar.
                </p>
              </div>
            </div>
          </div>
        )}
        <div className="relative flex-1 min-h-0" style={{ width: '100%', maxWidth: '100%', overflow: 'hidden', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
          {/* Controles de Zoom */}
          <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2 bg-white rounded-lg shadow-lg border border-gray-200 p-2">
            <button
              onClick={handleZoomIn}
              className="p-2 hover:bg-gray-100 rounded transition-colors"
              title="Zoom In (Ctrl + Scroll)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
              </svg>
            </button>
            <button
              onClick={handleZoomOut}
              className="p-2 hover:bg-gray-100 rounded transition-colors"
              title="Zoom Out (Ctrl + Scroll)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
              </svg>
            </button>
          </div>
          
          <div 
            ref={svgContainerRef}
            className="bg-white rounded-2xl shadow-inner border border-gray-200 flex-1"
            style={{ 
              width: '100%', 
              position: 'relative',
              overflow: 'hidden',
              boxSizing: 'border-box',
              maxWidth: '100%',
              minHeight: 0
            }}
          >
            <svg 
              viewBox={`${panX} ${panY} ${BASE_VIEWBOX_WIDTH / zoom} ${BASE_VIEWBOX_HEIGHT / zoom}`}
              preserveAspectRatio="xMidYMid meet"
              style={{ 
                width: '100%',
                height: '100%',
                display: 'block',
                maxWidth: '100%',
                maxHeight: '100%'
              }}
              onMouseMove={handleMouseMove}
              onMouseUp={(e) => {
                handleMouseUp(e);
                handlePanEnd(e);
              }}
              onMouseDown={(e) => {
                // Se estiver criando mesa, não fazer pan
                if (!isCreatingDeskAtMouse) {
                  handlePanStart(e);
                }
              }}
              onWheel={handleWheel}
              onContextMenu={(e) => e.preventDefault()} // Desabilitar menu de contexto no botão direito
            >
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" opacity={zoom > 1 ? 0.15 : 0.08} strokeWidth={zoom > 2 ? 0.5 : 1} />
            </pattern>
          </defs>
          {/* Grid gigante */}
          <rect 
            x={-GRID_WIDTH / 2} 
            y={-GRID_HEIGHT / 2} 
            width={GRID_WIDTH} 
            height={GRID_HEIGHT} 
            fill="url(#grid)" 
          />
          
          
          {/* Renderizar todas as mesas primeiro */}
          {desks.map(desk => {
            const slot = getSlotByDesk(desk.id);
            if (!slot) {
              // Se está arrastando essa mesa, continuar mostrando ela na posição arrastada
              if (draggingDesk && draggingDesk.desk.id === desk.id && draggedPosition) {
                const deskWidth = (desk.width_units || SLOT_WIDTH_UNITS) * GRID_UNIT;
                const deskHeight = (desk.height_units || SLOT_HEIGHT_UNITS) * GRID_UNIT;
                return (
                  <g key={desk.id}>
                    <rect
                      x={draggedPosition.x}
                      y={draggedPosition.y}
                      width={deskWidth}
                      height={deskHeight}
                      fill={deskFill(byDesk[desk.id], desk.is_blocked)}
                      stroke={desk.is_blocked ? '#ef4444' : (areas.find(a => a.id === desk.area_id)?.color || '#000')}
                      strokeWidth={desk.is_blocked ? 3 : 2}
                      rx={8}
                      opacity={0.7}
                      data-desk={desk.id}
                    />
                  </g>
                );
              }
              console.warn(`Slot não encontrado para mesa ${desk.code} (id: ${desk.id}, slot_id: ${desk.slot_id})`);
              return null;
            }
            
            const isDragging = draggingDesk && draggingDesk.desk.id === desk.id;
            const draftPosition = deskPositionsDraft.get(desk.id);
            
            // Usar posição do rascunho se existir, senão usar posição do slot
            let displayX = slot.x;
            let displayY = slot.y;
            
            if (isDragging && draggedPosition) {
              // Durante o drag, usar posição arrastada
              displayX = draggedPosition.x;
              displayY = draggedPosition.y;
            } else if (draftPosition) {
              // Se tem rascunho, usar posição do rascunho
              displayX = draftPosition.x;
              displayY = draftPosition.y;
            }
            const deskWidth = (desk.width_units || SLOT_WIDTH_UNITS) * GRID_UNIT;
            const deskHeight = (desk.height_units || SLOT_HEIGHT_UNITS) * GRID_UNIT;
            
            const isBlocked = desk.is_blocked || false;
            
            return (
              <g key={desk.id}>
                {isBlocked && (
                  <title>Mesa Bloqueada</title>
                )}
                <rect
                  x={displayX}
                  y={displayY}
                  width={deskWidth}
                  height={deskHeight}
                  fill={deskFill(byDesk[desk.id], isBlocked)}
                  stroke={isBlocked ? '#ef4444' : (areas.find(a => a.id === desk.area_id)?.color || '#000')}
                  strokeWidth={isBlocked ? 3 : 2}
                  rx={8}
                  opacity={isDragging ? 0.7 : 1}
                  data-desk={desk.id}
                  className={`${
                    isBefore(new Date(dateISO + 'T00:00:00'), startOfDay(new Date())) 
                      ? 'cursor-not-allowed' 
                      : isEditMode
                      ? 'cursor-move hover:opacity-80' 
                      : isBlocked
                      ? 'cursor-not-allowed hover:opacity-90' 
                      : 'hover:opacity-80 cursor-pointer'
                  }`}
                  onMouseDown={isEditMode ? (e) => handleMouseDown(e, desk, slot) : undefined}
                  onClick={() => {
                    // Verificar se a data selecionada é passada
                    const selectedDate = new Date(dateISO + 'T00:00:00');
                    const isPastDate = isBefore(selectedDate, startOfDay(new Date()));
                    
                    // Se for data passada, não permitir interação
                    // Se estiver bloqueada, não permitir reservar
                    if (isPastDate || isEditMode || isBlocked) {
                      if (isBlocked && !isEditMode && !isPastDate) {
                        setSuccessMessage('Esta mesa está bloqueada e não pode ser reservada.');
                      }
                      return;
                    }
                    
                    const deskReservations = byDesk[desk.id] || [];
                    const hasReservation = deskReservations.length > 0;
                    
                    if (hasReservation) {
                      setSelectedDesk(desk);
                      
                      // Buscar reservas recorrentes desta mesa apenas para o dia atual
                      const allDeskRecurringReservations = reservations.filter(r => 
                        r.desk_id === desk.id && r.is_recurring && r.date === dateISO
                      );
                      
                      if (allDeskRecurringReservations.length > 0) {
                        const recurringReservation = allDeskRecurringReservations[0];
                        const recurringDays = Array.isArray(recurringReservation.recurring_days) 
                          ? recurringReservation.recurring_days 
                          : JSON.parse(recurringReservation.recurring_days || '[]');
                        setCurrentRecurringDays(recurringDays);
                        setHasRecurringReservation(true);
                        setIsModalOpen(true);
                      } else {
                        setHasRecurringReservation(false);
                        setIsModalOpen(true);
                      }
                    } else {
                      setSelectedDesk(desk);
                      setHasRecurringReservation(false);
                      setIsModalOpen(true);
                    }
                  }}
                />
                {/* Nome da área acima da mesa */}
                <text 
                  x={displayX + deskWidth / 2} 
                  y={displayY + deskHeight / 2 - 20} 
                  textAnchor="middle" 
                  dominantBaseline="central" 
                  fontSize="14" 
                  fill="#666"
                  pointerEvents="none"
                >
                  {areas.find(a => a.id === desk.area_id)?.name}
                </text>
                {/* Código da mesa */}
                <text 
                  x={displayX + deskWidth / 2} 
                  y={displayY + deskHeight / 2} 
                  textAnchor="middle" 
                  dominantBaseline="central" 
                  fontSize="16" 
                  fill="#111"
                  pointerEvents="none"
                >
                  {desk.code}
                </text>
                {/* Nome da reserva */}
                {byDesk[desk.id] && byDesk[desk.id].length > 0 && (
                  <g>
                    <text 
                      x={displayX + deskWidth / 2} 
                      y={displayY + deskHeight / 2 + 20} 
                      textAnchor="middle" 
                      dominantBaseline="central" 
                      fontSize="12" 
                      fill="#666"
                      pointerEvents="none"
                    >
                      {byDesk[desk.id][0].note}
                    </text>
                    {/* Ícone de recorrência */}
                    {byDesk[desk.id][0].is_recurring && (
                      <g transform={`translate(${displayX + deskWidth - 20}, ${displayY + 5})`}>
                        <text 
                          x="8" 
                          y="8" 
                          textAnchor="middle" 
                          dominantBaseline="central" 
                          fontSize="18" 
                          fill="#333"
                          fontWeight="bold"
                          pointerEvents="none"
                        >
                          ↻
                        </text>
                      </g>
                    )}
                  </g>
                )}
                {/* Botões de ação quando em modo edição */}
                {isEditMode && (
                  <g className="edit-mode-controls">
                    {/* Botão editar código */}
                    <g
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingDesk(desk);
                        setIsEditDeskModalOpen(true);
                      }}
                      className="cursor-pointer"
                    >
                      <circle
                        cx={displayX + deskWidth - 40}
                        cy={displayY + 15}
                        r={12}
                        fill="#3b82f6"
                        className="hover:fill-blue-600"
                      />
                      <text
                        x={displayX + deskWidth - 40}
                        y={displayY + 15}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize="10"
                        fill="white"
                        fontWeight="bold"
                        pointerEvents="none"
                      >
                        ✎
                      </text>
                    </g>
                    
                    {/* Botão excluir */}
                    <g
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDesk(desk);
                      }}
                      className="cursor-pointer"
                    >
                      <circle
                        cx={displayX + deskWidth - 15}
                        cy={displayY + 15}
                        r={12}
                        fill="#ef4444"
                        className="hover:fill-red-600"
                      />
                      <text
                        x={displayX + deskWidth - 15}
                        y={displayY + 15}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize="12"
                        fill="white"
                        fontWeight="bold"
                        pointerEvents="none"
                      >
                        ×
                      </text>
                    </g>
                  </g>
                )}
              </g>
            );
          })}
          
          {/* Preview de mesa sendo criada (seguindo o mouse) */}
          {isCreatingDeskAtMouse && previewDeskPosition && previewDeskAreaId && (
            <g>
              <rect
                x={previewDeskPosition.x}
                y={previewDeskPosition.y}
                width={SLOT_WIDTH_UNITS * GRID_UNIT}
                height={SLOT_HEIGHT_UNITS * GRID_UNIT}
                fill="rgba(16,185,129,0.2)"
                stroke="#10b981"
                strokeWidth={3}
                strokeDasharray="5,5"
                rx={8}
                className="cursor-pointer"
                onClick={async () => {
                  // Validar se pode colocar na posição
                  if (canPlaceDesk(previewDeskPosition.x, previewDeskPosition.y, SLOT_WIDTH_UNITS, SLOT_HEIGHT_UNITS)) {
                    // Criar slot temporário para abrir o modal
                    const tempSlot: Slot = {
                      id: 'temp',
                      area_id: previewDeskAreaId,
                      row_number: 0,
                      col_number: 0,
                      x: previewDeskPosition.x,
                      y: previewDeskPosition.y,
                      w: SLOT_WIDTH_UNITS * GRID_UNIT,
                      h: SLOT_HEIGHT_UNITS * GRID_UNIT,
                      is_available: true,
                    };
                    setCreatingDeskData({ slot: tempSlot, desk: null, direction: 'in-place' });
                    setIsCreateDeskModalOpen(true);
                    setIsCreatingDeskAtMouse(false);
                    setPreviewDeskPosition(null);
                    setPreviewDeskAreaId(null);
                  } else {
                    setSuccessMessage('Não é possível criar a mesa nesta posição. Há sobreposição com outra mesa.');
                  }
                }}
              />
              <text 
                x={previewDeskPosition.x + (SLOT_WIDTH_UNITS * GRID_UNIT) / 2} 
                y={previewDeskPosition.y + (SLOT_HEIGHT_UNITS * GRID_UNIT) / 2} 
                textAnchor="middle" 
                dominantBaseline="central" 
                fontSize="12" 
                fill="#10b981"
                fontWeight="bold"
                pointerEvents="none"
              >
                Nova mesa
              </text>
              <text 
                x={previewDeskPosition.x + (SLOT_WIDTH_UNITS * GRID_UNIT) / 2} 
                y={previewDeskPosition.y + (SLOT_HEIGHT_UNITS * GRID_UNIT) / 2 + 15} 
                textAnchor="middle" 
                dominantBaseline="central" 
                fontSize="10" 
                fill="#6b7280"
                pointerEvents="none"
              >
                Clique para criar
              </text>
            </g>
          )}
            </svg>
          </div>
        </div>
        
      </div>

      <ReservationModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedDesk(null);
          setHasRecurringReservation(false);
        }}
        onConfirm={reserve}
        deskCode={selectedDesk?.code || ''}
        areaName={selectedDesk ? areas.find(a => a.id === selectedDesk.area_id)?.name || '' : ''}
        date={dateISO}
        hasRecurringReservation={hasRecurringReservation}
        onCancelRecurring={openRecurringCancelModal}
        existingReservation={selectedDesk ? (byDesk[selectedDesk.id] && byDesk[selectedDesk.id].length > 0 ? byDesk[selectedDesk.id][0] : undefined) : undefined}
        isCreatingReservation={isCreatingReservation}
        isDeletingReservation={isDeletingReservation}
        onDeleteReservation={cancelIndividualReservation}
      />

      <RecurringCancelModal
        isOpen={isRecurringCancelModalOpen}
        onClose={() => {
          setIsRecurringCancelModalOpen(false);
          setCurrentRecurringDays([]);
        }}
        onConfirm={cancelPartialRecurringReservation}
        recurringDays={currentRecurringDays}
        deskCode={selectedDesk?.code || ''}
        areaName={selectedDesk ? areas.find(a => a.id === slots.find(s => s.id === selectedDesk.slot_id)?.area_id)?.name || '' : ''}
        reservationName={selectedDesk ? (byDesk[selectedDesk.id] && byDesk[selectedDesk.id].length > 0 ? (byDesk[selectedDesk.id][0].note || '') : '') : ''}
        isDeletingReservation={isDeletingReservation}
      />

      <RecurringConflictModal
        isOpen={isConflictModalOpen}
        onClose={handleConflictCancel}
        onConfirm={handleConflictConfirm}
        conflicts={conflictData?.conflicts || []}
        newReservationName={conflictData?.newName || ''}
      />

      {/* Notificação de Sucesso */}
      {successMessage && (
        <div className="fixed bottom-4 right-4 z-50 bg-btg-blue-bright text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-3 animate-in slide-in-from-right duration-300">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <div className="flex-1">
            <span className="font-medium">{successMessage}</span>
            <div className="mt-2 bg-white bg-opacity-30 rounded-full h-1">
              <div 
                className="bg-white h-1 rounded-full transition-all duration-75 ease-linear"
                style={{ width: `${messageTimer}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de conflito para reservas individuais */}
      {individualConflictData && (
        <IndividualConflictModal
          isOpen={isIndividualConflictModalOpen}
          onRefresh={async () => {
            await onFetchReservations();
            setIsIndividualConflictModalOpen(false);
            setIndividualConflictData(null);
          }}
          date={individualConflictData.date}
          deskCode={individualConflictData.deskCode}
        />
      )}

      {/* Modal de conflito para recorrências vs recorrências */}
      {recurringRecurringConflictData && (
        <RecurringRecurringConflictModal
          isOpen={isRecurringRecurringConflictModalOpen}
          onClose={handleRecurringRecurringConflictClose}
          onConfirm={handleRecurringRecurringConflictClose}
          conflicts={recurringRecurringConflictData.conflicts}
          newReservationName={recurringRecurringConflictData.newName}
        />
      )}

      {/* Modal de exclusão de mesa */}
      {deleteDeskData && (
        <DeleteDeskModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setDeleteDeskData(null);
          }}
          onConfirm={handleConfirmDelete}
          deskCode={deleteDeskData.desk.code}
          hasReservations={deleteDeskData.reservations.length > 0}
          reservations={deleteDeskData.reservations}
          isDeleting={isDeletingDesk}
          isBlockingContext={deleteDeskData.isBlockingContext || false}
        />
      )}

      {/* Modal de nova linha */}
      <NewRowModal
        isOpen={isNewRowModalOpen}
        onClose={() => {
          setIsNewRowModalOpen(false);
          setSelectedSlotForAction(null);
        }}
        onConfirm={handleCreateDeskWithRowName}
        isCreating={isCreatingDesk}
      />

      {/* Modal de edição de código da mesa */}
      {editingDesk && (
        <EditDeskModal
          isOpen={isEditDeskModalOpen}
          onClose={() => {
            setIsEditDeskModalOpen(false);
            setEditingDesk(null);
          }}
          onConfirm={handleUpdateDeskCode}
          currentCode={editingDesk.code}
          currentAreaId={editingDesk.area_id}
          currentIsBlocked={editingDesk.is_blocked || false}
          areas={areas}
          isUpdating={isUpdatingDesk}
        />
      )}

      {/* Modal de criação de mesa */}
      <CreateDeskSizeModal
        isOpen={isCreateDeskModalOpen}
        onClose={() => {
          setIsCreateDeskModalOpen(false);
          setCreatingDeskData(null);
        }}
        onConfirm={handleConfirmCreateDesk}
        areas={areas}
        defaultAreaId={creatingDeskData?.slot?.area_id}
        isCreating={isCreatingDesk}
      />

      {/* Modal de gerenciamento de áreas */}
      <ManageAreasModal
        isOpen={isManageAreasModalOpen}
        onClose={() => setIsManageAreasModalOpen(false)}
        areas={areas}
        onAreasChange={onAreasChange || (async () => {})}
      />
    </div>
  );
}

function groupBy<T>(arr: T[], keyFn: (item: T) => string) {
  return arr.reduce((acc, item) => { const k = keyFn(item); (acc[k] ||= []).push(item); return acc; }, {} as Record<string, T[]>);
}
function deskFill(res: Reservation[], isBlocked?: boolean) {
  if (isBlocked) return 'rgba(239,68,68,0.4)'; // bloqueada (vermelho mais forte)
  if (!res || res.length === 0) return 'rgba(16,185,129,0.15)'; // livre (verde claro)
  return 'rgba(239,68,68,0.18)'; // ocupado em algum horário
}
function deskName(desks: Desk[], id: string) {
  const d = desks.find(x => x.id === id); return d ? d.code : id;
}
function fmtHour(iso: string) {
  const d = new Date(iso); return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}
