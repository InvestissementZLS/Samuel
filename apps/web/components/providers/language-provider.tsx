"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { dictionary, Dictionary, Locale } from "@/lib/i18n/dictionary";
import Cookies from "js-cookie";

interface LanguageContextType {
    language: Locale;
    setLanguage: (lang: Locale) => void;
    t: Dictionary;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({
    children,
    initialLanguage = "en",
}: {
    children: React.ReactNode;
    initialLanguage?: Locale;
}) {
    const [language, setLanguageState] = useState<Locale>(initialLanguage);

    const setLanguage = (lang: Locale) => {
        setLanguageState(lang);
        Cookies.set("NEXT_LOCALE", lang, { expires: 365 });
        // Optional: Trigger a router refresh if server components need to know immediate changes
        // but for client-side text replacement, state is enough. 
        // For mixed usage, a reload is safer.
        window.location.reload();
    };

    const t = dictionary[language] || dictionary.en;

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error("useLanguage must be used within a LanguageProvider");
    }
    return context;
}
