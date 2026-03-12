"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function setDivisionCookie(division: string) {
    cookies().set('division', division, {
        path: '/',
        maxAge: 31536000,
        sameSite: 'lax',
    });
    
    // We want to force next.js to re-fetch all data on the new division
    revalidatePath('/', 'layout');
}
