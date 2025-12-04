"use client";

import * as React from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import {
    Calculator,
    Calendar,
    CreditCard,
    Settings,
    Smile,
    User,
    Search,
    Truck,
    Package,
    BarChart,
    Plus
} from "lucide-react";

import { DialogTitle } from "@radix-ui/react-dialog";

export function CommandMenu() {
    const [open, setOpen] = React.useState(false);
    const router = useRouter();

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    const runCommand = React.useCallback((command: () => unknown) => {
        setOpen(false);
        command();
    }, []);

    return (
        <Command.Dialog
            open={open}
            onOpenChange={setOpen}
            label="Global Command Menu"
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-[640px] w-full bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-[100]"
        >
            <DialogTitle className="sr-only">Global Command Menu</DialogTitle>
            <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                <Command.Input
                    placeholder="Type a command or search..."
                    className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
                />
            </div>
            <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2">
                <Command.Empty className="py-6 text-center text-sm">No results found.</Command.Empty>

                <Command.Group heading="Suggestions" className="text-xs font-medium text-gray-500 px-2 py-1.5">
                    <Command.Item
                        onSelect={() => runCommand(() => router.push("/calendar"))}
                        className="flex items-center px-2 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 cursor-pointer aria-selected:bg-gray-100"
                    >
                        <Calendar className="mr-2 h-4 w-4" />
                        <span>Calendar</span>
                    </Command.Item>
                    <Command.Item
                        onSelect={() => runCommand(() => router.push("/jobs"))}
                        className="flex items-center px-2 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 cursor-pointer aria-selected:bg-gray-100"
                    >
                        <Truck className="mr-2 h-4 w-4" />
                        <span>Search Jobs</span>
                    </Command.Item>
                    <Command.Item
                        onSelect={() => runCommand(() => router.push("/clients"))}
                        className="flex items-center px-2 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 cursor-pointer aria-selected:bg-gray-100"
                    >
                        <Smile className="mr-2 h-4 w-4" />
                        <span>Search Clients</span>
                    </Command.Item>
                </Command.Group>

                <Command.Separator className="h-px bg-gray-200 my-1" />

                <Command.Group heading="Quick Actions" className="text-xs font-medium text-gray-500 px-2 py-1.5">
                    <Command.Item
                        onSelect={() => runCommand(() => router.push("/jobs/new"))}
                        className="flex items-center px-2 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 cursor-pointer aria-selected:bg-gray-100"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        <span>Create New Job</span>
                    </Command.Item>
                    <Command.Item
                        onSelect={() => runCommand(() => router.push("/clients/new"))} // Assuming this route exists or will exist
                        className="flex items-center px-2 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 cursor-pointer aria-selected:bg-gray-100"
                    >
                        <User className="mr-2 h-4 w-4" />
                        <span>Add New Client</span>
                    </Command.Item>
                </Command.Group>

                <Command.Separator className="h-px bg-gray-200 my-1" />

                <Command.Group heading="Settings" className="text-xs font-medium text-gray-500 px-2 py-1.5">
                    <Command.Item
                        onSelect={() => runCommand(() => router.push("/settings"))}
                        className="flex items-center px-2 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 cursor-pointer aria-selected:bg-gray-100"
                    >
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                    </Command.Item>
                </Command.Group>
            </Command.List>
        </Command.Dialog>
    );
}
