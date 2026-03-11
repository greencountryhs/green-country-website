import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testAuthAnon() {
  console.log('Triggering password reset with ANON key...');
  const { error: resetError } = await supabaseAnon.auth.resetPasswordForEmail('wizard@example.com', {
    redirectTo: 'http://localhost:3000/auth/callback?next=/update-password',
  });
  
  if (resetError) {
    console.error('FULL ANON RESET ERROR:', resetError);
  } else {
    console.log('Anon reset succeeded.');
  }
}

testAuthAnon();
