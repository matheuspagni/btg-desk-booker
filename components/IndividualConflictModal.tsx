'use client';

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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Reserva já existe
            </h2>
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
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-btg-blue-bright" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-btg-blue-dark">
                    Já existe uma reserva para a mesa <strong>{deskCode}</strong> no dia <strong>{new Date(date + 'T00:00:00').toLocaleDateString('pt-BR')}</strong>.
                  </p>
                </div>
              </div>
            </div>

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