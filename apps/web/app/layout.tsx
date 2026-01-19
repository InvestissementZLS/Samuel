import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "ZLS App",
    description: "ZLS Field Service Application",
};

import { cookies } from "next/headers";
import { LanguageProvider } from "@/components/providers/language-provider";

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const cookieStore = cookies();
    const cookieLang = cookieStore.get("NEXT_LOCALE")?.value;
    const initialLanguage = (cookieLang === "fr" || cookieLang === "en") ? cookieLang : "en";
    return (
        <html lang="fr">
            <body className={inter.className}>
                <LanguageProvider initialLanguage={initialLanguage as any}>
                    {children}
                    <Toaster />
                </LanguageProvider>
            </body>
        </html>
    );
}
