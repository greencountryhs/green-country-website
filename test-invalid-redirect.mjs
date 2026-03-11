import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testInvalidRedirect() {
  const { error } = await supabase.auth.resetPasswordForEmail('wizard@example.com', {
    redirectTo: 'https://invalid-domain.com/auth/callback',
  });
  console.log('Error output object details:');
  console.dir(error, { depth: null });
  console.log('Error message:', error?.message);
}

testInvalidRedirect();
