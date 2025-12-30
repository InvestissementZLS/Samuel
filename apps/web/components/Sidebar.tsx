'use client';

import { useState } from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, Calendar, Settings, Truck, Package, BarChart, FileText, DollarSign, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { DivisionSwitcher } from './division-switcher';
import { GlobalSearch } from './global-search';
import { useLanguage } from '@/components/providers/language-provider';
import { LanguageSwitcher } from '@/components/language-switcher';

export function Sidebar() {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const { t } = useLanguage();

    const navigation = [
        { name: t.sidebar.dashboard, href: '/', icon: Home },
        { name: t.sidebar.calendar, href: '/calendar', icon: Calendar },
        { name: t.sidebar.jobs, href: '/jobs', icon: Truck },
        { name: t.sidebar.quotes, href: '/quotes', icon: FileText },
        { name: t.sidebar.invoices, href: '/invoices', icon: DollarSign },
        { name: t.sidebar.clients, href: '/clients', icon: Users },
        { name: t.sidebar.technicians, href: '/technicians', icon: Users },
        { name: t.sidebar.products, href: '/products', icon: Package },
        { name: t.sidebar.commissions, href: '/commissions', icon: DollarSign },
        { name: t.sidebar.reports, href: '/reports', icon: BarChart },
        { name: t.sidebar.timesheets, href: '/timesheets', icon: Calendar },
        { name: t.sidebar.settings, href: '/settings', icon: Settings },
    ];

    return (
        <div className={`hidden md:flex h-full flex-col bg-gray-900 text-white z-50 transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`}>
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
                        title={isCollapsed ? t.common.search : undefined}
                    >
                        <Search
                            className={`${isCollapsed ? 'mr-0' : 'mr-3'} h-6 w-6 flex-shrink-0 text-gray-400 group-hover:text-gray-300`}
                            aria-hidden="true"
                        />
                        {!isCollapsed && t.common.search}
                    </button>
                } />
                {navigation.map((item) => {
                    const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`group flex items-center rounded-md px-2 py-2 text-sm font-medium ${isActive
                                ? 'bg-gray-800 text-white'
                                : 'text-gray-100 hover:bg-gray-700 hover:text-white'
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
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-white">{t.common.adminUser}</p>
                            <p className="text-xs font-medium text-gray-400">{t.common.viewProfile}</p>
                        </div>
                        <LanguageSwitcher />
                    </div>
                ) : (
                    <div className="flex flex-col gap-2 items-center">
                        <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold">AU</div>
                        <LanguageSwitcher />
                    </div>
                )}
            </div>
        </div>
    );
}
