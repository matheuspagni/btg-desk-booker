import { supabase } from './supabase';

// Função para obter informações corretas do timezone
function getTimezoneInfo(): string {
  if (typeof window === 'undefined') {
    return 'UTC';
  }
  
  try {
    // Tentar obter timezone via Intl API
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Se retornar GMT0 ou similar, tentar outras abordagens
    if (timezone === 'GMT0' || timezone === 'UTC' || !timezone) {
      // Tentar obter offset em minutos
      const offset = new Date().getTimezoneOffset();
      const offsetHours = Math.abs(offset) / 60;
      const offsetMinutes = Math.abs(offset) % 60;
      const sign = offset <= 0 ? '+' : '-';
      
      // Mapear offsets comuns para nomes de timezone
      const offsetString = `${sign}${offsetHours}${offsetMinutes > 0 ? ':' + offsetMinutes.toString().padStart(2, '0') : ''}`;
      
      // Mapear offsets conhecidos para timezones brasileiros
      if (offsetString === '-3') {
        return 'America/Sao_Paulo (GMT-3)';
      } else if (offsetString === '-4') {
        return 'America/Manaus (GMT-4)';
      } else if (offsetString === '-5') {
        return 'America/Rio_Branco (GMT-5)';
      } else if (offsetString === '-2') {
        return 'America/Noronha (GMT-2)';
      } else {
        return `GMT${offsetString}`;
      }
    }
    
    // Se conseguiu obter timezone real, formatar melhor
    if (timezone.includes('America/Sao_Paulo') || timezone.includes('America/Sao_Paulo')) {
      return 'America/Sao_Paulo (GMT-3)';
    } else if (timezone.includes('America/Manaus')) {
      return 'America/Manaus (GMT-4)';
    } else if (timezone.includes('America/Rio_Branco')) {
      return 'America/Rio_Branco (GMT-5)';
    } else if (timezone.includes('America/Noronha')) {
      return 'America/Noronha (GMT-2)';
    }
    
    return timezone;
  } catch (error) {
    // Fallback: usar offset
    const offset = new Date().getTimezoneOffset();
    const offsetHours = Math.abs(offset) / 60;
    const sign = offset <= 0 ? '+' : '-';
    return `GMT${sign}${offsetHours}`;
  }
}

export interface LogData {
  operationType: 'CREATE' | 'DELETE' | 'UPDATE';
  reservationId?: number;
  deskId?: string;
  reservationDate?: string;
  reservationNote?: string;
  isRecurring?: boolean;
  recurringDays?: number[];
  processingTimeMs?: number;
  success?: boolean;
  errorMessage?: string;
  operationDetails?: any;
}

export interface BrowserInfo {
  userAgent: string;
  browserName: string;
  browserVersion: string;
  operatingSystem: string;
  deviceType: string;
  screenResolution: string;
  timezone: string;
  language: string;
  referrerUrl: string;
  pageUrl: string;
  computerName: string;
}

// Função para extrair informações do navegador
export function getBrowserInfo(): BrowserInfo {
  if (typeof window === 'undefined') {
    return {
      userAgent: 'Server-side',
      browserName: 'Server',
      browserVersion: '1.0',
      operatingSystem: 'Server',
      deviceType: 'server',
      screenResolution: 'N/A',
      timezone: 'UTC',
      language: 'en',
      referrerUrl: '',
      pageUrl: '',
      computerName: 'Server'
    };
  }

  const userAgent = navigator.userAgent;
  
  // Detectar navegador
  let browserName = 'Unknown';
  let browserVersion = 'Unknown';
  
  if (userAgent.includes('Chrome')) {
    browserName = 'Chrome';
    const match = userAgent.match(/Chrome\/(\d+\.\d+)/);
    browserVersion = match ? match[1] : 'Unknown';
  } else if (userAgent.includes('Firefox')) {
    browserName = 'Firefox';
    const match = userAgent.match(/Firefox\/(\d+\.\d+)/);
    browserVersion = match ? match[1] : 'Unknown';
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    browserName = 'Safari';
    const match = userAgent.match(/Version\/(\d+\.\d+)/);
    browserVersion = match ? match[1] : 'Unknown';
  } else if (userAgent.includes('Edge')) {
    browserName = 'Edge';
    const match = userAgent.match(/Edge\/(\d+\.\d+)/);
    browserVersion = match ? match[1] : 'Unknown';
  }

  // Detectar sistema operacional
  let operatingSystem = 'Unknown';
  if (userAgent.includes('Windows')) {
    operatingSystem = 'Windows';
  } else if (userAgent.includes('Mac OS')) {
    operatingSystem = 'macOS';
  } else if (userAgent.includes('Linux')) {
    operatingSystem = 'Linux';
  } else if (userAgent.includes('Android')) {
    operatingSystem = 'Android';
  } else if (userAgent.includes('iOS')) {
    operatingSystem = 'iOS';
  }

  // Detectar tipo de dispositivo
  let deviceType = 'desktop';
  if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
    deviceType = 'mobile';
  } else if (/iPad|Android(?=.*Tablet)/i.test(userAgent)) {
    deviceType = 'tablet';
  }

  // Tentar obter informações do computador (limitado por segurança do navegador)
  let computerName = 'Unknown';
  
  try {
    // Estratégia 1: Usar hostname (ideal para ambiente corporativo)
    if (window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      computerName = window.location.hostname;
    } else {
      // Estratégia 2: Fallback para desenvolvimento local
      let systemInfo = '';
      
      if (userAgent.includes('Mac')) {
        systemInfo = 'MacBook Pro';
      } else if (userAgent.includes('Windows')) {
        systemInfo = 'Windows PC';
      } else if (userAgent.includes('Linux')) {
        systemInfo = 'Linux PC';
      } else {
        systemInfo = 'Unknown Device';
      }
      
      // Gerar hash simples para desenvolvimento
      const hash = userAgent.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      
      const shortHash = Math.abs(hash).toString(36).slice(0, 4).toUpperCase();
      computerName = `${systemInfo} (${shortHash})`;
    }
  } catch (error) {
    // Fallback simples
    computerName = 'Unknown Device';
  }

  return {
    userAgent,
    browserName,
    browserVersion,
    operatingSystem,
    deviceType,
    screenResolution: `${screen.width}x${screen.height}`,
    timezone: getTimezoneInfo(),
    language: navigator.language,
    referrerUrl: document.referrer,
    pageUrl: window.location.href,
    computerName
  };
}

