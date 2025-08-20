import { getServerSession } from 'next-auth';
import { authOptions } from '../pages/api/auth/[...nextauth]'; // Make sure this path is correct
import { prisma } from './prisma';

export async function getUser(req: any, res?: any) {
  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session?.user?.email) {
      return null;
    }

    const user = await prisma.user.upsert({
      where: { email: session.user.email },
      create: {
        email: session.user.email,
        name: session.user.name || session.user.email,
        avatar: session.user.image,
        passwordHash: 'nextauth-user'
      },
      update: {
        name: session.user.name || session.user.email,
        avatar: session.user.image,
      }
    });

    return user;
  } catch (error) {
    console.error('getUser error:', error);
    return null;
  }
}
