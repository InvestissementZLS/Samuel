"use client";

import { useState } from "react";
import Link from "next/link";
import { Client } from "@prisma/client";
import { ClientDialog } from "./client-dialog";

interface ClientHeaderProps {
    client: Client;
}

export function ClientHeader({ client }: ClientHeaderProps) {
    const [isEditOpen, setIsEditOpen] = useState(false);

    return (
        <div className="flex justify-between items-center mb-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">{client.name}</h1>
                <p className="text-sm text-gray-500">Client ID: {client.id}</p>
            </div>
            <div className="space-x-4 flex items-center">
                <Link
                    href={`/portal/${client.id}`}
                    target="_blank"
                    className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                >
                    View Portal
                </Link>
                <button
                    onClick={() => setIsEditOpen(true)}
                    className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50"
                >
                    Edit Client
                </button>
            </div>

            <ClientDialog
                isOpen={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                client={client}
            />
        </div>
    );
}
