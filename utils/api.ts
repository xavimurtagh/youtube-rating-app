export async function api<T = any>(path: string, opts: RequestInit = {}) {
  const res = await fetch(`/api/${path}`, {
    credentials: 'include',
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {})
    }
  });

  if (!res.ok) {
    // Surface the server's human-readable message, not a raw JSON string.
    const text = await res.text();
    let message = text;
    try {
      const body = JSON.parse(text);
      message = body.error || body.message || text;
    } catch {
      // Not JSON; use the text as-is.
    }
    throw new Error(message || `Request failed (${res.status})`);
  }

  return res.json() as Promise<T>;
}

export const socialAPI = {
  searchUsers: (query: string) =>
    api(`users/search?q=${encodeURIComponent(query)}`),

  getFollowing: () => api('following'),

  getFollowers: () => api('followers'),

  followUser: (userId: string) =>
    api(`follow/${userId}`, { method: 'POST' }),

  unfollowUser: (userId: string) =>
    api(`follow/${userId}`, { method: 'DELETE' }),

  getFeed: () => api('feed'),

  removeRating: (videoId: string) =>
    api('rate', { method: 'DELETE', body: JSON.stringify({ videoId }) }),

  getProfile: (userId: string) => api(`profile/${userId}`),

  addFavorite: (video: any) =>
    api('favorites', {
      method: 'POST',
      body: JSON.stringify({
        videoId: video.id,
        videoTitle: video.title,
        videoChannel: video.channel,
        videoThumbnail: video.thumbnail
      })
    }),

  removeFavorite: (videoId: string) =>
    api('favorites', { method: 'DELETE', body: JSON.stringify({ videoId }) }),

  rateVideo: (video: any, score: number) =>
    api('rate', { method: 'POST', body: JSON.stringify({ video, score }) })
};
