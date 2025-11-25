//src/lib/auth/utils.ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '@/lib/supabase/client';

/**
 * Return a JWT secret string.
 * - Prefer `process.env.JWT_SECRET`
 * - Fall back to `process.env.NEXT_PUBLIC_JWT_SECRET` if present
 * - In production, throw a helpful error if no secret is configured
 * - In development, fall back to a non-secret sentinel so code can run locally
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET ?? process.env.NEXT_PUBLIC_JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Missing JWT secret: set the JWT_SECRET environment variable');
    }
    // Development fallback to avoid runtime crashes during local dev/tests.
    // WARNING: This must not be used in production.
    // eslint-disable-next-line no-console
    console.warn('JWT_SECRET not set; using insecure development fallback. Set JWT_SECRET for production.');
    return 'dev-jwt-secret';
  }
  return secret;
}


// `supabase` is imported from `src/lib/supabase/client` and lazily initializes
// when first used. This avoids build-time errors when environment variables
// are not set during Next.js static analysis.

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function generateToken(
  user: { id: string; role: string; email: string },
  extras?: { roleId?: string; permissions?: Record<string, Record<string, boolean>> }
) {
  const payload: any = {
    id: user.id,
    role: user.role,
    email: user.email,
    userId: user.id,
  };
  if (extras?.roleId) payload.roleId = extras.roleId;
  if (extras?.permissions) payload.permissions = extras.permissions;
  const secret = getJwtSecret();
  // Tokens are long-lived for interactive sessions; use 7 days.
  return jwt.sign(payload, secret, { expiresIn: '7d' });
}


export function verifyToken(token: string) {
  try {
    const secret = getJwtSecret();
    const decodedRaw = jwt.verify(token, secret) as any;
    // Normalize so callers can use either `id` or `userId`
    const decoded = {
      id: decodedRaw.id ?? decodedRaw.userId ?? decodedRaw.sub,
      userId: decodedRaw.userId ?? decodedRaw.id ?? decodedRaw.sub,
      role: decodedRaw.role,
      email: decodedRaw.email,
      roleId: decodedRaw.roleId,
      permissions: decodedRaw.permissions,
      iat: decodedRaw.iat,
      exp: decodedRaw.exp,
    };
    return decoded as {
      id: string;
      userId: string;
      role: string;
      email: string;
      roleId?: string;
      permissions?: Record<string, Record<string, boolean>>;
      iat: number;
      exp: number;
    };
  } catch (error) {
    return null;
  }
}

export async function hashPassword(password: string) {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  return hashedPassword;
}
