import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zxgsaiosdudumacwzqmu.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required in environment.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function testReset() {
  console.log('Attempting to reset password for a test email...');
  // Using a test email that exists, or a dummy one just to see the error
  const { data, error } = await supabase.auth.resetPasswordForEmail('wizard@example.com', {
    redirectTo: 'http://localhost:3000/auth/callback?next=/update-password',
  });

  if (error) {
    console.error('FULL ERROR FROM SUPABASE:');
    console.dir(error, { depth: null });
  } else {
    console.log('Success! Data:', data);
  }
}

testReset();
