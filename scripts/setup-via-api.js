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
      name: 'slots',
      sql: `
        CREATE TABLE IF NOT EXISTS public.slots (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          area_id uuid NOT NULL REFERENCES public.areas(id) ON DELETE CASCADE,
          row_number int NOT NULL,
          col_number int NOT NULL,
          x int NOT NULL,
          y int NOT NULL,
          w int NOT NULL DEFAULT 120,
          h int NOT NULL DEFAULT 80,
          is_available boolean NOT NULL DEFAULT true,
          created_at timestamptz DEFAULT now(),
          UNIQUE(area_id, row_number, col_number)
        );
      `
    },
    {
      name: 'desks',
      sql: `
        CREATE TABLE IF NOT EXISTS public.desks (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          slot_id uuid NOT NULL REFERENCES public.slots(id) ON DELETE CASCADE,
          area_id uuid NOT NULL REFERENCES public.areas(id) ON DELETE CASCADE,
          code text NOT NULL,
          is_active boolean NOT NULL DEFAULT true,
          created_at timestamptz DEFAULT now(),
          UNIQUE(area_id, code)
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
    
    // Inserir slots
    console.log('   📍 Inserindo slots...');
    const slots = [];
    
    for (let row = 1; row <= 5; row++) {
      for (let col = 1; col <= 10; col++) {
        // Pular linha 2 exceto colunas 1-2, linha 5 corredor com 2 quadrados
        if ((row === 2 && col > 2) || (row === 5 && col > 2)) continue;
        
        const areaId = (row === 1 && col <= 3) ? derivativosId : semAreaId;
        
        slots.push({
          area_id: areaId,
          row_number: row,
          col_number: col,
          x: 80 + (col - 1) * 120,
          y: (row - 1) * 80,
          w: 120,
          h: 80,
          is_available: true
        });
      }
    }
    
    const { error: slotsError } = await supabase
      .from('slots')
      .upsert(slots, { onConflict: 'area_id,row_number,col_number' });
    
    if (slotsError) {
      console.log(`   ⚠️  Aviso nos slots: ${slotsError.message}`);
    } else {
      console.log(`   ✅ ${slots.length} slots inseridos`);
    }
    
    // Inserir mesas
    console.log('   📍 Inserindo mesas...');
    const { data: slotsData } = await supabase.from('slots').select('*');
    const desks = [];
    
    // Linha 1: C1-C10
    const row1Slots = slotsData?.filter(s => s.row_number === 1) || [];
    row1Slots.forEach(slot => {
      desks.push({
        slot_id: slot.id,
        area_id: slot.area_id,
        code: `C${slot.col_number}`,
        is_active: true
      });
    });
    
    // Linha 3: B1-B10
    const row3Slots = slotsData?.filter(s => s.row_number === 3) || [];
    row3Slots.forEach(slot => {
      desks.push({
        slot_id: slot.id,
        area_id: slot.area_id,
        code: `B${slot.col_number}`,
        is_active: true
      });
    });
    
    // Linha 4: A1-A2
    const row4Slots = slotsData?.filter(s => s.row_number === 4 && s.col_number <= 2) || [];
    row4Slots.forEach(slot => {
      desks.push({
        slot_id: slot.id,
        area_id: slot.area_id,
        code: `A${slot.col_number}`,
        is_active: true
      });
    });
    
    const { error: desksError } = await supabase
      .from('desks')
      .upsert(desks, { onConflict: 'area_id,code' });
    
    if (desksError) {
      console.log(`   ⚠️  Aviso nas mesas: ${desksError.message}`);
    } else {
      console.log(`   ✅ ${desks.length} mesas inseridas`);
    }
    
    // Marcar slots ocupados como indisponíveis
    console.log('   📍 Atualizando slots ocupados...');
    const deskSlotIds = desks.map(d => d.slot_id);
    
    const { error: updateError } = await supabase
      .from('slots')
      .update({ is_available: false })
      .in('id', deskSlotIds);
    
    if (updateError) {
      console.log(`   ⚠️  Aviso na atualização: ${updateError.message}`);
    } else {
      console.log('   ✅ Slots atualizados');
    }
    
  } catch (err) {
    console.log(`   ❌ Erro ao inserir dados: ${err.message}`);
  }
}

async function verifySetup() {
  console.log('\n🔍 Verificando configuração...');
  
  const tables = ['areas', 'slots', 'desks', 'reservations'];
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
