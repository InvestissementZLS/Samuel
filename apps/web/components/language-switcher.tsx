"use client";

import { useLanguage } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";

export function LanguageSwitcher() {
    const { language, setLanguage } = useLanguage();

    return (
        <div className="flex gap-1 bg-gray-800 p-1 rounded-md">
            <Button
                variant={language === 'en' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setLanguage('en')}
                className="text-xs h-7 px-2"
            >
                EN
            </Button>
            <Button
                variant={language === 'fr' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setLanguage('fr')}
                className="text-xs h-7 px-2"
            >
                FR
            </Button>
        </div>
    );
}
