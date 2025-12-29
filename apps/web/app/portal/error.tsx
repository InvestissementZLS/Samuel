'use client';

import { useEffect } from 'react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Portal Error:', error);
    }, [error]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="bg-white p-8 rounded-lg shadow-lg max-w-lg w-full text-center">
                <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong!</h2>
                <div className="bg-red-50 p-4 rounded text-left text-sm text-red-800 mb-6 overflow-auto max-h-40">
                    <p className="font-semibold mb-1">Error Details:</p>
                    <p>{error.message}</p>
                    {error.digest && <p className="mt-2 text-xs text-gray-500">Digest: {error.digest}</p>}
                </div>
                <button
                    onClick={() => reset()}
                    className="bg-slate-900 text-white px-4 py-2 rounded hover:bg-slate-800 transition-colors"
                >
                    Try again
                </button>
            </div>
        </div>
    );
}
