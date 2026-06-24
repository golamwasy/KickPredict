'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { API_BASE_URL } from '../utils/api';

const BET_TYPE_LABELS: Record<string, string> = {
  MATCH_WINNER: '🏆 Match Winner',
  EXACT_SCORE: '🎯 Exact Score',
  OVER_UNDER_GOALS: '📊 Over / Under',
  BOTH_TEAMS_TO_SCORE: '⚽ Both Teams Score',
  CORRECT_MARGIN: '📏 Goal Margin',
  FIRST_TO_SCORE: '⚡ First to Score',
  DOUBLE_CHANCE: '🛡️ Double Chance',
};

const BET_STATUS_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  PENDING: { color: '#E67E22', bg: 'rgba(230,126,34,0.15)', label: '⏳ Pending' },
  WON: { color: '#27AE60', bg: 'rgba(39,174,96,0.15)', label: '🏆 Won' },
  LOST: { color: '#E74C3C', bg: 'rgba(231,76,60,0.15)', label: '❌ Lost' },
  VOID: { color: '#95A5A6', bg: 'rgba(149,165,166,0.15)', label: '↩️ Refunded' },
};

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [bets, setBets] = useState<any[]>([]);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    setUser(JSON.parse(localStorage.getItem('user') || '{}'));

    Promise.all([
      fetch(`${API_BASE_URL}/api/bets/me`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API_BASE_URL}/api/wallet/me`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([betsData, walletData]) => {
      if (Array.isArray(betsData)) setBets(betsData);
      if (walletData?.balance !== undefined) setWalletBalance(walletData.balance);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [router]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ width: '48px', height: '48px', border: '3px solid var(--border)', borderTop: '3px solid var(--teal)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
      <p style={{ color: '#FFFFFF' }}>Loading your stats...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const validBets = bets.filter(b => b.status !== 'VOID');
  const totalBets = validBets.length;
  const wonBets = validBets.filter(b => b.status === 'WON');
  const lostBets = validBets.filter(b => b.status === 'LOST');
  const pendingBets = validBets.filter(b => b.status === 'PENDING');
  const totalWon = wonBets.reduce((acc, b) => acc + b.potentialPayout, 0);
  const totalStaked = validBets.reduce((acc, b) => acc + b.stake, 0);
  const settledBets = wonBets.length + lostBets.length;
  const accuracy = settledBets > 0 ? Math.round((wonBets.length / settledBets) * 100) : 0;

  const sorted = [...bets].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const stats = [
    { label: 'Total Won', value: totalWon.toLocaleString() + ' KC', accent: 'stat-accent-purple', color: 'var(--fifa-purple)' },
    { label: 'Total Bets', value: totalBets, accent: 'stat-accent-green', color: 'var(--fifa-green)' },
    { label: 'Win Rate', value: accuracy + '%', accent: 'stat-accent-gold', color: 'var(--fifa-orange)' },
  ];

  return (
    <div className="container">
      <div style={{ marginBottom: '2.5rem', animation: 'floatIn 0.6s ease both' }}>
        <p style={{ color: '#FFFFFF', fontSize: '0.8rem', fontFamily: 'Outfit, sans-serif', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.5rem', textShadow: '0 2px 8px #000000, 0 0 4px #000000' }}>Your Dashboard</p>
        <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)' }}>
          Welcome back, <span style={{ color: 'var(--fifa-lime)', textShadow: '0 0 20px rgba(178,255,0,0.3)' }}>{user?.fullName}</span>
        </h1>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {stats.map((stat, i) => (
          <div key={stat.label} className={`card ${stat.accent}`} style={{ textAlign: 'center', animation: `floatIn 0.5s ease ${0.1 + i * 0.05}s both` }}>
            <p style={{ color: stat.accent === 'stat-accent-purple' ? '#FFFFFF' : '#000000', fontSize: '0.78rem', fontFamily: 'Outfit, sans-serif', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>{stat.label}</p>
            <div style={{ fontSize: '2.2rem', fontWeight: 900, fontFamily: 'Outfit, sans-serif', color: stat.accent === 'stat-accent-purple' ? '#FFFFFF' : stat.color, lineHeight: 1 }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Quick summary row */}
      {totalBets > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '2.5rem' }}>
          {[
            { label: 'Pending', v: pendingBets.length, color: '#E67E22' },
            { label: 'Won', v: wonBets.length, color: '#27AE60' },
            { label: 'Lost', v: lostBets.length, color: '#E74C3C' },
            { label: 'Total Staked', v: totalStaked.toLocaleString() + ' KC', color: 'var(--fifa-black)' },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: '1rem', textAlign: 'center', marginBottom: 0, boxShadow: '4px 4px 0px var(--fifa-black)', border: '2px solid var(--fifa-black)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 900, color: '#555555', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>{s.label}</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: s.color }}>{s.v}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', animation: 'floatIn 0.5s ease 0.25s both' }}>Bet History</h2>
      </div>

      {bets.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', animation: 'floatIn 0.5s ease 0.3s both' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚽</div>
          <p style={{ color: '#555555', marginBottom: '1.5rem' }}>You haven't placed any bets yet.</p>
          <Link href="/matches" className="btn-primary" style={{ width: 'auto', display: 'inline-flex', padding: '0.75rem 2rem' }}>Browse Matches</Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {sorted.map((bet, i) => {
            const s = BET_STATUS_STYLE[bet.status] || BET_STATUS_STYLE.PENDING;
            return (
              <Link key={bet.id} href={`/matches/${bet.matchId}`} style={{ textDecoration: 'none' }}>
                <div className="card" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', animation: `floatIn 0.5s ease ${0.3 + i * 0.04}s both`, cursor: 'pointer', transition: 'border-color 0.2s', padding: '1rem 1.25rem', marginBottom: 0 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--fifa-orange)', marginBottom: '0.2rem', letterSpacing: '0.05em' }}>
                      {new Date(bet.match?.kickoffTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '0.3rem', color: 'var(--fifa-black)' }}>
                      {bet.match?.team1?.name} <span style={{ color: '#888888' }}>vs</span> {bet.match?.team2?.name}
                    </div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#555555' }}>
                      {BET_TYPE_LABELS[bet.betType] || bet.betType}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span style={{ padding: '0.25rem 0.7rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700, background: s.bg, color: s.color, border: `1px solid ${s.color}` }}>
                      {s.label}
                    </span>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#555555', marginTop: '0.4rem' }}>
                      {bet.stake.toLocaleString()} KC @ {bet.multiplier}×
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: bet.status === 'WON' ? '#27AE60' : bet.status === 'LOST' ? '#E74C3C' : '#888888', marginTop: '0.15rem' }}>
                      → {bet.potentialPayout.toLocaleString()} KC
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
      <style>{`@keyframes floatIn { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
}
