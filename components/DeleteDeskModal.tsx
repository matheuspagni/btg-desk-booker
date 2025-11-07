'use client';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

type DeleteDeskModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  deskCode: string;
  hasReservations: boolean;
  reservations?: Array<{ id: string; date: string; note: string | null }>;
  isDeleting?: boolean;
};

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
                      Esta mesa possui {reservations.length} reserva(s) futura(s) associada(s):
                    </p>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {reservations.map((res) => (
                        <div key={res.id} className="text-xs text-red-600 bg-white rounded p-2">
                          <span className="font-medium">{res.date}</span>
                          {res.note && <span className="ml-2">- {res.note}</span>}
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

