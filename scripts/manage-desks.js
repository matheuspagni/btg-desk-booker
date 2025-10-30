const { createClient } = require('@supabase/supabase-js');

// Seleção de ambiente via argumento: --env=dev | --env=prod (default: dev)
const argEnv = (process.argv.find(a => a.startsWith('--env=')) || '--env=dev').split('=')[1];
const envPath = argEnv === 'prod' ? '.env.prod.local' : '.env.local';
require('dotenv').config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas!');
  console.log('Certifique-se de que o arquivo .env.local existe e contém:');
  console.log('NEXT_PUBLIC_SUPABASE_URL=...');
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY=...');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================================
// CONFIGURAÇÃO POR AMBIENTE - EDITE AQUI SEPARADAMENTE PARA DEV/PROD
// ============================================================================

const DESK_CONFIG_DEV = [
  // Linha 4 - A1-A5
  { code: 'A1', row: 4, col: 1 },
  { code: 'A2', row: 4, col: 2 },
  { code: 'A3', row: 4, col: 3 },
  { code: 'A4', row: 4, col: 4 },
  { code: 'A5', row: 4, col: 5 },
  // Linha 3 - B1-B5
  { code: 'B1', row: 3, col: 1 },
  { code: 'B2', row: 3, col: 2 },
  { code: 'B3', row: 3, col: 3 },
  { code: 'B4', row: 3, col: 4 },
  { code: 'B5', row: 3, col: 5 },
  // Linha 1 - C1-C5
  { code: 'C1', row: 1, col: 1 },
  { code: 'C2', row: 1, col: 2 },
  { code: 'C3', row: 1, col: 3 },
  { code: 'C4', row: 1, col: 4 },
  { code: 'C5', row: 1, col: 5 },
];

const DESK_CONFIG_PROD = [
  // Linha 4 - A1-A10
  { code: 'A1', row: 4, col: 1 },
  { code: 'A2', row: 4, col: 2 },
  { code: 'A3', row: 4, col: 3 },
  { code: 'A4', row: 4, col: 4 },
  { code: 'A5', row: 4, col: 5 },
  { code: 'A6', row: 4, col: 6 },
  { code: 'A7', row: 4, col: 7 },
  { code: 'A8', row: 4, col: 8 },
  { code: 'A9', row: 4, col: 9 },
  { code: 'A10', row: 4, col: 10 },
  // Linha 3 - B1-B10
  { code: 'B1', row: 3, col: 1 },
  { code: 'B2', row: 3, col: 2 },
  { code: 'B3', row: 3, col: 3 },
  { code: 'B4', row: 3, col: 4 },
  { code: 'B5', row: 3, col: 5 },
  { code: 'B6', row: 3, col: 6 },
  { code: 'B7', row: 3, col: 7 },
  { code: 'B8', row: 3, col: 8 },
  { code: 'B9', row: 3, col: 9 },
  { code: 'B10', row: 3, col: 10 },
  // Linha 1 - C1-C10
  { code: 'C1', row: 1, col: 1 },
  { code: 'C2', row: 1, col: 2 },
  { code: 'C3', row: 1, col: 3 },
  { code: 'C4', row: 1, col: 4 },
  { code: 'C5', row: 1, col: 5 },
  { code: 'C6', row: 1, col: 6 },
  { code: 'C7', row: 1, col: 7 },
  { code: 'C8', row: 1, col: 8 },
  { code: 'C9', row: 1, col: 9 },
  { code: 'C10', row: 1, col: 10 },
];

const DESK_CONFIG = argEnv === 'prod' ? DESK_CONFIG_PROD : DESK_CONFIG_DEV;

// ============================================================================
// FUNÇÕES DO SCRIPT
// ============================================================================

async function getSlotsByRow(rowNumber) {
  const { data: slots, error } = await supabase
    .from('slots')
    .select('id, col_number, area_id')
    .eq('row_number', rowNumber)
    .order('col_number');

  if (error) {
    console.error('❌ Erro ao buscar slots:', error);
    return null;
  }

  return slots;
}

