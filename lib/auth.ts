import { getServerSession } from 'next-auth';
import type { Session } from 'next-auth';
import { authOptions } from '../pages/api/auth/[...nextauth]';
import { prisma } from './prisma';

/**
 * The signed-in member, or null. Read-only: accounts are created when someone
 * signs in (see the signIn callback in [...nextauth]), so a deleted account
 * isn't silently re-created by a session that is still valid.
 */
export async function getUser(req: any, res?: any) {
  try {
    const session = (await getServerSession(req, res, authOptions)) as Session | null;
    if (!session?.user?.email) return null;
    return await prisma.user.findUnique({ where: { email: session.user.email } });
  } catch (error) {
    console.error('getUser error:', error);
    return null;
  }
}
