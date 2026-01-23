import type { Metadata } from "next";
import { Sidebar } from "@/components/Sidebar";
import { CommandMenu } from "@/components/command-menu";
import { DivisionProvider } from "@/components/providers/division-provider";
import { UserProvider } from "@/components/providers/user-provider";
import { MobileNav } from "@/components/MobileNav";
import { getUserProfile } from "@/app/actions/user-actions";

export const metadata: Metadata = {
    title: "Field Service Admin",
    description: "Admin dashboard for field service management",
};


export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // const cookieStore = cookies();
    // const cookieLang = cookieStore.get("NEXT_LOCALE")?.value;
    // const initialLanguage = (cookieLang === "fr" || cookieLang === "en") ? cookieLang : "en";

    const user = await getUserProfile();

    return (
        <UserProvider initialUser={user}>
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
        </UserProvider>
    );
}
