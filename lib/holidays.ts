// Feriados nacionais brasileiros
export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
  type: 'national' | 'regional' | 'optional';
}

// Feriados fixos (mesmo dia todo ano)
const fixedHolidays: Omit<Holiday, 'date'>[] = [
  { name: 'Confraternização Universal', type: 'national' },
  { name: 'Tiradentes', type: 'national' },
  { name: 'Dia do Trabalhador', type: 'national' },
  { name: 'Independência do Brasil', type: 'national' },
  { name: 'Nossa Senhora Aparecida', type: 'national' },
  { name: 'Finados', type: 'national' },
  { name: 'Proclamação da República', type: 'national' },
  { name: 'Natal', type: 'national' },
];

// Função para calcular Páscoa (algoritmo de Gauss)
function calculateEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const n = Math.floor((h + l - 7 * m + 114) / 31);
  const p = (h + l - 7 * m + 114) % 31;
  
  return new Date(year, n - 1, p + 1);
}

// Função para calcular feriados móveis baseados na Páscoa
function calculateMovableHolidays(year: number): Holiday[] {
  const easter = calculateEaster(year);
  const holidays: Holiday[] = [];
  
  // Carnaval (47 dias antes da Páscoa)
  const carnival = new Date(easter);
  carnival.setDate(easter.getDate() - 47);
  holidays.push({
    date: carnival.toISOString().split('T')[0],
    name: 'Carnaval',
    type: 'national'
  });
  
  // Sexta-feira Santa (2 dias antes da Páscoa)
  const goodFriday = new Date(easter);
  goodFriday.setDate(easter.getDate() - 2);
  holidays.push({
    date: goodFriday.toISOString().split('T')[0],
    name: 'Sexta-feira Santa',
    type: 'national'
  });
  
  // Corpus Christi (60 dias depois da Páscoa)
  const corpusChristi = new Date(easter);
  corpusChristi.setDate(easter.getDate() + 60);
  holidays.push({
    date: corpusChristi.toISOString().split('T')[0],
    name: 'Corpus Christi',
    type: 'national'
  });
  
  return holidays;
}

// Função para gerar todos os feriados de um ano
export function getHolidaysForYear(year: number): Holiday[] {
  const holidays: Holiday[] = [];
  
  // Feriados fixos
  const fixedDates = [
    { month: 0, day: 1 },   // 1º de Janeiro
    { month: 3, day: 21 },  // 21 de Abril
    { month: 4, day: 1 },   // 1º de Maio
    { month: 8, day: 7 },   // 7 de Setembro
    { month: 9, day: 12 },  // 12 de Outubro
    { month: 10, day: 2 },  // 2 de Novembro
    { month: 10, day: 15 }, // 15 de Novembro
    { month: 11, day: 25 }, // 25 de Dezembro
  ];
  
  fixedDates.forEach(({ month, day }, index) => {
    const date = new Date(year, month, day);
    holidays.push({
      date: date.toISOString().split('T')[0],
      name: fixedHolidays[index].name,
      type: fixedHolidays[index].type
    });
  });
  
  // Feriados móveis
  const movableHolidays = calculateMovableHolidays(year);
  holidays.push(...movableHolidays);
  
  return holidays.sort((a, b) => a.date.localeCompare(b.date));
}

// Função para verificar se uma data é feriado
export function isHoliday(date: string): Holiday | null {
  // Extrair o ano diretamente da string para evitar problemas de timezone
  const year = parseInt(date.split('-')[0]);
  const holidays = getHolidaysForYear(year);
  return holidays.find(holiday => holiday.date === date) || null;
}

// Função para obter feriados em um range de datas
export function getHolidaysInRange(startDate: string, endDate: string): Holiday[] {
  const startYear = new Date(startDate).getFullYear();
  const endYear = new Date(endDate).getFullYear();
  const holidays: Holiday[] = [];
  
  for (let year = startYear; year <= endYear; year++) {
    const yearHolidays = getHolidaysForYear(year);
    holidays.push(...yearHolidays);
  }
  
  return holidays
    .filter(holiday => holiday.date >= startDate && holiday.date <= endDate)
    .sort((a, b) => a.date.localeCompare(b.date));
}
