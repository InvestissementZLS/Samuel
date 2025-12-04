'use client';

import { useState } from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, Calendar, Settings, Truck, Package, BarChart, FileText, DollarSign, ChevronLeft, ChevronRight, Search } from 'lucide-react';

const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Calendar', href: '/calendar', icon: Calendar },
    { name: 'Jobs', href: '/jobs', icon: Truck },
    { name: 'Quotes', href: '/quotes', icon: FileText },
    { name: 'Invoices', href: '/invoices', icon: DollarSign },
    { name: 'Clients', href: '/clients', icon: Users },
    { name: 'Technicians', href: '/technicians', icon: Users },
    { name: 'Products', href: '/products', icon: Package },
    { name: 'Commissions', href: '/commissions', icon: DollarSign },
    { name: 'Reports', href: '/reports', icon: BarChart },
    { name: 'Settings', href: '/settings', icon: Settings },
];

import { DivisionSwitcher } from './division-switcher';
import { GlobalSearch } from './global-search';

export function Sidebar() {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <div className={`flex h-full flex-col bg-gray-900 text-white z-50 transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`}>
            <div className={`flex flex-col h-auto items-center justify-center border-b border-gray-800 p-4 gap-4 relative ${isCollapsed ? 'pt-12' : ''}`}>
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute top-2 right-2 p-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md"
                >
                    {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                </button>

                {!isCollapsed ? (
                    <>
                        <img src="/logo.png" alt="ZLS Logo" className="h-16 w-auto object-contain" />
                        <DivisionSwitcher />
                    </>
                ) : (
                    <div className="h-8" /> // Spacer
                )}
            </div>
            <nav className="flex-1 space-y-1 px-2 py-4">
                <GlobalSearch trigger={
                    <button
                        className={`group flex w-full items-center rounded-md px-2 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white ${isCollapsed ? 'justify-center' : ''}`}
                        title={isCollapsed ? "Search" : undefined}
                    >
                        <Search
                            className={`${isCollapsed ? 'mr-0' : 'mr-3'} h-6 w-6 flex-shrink-0 text-gray-400 group-hover:text-gray-300`}
                            aria-hidden="true"
                        />
                        {!isCollapsed && "Search"}
                    </button>
                } />
                {navigation.map((item) => {
                    const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`group flex items-center rounded-md px-2 py-2 text-sm font-medium ${isActive
                                ? 'bg-gray-800 text-white'
                                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                                } ${isCollapsed ? 'justify-center' : ''}`}
                            title={isCollapsed ? item.name : undefined}
                        >
                            <item.icon
                                className={`${isCollapsed ? 'mr-0' : 'mr-3'} h-6 w-6 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'
                                    }`}
                                aria-hidden="true"
                            />
                            {!isCollapsed && item.name}
                        </Link>
                    );
                })}
            </nav>
            <div className="border-t border-gray-800 p-4">
                {!isCollapsed ? (
                    <div className="flex items-center">
                        <div className="ml-3">
                            <p className="text-sm font-medium text-white">Admin User</p>
                            <p className="text-xs font-medium text-gray-400">View Profile</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex justify-center">
                        <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold">AU</div>
                    </div>
                )}
            </div>
        </div>
    );
}
