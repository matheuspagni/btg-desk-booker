const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://nygqtbjdmlfagxwrnqhg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55Z3F0YmpkbWxmYWd4d3JucWhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0NzQ5NDAsImV4cCI6MjA1MDA1MDk0MH0.3JZz7Zz7Zz7Zz7Zz7Zz7Zz7Zz7Zz7Zz7Zz7Zz7Zz7Z';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateSchema() {
  try {
    // Ler o arquivo SQL
    const sql = fs.readFileSync('./sql/complete-setup.sql', 'utf8');
    
    // Executar o SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('Erro ao executar SQL:', error);
      return;
    }
    
    console.log('Schema atualizado com sucesso!');
  } catch (err) {
    console.error('Erro:', err);
  }
}

updateSchema();
