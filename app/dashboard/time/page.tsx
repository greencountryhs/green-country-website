'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface Employee {
    id: string;
    display_name: string;
    active: boolean;
}

interface TimeEntry {
    id: string;
    employee_id: string;
    clock_in: string;
    clock_out: string | null;
}

export default function TimeTrackingPage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [activeEntries, setActiveEntries] = useState<Record<string, TimeEntry>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        setLoading(true);

        // Fetch active employees
        const { data: empData } = await supabase
            .from('employees')
            .select('*')
            .eq('active', true)
            .order('display_name', { ascending: true });

        // Fetch open time entries
        const { data: timeData } = await supabase
            .from('time_entries')
            .select('*')
            .is('clock_out', null);

        if (empData) setEmployees(empData);

        if (timeData) {
            const entryMap: Record<string, TimeEntry> = {};
            timeData.forEach(entry => {
                entryMap[entry.employee_id] = entry;
            });
            setActiveEntries(entryMap);
        }

        setLoading(false);
    }

    async function clockIn(employeeId: string) {
        if (activeEntries[employeeId]) return;

        const { error } = await supabase
            .from('time_entries')
            .insert([{
                employee_id: employeeId,
                clock_in: new Date().toISOString()
            }]);

        if (!error) fetchData();
    }

    async function clockOut(employeeId: string) {
        const entry = activeEntries[employeeId];
        if (!entry) return;

        const { error } = await supabase
            .from('time_entries')
            .update({ clock_out: new Date().toISOString() })
            .eq('id', entry.id);

        if (!error) fetchData();
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-12">
            <div className="max-w-2xl mx-auto">
                <header className="mb-8">
                    <Link href="/dashboard" className="text-sm text-gray-500 hover:text-black mb-2 block">
                        ← Dashboard
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900">Time Tracking</h1>
                </header>

                <div className="space-y-4">
                    {loading ? (
                        <p className="text-gray-500">Loading staff...</p>
                    ) : employees.length === 0 ? (
                        <p className="text-gray-500 italic">No active employees found. Add some in the Employees tab.</p>
                    ) : (
                        employees.map((emp) => {
                            const isOpen = !!activeEntries[emp.id];
                            return (
                                <div key={emp.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                        <div>
                                            <h3 className="font-bold text-xl mb-1">{emp.display_name}</h3>
                                            <div className="flex items-center gap-2">
                                                <span className={`w-3 h-3 rounded-full ${isOpen ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                                                <span className="text-sm font-medium text-gray-600">
                                                    {isOpen ? 'Working' : 'Not clocked in'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex gap-3">
                                            {!isOpen ? (
                                                <button
                                                    onClick={() => clockIn(emp.id)}
                                                    className="flex-1 md:flex-none px-8 py-4 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-all active:scale-95"
                                                >
                                                    Clock In
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => clockOut(emp.id)}
                                                    className="flex-1 md:flex-none px-8 py-4 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-all active:scale-95"
                                                >
                                                    Clock Out
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
