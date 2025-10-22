const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nygqtbjdmlfagxwrnqhg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55Z3F0YmpkbWxmYWd4d3JucWhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0NzQ5NDAsImV4cCI6MjA1MDA1MDk0MH0.3JZz7Zz7Zz7Zz7Zz7Zz7Zz7Zz7Zz7Zz7Zz7Zz7Zz7Z';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  try {
    console.log('Verificando estrutura da tabela reservations...');
    
    // Tentar buscar dados para ver a estrutura
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Erro ao verificar tabela reservations:', error);
      
      // Se a tabela não existe, vamos criá-la
      if (error.code === 'PGRST116') {
        console.log('Tabela reservations não existe. Criando...');
        await createReservationsTable();
      }
    } else {
      console.log('Estrutura da tabela reservations:', data);
    }
    
    // Verificar se a coluna date existe
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

async function createReservationsTable() {
  try {
    // Criar tabela reservations com a estrutura correta
    const { error } = await supabase.rpc('exec', {
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
    });
    
    if (error) {
      console.error('Erro ao criar tabela:', error);
    } else {
      console.log('Tabela reservations criada com sucesso!');
    }
  } catch (err) {
    console.error('Erro ao criar tabela:', err);
  }
}

checkSchema();
