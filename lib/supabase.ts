'use client';
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase configuration missing');
}

export const supabase = createClient(
  supabaseUrl || 'https://nygqtbjdmlfagxwrnqhg.supabase.co',
  supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55Z3F0YmpkbWxmYWd4d3JucWhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0NzQ5NDAsImV4cCI6MjA1MDA1MDk0MH0.3JZz7Zz7Zz7Zz7Zz7Zz7Zz7Zz7Zz7Zz7Zz7Zz7Zz7Z'
);
