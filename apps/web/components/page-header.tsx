"use client";
import { useLanguage } from "@/components/providers/language-provider";

type PageKey = "reports" | "commissions" | "jobs";

interface PageHeaderProps {
    pageKey: PageKey;
    subtitleKey?: string;
}

export function PageHeader({ pageKey, subtitleKey }: PageHeaderProps) {
    const { t } = useLanguage();
    const section = (t as any)[pageKey];
    if (!section) return null;
    return (
        <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">{section.title}</h1>
            {subtitleKey && section[subtitleKey] && (
                <p className="text-gray-500 mt-1">{section[subtitleKey]}</p>
            )}
        </div>
    );
}
