const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function getDeskStatus() {
  try {
    console.log('📊 Status atual das mesas no banco de dados\n');
    
    // Buscar todas as mesas
    const { data: desks, error: desksError } = await supabase
      .from('desks')
      .select('code, slot_id, is_active, created_at')
      .eq('is_active', true)
      .order('code');

    if (desksError) {
      console.error('❌ Erro ao buscar mesas:', desksError);
      return;
    }

    // Buscar informações dos slots
    const slotIds = desks.map(d => d.slot_id);
    const { data: slots, error: slotsError } = await supabase
      .from('slots')
      .select('id, row_number, col_number')
      .in('id', slotIds);

    if (slotsError) {
      console.error('❌ Erro ao buscar slots:', slotsError);
      return;
    }

    // Criar mapa de slots
    const slotMap = {};
    slots.forEach(slot => {
      slotMap[slot.id] = slot;
    });

    // Organizar mesas por linha
    const desksByRow = {};
    desks.forEach(desk => {
      const slot = slotMap[desk.slot_id];
      if (slot) {
        if (!desksByRow[slot.row_number]) {
          desksByRow[slot.row_number] = [];
        }
        desksByRow[slot.row_number].push({
          code: desk.code,
          col: slot.col_number,
          created: desk.created_at
        });
      }
    });

    // Ordenar por linha e coluna
    Object.keys(desksByRow).forEach(row => {
      desksByRow[row].sort((a, b) => a.col - b.col);
    });

    // Exibir estrutura
    console.log('📋 Estrutura atual:');
    console.log('==================');
    
    const sortedRows = Object.keys(desksByRow).map(Number).sort((a, b) => b - a);
    
    sortedRows.forEach(row => {
      const rowDesks = desksByRow[row];
      const codes = rowDesks.map(d => d.code).join(', ');
      console.log(`Linha ${row}: ${codes} (${rowDesks.length} mesas)`);
    });

    console.log(`\n📊 Total: ${desks.length} mesas ativas`);

    // Exibir detalhes por linha
    console.log('\n📋 Detalhes por linha:');
    console.log('======================');
    
    sortedRows.forEach(row => {
      const rowDesks = desksByRow[row];
      console.log(`\nLinha ${row}:`);
      rowDesks.forEach(desk => {
        console.log(`  ${desk.code} (coluna ${desk.col})`);
      });
    });

    // Verificar linhas vazias
    console.log('\n📋 Linhas vazias:');
    console.log('=================');
    
    // Buscar todas as linhas disponíveis
    const { data: allSlots } = await supabase
      .from('slots')
      .select('row_number')
      .order('row_number');
    
    const allRows = [...new Set(allSlots.map(s => s.row_number))].sort((a, b) => b - a);
    const occupiedRows = new Set(Object.keys(desksByRow).map(Number));
    
    allRows.forEach(row => {
      if (!occupiedRows.has(row)) {
        console.log(`Linha ${row}: vazia`);
      }
    });

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

getDeskStatus();
