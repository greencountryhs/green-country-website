import Link from 'next/link';

export default function DashboardPage() {
    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-12">
            <div className="max-w-md mx-auto">
                <header className="mb-12">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Contractor Dashboard</h1>
                    <p className="text-gray-600">Green Country Home Services</p>
                </header>

                <nav className="grid gap-6">
                    <Link
                        href="/dashboard/employees"
                        className="flex items-center justify-center p-8 bg-white rounded-2xl shadow-sm border-2 border-transparent hover:border-black transition-all group"
                    >
                        <div className="text-center">
                            <span className="block text-4xl mb-3 group-hover:scale-110 transition-transform">👥</span>
                            <span className="text-xl font-bold">Employees</span>
                        </div>
                    </Link>

                    <Link
                        href="/dashboard/time"
                        className="flex items-center justify-center p-8 bg-white rounded-2xl shadow-sm border-2 border-transparent hover:border-black transition-all group"
                    >
                        <div className="text-center">
                            <span className="block text-4xl mb-3 group-hover:scale-110 transition-transform">⏱️</span>
                            <span className="text-xl font-bold">Time Tracking</span>
                        </div>
                    </Link>
                </nav>

                <div className="mt-12 pt-8 border-t border-gray-200">
                    <Link href="/" className="text-sm text-gray-500 hover:text-black">
                        ← Back to Marketing Site
                    </Link>
                </div>
            </div>
        </div>
    );
}
