'use client';
import { useMemo } from 'react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

type Reservation = {
  id: string;
  date: string;
  note: string | null;
  is_recurring?: boolean;
  recurring_days?: number[];
};

type DeleteDeskModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  deskCode: string;
  hasReservations: boolean;
  reservations?: Reservation[];
  isDeleting?: boolean;
};

// Função para formatar data de YYYY-MM-DD para dd/mm/yyyy
function formatDate(dateString: string): string {
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
}

// Função para formatar dias recorrentes
// No banco: 1=Segunda, 2=Terça, 3=Quarta, 4=Quinta, 5=Sexta
const dayLabels: Record<number, string> = {
  1: 'Segunda',
  2: 'Terça',
  3: 'Quarta',
  4: 'Quinta',
  5: 'Sexta'
};

function formatRecurringDays(days: number[]): string {
  const sortedDays = [...days].sort((a, b) => a - b);
  return sortedDays.map(day => dayLabels[day] || `Dia ${day}`).join(', ');
}

export default function DeleteDeskModal({
  isOpen,
  onClose,
  onConfirm,
  deskCode,
  hasReservations,
  reservations = [],
  isDeleting = false
}: DeleteDeskModalProps) {
  useBodyScrollLock(isOpen);

  // Agrupar reservas: individuais são exibidas normalmente, recorrentes são agrupadas
  const processedReservations = useMemo(() => {
    const individualReservations: Reservation[] = [];
    const recurringGroups = new Map<string, { note: string | null; recurring_days: number[]; count: number }>();

    reservations.forEach(res => {
      if (res.is_recurring && res.recurring_days && res.recurring_days.length > 0) {
        // Criar uma chave única para agrupar reservas recorrentes (mesma note e mesmos dias)
        // Usar string vazia se não houver note para agrupar corretamente
        const noteKey = res.note || '';
        const daysKey = [...res.recurring_days].sort().join(',');
        const key = `${noteKey}_${daysKey}`;
        
        if (recurringGroups.has(key)) {
          const group = recurringGroups.get(key)!;
          group.count += 1;
        } else {
          recurringGroups.set(key, {
            note: res.note,
            recurring_days: res.recurring_days,
            count: 1
          });
        }
      } else {
        // Reserva individual
        individualReservations.push(res);
      }
    });

    // Converter grupos de recorrência em objetos para exibição
    const recurringDisplay = Array.from(recurringGroups.entries()).map(([key, group]) => ({
      id: `recurring_${key}`,
      note: group.note,
      recurring_days: group.recurring_days,
      count: group.count,
      isRecurring: true
    }));

    return {
      individual: individualReservations,
      recurring: recurringDisplay
    };
  }, [reservations]);

  const totalReservationsCount = reservations.length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 max-w-md w-full">
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
              Excluir Mesa
            </h2>
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {hasReservations ? (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-red-800 mb-2">
                      Não é possível excluir a mesa {deskCode}
                    </h3>
                    <p className="text-sm text-red-700 mb-3">
                      Esta mesa possui {totalReservationsCount} reserva(s) futura(s) associada(s):
                    </p>
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {/* Reservas individuais */}
                      {processedReservations.individual.map((res) => (
                        <div key={res.id} className="text-xs text-red-600 bg-white rounded p-2 border border-red-200">
                          <span className="font-medium">{formatDate(res.date)}</span>
                          {res.note && <span className="ml-2">- {res.note}</span>}
                        </div>
                      ))}
                      
                      {/* Reservas recorrentes agrupadas */}
                      {processedReservations.recurring.map((group) => (
                        <div key={group.id} className="text-xs text-red-600 bg-white rounded p-2 border border-red-200">
                          <div className="font-medium">
                            Recorrente ({group.count} ocorrência{group.count > 1 ? 's' : ''})
                          </div>
                          <div className="mt-1 text-red-500">
                            {group.note ? (
                              <span>{group.note} - {formatRecurringDays(group.recurring_days)}</span>
                            ) : (
                              <span>{formatRecurringDays(group.recurring_days)}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={onClose}
                  className="btn-secondary"
                >
                  Fechar
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-700">
                Tem certeza que deseja excluir a mesa <strong>{deskCode}</strong>?
              </p>
              <p className="text-sm text-gray-500">
                Esta ação não pode ser desfeita.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  onClick={onClose}
                  disabled={isDeleting}
                  className="btn-secondary flex-1 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={onConfirm}
                  disabled={isDeleting}
                  className="btn-danger flex-1 disabled:opacity-50 flex items-center justify-center"
                >
                  {isDeleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Excluindo...
                    </>
                  ) : (
                    'Excluir Mesa'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

