import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from 'uuid';
import { revalidatePath } from "next/cache";

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const formData = await request.formData();
        const file = formData.get("photo") as File | null;
        const caption = formData.get("caption") as string || "";

        if (!file) {
            return NextResponse.json(
                { error: "No file uploaded" },
                { status: 400 }
            );
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const filename = `${uuidv4()} -${file.name.replace(/[^a-zA-Z0-9.-]/g, "")} `;

        // Ensure uploads directory exists
        const uploadDir = path.join(process.cwd(), "public/uploads/photos");
        await mkdir(uploadDir, { recursive: true });

        const filepath = path.join(uploadDir, filename);
        await writeFile(filepath, buffer);

        const url = `/ uploads / photos / ${filename} `;

        // Create DB record
        // @ts-ignore
        const photo = await prisma.jobPhoto.create({
            data: {
                jobId: params.id,
                url,
                caption
            }
        });

        revalidatePath(`/ jobs / ${params.id} `); /* Trigger UI update */

        return NextResponse.json({ success: true, photo });

    } catch (error) {
        console.error("Error uploading photo:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // @ts-ignore
        const photos = await prisma.jobPhoto.findMany({
            where: { jobId: params.id },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(photos);
    } catch (error) {
        return NextResponse.json(
            { error: "Failed to fetch photos" },
            { status: 500 }
        );
    }
}
