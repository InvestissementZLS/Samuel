import { format } from "date-fns";
import ts from "typescript";

function serialize(data: any): any {
    if (data === null || data === undefined) return data;
    if (data instanceof Date) return data;
    if (Array.isArray(data)) return data.map(serialize);
    if (typeof data === 'object') {
        const result: any = {};
        for (const key in data) result[key] = serialize(data[key]);
        return result;
    }
    return data;
}

const mockInvoice = { createdAt: new Date("2025-04-30T04:00:00.000Z") };
const serialized = serialize(mockInvoice);

// Simulate JSON stringify which happens crossing RSC -> Client component
const stringified = JSON.stringify(serialized);
const parsed = JSON.parse(stringified);

console.log("Original:", mockInvoice.createdAt);
console.log("Stringified parsed:", parsed.createdAt);

try {
    const formatted = format(new Date(parsed.createdAt), 'dd MMM yyyy');
    console.log("Formatted in UI:", formatted);
} catch (e: any) {
    console.log("Format error:", e.message);
}
