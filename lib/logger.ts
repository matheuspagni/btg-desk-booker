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
  ipAddress: string;
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
      computerName: 'Server',
      ipAddress: 'Unknown'
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

  // Tentar obter IP do usuário (limitado por segurança do navegador)
  let ipAddress = 'Unknown';
  
  // Tentar obter IP armazenado anteriormente
  if (typeof window !== 'undefined' && (window as any).__userIP) {
    ipAddress = (window as any).__userIP;
  } else {
    // Se não tem IP armazenado, tentar obter via API (de forma síncrona com timeout curto)
    try {
      // Usar uma API mais rápida e confiável
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000); // 1 segundo timeout
      
      fetch('https://api.ipify.org?format=json', {
        signal: controller.signal
      })
      .then(response => response.json())
      .then(data => {
        if (data.ip) {
          ipAddress = data.ip;
          // Armazenar para próximas chamadas
          if (typeof window !== 'undefined') {
            (window as any).__userIP = data.ip;
          }
        }
      })
      .catch(() => {
        // Se falhar, usar fallback
        ipAddress = 'Unknown';
      })
      .finally(() => {
        clearTimeout(timeoutId);
      });
    } catch (error) {
      ipAddress = 'Unknown';
    }
  }

  // Tentar obter informações do computador (limitado por segurança do navegador)
  let computerName = 'Unknown';
  
  try {
    // OPÇÃO 1: Usar hostname APENAS para desenvolvimento local
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      computerName = 'Local Development';
    } else {
      // OPÇÃO 2: Tentar obter nome real do computador (limitado por segurança)
      let systemInfo = '';
      let deviceIdentifier = '';
      
      // Detectar sistema operacional mais específico
      if (userAgent.includes('Mac')) {
        if (userAgent.includes('Intel')) {
          systemInfo = 'MacBook Pro (Intel)';
        } else if (userAgent.includes('Apple')) {
          systemInfo = 'MacBook Pro (Apple Silicon)';
        } else {
          systemInfo = 'MacBook Pro';
        }
      } else if (userAgent.includes('Windows')) {
        if (userAgent.includes('Windows NT 10.0')) {
          systemInfo = 'Windows 10/11';
        } else if (userAgent.includes('Windows NT 6.3')) {
          systemInfo = 'Windows 8.1';
        } else if (userAgent.includes('Windows NT 6.1')) {
          systemInfo = 'Windows 7';
        } else {
          systemInfo = 'Windows PC';
        }
      } else if (userAgent.includes('Linux')) {
        if (userAgent.includes('Ubuntu')) {
          systemInfo = 'Ubuntu Linux';
        } else if (userAgent.includes('Fedora')) {
          systemInfo = 'Fedora Linux';
        } else if (userAgent.includes('Debian')) {
          systemInfo = 'Debian Linux';
        } else {
          systemInfo = 'Linux PC';
        }
      } else if (userAgent.includes('Android')) {
        systemInfo = 'Android Device';
      } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
        systemInfo = 'iOS Device';
      } else {
        systemInfo = 'Unknown Device';
      }
      
      // OPÇÃO 3: Gerar identificador único baseado em múltiplos fatores
      const factors = [
        userAgent,
        navigator.language,
        screen.width + 'x' + screen.height,
        navigator.platform,
        new Date().getTimezoneOffset().toString()
      ].join('|');
      
      const hash = factors.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      
      const shortHash = Math.abs(hash).toString(36).slice(0, 6).toUpperCase();
      deviceIdentifier = `(${shortHash})`;
      
      // OPÇÃO 4: Usar timestamp para criar nome único por sessão
      const sessionId = Date.now().toString(36).slice(-4).toUpperCase();
      
      // OPÇÃO 5: Usar apenas o sistema operacional com identificador único
      computerName = `${systemInfo} ${deviceIdentifier}`;
      
      // OPÇÃO 6: Alternativas mais específicas (comentadas para uso futuro)
      const alternatives = [
        `${systemInfo} - ${navigator.platform}`,
        `${systemInfo} - ${navigator.language}`,
        `${systemInfo} - ${screen.width}x${screen.height}`,
        `${systemInfo} - Session ${sessionId}`,
        `${systemInfo} - ${new Date().toLocaleDateString()}`,
        `${systemInfo} - ${navigator.userAgent.split(' ')[0]}`,
        `${systemInfo} - ${window.location.protocol}`,
        `${systemInfo} - ${navigator.cookieEnabled ? 'Cookies ON' : 'Cookies OFF'}`,
        `${systemInfo} - ${navigator.onLine ? 'Online' : 'Offline'}`,
        `${systemInfo} - ${navigator.hardwareConcurrency || 'Unknown'} cores`
      ];
      
      // OPÇÃO 7: Usar nome baseado no timezone
      const timezoneBasedName = `${systemInfo} - ${getTimezoneInfo()} ${deviceIdentifier}`;
      
      // OPÇÃO 8: Usar nome baseado na resolução
      const resolutionBasedName = `${systemInfo} - ${screen.width}x${screen.height} ${deviceIdentifier}`;
      
      // OPÇÃO 9: Usar nome baseado no idioma
      const languageBasedName = `${systemInfo} - ${navigator.language} ${deviceIdentifier}`;
      
      // Você pode escolher qual opção usar descomentando uma das linhas abaixo:
      // computerName = alternatives[0]; // Primeira alternativa
      // computerName = timezoneBasedName; // Baseado no timezone
      // computerName = resolutionBasedName; // Baseado na resolução
      // computerName = languageBasedName; // Baseado no idioma
      
      // Por padrão, usar apenas o sistema operacional com identificador único (já definido acima)
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
    computerName,
    ipAddress
  };
}

