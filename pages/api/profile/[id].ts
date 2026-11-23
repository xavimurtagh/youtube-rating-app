// pages/api/profile/[id].ts

import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { getUser } from '../../../lib/auth';

/**
 * A member's profile, as their privacy settings allow. Follower and following
 * lists are never sent, only counts (so private members who follow someone
 * aren't listed by id), plus whether the viewer follows them.
 */
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

  if (typeof id !== 'string' || !id || id.length > 64) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  try {
    const me = await getUser(req, res);
    if (!me) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // "me" resolves to the signed-in user, so the client can link to its own
    // profile without knowing its id.
    const targetId = id === 'me' ? me.id : id;

    const user = await prisma.user.findUnique({
      where: { id: targetId },
      select: {
        id: true,
        name: true,
        avatar: true,
        bio: true,
        publicProfile: true,
        showActivity: true,
        favourites: {
          select: { id: true, title: true, channel: true, thumbnail: true },
          take: 12,
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
        _count: { select: { followers: true, following: true } },
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMe = me.id === user.id;
    const isFollowing = isMe
      ? false
      : !!(await prisma.follow.findUnique({
          where: { followerId_followeeId: { followerId: me.id, followeeId: user.id } },
          select: { id: true },
        }));

    // Respect the profile owner's visibility preference. Owners can always see
    // their own profile.
    if (!isMe && !user.publicProfile) {
      return res.status(200).json({
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        bio: user.bio,
        isPrivate: true,
        viewerId: me.id,
        isFollowing,
        favourites: [],
        ratings: [],
        followerCount: null,
        followingCount: null,
        bothSaved: [],
      });
    }

    // Videos you've both saved, when they share their activity.
    const bothSaved =
      !isMe && user.showActivity
        ? (
            await prisma.savedVideo.findMany({
              where: { userId: user.id, video: { available: true, saved: { some: { userId: me.id } } } },
              select: { video: { select: { id: true, title: true, channel: true } } },
              orderBy: { savedAt: 'desc' },
              take: 12,
            })
          ).map((s) => s.video)
        : [];

    return res.status(200).json({
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      bio: user.bio,
      publicProfile: user.publicProfile,
      viewerId: me.id,
      isFollowing,
      favourites: user.favourites,
      // Flatten the video relation onto each rating so the client can read
      // `videoTitle` / `videoChannel` directly.
      ratings: user.ratings.map((r) => ({
        id: r.id,
        videoId: r.videoId,
        score: r.score,
        videoTitle: r.video?.title || null,
        videoChannel: r.video?.channel || null,
      })),
      followerCount: user._count.followers,
      followingCount: user._count.following,
      bothSaved,
    });
  } catch (error) {
    console.error('Profile error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
