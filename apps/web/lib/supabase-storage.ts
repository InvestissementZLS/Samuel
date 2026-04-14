/**
 * Supabase Storage Helper — Praxis ZLS
 *
 * Uploads files to Supabase Storage using the REST API directly (no SDK needed).
 * Uses the service_role key for server-side uploads (bypasses RLS).
 *
 * Buckets:
 *   - "odometer-photos"  → punch-in odometer photos (private)
 *   - "job-photos"       → job site photos (private)
 *
 * Setup required in Supabase Dashboard:
 *   1. Storage → New Bucket → "odometer-photos" (Private)
 *   2. Storage → New Bucket → "job-photos" (Private)  [likely already exists]
 *   3. Add SUPABASE_URL and SUPABASE_SERVICE_KEY to .env
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export interface UploadResult {
    success: boolean;
    url?: string;       // Public or signed URL
    storagePath?: string; // e.g. "odometer-photos/2026/04/14/user-xxx-timestamp.jpg"
    error?: string;
}

/**
 * Uploads a file Buffer to Supabase Storage.
 * Returns the storage path and a signed URL valid for 10 years (effectively permanent).
 */
export async function uploadToSupabase(
    bucket: string,
    fileName: string,
    fileBuffer: Buffer,
    contentType: string = 'image/jpeg'
): Promise<UploadResult> {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        console.error('[Supabase Storage] SUPABASE_URL or SUPABASE_SERVICE_KEY not set');
        return { success: false, error: 'Storage not configured' };
    }

    const storagePath = fileName; // e.g. "2026/04/14/userId-timestamp.jpg"
    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${bucket}/${storagePath}`;

    try {
        // Upload file via Supabase REST API
        const uploadResponse = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': contentType,
                'x-upsert': 'true', // Overwrite if same name (idempotent)
            },
            body: fileBuffer as any,
        });

        if (!uploadResponse.ok) {
            const err = await uploadResponse.text();
            console.error(`[Supabase Storage] Upload failed: ${uploadResponse.status}`, err);
            return { success: false, error: `Upload failed: ${uploadResponse.status}` };
        }

        // Generate a signed URL (10 year expiry = 315,360,000 seconds)
        const signedUrlResponse = await fetch(
            `${SUPABASE_URL}/storage/v1/object/sign/${bucket}/${storagePath}`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ expiresIn: 315360000 }),
            }
        );

        if (!signedUrlResponse.ok) {
            // Upload succeeded but can't get URL — return path for later retrieval
            return { success: true, storagePath, url: uploadUrl };
        }

        const { signedURL } = await signedUrlResponse.json();
        const fullUrl = `${SUPABASE_URL}/storage/v1${signedURL}`;

        return { success: true, storagePath, url: fullUrl };
    } catch (error) {
        console.error('[Supabase Storage] Upload error:', error);
        return { success: false, error: String(error) };
    }
}

/**
 * Generates a structured file path for odometer photos.
 * Format: YYYY/MM/DD/userId-timestamp.jpg
 */
export function buildOdometerPhotoPath(userId: string): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const timestamp = now.getTime();
    return `${year}/${month}/${day}/${userId}-${timestamp}.jpg`;
}

/**
 * Generates a structured file path for job site photos.
 */
export function buildJobPhotoPath(jobId: string, userId: string): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const timestamp = now.getTime();
    return `${year}/${month}/${day}/${jobId}-${userId}-${timestamp}.jpg`;
}
