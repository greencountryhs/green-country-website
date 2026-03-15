import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
    'https://zxgsaiosdudumacwzqmu.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4Z3NhaW9zZHVkdW1hY3d6cW11Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjcxMjA1OSwiZXhwIjoyMDg4Mjg4MDU5fQ.D4QZoLM_IZOPFsOtgwOwf7A-gMBTZcANkB1DdOJjXi0'
);

async function check() {
    const out = {};
    const { data: roles, error: err1 } = await supabase.from('roles').select('*').limit(1);
    out.roles = { data: roles, error: err1 };

    const { data: joinData, error: err3 } = await supabase
        .from('task_assignment_instance_targets')
        .select(`id, roles ( * )`)
        .limit(1);
    out.join1 = { data: joinData, error: err3 };
    
    fs.writeFileSync('output.json', JSON.stringify(out, null, 2));
    console.log("Done");
}

check();
