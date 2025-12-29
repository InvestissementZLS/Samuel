import type { Metadata } from "next";
import { Sidebar } from "@/components/Sidebar";
import { CommandMenu } from "@/components/command-menu";
import { DivisionProvider } from "@/components/providers/division-provider";
import { MobileNav } from "@/components/MobileNav";

export const metadata: Metadata = {
    title: "Field Service Admin",
    description: "Admin dashboard for field service management",
};

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <DivisionProvider>
            <div className="flex h-screen overflow-hidden bg-gray-100 flex-col md:flex-row">
                <Sidebar />
                <MobileNav />
                <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
                    <CommandMenu />
                    {children}
                </main>
            </div>
        </DivisionProvider>
    );
}
