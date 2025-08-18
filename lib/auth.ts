import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

const JWT_SECRET = process.env.JWT_SECRET!;

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signToken(userId: string) {
  return jwt.sign({ uid: userId }, JWT_SECRET, { expiresIn: '30d' });
}

export function verifyToken(token: string) {
  try { 
    return jwt.verify(token, JWT_SECRET) as { uid: string }; 
  } catch { 
    return null; 
  }
}

/** Get user from Authorization: Bearer <jwt> */
export async function getUser(req: Request) {
  const hdr = req.headers.get('authorization') || '';
  const token = hdr.split(' ')[1];
  if (!token) return null;
  
  const payload = verifyToken(token);
  if (!payload) return null;
  
  return prisma.user.findUnique({ where: { id: payload.uid } });
}
