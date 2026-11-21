// pages/api/profile/[id].ts

import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { getUser } from '../../../lib/auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Normalize id to string
  const rawId = req.query.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  if (typeof id !== 'string' || !id) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  try {
    // Ensure the requester is authenticated (optional)
    const me = await getUser(req, res);
    if (!me) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // "me" resolves to the signed-in user, so the client can link to its own
    // profile without knowing its id.
    const targetId = id === 'me' ? me.id : id;

    // Fetch user profile
    const user = await prisma.user.findUnique({
      where: { id: targetId },
      select: {
        id: true,
        name: true,
        avatar: true,
        bio: true,
        publicProfile: true,
        favourites: {
          select: {
            id: true,
            title: true,
            channel: true,
            thumbnail: true
          }
        },
        ratings: {
          select: {
            id: true,
            videoId: true,
            score: true,
            video: { select: { title: true, channel: true } }
          },
          orderBy: { ratedAt: 'desc' },
          take: 500
        },
        followers: {
          select: {
            followerId: true
          }
        },
        following: {
          select: {
            followeeId: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Respect the profile owner's visibility preference. Owners can always see
    // their own profile.
    if (me.id !== user.id && !user.publicProfile) {
      return res.status(200).json({
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        bio: user.bio,
        isPrivate: true,
        viewerId: me.id,
        favourites: [],
        ratings: [],
        // Only the viewer's own follow, so the button works; no lists of ids.
        followers: user.followers.filter((f) => f.followerId === me.id),
        following: [],
      });
    }

    // Flatten the video relation onto each rating so the client can read
    // `videoTitle` / `videoChannel` directly.
    const profile = {
      ...user,
      viewerId: me.id,
      ratings: user.ratings.map(r => ({
        id: r.id,
        videoId: r.videoId,
        score: r.score,
        videoTitle: r.video?.title || null,
        videoChannel: r.video?.channel || null
      }))
    };

    // Return profile data
    return res.status(200).json(profile);
  } catch (error) {
    console.error('Profile error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
