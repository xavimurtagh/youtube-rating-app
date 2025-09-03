import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../lib/prisma'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Delete activities older than 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const deleteResult = await prisma.activity.deleteMany({
      where: {
        createdAt: {
          lt: sevenDaysAgo
        }
      }
    });

    console.log(`Cleaned up ${deleteResult.count} old activities`);

    // Optional: Also cleanup old anonymous sessions or other data
    // Add more cleanup operations here as needed

    return res.status(200).json({ 
      success: true, 
      deletedCount: deleteResult.count,
      cleanupDate: sevenDaysAgo.toISOString()
    });

  } catch (error) {
    console.error('Activity cleanup error:', error);
    return res.status(500).json({ 
      error: 'Failed to cleanup activities', 
      details: error.message 
    });
  }
}
