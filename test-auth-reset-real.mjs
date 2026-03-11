import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function testAuth() {
  const testEmail = `testuser_${Date.now()}@greencountryhs.com`;
  console.log(`Creating test user: ${testEmail}`);
  
  // 1. Create a real user
  const { data: userData, error: createError } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: 'password123',
    email_confirm: true // Force confirm so they are a valid user
  });

  if (createError) {
    console.error('Failed to create user:', createError);
    process.exit(1);
  }
  
  console.log('User created:', userData.user.id);
  
  // 2. Trigger reset password
  console.log('Triggering password reset...');
  const { error: resetError } = await supabase.auth.resetPasswordForEmail(testEmail, {
    redirectTo: 'http://localhost:3000/auth/callback?next=/update-password',
  });
  
  if (resetError) {
    console.error('FULL RESET ERROR:', resetError);
  } else {
    console.log('Reset succeeded without error (SMTP might be queued or worked).');
  }
  
  // 3. Cleanup
  console.log('Cleaning up user...');
  await supabase.auth.admin.deleteUser(userData.user.id);
}

testAuth();
