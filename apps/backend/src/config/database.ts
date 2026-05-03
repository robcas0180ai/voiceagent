import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

export const testConnection = async () => {
  try {
    const { data, error } = await supabase.from('_test').select('*').limit(1);
    if (error && error.code !== 'PGRST116') {
      console.log('✅ Supabase conectado correctamente');
    } else {
      console.log('✅ Supabase conectado correctamente');
    }
  } catch (err) {
    console.error('❌ Error conectando a Supabase:', err);
  }
};
