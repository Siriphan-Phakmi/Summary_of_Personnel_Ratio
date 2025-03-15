'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
    const pathname = usePathname();

    const isActive = (path) => pathname === path;

    return (
        <nav className="bg-blue-500 shadow-md">
            <div className="max-w-7xl mx-auto px-4 py-3">
                <div className="flex justify-between items-center">
                    <Link href="/" className={isActive('/') ? "text-xl font-bold text-white" : "text-gray-600 hover:text-white"}>
                        บันทึกข้อมูล
                    </Link>
                    <div className="space-x-4">
                        <Link href="/dashboard" className={isActive('/dashboard') ? "text-gray-600 hover:text-white" : "text-gray-600 hover:text-white"}>
                            Dashboard
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    );
}
