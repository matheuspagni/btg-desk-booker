'use client';
import { useState, useEffect } from 'react';
import { formatDateToBrazilian } from '@/lib/date-utils';

interface LogEntry {
  id: number;
  created_at: string;
  local_time?: string;
  operation_type: 'CREATE' | 'DELETE' | 'UPDATE';
  desk_id: string | null;
  reservation_date: string | null;
  reservation_note: string | null;
  is_recurring: boolean;
  recurring_days: number[] | null;
  browser_name: string;
  browser_version: string;
  operating_system: string;
  device_type: string;
  screen_resolution: string;
  timezone: string;
  computer_name: string;
  session_id: string;
  processing_time_ms: number;
  success: boolean;
  error_message: string | null;
  operation_details: any;
}

type LogsViewerProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function LogsViewer({ isOpen, onClose }: LogsViewerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'CREATE' | 'DELETE' | 'UPDATE'>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen, filter, dateFilter, page]);

  async function fetchLogs() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        itemsPerPage: itemsPerPage.toString()
      });

      if (filter !== 'ALL') {
        params.append('filter', filter);
      }

      if (dateFilter) {
        params.append('dateFilter', dateFilter);
      }

      const response = await fetch(`/api/reservation-logs?${params.toString()}`);
      
      if (!response.ok) {
        console.error('Erro ao buscar logs:', response.status);
        return;
      }

      const data = await response.json();
      setLogs(data.logs || []);
      setTotalPages(data.totalPages || 0);
    } catch (error) {
      console.error('Erro ao buscar logs:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString('pt-BR', {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  function getOperationColor(type: string) {
    switch (type) {
      case 'CREATE': return 'text-green-600 bg-green-100';
      case 'DELETE': return 'text-red-600 bg-red-100';
      case 'UPDATE': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  }

  function getDeviceIcon(deviceType: string) {
    switch (deviceType) {
      case 'mobile': return '📱';
      case 'tablet': return '📱';
      case 'desktop': return '💻';
      default: return '🖥️';
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-auto">
        <div className="p-3 sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 sm:w-6 sm:h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                Logs do Sistema
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Filtros */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 items-start sm:items-center">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Operação
                </label>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">Todas</option>
                  <option value="CREATE">Criação</option>
                  <option value="DELETE">Exclusão</option>
                  <option value="UPDATE">Atualização</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data
                </label>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={() => {
                  setFilter('ALL');
                  setDateFilter('');
                  setPage(1);
                }}
                className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Limpar Filtros
              </button>
            </div>
          </div>

          {/* Conteúdo */}
          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Carregando logs...</span>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Nenhum log encontrado com os filtros aplicados.
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getOperationColor(log.operation_type)}`}>
                        {log.operation_type}
                      </span>
                      <span className="text-sm text-gray-600">
                        {log.local_time || formatDate(log.created_at)}
                      </span>
                      {!log.success && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium text-red-600 bg-red-100">
                          ERRO
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <span>{getDeviceIcon(log.device_type)}</span>
                      <span>{log.browser_name} {log.browser_version}</span>
                      <span>•</span>
                      <span>{log.operating_system}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Mesa:</span>
                      <span className="ml-1 text-gray-600">{log.desk_id || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Data:</span>
                      <span className="ml-1 text-gray-600">{log.reservation_date || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Nome:</span>
                      <span className="ml-1 text-gray-600">{log.reservation_note || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Recorrente:</span>
                      <span className="ml-1 text-gray-600">{log.is_recurring ? 'Sim' : 'Não'}</span>
                    </div>
                  </div>

                  {log.recurring_days && log.recurring_days.length > 0 && (
                    <div className="mt-2 text-sm">
                      <span className="font-medium text-gray-700">Dias da semana:</span>
                      <span className="ml-1 text-gray-600">
                        {log.recurring_days.map(day => {
                          const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                          return days[day];
                        }).join(', ')}
                      </span>
                    </div>
                  )}

                  <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 text-xs sm:text-sm text-gray-500">
                    <div>
                      <span className="font-medium">Computador:</span>
                      <span className="ml-1 font-mono">{log.computer_name}</span>
                    </div>
                    <div>
                      <span className="font-medium">Sessão:</span>
                      <span className="ml-1 font-mono">{log.session_id.slice(-8)}</span>
                    </div>
                    <div>
                      <span className="font-medium">Tempo:</span>
                      <span className="ml-1">{log.processing_time_ms}ms</span>
                    </div>
                    <div>
                      <span className="font-medium">Resolução:</span>
                      <span className="ml-1">{log.screen_resolution}</span>
                    </div>
                    <div>
                      <span className="font-medium">Fuso:</span>
                      <span className="ml-1">{log.timezone}</span>
                    </div>
                  </div>

                  {log.error_message && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                      <span className="text-sm font-medium text-red-800">Erro:</span>
                      <span className="ml-1 text-sm text-red-700">{log.error_message}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Página {page} de {totalPages}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}