import "./globals.css";
import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "PraxisZLS",
    description: "PraxisZLS Field Service Application",
};

import { cookies } from "next/headers";
import { LanguageProvider } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});


export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const cookieStore = cookies();
    const cookieLang = cookieStore.get("NEXT_LOCALE")?.value;
    const initialLanguage = (cookieLang === "fr" || cookieLang === "en") ? cookieLang : "en";
    return (
        <html lang="fr" className={cn("font-sans", geist.variable)}>
            <body className={inter.className}>
                <LanguageProvider initialLanguage={initialLanguage as any}>
                    {children}
                    <Toaster />
                </LanguageProvider>
            </body>
        </html>
    );
}
