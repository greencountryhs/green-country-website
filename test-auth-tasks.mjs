import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';


const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if(!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY){
    console.error("Missing env vars");
    process.exit(1);
}

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
// This client will strictly use the user JWT to strictly respect app RLS
let userClient = null;

async function runAuthenticatedTest() {
    console.log("Setting up test user context...");
    
    // 1. Get the capability ID.
    const { data: cap } = await adminClient.from('capabilities').select('id').eq('code', 'manage_tasks').single();
    if (!cap) throw new Error("Could not find manage_tasks capability");
    const capId = cap.id;
    
    // 2. Create the real auth user.
    const testEmail = `manager-test-${Date.now()}@greencountryhs.com`;
    const password = 'TestPassword123!';
    const { data: authUser, error: authErr } = await adminClient.auth.admin.createUser({
        email: testEmail,
        password: password,
        email_confirm: true
    });
    if (authErr) throw new Error("Failed to create auth user: " + authErr.message);
    const userId = authUser.user.id;
    
    // 3. Setup standard employee profile
    const { data: profile, error: pErr } = await adminClient.from('profiles').select('id').eq('id', userId).single();
    if(pErr) throw new Error("Profile Err: " + JSON.stringify(pErr));
    const { data: employee, error: eErr } = await adminClient.from('employees').insert([{ user_id: userId, display_name: 'Test Manager', active: true }]).select('id').single();
    if(eErr) throw new Error("Employee Err: " + JSON.stringify(eErr));
    
    // 4. Use existing role with capability
    const { data: roleCap } = await adminClient.from('role_capabilities').select('role_id').eq('capability_id', capId).limit(1).single();
    if(!roleCap) throw new Error("Could not find an existing role with manage_tasks capability");
    const existingRoleId = roleCap.role_id;
    await adminClient.from('employee_roles').insert([{ employee_id: employee.id, role_id: existingRoleId }]);

    console.log("Signing in to test client...");
    // 5. Authenticate a standard client representing the browser!
    userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { error: signInErr } = await userClient.auth.signInWithPassword({ email: testEmail, password });
    if(signInErr) throw new Error("SignIn failed: " + signInErr.message);
    
    try {
        console.log("Testing parent assignments insert under authenticated user!");
        const d = new Date().toISOString().split('T')[0];
        
        // This is the specific RLS failure point the migration fixes
        const { data: adHocAssignment, error: aErr } = await userClient.from('task_assignments').insert([{
            task_template_id: null,
            assignment_date: d,
            title: 'Auth Check Task',
            display_mode: 'full'
        }]).select('id').single();
        if (aErr) throw new Error("Assignment Creation BLOCKED BY RLS: " + aErr.message);
        
        console.log("Testing child instance insert...");
        const { data: instance, error: iErr } = await userClient.from('task_assignment_instances').insert([{
            task_assignment_id: adHocAssignment.id,
            assignment_date: d,
            title: 'Auth Check Task Instance',
            display_mode: 'full',
            is_override: true,
            status: 'scheduled'
        }]).select('id').single();
        if(iErr) throw new Error("Instance Creation BLOCKED BY RLS: " + iErr.message);
        
        console.log("Testing targeting...");
        const { error: tErr } = await userClient.from('task_assignment_instance_targets').insert([{
            task_assignment_instance_id: instance.id,
            target_type: 'all_crew'
        }]);
        if (tErr) throw new Error("Target Creation BLOCKED BY RLS: " + tErr.message);
        
        console.log("ALL INSERTS SUCCEEDED (RLS PASSED)");
        
    } finally {
        console.log("Cleaning up test user context...");
        await adminClient.from('employee_roles').delete().eq('employee_id', employee.id);
        await adminClient.from('employees').delete().eq('id', employee.id);
        await adminClient.from('profiles').delete().eq('id', userId);
        await adminClient.auth.admin.deleteUser(userId);
    }
}
runAuthenticatedTest().catch(e => console.error(e.message));
