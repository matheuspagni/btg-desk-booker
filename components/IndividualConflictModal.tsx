'use client';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { formatDateToBrazilian } from '@/lib/date-utils';

type IndividualConflictModalProps = {
  isOpen: boolean;
  onRefresh: () => void;
  date: string;
  deskCode: string;
};

export default function IndividualConflictModal({ 
  isOpen, 
  onRefresh,
  date, 
  deskCode 
}: IndividualConflictModalProps) {
  // Bloquear scroll do body quando modal estiver aberto
  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 max-w-md w-full my-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-btg-blue-bright" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                Reserva já existe
              </h2>
            </div>
            <button
              onClick={onRefresh}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              <strong>Já existe uma reserva</strong> para a mesa <strong>{deskCode}</strong> no dia <strong>{formatDateToBrazilian(date)}</strong>.
            </p>
          </div>

          <div className="flex justify-center mt-6">
            <button
              onClick={onRefresh}
              className="btn px-8 py-3"
            >
              Atualizar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}