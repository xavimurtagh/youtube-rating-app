import { prisma } from '../../lib/prisma'

export default async function handler(req, res) {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'healthy' });
  } catch (error) {
    console.error('Database health check failed:', error);
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
}
