import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateAuth } from "@/lib/auth";
import { uploadToSupabase, buildJobPhotoPath } from "@/lib/supabase-storage";

import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  const currentUser = await validateAuth(req);
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const formData = await req.formData();
    
    const amount = formData.get("amount")?.toString();
    const category = formData.get("category")?.toString();
    const description = formData.get("description")?.toString() || "Dépense";
    const userId = formData.get("userId")?.toString() || null;
    const dateStr = formData.get("date")?.toString();
    const receiptFile = formData.get("receipt") as File | null;

    if (!amount || !category) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    let receiptUrl = null;

    if (receiptFile && receiptFile.size > 0) {
      const buffer = Buffer.from(await receiptFile.arrayBuffer());
      const ext = path.extname(receiptFile.name) || '.jpg';
      const filename = `expense-${userId || 'unknown'}-${Date.now()}${ext}`;
      const storagePath = `receipts/${filename}`;
      
      const uploadResult = await uploadToSupabase(
        'expenses-receipts', // use or create a bucket named 'expenses-receipts' in Supabase
        storagePath,
        buffer,
        receiptFile.type || 'image/jpeg'
      );

      if (uploadResult.success && uploadResult.url) {
        receiptUrl = uploadResult.url;
      } else {
        console.error("Failed to upload receipt to Supabase.");
        return NextResponse.json({ success: false, error: "Failed to upload receipt image" }, { status: 500 });
      }
    }

    const expense = await prisma.expense.create({
      data: {
        amount: parseFloat(amount),
        category,
        description,
        userId,
        date: dateStr ? new Date(dateStr) : new Date(),
        receiptUrl,
        status: "PENDING"
      }
    });

    return NextResponse.json({ success: true, expense });
  } catch (error) {
    console.error("Error creating expense:", error);
    return NextResponse.json({ success: false, error: "Failed to create expense" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const expenses = await prisma.expense.findMany({
      include: {
        user: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });
    return NextResponse.json({ success: true, expenses });
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch expenses" }, { status: 500 });
  }
}
