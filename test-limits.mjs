import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testLimits() {
  for (let i = 0; i < 15; i++) {
    const { error } = await supabase.auth.resetPasswordForEmail('wizard@example.com', {
      redirectTo: 'http://localhost:3000/auth/callback',
    });
    if (error) {
      console.log(`Request ${i} failed with error message:`, error.message);
      break;
    } else {
      console.log(`Request ${i} succeeded.`);
    }
  }
}

testLimits();
