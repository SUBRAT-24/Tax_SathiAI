import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://gfiuxlduigxfksvrjwlw.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmaXV4bGR1aWd4ZmtzdnJqd2x3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2Mjg3ODEsImV4cCI6MjEwODIwNDc4MX0.CK5KamiXkOB8Tc0X-dR_1NcfloyeXQ3Rf4z_i4GWKu0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
