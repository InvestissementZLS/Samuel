"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function logCapture(data: {
  clientId: string;
  animalType: string;
  jobId?: string;
  assetId?: string;
  notes?: string;
}) {
  const log = await prisma.captureLog.create({
    data: {
      clientId: data.clientId,
      animalType: data.animalType,
      jobId: data.jobId,
      assetId: data.assetId,
      notes: data.notes,
      isBilled: false
    }
  });

  revalidatePath(`/clients/${data.clientId}`);
  return log;
}

export async function getUnbilledCaptures(clientId: string) {
  return prisma.captureLog.findMany({
    where: {
      clientId,
      isBilled: false
    },
    orderBy: { caughtAt: "asc" }
  });
}

export async function markCapturesAsBilled(captureIds: string[]) {
  if (captureIds.length === 0) return;
  
  await prisma.captureLog.updateMany({
    where: { id: { in: captureIds } },
    data: { isBilled: true }
  });
}

export async function deleteCaptureLog(id: string, clientId: string) {
  await prisma.captureLog.delete({ where: { id } });
  revalidatePath(`/clients/${clientId}`);
}