async function getExistingDesks() {
  const { data: desks, error } = await supabase
    .from('desks')
    .select('code, slot_id')
    .order('code');

  if (error) {
    console.error('❌ Erro ao buscar mesas existentes:', error);
    return null;
  }

  return desks;
}

async function createDesks(desksToCreate) {
  if (desksToCreate.length === 0) {
    console.log('✅ Nenhuma mesa nova para criar!');
    return;
  }

  console.log(`📝 Criando ${desksToCreate.length} mesas:`, desksToCreate.map(d => d.code).join(', '));

  const { data, error } = await supabase
    .from('desks')
    .insert(desksToCreate)
    .select();

  if (error) {
    console.error('❌ Erro ao criar mesas:', error);
    return;
  }

  console.log('✅ Mesas criadas com sucesso!');
  console.log('📋 Mesas criadas:', data.map(d => d.code).join(', '));
}

async function deleteDesks(codesToDelete) {
  if (codesToDelete.length === 0) {
    console.log('✅ Nenhuma mesa para deletar!');
    return;
  }

  console.log(`🗑️  Deletando ${codesToDelete.length} mesas:`, codesToDelete.join(', '));

  const { error } = await supabase
    .from('desks')
    .delete()
    .in('code', codesToDelete);

  if (error) {
    console.error('❌ Erro ao deletar mesas:', error);
    return;
  }

  console.log('✅ Mesas deletadas com sucesso!');
}

async function showDeskStatus() {
  const { count: totalDesks } = await supabase
    .from('desks')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  console.log(`📊 Total de mesas ativas no sistema: ${totalDesks}`);
  
  // Mostrar mesas por linha
  const existingDesks = await getExistingDesks();
  if (existingDesks) {
    const desksByRow = {};
    existingDesks.forEach(desk => {
      // Buscar o slot da mesa para saber a linha
      // Por simplicidade, vamos mostrar todas as mesas
      console.log(`  - ${desk.code}`);
    });
  }
}

async function manageDesks() {
  try {
    console.log('🚀 Gerenciando mesas...');
    console.log('📋 Configuração atual:', DESK_CONFIG.length, 'mesas definidas');
    
    // Buscar slots por linha
    const slotsByRow = {};
    for (const config of DESK_CONFIG) {
      if (!slotsByRow[config.row]) {
        const slots = await getSlotsByRow(config.row);
        if (slots) {
          slotsByRow[config.row] = slots;
        }
      }
    }

    // Buscar mesas existentes
    const existingDesks = await getExistingDesks();
    if (!existingDesks) return;

    const existingCodes = new Set(existingDesks.map(d => d.code));
    
    // Preparar mesas para criar
    const desksToCreate = [];
    const codesToDelete = [];

    for (const config of DESK_CONFIG) {
      const slot = slotsByRow[config.row]?.find(s => s.col_number === config.col);
      
      if (slot) {
        if (!existingCodes.has(config.code)) {
          desksToCreate.push({
            code: config.code,
            slot_id: slot.id,
            area_id: slot.area_id,
            is_active: true,
            created_at: new Date().toISOString()
          });
        } else {
          console.log(`✅ Mesa ${config.code} já existe`);
        }
      } else {
        console.log(`⚠️  Slot não encontrado para ${config.code} (linha ${config.row}, coluna ${config.col})`);
      }
    }

    // Identificar mesas para deletar (que existem mas não estão na configuração)
    const configCodes = new Set(DESK_CONFIG.map(c => c.code));
    for (const desk of existingDesks) {
      if (!configCodes.has(desk.code)) {
        codesToDelete.push(desk.code);
      }
    }

    // Executar operações
    await createDesks(desksToCreate);
    await deleteDesks(codesToDelete);
    await showDeskStatus();

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  manageDesks();
}

module.exports = { manageDesks, DESK_CONFIG };
