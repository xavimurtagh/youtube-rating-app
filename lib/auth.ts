import { getServerSession } from 'next-auth';
import type { Session } from 'next-auth';
import { authOptions } from '../pages/api/auth/[...nextauth]';
import { prisma } from './prisma';

/**
 * The signed-in member, or null. Read-only: accounts are created when someone
 * signs in (see the signIn callback in [...nextauth]), so a deleted account
 * isn't silently re-created by a session that is still valid.
 *
 * The session names our own account id, which was tied to Google's permanent
 * account id at sign-in, so a session is never matched to an account by its
 * email address alone.
 */
export async function getUser(req: any, res?: any) {
  try {
    const session = (await getServerSession(req, res, authOptions as any)) as Session | null;
    const id = (session?.user as { id?: string } | undefined)?.id;
    if (!id) return null;
    return await prisma.user.findUnique({ where: { id } });
  } catch (error) {
    console.error('getUser error:', error);
    return null;
  }
}
