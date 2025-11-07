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
      .select('code, x, y, is_active, created_at')
      .eq('is_active', true)
      .order('code');

    if (desksError) {
      console.error('❌ Erro ao buscar mesas:', desksError);
      return;
    }

    // Organizar mesas por linha usando o prefixo do código (A, B, C, etc)
    const desksByRow = {};
    desks.forEach(desk => {
      const rowLabelMatch = desk.code.match(/^[A-Z]+/);
      const colMatch = desk.code.match(/(\d+)/);
      const rowLabel = rowLabelMatch ? rowLabelMatch[0] : 'Desconhecido';
      const colNumber = colMatch ? parseInt(colMatch[1], 10) : 0;

      if (!desksByRow[rowLabel]) {
        desksByRow[rowLabel] = [];
      }
      desksByRow[rowLabel].push({
        code: desk.code,
        col: colNumber,
        created: desk.created_at
      });
    });

    // Ordenar por linha e coluna
    Object.keys(desksByRow).forEach(label => {
      desksByRow[label].sort((a, b) => a.col - b.col);
    });

    // Exibir estrutura
    console.log('📋 Estrutura atual:');
    console.log('==================');
    
    const sortedRows = Object.keys(desksByRow).sort((a, b) => a.localeCompare(b));
    
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

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

getDeskStatus();
