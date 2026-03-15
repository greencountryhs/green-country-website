import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const supabase=createClient('https://zxgsaiosdudumacwzqmu.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4Z3NhaW9zZHVkdW1hY3d6cW11Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjcxMjA1OSwiZXhwIjoyMDg4Mjg4MDU5fQ.D4QZoLM_IZOPFsOtgwOwf7A-gMBTZcANkB1DdOJjXi0');

async function testActions() {
    try {
        const {data:e}=await supabase.from('employees').select('id').limit(1);
        const {data:r}=await supabase.from('roles').select('id').limit(1);
        const dateStr=new Date().toISOString().split('T')[0];
        
        // Emulate employee target
        console.log("Creating employee task...");
        let p1 = await supabase.from('task_assignments').insert([{task_template_id: null, assignment_date: dateStr, title: 'Ad Hoc Emp', display_mode: 'full'}]).select('id').single();
        if(p1.error) throw p1.error;
        let c1 = await supabase.from('task_assignment_instances').insert([{task_assignment_id: p1.data.id, assignment_date: dateStr, title: 'Ad Hoc Emp', display_mode:'full', is_override: true, status: 'scheduled'}]).select('id').single();
        if(c1.error) throw c1.error;
        let t1 = await supabase.from('task_assignment_instance_targets').insert([{task_assignment_instance_id: c1.data.id, target_type: 'employee', employee_id: e[0].id}]);
        if(t1.error) throw t1.error;
        
        console.log("Done");
    } catch (err) {
        fs.writeFileSync('test-e2e-err.json', JSON.stringify(err, null, 2));
        console.error("Failed");
    }
}
testActions();
