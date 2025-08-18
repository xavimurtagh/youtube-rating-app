import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { hashPassword, signToken } from '../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password, name } = req.body;
    
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    const user = await prisma.user.create({
      data: { 
        email, 
        name, 
        passwordHash: await hashPassword(password) 
      }
    });

    const token = signToken(user.id);
    
    res.status(201).json({ 
      token, 
      user: { id: user.id, name: user.name, email: user.email } 
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
