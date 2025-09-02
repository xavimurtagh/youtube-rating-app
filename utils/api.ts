export async function api<T = any>(path: string, opts: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('jwt') : null;
  
  const res = await fetch(`/api/${path}`, {
    ...opts,
    headers: { 
      'Content-Type': 'application/json', 
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}) 
    }
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText);
  }
  
  return res.json() as Promise<T>;
}

// Auth API
export const authAPI = {
  login: (email: string, password: string) => 
    api('auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  
  signup: (email: string, password: string, name: string) =>
    api('auth/signup', { method: 'POST', body: JSON.stringify({ email, password, name }) }),
};

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

  addFavorite: (video: any) => {
    console.log('socialAPI.addFavorite called with:', video)
    const payload = {
      videoId: video.id,
      title: video.title,
      channel: video.channel,
      thumbnail: video.thumbnail,
    }
    console.log('socialAPI.addFavorite payload:', payload)
    
    return api('favorites', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  
  removeFavorite: (videoId: string) =>
    api('favorites', { method: 'DELETE', body: JSON.stringify({ videoId }) }),
  
  rateVideo: (video: any, score: number) =>
    api('rate', { method: 'POST', body: JSON.stringify({ video, score }) })
};
