/**
 * Script para verificar e corrigir RLS no Supabase
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔧 Verificando e corrigindo RLS...\n');

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Variáveis não encontradas!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndFixRLS() {
  try {
    console.log('1. Desabilitando RLS nas tabelas principais...');
    
    const tables = ['areas', 'desks', 'reservations'];
    
    for (const table of tables) {
      const { error } = await supabase.rpc('exec', {
        sql: `ALTER TABLE public.${table} DISABLE ROW LEVEL SECURITY;`
      });
      
      if (error) {
        console.log(`⚠️  Aviso ao desabilitar RLS em ${table}: ${error.message}`);
      } else {
        console.log(`✅ RLS desabilitado em ${table}`);
      }
    }
    
    // Verificar se funcionou
    console.log('\n2. Testando acesso após desabilitar RLS...');
    
    const { data: testDesks, error: testError } = await supabase
      .from('desks')
      .select('*')
      .limit(3);
    
    if (testError) {
      console.log(`❌ Erro no teste: ${testError.message}`);
    } else {
      console.log(`✅ Teste OK: ${testDesks?.length || 0} mesas encontradas`);
    }
    
    console.log('\n3. Testando API REST...');
    
    const response = await fetch(`${supabaseUrl}/rest/v1/desks?select=*&order=code.asc`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.log(`❌ Erro na API REST: ${response.status}`);
    } else {
      const data = await response.json();
      console.log(`✅ API REST retornou: ${data.length} mesas`);
    }
    
  } catch (err) {
    console.log(`❌ Erro geral: ${err.message}`);
  }
}

checkAndFixRLS();
