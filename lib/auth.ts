import { getServerSession } from 'next-auth';
import { authOptions } from '../pages/api/auth/[...nextauth]'; // Adjust path as needed
import { prisma } from './prisma';

export async function getUser(req: any, res?: any) {
  // Use NextAuth session instead of JWT
  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user?.email) {
    return null;
  }

  // Find or create user based on NextAuth session
  const user = await prisma.user.upsert({
    where: { email: session.user.email },
    create: {
      email: session.user.email,
      name: session.user.name || session.user.email,
      avatar: session.user.image,
      passwordHash: 'nextauth-user' // Placeholder since no password needed
    },
    update: {
      name: session.user.name || session.user.email,
      avatar: session.user.image,
    }
  });

  return user;
}
