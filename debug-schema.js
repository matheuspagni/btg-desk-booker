// Script para executar no console do navegador
// Cole este código no console do navegador (F12 → Console)

console.log('=== DEBUG SCHEMA ===');

// Verificar se o Supabase está funcionando
const { createClient } = window.supabase || {};

if (!createClient) {
  console.error('Supabase não está disponível no window');
} else {
  const supabase = createClient(
    'https://nygqtbjdmlfagxwrnqhg.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55Z3F0YmpkbWxmYWd4d3JucWhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0NzQ5NDAsImV4cCI6MjA1MDA1MDk0MH0.3JZz7Zz7Zz7Zz7Zz7Zz7Zz7Zz7Zz7Zz7Zz7Zz7Zz7Z'
  );

  // Testar conexão
  async function testConnection() {
    try {
      console.log('Testando conexão com Supabase...');
      
      // Verificar se a tabela reservations existe
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .limit(1);
      
      if (error) {
        console.error('Erro ao acessar tabela reservations:', error);
        
        if (error.message.includes('date')) {
          console.log('PROBLEMA IDENTIFICADO: Coluna "date" não existe na tabela reservations');
          console.log('SOLUÇÃO: Execute o SQL no Supabase Dashboard');
          console.log('SQL para executar:');
          console.log(`
            ALTER TABLE public.reservations 
            ADD COLUMN IF NOT EXISTS date date;
          `);
        }
      } else {
        console.log('Tabela reservations acessível:', data);
      }
      
      // Verificar estrutura da tabela
      const { data: columns, error: columnError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type')
        .eq('table_name', 'reservations');
      
      if (columnError) {
        console.log('Não foi possível verificar colunas via information_schema');
      } else {
        console.log('Colunas da tabela reservations:', columns);
      }
      
    } catch (err) {
      console.error('Erro geral:', err);
    }
  }

  testConnection();
}
