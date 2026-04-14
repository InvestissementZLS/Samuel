/**
 * JWT Authentication Library — Praxis ZLS
 *
 * Uses `jose` (Edge Runtime compatible, no Node.js crypto dependency).
 * Tokens are signed with HS256 and contain: { sub: userId, role, email, iat, exp }
 *
 * Used by:
 *  - /api/auth/login  → signs a token and returns it in the response body
 *  - /lib/auth.ts     → verifies the token on every authenticated request
 *  - Mobile app       → stores the token in AsyncStorage, sends as Bearer header
 */

import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

// Secret key — must be set in environment variables
// Generate a strong secret: openssl rand -base64 32
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = '7d'; // 7 days — matches the web cookie maxAge

if (!JWT_SECRET) {
    console.warn('[JWT] WARNING: JWT_SECRET is not set in environment variables. Using fallback (NOT SAFE FOR PRODUCTION).');
}

// Encode secret as Uint8Array for jose
const getSecret = (): Uint8Array => {
    const secret = JWT_SECRET || 'zls-fallback-dev-secret-change-in-production-!!';
    return new TextEncoder().encode(secret);
};

export interface JWTUser {
    sub: string;       // userId
    email: string;
    role: string;
    name?: string;
    divisions?: string[];
}

/**
 * Signs a new JWT for a user after successful login.
 * @returns Signed JWT string (compact serialization)
 */
export async function signJWT(payload: JWTUser): Promise<string> {
    return await new SignJWT({
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
        name: payload.name ?? '',
        divisions: payload.divisions ?? [],
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(JWT_EXPIRY)
        .sign(getSecret());
}

/**
 * Verifies a JWT and returns the decoded payload.
 * Returns null if the token is invalid, expired, or tampered.
 */
export async function verifyJWT(token: string): Promise<(JWTPayload & JWTUser) | null> {
    try {
        const { payload } = await jwtVerify(token, getSecret(), {
            algorithms: ['HS256'],
        });
        return payload as JWTPayload & JWTUser;
    } catch (error) {
        // Token expired, invalid signature, or malformed
        return null;
    }
}
