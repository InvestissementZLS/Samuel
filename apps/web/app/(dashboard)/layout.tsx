import type { Metadata } from "next";
import { Sidebar } from "@/components/Sidebar";
import { CommandMenu } from "@/components/command-menu";
import { DivisionProvider } from "@/components/providers/division-provider";
import { MobileNav } from "@/components/MobileNav";

export const metadata: Metadata = {
    title: "Field Service Admin",
    description: "Admin dashboard for field service management",
};

import { cookies } from "next/headers";
import { LanguageProvider } from "@/components/providers/language-provider";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const cookieStore = cookies();
    const initialLanguage = cookieStore.get("NEXT_LOCALE")?.value || "en";

    return (
        <LanguageProvider initialLanguage={initialLanguage as any}>
            <DivisionProvider>
                <div className="flex h-screen overflow-hidden bg-gray-100 flex-col md:flex-row">
                    {/* Sidebar Refresh Trigger */}
                    <Sidebar />
                    <MobileNav />
                    <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
                        <CommandMenu />
                        {children}
                    </main>
                </div>
            </DivisionProvider>
        </LanguageProvider>
    );
}
