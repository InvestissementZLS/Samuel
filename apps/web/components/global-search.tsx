"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Loader2, FileText, Truck, Users, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import { searchGlobal, type SearchResult } from "@/app/actions/search-actions";
import { cn } from "@/lib/utils";

interface GlobalSearchProps {
    trigger?: React.ReactNode;
}

export function GlobalSearch({ trigger }: GlobalSearchProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    // Debounce search
    useEffect(() => {
        if (query.length < 2) {
            setResults([]);
            return;
        }

        const timer = setTimeout(() => {
            startTransition(async () => {
                const data = await searchGlobal(query);
                setResults(data);
            });
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    // Keyboard shortcut (Ctrl+K)
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };
        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);



    const getIcon = (type: SearchResult["type"]) => {
        switch (type) {
            case "CLIENT": return <Users className="mr-2 h-4 w-4" />;
            case "INVOICE": return <FileText className="mr-2 h-4 w-4" />;
            case "JOB": return <Truck className="mr-2 h-4 w-4" />;
            case "PROPERTY": return <MapPin className="mr-2 h-4 w-4" />;
            default: return <Search className="mr-2 h-4 w-4" />;
        }
    };

    return (
        <>
            {trigger ? (
                <div onClick={() => setOpen(true)} className="w-full">
                    {trigger}
                </div>
            ) : (
                <Button
                    variant="outline"
                    className="w-full justify-start text-muted-foreground bg-gray-800 border-gray-700 hover:bg-gray-700 hover:text-white"
                    onClick={() => setOpen(true)}
                >
                    <Search className="mr-2 h-4 w-4" />
                    <span>Search...</span>
                    <kbd className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                        <span className="text-xs">Ctrl K</span>
                    </kbd>
                </Button>
            )}

            <Modal
                isOpen={open}
                onClose={() => setOpen(false)}
                title="Global Search"
            >
                <Command shouldFilter={false} className="rounded-lg border shadow-md">
                    <CommandInput
                        placeholder="Type to search..."
                        value={query}
                        onValueChange={setQuery}
                    />
                    <CommandList>
                        <CommandEmpty className="py-6 text-center text-sm">
                            {isPending ? (
                                <div className="flex items-center justify-center">
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Searching...
                                </div>
                            ) : (
                                "No results found."
                            )}
                        </CommandEmpty>

                        {results.length > 0 && (
                            <CommandGroup heading="Results">
                                {results.map((result) => (
                                    <CommandItem
                                        key={`${result.type}-${result.id}`}
                                        value={`${result.title} ${result.subtitle || ""}`}
                                        onSelect={() => {
                                            router.push(result.url);
                                            setOpen(false);
                                        }}
                                        className="cursor-pointer p-0"
                                        asChild
                                    >
                                        <Link
                                            href={result.url}
                                            className="flex items-center w-full px-2 py-1.5 hover:bg-gray-700 hover:text-white aria-selected:bg-gray-700 aria-selected:text-white transition-colors rounded-sm"
                                            onClick={() => setOpen(false)}
                                        >
                                            {getIcon(result.type)}
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">{result.title}</span>
                                                    {result.division && (
                                                        <span className={cn(
                                                            "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                                                            result.division === "EXTERMINATION"
                                                                ? "bg-red-100 text-red-800"
                                                                : "bg-blue-100 text-blue-800"
                                                        )}>
                                                            {result.division === "EXTERMINATION" ? "EXO" : "ENT"}
                                                        </span>
                                                    )}
                                                </div>
                                                {result.subtitle && (
                                                    <span className="text-xs text-muted-foreground">
                                                        {result.subtitle}
                                                    </span>
                                                )}
                                            </div>
                                        </Link>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        )}
                    </CommandList>
                </Command>
            </Modal>
        </>
    );
}
