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
    const errorText = await res.text();
    throw new Error(errorText);
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
