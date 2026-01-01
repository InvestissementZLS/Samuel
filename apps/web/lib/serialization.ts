export function serialize<T>(data: T): T {
    if (data === null || data === undefined) {
        return data;
    }

    if (typeof data === 'object' && typeof (data as any).toNumber === 'function') {
        return (data as any).toNumber();
    }

    // Handle Date if needed, though Next.js usually handles Date. 
    // But to be consistent with "JSON" safe:
    if (data instanceof Date) {
        // Keep it as Date if Client Component props support it (they do in Next 14).
        // But unexpected things happens. 
        // Let's stick to handling "toNumber" for Decimals.
        return data;
    }

    if (Array.isArray(data)) {
        return data.map(item => serialize(item)) as unknown as T;
    }

    if (typeof data === 'object') {
        const result: any = {};
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                result[key] = serialize((data as any)[key]);
            }
        }
        return result;
    }

    return data;
}
