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
    console.log('1. Verificando RLS nas tabelas...');
    
    // Verificar RLS na tabela slots
    const { data: slotsRLS, error: slotsError } = await supabase.rpc('exec', {
      sql: `
        SELECT schemaname, tablename, rowsecurity 
        FROM pg_tables 
        WHERE tablename = 'slots' AND schemaname = 'public';
      `
    });
    
    if (slotsError) {
      console.log(`❌ Erro ao verificar RLS slots: ${slotsError.message}`);
    } else {
      console.log(`✅ RLS slots: ${slotsRLS?.[0]?.rowsecurity ? 'ATIVADO' : 'DESATIVADO'}`);
    }
    
    // Desabilitar RLS em todas as tabelas
    console.log('\n2. Desabilitando RLS...');
    
    const tables = ['areas', 'slots', 'desks', 'reservations'];
    
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
    console.log('\n3. Testando acesso após desabilitar RLS...');
    
    const { data: testSlots, error: testError } = await supabase
      .from('slots')
      .select('*')
      .limit(3);
    
    if (testError) {
      console.log(`❌ Erro no teste: ${testError.message}`);
    } else {
      console.log(`✅ Teste OK: ${testSlots?.length || 0} slots encontrados`);
    }
    
    console.log('\n4. Testando API REST...');
    
    const response = await fetch(`${supabaseUrl}/rest/v1/slots?select=*&order=row_number,col_number.asc`, {
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
      console.log(`✅ API REST retornou: ${data.length} slots`);
    }
    
  } catch (err) {
    console.log(`❌ Erro geral: ${err.message}`);
  }
}

checkAndFixRLS();
