import { getSession } from 'next-auth/react';
export async function api<T = any>(path: string, opts: RequestInit = {}) {
  const session = await getSession();
  
  const res = await fetch(`/api/${path}`, {
    ...opts,
    headers: { 
      'Content-Type': 'application/json', 
      ...(session?.user?.email ? { 'X-User-Email': session.user.email } : {}),
      ...(opts.headers || {}) 
    }
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText);
  }
  
  return res.json() as Promise<T>;
}


// Social API
export const socialAPI = {
  searchUsers: (query: string) =>
    api(`users/search?q=${encodeURIComponent(query)}`),
  
  getFollowing: () => api('following'),
  
  followUser: (userId: string) =>
    api(`follow/${userId}`, { method: 'POST' }),
  
  unfollowUser: (userId: string) =>
    api(`follow/${userId}`, { method: 'DELETE' }),
  
  getFeed: () => api('feed'),
  
  getProfile: (userId: string) => api(`profile/${userId}`),
  
  rateVideo: (video: any, score: number) =>
    api('rate', { method: 'POST', body: JSON.stringify({ video, score }) }),
};

