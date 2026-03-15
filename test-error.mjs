import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase=createClient('https://zxgsaiosdudumacwzqmu.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4Z3NhaW9zZHVkdW1hY3d6cW11Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjcxMjA1OSwiZXhwIjoyMDg4Mjg4MDU5fQ.D4QZoLM_IZOPFsOtgwOwf7A-gMBTZcANkB1DdOJjXi0');

async function run(){
    const res = await supabase.from('task_assignment_instances').insert([{assignment_date:'2026-03-12',title:'E2E Employee Task',is_override:true,status:'scheduled'}]);
    fs.writeFileSync('e2e-error.json', JSON.stringify(res.error, null, 2));
    console.log("Wrote error");
}
run();
