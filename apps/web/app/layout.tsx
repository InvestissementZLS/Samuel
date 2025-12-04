import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Sidebar } from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"] });



export const metadata: Metadata = {
    title: "Field Service Admin",
    description: "Admin dashboard for field service management",
};

import { Toaster } from "sonner";

import { CommandMenu } from "@/components/command-menu";

import { DivisionProvider } from "@/components/providers/division-provider";

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <DivisionProvider>
                    <div className="flex h-screen overflow-hidden bg-gray-100">
                        <Sidebar />
                        <main className="flex-1 overflow-y-auto p-8 relative">
                            <CommandMenu />
                            {children}
                        </main>
                    </div>
                </DivisionProvider>
                <Toaster />
            </body>
        </html>
    );
}
