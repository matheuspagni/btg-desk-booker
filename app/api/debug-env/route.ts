import { NextResponse } from 'next/server';

export async function GET() {
  // Retornar apenas informações básicas para verificar se está em produção
  return NextResponse.json({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    environment: process.env.NODE_ENV,
    isProduction: process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('supabase.co') && 
                  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-dev-project.supabase.co'
  });
}
