/**
 * Script para clonar dados de um projeto Supabase para outro
 * 
 * Uso:
 *   node scripts/clone-database.js
 * 
 * Variáveis de ambiente necessárias:
 *   SOURCE_SUPABASE_URL - URL do projeto original
 *   SOURCE_SUPABASE_KEY - Chave anon do projeto original
 *   TARGET_SUPABASE_URL - URL do projeto destino
 *   TARGET_SUPABASE_KEY - Chave anon do projeto destino
 */

const { createClient } = require('@supabase/supabase-js');

// Carregar variáveis de ambiente
require('dotenv').config({ path: '.env.local' });

const sourceUrl = process.env.SOURCE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const sourceKey = process.env.SOURCE_SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const targetUrl = process.env.TARGET_SUPABASE_URL;
const targetKey = process.env.TARGET_SUPABASE_KEY;

if (!sourceUrl || !sourceKey) {
  console.error('❌ Erro: Configure SOURCE_SUPABASE_URL e SOURCE_SUPABASE_KEY');
  process.exit(1);
}

if (!targetUrl || !targetKey) {
  console.error('❌ Erro: Configure TARGET_SUPABASE_URL e TARGET_SUPABASE_KEY');
  console.log('\n💡 Dica: Adicione no .env.local:');
  console.log('   TARGET_SUPABASE_URL=https://seu-projeto-novo.supabase.co');
  console.log('   TARGET_SUPABASE_KEY=sua-chave-anon-nova');
  process.exit(1);
}

const sourceClient = createClient(sourceUrl, sourceKey);
const targetClient = createClient(targetUrl, targetKey);

async function exportAndImport(tableName, options = {}) {
  const { select = '*', skipRelations = false } = options;
  
  console.log(`\n📤 Exportando ${tableName}...`);
  
  try {
    // Exportar do projeto original
    const { data, error } = await sourceClient
      .from(tableName)
      .select(select);
    
    if (error) {
      console.error(`   ⚠️  Erro ao exportar ${tableName}:`, error.message);
      return { count: 0, error };
    }
    
    if (!data || data.length === 0) {
      console.log(`   ℹ️  Nenhum dado encontrado em ${tableName}`);
      return { count: 0 };
    }
    
    console.log(`   ✓ Encontrados ${data.length} registros`);
    
    // Importar no projeto destino
    console.log(`📥 Importando ${data.length} registros em ${tableName}...`);
    
    const { error: insertError } = await targetClient
      .from(tableName)
      .upsert(data, { onConflict: 'id' });
    
    if (insertError) {
      console.error(`   ⚠️  Erro ao importar ${tableName}:`, insertError.message);
      return { count: 0, error: insertError };
    }
    
    console.log(`   ✅ ${data.length} registros importados com sucesso!`);
    
    return { count: data.length };
    
  } catch (err) {
    console.error(`   ❌ Erro inesperado em ${tableName}:`, err.message);
    return { count: 0, error: err };
  }
}

async function cloneDatabase() {
  console.log('🚀 Iniciando clonagem de banco de dados...');
  console.log(`\n📊 Projeto Origem: ${sourceUrl}`);
  console.log(`📊 Projeto Destino: ${targetUrl}`);
  
  const results = {
    areas: await exportAndImport('areas'),
    desks: await exportAndImport('desks'),
    reservations: await exportAndImport('reservations'),
  };
  
  // Tentar importar logs se a tabela existir
  try {
    const { error } = await sourceClient.from('reservation_logs').select('id').limit(1);
    if (!error) {
      results.reservation_logs = await exportAndImport('reservation_logs');
    }
  } catch (err) {
    console.log('\n   ℹ️  Tabela reservation_logs não encontrada, pulando...');
  }
  
  // Resumo
  console.log('\n' + '='.repeat(60));
  console.log('📋 RESUMO DA CLONAGEM');
  console.log('='.repeat(60));
  
  let totalRecords = 0;
  let errors = 0;
  
  Object.entries(results).forEach(([table, result]) => {
    if (result.error) {
      console.log(`❌ ${table}: ERRO - ${result.error.message}`);
      errors++;
    } else {
      console.log(`✅ ${table}: ${result.count} registros`);
      totalRecords += result.count;
    }
  });
  
  console.log('='.repeat(60));
  console.log(`\n📊 Total: ${totalRecords} registros clonados`);
  
  if (errors > 0) {
    console.log(`⚠️  ${errors} tabela(s) com erros`);
    process.exit(1);
  } else {
    console.log('✅ Clonagem concluída com sucesso!');
  }
}

// Executar
cloneDatabase()
  .catch(err => {
    console.error('\n❌ Erro fatal:', err);
    process.exit(1);
  });

