'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Search, Home, Briefcase, Calendar, Users, FileText, Settings, CreditCard, LayoutDashboard, Box, Package, Clock, DollarSign } from 'lucide-react';
import { DivisionSwitcher } from './division-switcher';
import { GlobalSearch } from './global-search';
import { useLanguage } from '@/components/providers/language-provider';
import { useDivision } from '@/components/providers/division-provider';
import { LanguageSwitcher } from '@/components/language-switcher';

export function MobileNav() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const { t } = useLanguage();
    const { division } = useDivision();

    const logoSrc = division === 'RENOVATION' ? "/renovation-logo.png" : "/zls-logo.png";

    const navigation = [
        { name: t.sidebar.dashboard, href: '/', icon: Home },
        { name: t.sidebar.calendar, href: '/calendar', icon: Calendar },
        { name: t.sidebar.jobs, href: '/jobs', icon: Briefcase },
        { name: t.sidebar.clients, href: '/clients', icon: Users },
        { name: t.sidebar.invoices, href: '/invoices', icon: FileText },
        { name: t.sidebar.quotes, href: '/quotes', icon: FileText },
        { name: t.sidebar.products, href: '/products', icon: Package },
        { name: t.sidebar.inventory, href: '/inventory', icon: Box },
        { name: t.sidebar.expenses, href: '/expenses', icon: DollarSign },
        { name: t.sidebar.timesheets, href: '/timesheets', icon: Clock },
        { name: t.sidebar.settings, href: '/settings', icon: Settings },
    ];

    return (
        <div className="md:hidden bg-gray-900 text-white border-b border-gray-800">
            <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="p-2 text-gray-400 hover:text-white rounded-md"
                    >
                        <Menu size={24} />
                    </button>
                    <img src={logoSrc} alt="ZLS Logo" className="h-8 w-auto object-contain" />
                </div>
                <div className="flex items-center gap-2">
                    {/* Placeholder for search or other header items if needed */}
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            {isOpen && (
                <div className="fixed inset-0 z-50 bg-gray-900/95 backdrop-blur-sm">
                    <div className="flex flex-col h-full">
                        <div className="flex items-center justify-between p-4 border-b border-gray-800">
                            <img src={logoSrc} alt="ZLS Logo" className="h-8 w-auto object-contain" />
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 text-gray-400 hover:text-white rounded-md"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-4 border-b border-gray-800 flex justify-between items-center gap-4">
                            <div className="flex-1">
                                <DivisionSwitcher />
                            </div>
                            <LanguageSwitcher />
                        </div>

                        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
                            <div className="mb-4">
                                <GlobalSearch trigger={
                                    <button
                                        className="flex w-full items-center rounded-md px-2 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white border border-gray-700"
                                    >
                                        <Search className="mr-3 h-5 w-5 text-gray-400" />
                                        {t.common.search}
                                    </button>
                                } />
                            </div>

                            {navigation.map((item) => {
                                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setIsOpen(false)}
                                        className={`group flex items-center rounded-md px-2 py-3 text-base font-medium ${isActive
                                            ? 'bg-gray-800 text-white'
                                            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                                            }`}
                                    >
                                        <item.icon
                                            className={`mr-4 h-6 w-6 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'
                                                }`}
                                            aria-hidden="true"
                                        />
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </nav>

                        <div className="border-t border-gray-800 p-4">
                            <div className="flex items-center">
                                <div className="h-10 w-10 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold">AU</div>
                                <div className="ml-3">
                                    <p className="text-sm font-medium text-white">{t.common.adminUser}</p>
                                    <p className="text-xs font-medium text-gray-400">{t.common.viewProfile}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