// Função para gerar um ID de sessão único
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Função principal para logar operações
export async function logReservationOperation(
  logData: LogData,
  sessionId?: string
): Promise<void> {
  try {
    const browserInfo = getBrowserInfo();
    const startTime = Date.now();
    
    // Se não foi fornecido um sessionId, gerar um novo
    const currentSessionId = sessionId || generateSessionId();
    
    const logEntry = {
      operation_type: logData.operationType,
      reservation_id: logData.reservationId || null,
      desk_id: logData.deskId || null,
      reservation_date: logData.reservationDate || null,
      reservation_note: logData.reservationNote || null,
      is_recurring: logData.isRecurring || false,
      recurring_days: logData.recurringDays || null,
      user_agent: browserInfo.userAgent,
      browser_name: browserInfo.browserName,
      browser_version: browserInfo.browserVersion,
      operating_system: browserInfo.operatingSystem,
      device_type: browserInfo.deviceType,
      screen_resolution: browserInfo.screenResolution,
      timezone: browserInfo.timezone,
      computer_name: browserInfo.computerName,
      session_id: currentSessionId,
      referrer_url: browserInfo.referrerUrl,
      page_url: browserInfo.pageUrl,
      processing_time_ms: logData.processingTimeMs || (Date.now() - startTime),
      success: logData.success !== false, // default true
      error_message: logData.errorMessage || null,
      operation_details: logData.operationDetails || null,
      created_at: new Date().toISOString(), // Timestamp UTC
      local_time: new Date().toLocaleString('pt-BR', { 
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }) // Horário local brasileiro
    };

    const response = await fetch('/api/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(logEntry),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Erro ao salvar log:', errorData);
    }
  } catch (error) {
    console.error('Erro ao processar log:', error);
  }
}

// Função para logar criação de reserva
export async function logReservationCreate(
  deskId: string,
  reservationDate: string,
  reservationNote: string,
  isRecurring: boolean = false,
  recurringDays?: number[],
  processingTimeMs?: number,
  sessionId?: string
): Promise<void> {
  await logReservationOperation({
    operationType: 'CREATE',
    deskId,
    reservationDate,
    reservationNote,
    isRecurring,
    recurringDays,
    processingTimeMs,
    success: true
  }, sessionId);
}

// Função para logar exclusão de reserva
export async function logReservationDelete(
  deskId: string,
  reservationDate: string,
  reservationNote: string,
  isRecurring: boolean = false,
  recurringDays?: number[],
  processingTimeMs?: number,
  sessionId?: string
): Promise<void> {
  await logReservationOperation({
    operationType: 'DELETE',
    deskId,
    reservationDate,
    reservationNote,
    isRecurring,
    recurringDays,
    processingTimeMs,
    success: true
  }, sessionId);
}

// Função para logar erro
export async function logError(
  operationType: 'CREATE' | 'DELETE' | 'UPDATE',
  errorMessage: string,
  deskId?: string,
  sessionId?: string
): Promise<void> {
  await logReservationOperation({
    operationType,
    deskId,
    success: false,
    errorMessage
  }, sessionId);
}

