/**
 * Script para verificar configuração de ambiente (dev/prod)
 * 
 * Uso:
 *   node scripts/check-env.js
 */

require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Verificando configuração de ambiente...\n');

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Variáveis de ambiente não encontradas!');
  console.log('\n📝 Para desenvolvimento local, crie um arquivo .env.local com:');
  console.log('   NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto-dev.supabase.co');
  console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-dev');
  console.log('\n💡 Para produção, configure as variáveis no Vercel Dashboard');
  process.exit(1);
}

// Mascarar parte da URL e key para segurança
const maskedUrl = supabaseUrl.replace(/https:\/\/([^.]+)\.supabase\.co/, 
  (match, project) => `https://${project.substring(0, 4)}***.supabase.co`);
const maskedKey = supabaseKey.substring(0, 20) + '...';

console.log('✅ Variáveis encontradas:');
console.log(`   URL: ${maskedUrl}`);
console.log(`   Key: ${maskedKey}`);
console.log('\n📌 Esta é a configuração de DESENVOLVIMENTO');
console.log('   (Para produção, configure no Vercel Dashboard)\n');

// Dica sobre produção
if (supabaseUrl.includes('prod') || supabaseUrl.includes('production')) {
  console.log('⚠️  ATENÇÃO: Parece que você está usando projeto de PRODUÇÃO localmente!');
  console.log('   Considere usar um projeto separado para desenvolvimento.\n');
}

console.log('✅ Configuração OK!');

