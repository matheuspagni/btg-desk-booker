/**
 * Utilitários de data padronizados para o sistema
 * Garante consistência entre desenvolvimento local e produção (Vercel)
 */

/**
 * Obtém a data atual no fuso horário do Brasil (UTC-3)
 * Funciona tanto localmente quanto em produção (Vercel)
 */
export function getBrazilToday(): string {
  const now = new Date();
  
  // Se estivermos rodando localmente (desenvolvimento), usar data local
  if (process.env.NODE_ENV === 'development') {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
  
  // Em produção (Vercel), o servidor roda em UTC, então precisamos ajustar para o Brasil (UTC-3)
  const brazilTime = new Date(now.getTime() - (3 * 60 * 60 * 1000));
  return brazilTime.toISOString().split('T')[0];
}

/**
 * Obtém a data atual no fuso horário do Brasil formatada para exibição
 * Formato: DD/MM/YYYY
 */
export function getBrazilTodayFormatted(): string {
  const today = getBrazilToday();
  const [year, month, day] = today.split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Converte uma data ISO para o formato brasileiro
 * Formato: DD/MM/YYYY
 */
export function formatDateToBrazilian(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Verifica se uma data é hoje (considerando fuso horário do Brasil)
 */
export function isToday(dateStr: string): boolean {
  return getBrazilToday() === dateStr;
}

/**
 * Obtém a data de hoje para uso em queries de banco
 * Retorna no formato YYYY-MM-DD
 */
export function getTodayForQuery(): string {
  return getBrazilToday();
}

/**
 * Converte um objeto Date para string YYYY-MM-DD considerando fuso do Brasil (UTC-3 em prod)
 */
export function toBrazilDateString(date: Date): string {
  if (process.env.NODE_ENV === 'development') {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  const b = new Date(date.getTime() - (3 * 60 * 60 * 1000));
  return b.toISOString().split('T')[0];
}
/**
 * Obtém o primeiro e último dia do mês atual (considerando fuso horário do Brasil)
 * Retorna no formato { startDate: 'YYYY-MM-DD', endDate: 'YYYY-MM-DD' }
 */
export function getCurrentMonthRange(): { startDate: string; endDate: string } {
  const today = getBrazilToday();
  const [year, month] = today.split('-').map(Number);
  
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  
  return {
    startDate: firstDay.toISOString().split('T')[0],
    endDate: lastDay.toISOString().split('T')[0]
  };
}
