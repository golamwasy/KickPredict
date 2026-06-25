'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LeaderboardAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    } else {
      setIsAuthorized(true);
    }
  }, [router]);

  if (!isAuthorized) {
    return <div style={{ textAlign: 'center', padding: '4rem', color: '#ccc' }}>Checking authorization...</div>;
  }

  return <>{children}</>;
}
