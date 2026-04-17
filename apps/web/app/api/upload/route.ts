import { NextRequest, NextResponse } from "next/server";
import { join } from "path";
import { writeFile, mkdir } from "fs/promises";
import { validateAuth } from "@/lib/auth";

export async function POST(request: NextRequest) {
    const currentUser = await validateAuth(request);
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
        return NextResponse.json({ success: false, message: 'No file uploaded' }, { status: 400 });
    }

    try {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Ensure unique filename
        const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '-')}`;

        // Import the Supabase helper
        const { uploadToSupabase } = await import('@/lib/supabase-storage');
        
        // Upload to the 'job-photos' Supabase bucket (which is configured for the project)
        const result = await uploadToSupabase(
            'job-photos', 
            `web-uploads/${filename}`, 
            buffer, 
            file.type || 'application/octet-stream'
        );

        if (!result.success || !result.url) {
            throw new Error(result.error || 'Failed to obtain Supabase URL');
        }

        return NextResponse.json({ success: true, url: result.url });
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json({ success: false, message: 'Upload failed' }, { status: 500 });
    }
}
