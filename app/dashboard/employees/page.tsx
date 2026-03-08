'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

type Employee = {
    id: string;
    display_name: string;
    pay_rate_cents: number;
    active: boolean;
};

export default function EmployeesPage() {
    const supabase = createClient();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [newName, setNewName] = useState('');
    const [newPayRate, setNewPayRate] = useState('');

    useEffect(() => {
        fetchEmployees();
    }, []);

    async function fetchEmployees() {
        setLoading(true);
        const { data, error } = await supabase
            .from('employees')
            .select('*')
            .order('display_name');

        if (error) {
            console.error('Error fetching employees:', error);
        } else {
            setEmployees(data || []);
        }
        setLoading(false);
    }

    async function addEmployee(e: React.FormEvent) {
        e.preventDefault();
        const payRateCents = Math.round(parseFloat(newPayRate) * 100);

        const { data, error } = await supabase
            .from('employees')
            .insert([
                { display_name: newName, pay_rate_cents: isNaN(payRateCents) ? 0 : payRateCents }
            ])
            .select();

        if (error) {
            console.error('Error adding employee:', error);
            alert('Failed to add employee');
        } else if (data) {
            setEmployees([...employees, data[0]].sort((a, b) => a.display_name.localeCompare(b.display_name)));
            setNewName('');
            setNewPayRate('');
        }
    }

    async function toggleActive(id: string, currentStatus: boolean) {
        const { error } = await supabase
            .from('employees')
            .update({ active: !currentStatus })
            .eq('id', id);

        if (error) {
            console.error('Error updating status:', error);
            alert('Failed to update status');
        } else {
            setEmployees(employees.map(emp =>
                emp.id === id ? { ...emp, active: !currentStatus } : emp
            ));
        }
    }

    return (
        <div className="page">
            <Link href="/dashboard" className="link small" style={{ marginBottom: '1rem', display: 'inline-block' }}>
                &larr; Back to Dashboard
            </Link>

            <h1>Crew Management</h1>

            <div className="callout" style={{ marginBottom: '2rem' }}>
                <h3>Add New Crew Member</h3>
                <form onSubmit={addEmployee} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Name</label>
                        <input
                            type="text"
                            required
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '1rem' }}
                            placeholder="e.g. John Doe"
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Hourly Rate ($)</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            value={newPayRate}
                            onChange={(e) => setNewPayRate(e.target.value)}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '1rem' }}
                            placeholder="e.g. 25.00"
                        />
                    </div>
                    <button type="submit" className="cta" style={{ marginTop: '0.5rem' }}>
                        Add Crew Member
                    </button>
                </form>
            </div>

            <h2>Current Crew</h2>
            {loading ? (
                <p>Loading crew...</p>
            ) : employees.length === 0 ? (
                <p>No crew members found.</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {employees.map(emp => (
                        <div key={emp.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: emp.active ? 1 : 0.6 }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{emp.display_name}</h3>
                                <p style={{ margin: '0.25rem 0 0 0', color: 'var(--muted)' }}>
                                    ${(emp.pay_rate_cents / 100).toFixed(2)} / hr
                                </p>
                                <span className="badge" style={{ marginTop: '0.5rem', display: 'inline-block', background: emp.active ? '#dcfce7' : '#f3f4f6', color: emp.active ? '#166534' : '#374151', border: 'none' }}>
                                    {emp.active ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            <button
                                onClick={() => toggleActive(emp.id, emp.active)}
                                className={`cta ${emp.active ? 'secondary' : ''}`}
                                style={{ padding: '0.5rem 1rem' }}
                            >
                                {emp.active ? 'Deactivate' : 'Activate'}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
