'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface Employee {
    id: string;
    display_name: string;
    pay_rate_cents: number;
    active: boolean;
}

export default function EmployeesPage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [newName, setNewName] = useState('');
    const [newPay, setNewPay] = useState('');

    useEffect(() => {
        fetchEmployees();
    }, []);

    async function fetchEmployees() {
        setLoading(true);
        const { data, error } = await supabase
            .from('employees')
            .select('*')
            .order('display_name', { ascending: true });

        if (data) setEmployees(data);
        setLoading(false);
    }

    async function addEmployee(e: React.FormEvent) {
        e.preventDefault();
        if (!newName || !newPay) return;

        const { error } = await supabase
            .from('employees')
            .insert([{
                display_name: newName,
                pay_rate_cents: Math.round(parseFloat(newPay) * 100),
                active: true
            }]);

        if (!error) {
            setNewName('');
            setNewPay('');
            fetchEmployees();
        }
    }

    async function toggleActive(id: string, currentStatus: boolean) {
        const { error } = await supabase
            .from('employees')
            .update({ active: !currentStatus })
            .eq('id', id);

        if (!error) fetchEmployees();
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-12">
            <div className="max-w-2xl mx-auto">
                <header className="flex items-center justify-between mb-8">
                    <div>
                        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-black mb-2 block">
                            ← Dashboard
                        </Link>
                        <h1 className="text-3xl font-bold text-gray-900">Employees</h1>
                    </div>
                </header>

                {/* Add Employee Form */}
                <form onSubmit={addEmployee} className="bg-white p-6 rounded-2xl shadow-sm mb-12 border border-gray-100">
                    <h2 className="text-lg font-bold mb-4">Add New Employee</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <input
                            type="text"
                            placeholder="Full Name"
                            className="p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            required
                        />
                        <input
                            type="number"
                            step="0.01"
                            placeholder="Pay Rate (e.g. 25.00)"
                            className="p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none"
                            value={newPay}
                            onChange={(e) => setNewPay(e.target.value)}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-black text-white p-4 rounded-xl font-bold hover:bg-gray-800 transition-colors"
                    >
                        Add Employee
                    </button>
                </form>

                {/* Employee List */}
                <div className="space-y-4">
                    <h2 className="text-lg font-bold mb-4">Current Staff</h2>
                    {loading ? (
                        <p className="text-gray-500">Loading employees...</p>
                    ) : employees.length === 0 ? (
                        <p className="text-gray-500 italic">No employees found.</p>
                    ) : (
                        employees.map((emp) => (
                            <div
                                key={emp.id}
                                className={`flex items-center justify-between p-6 bg-white rounded-2xl border ${emp.active ? 'border-gray-100' : 'border-gray-100 opacity-60'}`}
                            >
                                <div>
                                    <h3 className="font-bold text-lg">{emp.display_name}</h3>
                                    <p className="text-sm text-gray-500">${(emp.pay_rate_cents / 100).toFixed(2)} / hr</p>
                                </div>
                                <button
                                    onClick={() => toggleActive(emp.id, emp.active)}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${emp.active
                                            ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                            : 'bg-green-50 text-green-600 hover:bg-green-100'
                                        }`}
                                >
                                    {emp.active ? 'Deactivate' : 'Activate'}
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
