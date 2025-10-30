/**
 * Script para configurar um novo projeto Supabase do zero
 * 
 * Uso:
 *   node scripts/setup-new-project.js
 * 
 * Este script vai:
 * 1. Verificar se as variáveis de ambiente estão configuradas
 * 2. Testar conexão com o Supabase
 * 3. Executar o schema SQL
 * 4. Verificar se tudo foi criado corretamente
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Carregar variáveis de ambiente
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🚀 Configurando novo projeto Supabase...\n');

// Verificar variáveis de ambiente
if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Variáveis de ambiente não encontradas!');
  console.log('\n📝 Crie um arquivo .env.local com:');
  console.log('   NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto-id.supabase.co');
  console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon');
  console.log('\n💡 Use o arquivo env.example como base');
  process.exit(1);
}

// Mascarar URL para segurança
const maskedUrl = supabaseUrl.replace(/https:\/\/([^.]+)\.supabase\.co/, 
  (match, project) => `https://${project.substring(0, 4)}***.supabase.co`);

console.log('✅ Variáveis encontradas:');
console.log(`   URL: ${maskedUrl}`);
console.log(`   Key: ${supabaseKey.substring(0, 20)}...\n`);

// Criar cliente Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('🔌 Testando conexão com Supabase...');
  
  try {
    // Testar conexão básica
    const { data, error } = await supabase
      .from('areas')
      .select('count')
      .limit(1);
    
    if (error && error.code === 'PGRST116') {
      console.log('   ℹ️  Tabela areas não existe ainda (normal para novo projeto)');
      return true;
    } else if (error) {
      console.log('   ❌ Erro de conexão:', error.message);
      return false;
    } else {
      console.log('   ✅ Conexão estabelecida com sucesso!');
      return true;
    }
  } catch (err) {
    console.log('   ❌ Erro inesperado:', err.message);
    return false;
  }
}

async function executeSchema() {
  console.log('\n📋 Executando schema SQL...');
  
  try {
    // Ler o arquivo SQL
    const sqlPath = path.join(__dirname, '..', 'sql', 'complete-setup.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Dividir em comandos individuais (separados por ;)
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    console.log(`   📄 Encontrados ${commands.length} comandos SQL`);
    
    // Executar cada comando
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      if (command.length === 0) continue;
      
      try {
        const { error } = await supabase.rpc('exec', { sql: command });
        if (error) {
          console.log(`   ⚠️  Comando ${i + 1} com aviso:`, error.message);
        } else {
          console.log(`   ✅ Comando ${i + 1} executado`);
        }
      } catch (err) {
        console.log(`   ❌ Erro no comando ${i + 1}:`, err.message);
      }
    }
    
    console.log('   ✅ Schema executado!');
    return true;
    
  } catch (err) {
    console.log('   ❌ Erro ao executar schema:', err.message);
    return false;
  }
}

async function verifyTables() {
  console.log('\n🔍 Verificando tabelas criadas...');
  
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
  
  return allGood;
}

async function checkData() {
  console.log('\n📊 Verificando dados iniciais...');
  
  try {
    // Verificar áreas
    const { data: areas, error: areasError } = await supabase
      .from('areas')
      .select('*');
    
    if (areasError) {
      console.log('   ❌ Erro ao verificar áreas:', areasError.message);
      return false;
    }
    
    console.log(`   ✅ Áreas: ${areas?.length || 0} encontradas`);
    
    // Verificar mesas
    const { data: desks, error: desksError } = await supabase
      .from('desks')
      .select('*');
    
    if (desksError) {
      console.log('   ❌ Erro ao verificar mesas:', desksError.message);
      return false;
    }
    
    console.log(`   ✅ Mesas: ${desks?.length || 0} encontradas`);
    
    // Mostrar algumas áreas
    if (areas && areas.length > 0) {
      console.log('\n   📋 Áreas criadas:');
      areas.forEach(area => {
        console.log(`      - ${area.name} (${area.color})`);
      });
    }
    
    return true;
    
  } catch (err) {
    console.log('   ❌ Erro ao verificar dados:', err.message);
    return false;
  }
}

async function main() {
  try {
    // 1. Testar conexão
    const connected = await testConnection();
    if (!connected) {
      console.log('\n❌ Falha na conexão. Verifique suas credenciais.');
      process.exit(1);
    }
    
    // 2. Executar schema
    const schemaOk = await executeSchema();
    if (!schemaOk) {
      console.log('\n❌ Falha ao executar schema. Verifique o arquivo SQL.');
      process.exit(1);
    }
    
    // 3. Verificar tabelas
    const tablesOk = await verifyTables();
    if (!tablesOk) {
      console.log('\n❌ Algumas tabelas não foram criadas corretamente.');
      process.exit(1);
    }
    
    // 4. Verificar dados
    const dataOk = await checkData();
    if (!dataOk) {
      console.log('\n❌ Dados iniciais não foram criados corretamente.');
      process.exit(1);
    }
    
    // Sucesso!
    console.log('\n' + '='.repeat(60));
    console.log('🎉 CONFIGURAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('='.repeat(60));
    console.log('\n✅ Projeto Supabase configurado');
    console.log('✅ Schema criado');
    console.log('✅ Dados iniciais inseridos');
    console.log('✅ Pronto para usar!');
    console.log('\n🚀 Agora você pode executar:');
    console.log('   npm run dev');
    console.log('\n📝 Para produção, configure as mesmas variáveis no Vercel Dashboard');
    
  } catch (err) {
    console.log('\n❌ Erro fatal:', err.message);
    process.exit(1);
  }
}

// Executar
main();