// Função para gerar um ID de sessão único
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Função para inicializar a captura de IP quando a página carrega
export function initializeIPCapture(): void {
  if (typeof window === 'undefined') return;
  
  // Se já tem IP armazenado, não fazer nada
  if ((window as any).__userIP) return;
  
  // Tentar obter IP via API
  fetch('https://api.ipify.org?format=json')
    .then(response => response.json())
    .then(data => {
      if (data.ip) {
        (window as any).__userIP = data.ip;
      }
    })
    .catch(error => {
      // Tentar API alternativa
      return fetch('https://ipapi.co/json/');
    })
    .then(response => response?.json())
    .then(data => {
      if (data?.ip) {
        (window as any).__userIP = data.ip;
      }
    })
    .catch(() => {
    });
}

// Função principal para logar operações
export async function logReservationOperation(
  logData: LogData,
  sessionId?: string,
  browserInfo?: BrowserInfo
): Promise<void> {
  try {
    // Se browserInfo não foi fornecido, tentar obter no cliente
    const currentBrowserInfo = browserInfo || (typeof window !== 'undefined' ? getBrowserInfo() : {
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
      computerName: 'Server',
      ipAddress: 'Unknown'
    });
    
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
      user_agent: currentBrowserInfo.userAgent,
      browser_name: currentBrowserInfo.browserName,
      browser_version: currentBrowserInfo.browserVersion,
      operating_system: currentBrowserInfo.operatingSystem,
      device_type: currentBrowserInfo.deviceType,
      screen_resolution: currentBrowserInfo.screenResolution,
      timezone: currentBrowserInfo.timezone,
      computer_name: currentBrowserInfo.computerName,
      ip_address: currentBrowserInfo.ipAddress,
      session_id: currentSessionId,
      referrer_url: currentBrowserInfo.referrerUrl,
      page_url: currentBrowserInfo.pageUrl,
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

    const response = await fetch('/api/reservation-logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(logEntry),
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (jsonError) {
        errorData = { error: 'Invalid JSON response', status: response.status };
      }
      
      console.error('Erro ao salvar log:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        logEntry: {
          operationType: logEntry.operation_type,
          deskId: logEntry.desk_id,
          sessionId: logEntry.session_id
        }
      });
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
  sessionId?: string,
  count?: number
): Promise<void> {
  const browserInfo = typeof window !== 'undefined' ? getBrowserInfo() : undefined;
  await logReservationOperation({
    operationType: 'CREATE',
    deskId,
    reservationDate,
    reservationNote,
    isRecurring,
    recurringDays,
    processingTimeMs,
    success: true,
    operationDetails: count ? { bulk_count: count } : undefined
  }, sessionId, browserInfo);
}

// Função para logar exclusão de reserva
export async function logReservationDelete(
  deskId: string,
  reservationDate: string,
  reservationNote: string,
  isRecurring: boolean = false,
  recurringDays?: number[],
  processingTimeMs?: number,
  sessionId?: string,
  count?: number
): Promise<void> {
  const browserInfo = typeof window !== 'undefined' ? getBrowserInfo() : undefined;
  await logReservationOperation({
    operationType: 'DELETE',
    deskId,
    reservationDate,
    reservationNote,
    isRecurring,
    recurringDays,
    processingTimeMs,
    success: true,
    operationDetails: count ? { bulk_count: count } : undefined
  }, sessionId, browserInfo);
}

// Função para logar erro
export async function logError(
  operationType: 'CREATE' | 'DELETE' | 'UPDATE',
  errorMessage: string,
  deskId?: string,
  sessionId?: string
): Promise<void> {
  const browserInfo = typeof window !== 'undefined' ? getBrowserInfo() : undefined;
  await logReservationOperation({
    operationType,
    deskId,
    success: false,
    errorMessage
  }, sessionId, browserInfo);
}

