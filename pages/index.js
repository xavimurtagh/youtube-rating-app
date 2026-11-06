import { useSession } from 'next-auth/react';
import Landing from '../components/Landing';
import Today from '../components/Today';
import { Loading } from '../components/Layout';

export default function Home() {
  const { status } = useSession();
  if (status === 'loading') return <Loading />;
  return status === 'authenticated' ? <Today /> : <Landing />;
}
