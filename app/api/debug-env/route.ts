import { NextResponse } from 'next/server';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  
  // URLs conhecidas de produção e desenvolvimento
  const productionUrl = 'https://vqmbjzhdzgdmhpswljfu.supabase.co';
  const developmentUrl = 'https://tvbuwvrkkejnxwruvwwb.supabase.co';
  
  // Verificar se está apontando para produção baseado na URL específica
  const isPointingToProduction = supabaseUrl === productionUrl;
  
  return NextResponse.json({
    supabaseUrl,
    environment: process.env.NODE_ENV,
    isProduction: isPointingToProduction,
    productionUrl,
    developmentUrl
  });
}
