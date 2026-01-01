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
        console.error(error);
    }, [error]);

    return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center p-4">
            <h2 className="text-2xl font-bold mb-4 text-red-600">Something went wrong!</h2>
            <div className="bg-gray-100 p-4 rounded-md mb-4 max-w-lg overflow-auto">
                <p className="font-mono text-sm text-red-800">{error.message}</p>
                {error.digest && <p className="font-mono text-xs text-gray-500 mt-2">Digest: {error.digest}</p>}
            </div>
            <button
                className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                onClick={() => reset()}
            >
                Try again
            </button>
        </div>
    );
}
