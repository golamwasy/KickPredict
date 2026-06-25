'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

import { API_BASE_URL } from '../utils/api';

export default function BetPrompt({ leaderboard }: { leaderboard: any[] }) {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        const inLeaderboard = leaderboard.some(u => u.username === user.username);
        
        if (!inLeaderboard) {
          // Check actual bets to avoid issues with cached leaderboard data
          fetch(`${API_BASE_URL}/api/bets/me`, {
            headers: { Authorization: `Bearer ${token}` }
          })
            .then(res => res.json())
            .then(bets => {
              // Only show prompt if they actually have 0 valid bets
              if (Array.isArray(bets)) {
                const validBets = bets.filter(b => b.status !== 'VOID');
                if (validBets.length === 0) setShowPrompt(true);
              }
            })
            .catch(() => setShowPrompt(true));
        }
      } catch (e) {}
    }
  }, [leaderboard]);

  if (!showPrompt) return null;

  return (
    <div className="card" style={{ textAlign: 'center', marginBottom: '2rem', borderColor: 'var(--fifa-lime)', animation: 'floatIn 0.5s ease both' }}>
      <h2 style={{ fontSize: '1.2rem', color: 'var(--fifa-lime)', marginBottom: '0.5rem' }}>Want to see your name here?</h2>
      <p style={{ color: '#ccc', marginBottom: '1rem' }}>Place your first bet to get added to the global leaderboard!</p>
      <Link href="/matches" className="btn-primary" style={{ display: 'inline-block' }}>Place a Bet</Link>
    </div>
  );
}
