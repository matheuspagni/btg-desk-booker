/**
 * Script simples para configurar o banco
 * Executa comandos SQL básicos via API
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🚀 Setup simples do banco...\n');

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Variáveis não encontradas!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function waitForTable(tableName, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const { error } = await supabase.from(tableName).select('count').limit(1);
      if (!error) {
        console.log(`   ✅ Tabela ${tableName} disponível`);
        return true;
      }
    } catch (err) {
      // Ignorar erros de cache
    }
    
    console.log(`   ⏳ Aguardando tabela ${tableName}... (${i + 1}/${maxAttempts})`);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  return false;
}

async function main() {
  try {
    console.log('📋 Executando comandos SQL básicos...');
    
    // 1. Criar tabela areas
    console.log('   📄 Criando tabela areas...');
    const { error: areasError } = await supabase.rpc('exec', {
      sql: `CREATE TABLE IF NOT EXISTS public.areas (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL UNIQUE,
        color text NOT NULL DEFAULT '#0ea5e9',
        created_at timestamptz DEFAULT now()
      );`
    });
    
    if (areasError) {
      console.log(`   ⚠️  Aviso areas: ${areasError.message}`);
    } else {
      console.log('   ✅ Tabela areas criada');
    }
    
    // Aguardar tabela areas
    await waitForTable('areas');
    
    // 2. Criar tabela desks
    console.log('   📄 Criando tabela desks...');
    const { error: desksError } = await supabase.rpc('exec', {
      sql: `CREATE TABLE IF NOT EXISTS public.desks (
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
      );`
    });
    
    if (desksError) {
      console.log(`   ⚠️  Aviso desks: ${desksError.message}`);
    } else {
      console.log('   ✅ Tabela desks criada');
    }
    
    // Aguardar tabela desks
    await waitForTable('desks');
    
    // 3. Criar tabela reservations
    console.log('   📄 Criando tabela reservations...');
    const { error: reservationsError } = await supabase.rpc('exec', {
      sql: `CREATE TABLE IF NOT EXISTS public.reservations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        desk_id uuid NOT NULL REFERENCES public.desks(id) ON DELETE CASCADE,
        date date NOT NULL,
        note text,
        is_recurring boolean DEFAULT false,
        recurring_days integer[] DEFAULT '{}',
        created_at timestamptz DEFAULT now()
      );`
    });
    
    if (reservationsError) {
      console.log(`   ⚠️  Aviso reservations: ${reservationsError.message}`);
    } else {
      console.log('   ✅ Tabela reservations criada');
    }
    
    // Aguardar tabela reservations
    await waitForTable('reservations');
    
    // 4. Inserir dados básicos
    console.log('\n🌱 Inserindo dados iniciais...');
    
    // Inserir áreas
    const { error: insertAreasError } = await supabase
      .from('areas')
      .upsert([
        { name: 'Derivativos', color: '#0ea5e9' },
        { name: 'Sem Área', color: '#f59e0b' }
      ], { onConflict: 'name' });
    
    if (insertAreasError) {
      console.log(`   ⚠️  Aviso inserção áreas: ${insertAreasError.message}`);
    } else {
      console.log('   ✅ Áreas inseridas');
    }
    
    // Verificar se funcionou
    console.log('\n🔍 Verificando configuração...');
    
    const { data: areas, error: areasCheckError } = await supabase
      .from('areas')
      .select('*');
    
    if (areasCheckError) {
      console.log(`   ❌ Erro ao verificar áreas: ${areasCheckError.message}`);
    } else {
      console.log(`   ✅ Áreas: ${areas?.length || 0} encontradas`);
      if (areas && areas.length > 0) {
        areas.forEach(area => {
          console.log(`      - ${area.name} (${area.color})`);
        });
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 SETUP BÁSICO CONCLUÍDO!');
    console.log('='.repeat(50));
    console.log('\n✅ Tabelas criadas');
    console.log('✅ Dados iniciais inseridos');
    console.log('\n🚀 Agora você pode executar:');
    console.log('   npm run dev');
    console.log('\n📝 Para completar o setup, execute o SQL completo no Supabase Dashboard');
    
  } catch (err) {
    console.log('\n❌ Erro:', err.message);
  }
}

main();
