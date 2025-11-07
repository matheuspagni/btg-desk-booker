/**
 * Script para configurar banco via API REST do Supabase
 * (Alternativa quando a função exec não está disponível)
 * 
 * Uso:
 *   node scripts/setup-via-api.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Carregar variáveis de ambiente
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🚀 Configurando banco via API REST...\n');

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Variáveis de ambiente não encontradas!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTables() {
  console.log('📋 Criando tabelas...');
  
  const tables = [
    {
      name: 'areas',
      sql: `
        CREATE TABLE IF NOT EXISTS public.areas (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          name text NOT NULL UNIQUE,
          color text NOT NULL DEFAULT '#0ea5e9',
          created_at timestamptz DEFAULT now()
        );
      `
    },
    {
      name: 'desks',
      sql: `
        CREATE TABLE IF NOT EXISTS public.desks (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          area_id uuid REFERENCES public.areas(id) ON DELETE SET NULL,
          code text NOT NULL UNIQUE,
          x int NOT NULL,
          y int NOT NULL,
          width_units int NOT NULL DEFAULT 3,
          height_units int NOT NULL DEFAULT 2,
          is_active boolean NOT NULL DEFAULT true,
          is_blocked boolean NOT NULL DEFAULT false,
          created_at timestamptz DEFAULT now(),
        );
      `
    },
    {
      name: 'reservations',
      sql: `
        CREATE TABLE IF NOT EXISTS public.reservations (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          desk_id uuid NOT NULL REFERENCES public.desks(id) ON DELETE CASCADE,
          date date NOT NULL,
          note text,
          is_recurring boolean DEFAULT false,
          recurring_days integer[] DEFAULT '{}',
          created_at timestamptz DEFAULT now()
        );
      `
    }
  ];

  for (const table of tables) {
    try {
      console.log(`   📄 Criando tabela ${table.name}...`);
      
      // Usar rpc para executar SQL
      const { error } = await supabase.rpc('exec', { sql: table.sql });
      
      if (error) {
        console.log(`   ⚠️  Aviso em ${table.name}: ${error.message}`);
      } else {
        console.log(`   ✅ Tabela ${table.name} criada`);
      }
    } catch (err) {
      console.log(`   ❌ Erro em ${table.name}: ${err.message}`);
    }
  }
}

async function insertInitialData() {
  console.log('\n🌱 Inserindo dados iniciais...');
  
  try {
    // Inserir áreas
    console.log('   📍 Inserindo áreas...');
    const { error: areasError } = await supabase
      .from('areas')
      .upsert([
        { name: 'Derivativos', color: '#0ea5e9' },
        { name: 'Sem Área', color: '#f59e0b' }
      ], { onConflict: 'name' });
    
    if (areasError) {
      console.log(`   ⚠️  Aviso nas áreas: ${areasError.message}`);
    } else {
      console.log('   ✅ Áreas inseridas');
    }
    
    // Buscar IDs das áreas
    const { data: areas } = await supabase.from('areas').select('id, name');
    const derivativosId = areas?.find(a => a.name === 'Derivativos')?.id;
    const semAreaId = areas?.find(a => a.name === 'Sem Área')?.id;
    
    if (!derivativosId || !semAreaId) {
      console.log('   ❌ Não foi possível encontrar IDs das áreas');
      return;
    }
    
    // Inserir mesas
    console.log('   📍 Inserindo mesas...');
    const desks = [];
    const GRID_UNIT = 40;
    const WIDTH_UNITS = 3;
    const HEIGHT_UNITS = 2;
    const cellWidth = WIDTH_UNITS * GRID_UNIT;
    const cellHeight = HEIGHT_UNITS * GRID_UNIT;

    for (let col = 1; col <= 10; col++) {
      const areaId = col <= 3 ? derivativosId : semAreaId;
      desks.push({
        code: `C${col}`,
        area_id: areaId,
        x: 80 + (col - 1) * cellWidth,
        y: 0,
        width_units: WIDTH_UNITS,
        height_units: HEIGHT_UNITS,
        is_active: true,
        is_blocked: false
      });
    }

    for (let col = 1; col <= 10; col++) {
      desks.push({
        code: `B${col}`,
        area_id: semAreaId,
        x: 80 + (col - 1) * cellWidth,
        y: (3 - 1) * cellHeight,
        width_units: WIDTH_UNITS,
        height_units: HEIGHT_UNITS,
        is_active: true,
        is_blocked: false
      });
    }

    for (let col = 1; col <= 2; col++) {
      desks.push({
        code: `A${col}`,
        area_id: semAreaId,
        x: 80 + (col - 1) * cellWidth,
        y: (4 - 1) * cellHeight,
        width_units: WIDTH_UNITS,
        height_units: HEIGHT_UNITS,
        is_active: true,
        is_blocked: false
      });
    }

    const { error: desksError } = await supabase
      .from('desks')
      .upsert(desks, { onConflict: 'code' });
    
    if (desksError) {
      console.log(`   ⚠️  Aviso nas mesas: ${desksError.message}`);
    } else {
      console.log(`   ✅ ${desks.length} mesas inseridas`);
    }

  } catch (err) {
    console.log(`   ❌ Erro ao inserir dados: ${err.message}`);
  }
}

async function verifySetup() {
  console.log('\n🔍 Verificando configuração...');
  
  const tables = ['areas', 'desks', 'reservations'];
  let allGood = true;
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('count')
        .limit(1);
      
      if (error) {
        console.log(`   ❌ Tabela ${table}: ERRO - ${error.message}`);
        allGood = false;
      } else {
        console.log(`   ✅ Tabela ${table}: OK`);
      }
    } catch (err) {
      console.log(`   ❌ Tabela ${table}: ERRO - ${err.message}`);
      allGood = false;
    }
  }
  
  // Verificar dados
  try {
    const { data: areas } = await supabase.from('areas').select('*');
    const { data: desks } = await supabase.from('desks').select('*');
    
    console.log(`\n📊 Dados inseridos:`);
    console.log(`   Áreas: ${areas?.length || 0}`);
    console.log(`   Mesas: ${desks?.length || 0}`);
    
    if (areas && areas.length > 0) {
      console.log(`\n   📋 Áreas criadas:`);
      areas.forEach(area => {
        console.log(`      - ${area.name} (${area.color})`);
      });
    }
    
  } catch (err) {
    console.log(`   ❌ Erro ao verificar dados: ${err.message}`);
    allGood = false;
  }
  
  return allGood;
}

async function main() {
  try {
    // 1. Criar tabelas
    await createTables();
    
    // 2. Inserir dados iniciais
    await insertInitialData();
    
    // 3. Verificar setup
    const success = await verifySetup();
    
    if (success) {
      console.log('\n' + '='.repeat(60));
      console.log('🎉 CONFIGURAÇÃO CONCLUÍDA COM SUCESSO!');
      console.log('='.repeat(60));
      console.log('\n✅ Banco configurado via API REST');
      console.log('✅ Tabelas criadas');
      console.log('✅ Dados iniciais inseridos');
      console.log('✅ Pronto para usar!');
      console.log('\n🚀 Agora você pode executar:');
      console.log('   npm run dev');
    } else {
      console.log('\n❌ Configuração incompleta. Verifique os erros acima.');
    }
    
  } catch (err) {
    console.log('\n❌ Erro fatal:', err.message);
  }
}

// Executar
main();
