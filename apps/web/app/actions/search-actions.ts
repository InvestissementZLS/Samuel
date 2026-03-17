"use server";

import { prisma } from "@/lib/prisma";

import { cookies } from "next/headers";
import { Division } from "@prisma/client";

export type SearchResult = {
    id: string;
    type: "CLIENT" | "INVOICE" | "JOB" | "PROPERTY";
    title: string;
    subtitle?: string;
    division?: string;
    url: string;
};

export async function searchGlobal(query: string): Promise<SearchResult[]> {
    if (!query || query.length < 2) return [];

    const lowerQuery = query.toLowerCase();

    const cookieStore = await cookies();
    const divisionVal = cookieStore.get('division')?.value || 'EXTERMINATION';
    const division = divisionVal as Division;

    // Parallelize queries for better performance
    const [clients, invoices, jobs, properties] = await Promise.all([
        // Search Clients
        prisma.client.findMany({
            where: {
                divisions: { has: division },
                OR: [
                    { name: { contains: lowerQuery, mode: "insensitive" } },
                    { email: { contains: lowerQuery, mode: "insensitive" } },
                    { phone: { contains: lowerQuery, mode: "insensitive" } },
                ],
            },
            take: 5,
        }),
        // Search Invoices
        prisma.invoice.findMany({
            where: {
                division,
                number: { contains: lowerQuery, mode: "insensitive" },
            },
            include: { client: true },
            take: 5,
        }),
        // Search Jobs
        prisma.job.findMany({
            where: {
                division,
                description: { contains: lowerQuery, mode: "insensitive" },
            },
            include: { property: true },
            take: 5,
        }),
        // Search Properties
        prisma.property.findMany({
            where: {
                client: { divisions: { has: division } },
                address: { contains: lowerQuery, mode: "insensitive" },
            },
            include: { client: true },
            take: 5,
        }),
    ]);

    const results: SearchResult[] = [];

    // Map Clients
    clients.forEach((client) => {
        results.push({
            id: client.id,
            type: "CLIENT",
            title: client.name,
            subtitle: client.phone || client.email || undefined,
            division: client.divisions[0] || undefined,
            url: `/clients/${client.id}`,
        });
    });

    // Map Invoices
    invoices.forEach((invoice) => {
        results.push({
            id: invoice.id,
            type: "INVOICE",
            title: invoice.number || "Draft Invoice",
            subtitle: invoice.client.name,
            division: invoice.division,
            url: `/invoices?id=${invoice.id}`,
        });
    });

    // Map Jobs
    jobs.forEach((job) => {
        results.push({
            id: job.id,
            type: "JOB",
            title: job.description || "Untitled Job",
            subtitle: job.property.address,
            division: job.division,
            url: `/jobs/${job.id}`,
        });
    });

    // Map Properties
    properties.forEach((property) => {
        results.push({
            id: property.id,
            type: "PROPERTY",
            title: property.address,
            subtitle: property.client.name,
            division: undefined,
            url: `/clients/${property.clientId}`,
        });
    });

    return results;
}
