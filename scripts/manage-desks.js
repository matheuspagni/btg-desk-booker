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

async function getExistingDesks() {
  const { data: desks, error } = await supabase
    .from('desks')
    .select('code')
    .order('code');

  if (error) {
    console.error('❌ Erro ao buscar mesas existentes:', error);
    return null;
  }

  return desks;
}

async function getAreaMap() {
  const { data: areas, error } = await supabase
    .from('areas')
    .select('id, name');

  if (error) {
    console.error('❌ Erro ao buscar áreas:', error);
    return null;
  }

  return areas.reduce((acc, area) => {
    acc[area.name] = area.id;
    return acc;
  }, {});
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
    const desksByRow = existingDesks.reduce((acc, desk) => {
      const rowLabelMatch = desk.code.match(/^[A-Z]+/);
      const rowLabel = rowLabelMatch ? rowLabelMatch[0] : 'Outros';
      if (!acc[rowLabel]) {
        acc[rowLabel] = [];
      }
      acc[rowLabel].push(desk.code);
      return acc;
    }, {});

    Object.keys(desksByRow)
      .sort((a, b) => a.localeCompare(b))
      .forEach(row => {
        const codes = desksByRow[row].sort();
        console.log(`  ${row}: ${codes.join(', ')}`);
      });
  }
}

async function manageDesks() {
  try {
    console.log('🚀 Gerenciando mesas...');
    console.log('📋 Configuração atual:', DESK_CONFIG.length, 'mesas definidas');

    const areaMap = await getAreaMap();
    if (!areaMap) return;

    const areaDerivativos = areaMap['Derivativos'];
    const areaSemArea = areaMap['Sem Área'];

    if (!areaDerivativos || !areaSemArea) {
      console.error('❌ Áreas necessárias não encontradas. Certifique-se de que "Derivativos" e "Sem Área" existem.');
      return;
    }

    // Buscar mesas existentes
    const existingDesks = await getExistingDesks();
    if (!existingDesks) return;

    const existingCodes = new Set(existingDesks.map(d => d.code));
    
    // Preparar mesas para criar
    const desksToCreate = [];
    const codesToDelete = [];

    for (const config of DESK_CONFIG) {
      const widthUnits = 3;
      const heightUnits = 2;
      const cellWidth = widthUnits * 40;
      const cellHeight = heightUnits * 40;

      const x = 80 + (config.col - 1) * cellWidth;
      const y = (config.row - 1) * cellHeight;
      const areaId = config.row === 1 && config.col <= 3 ? areaDerivativos : areaSemArea;

      if (!existingCodes.has(config.code)) {
        desksToCreate.push({
          code: config.code,
          area_id: areaId,
          x,
          y,
          width_units: widthUnits,
          height_units: heightUnits,
          is_active: true,
          is_blocked: false,
          created_at: new Date().toISOString()
        });
      } else {
        console.log(`✅ Mesa ${config.code} já existe`);
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
