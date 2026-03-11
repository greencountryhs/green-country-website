import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function testAuth() {
  const testEmail = `testuser_${Date.now()}@greencountryhs.com`;
  const { data: userData } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: 'password123',
    email_confirm: true
  });
  
  const { error: resetError } = await supabase.auth.resetPasswordForEmail(testEmail, {
    redirectTo: 'http://localhost:3000/auth/callback?next=/update-password',
  });
  
  if (resetError) {
    fs.writeFileSync('error_details.txt', JSON.stringify(resetError, null, 2), 'utf-8');
  } else {
    fs.writeFileSync('error_details.txt', 'NO ERROR - SUCCESS', 'utf-8');
  }
  
  await supabase.auth.admin.deleteUser(userData.user.id);
}

testAuth();
