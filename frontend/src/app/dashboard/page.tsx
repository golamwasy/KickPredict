'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { API_BASE_URL } from '../utils/api';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    setUser(JSON.parse(localStorage.getItem('user') || '{}'));
    fetch(`${API_BASE_URL}/api/predictions/me`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setPredictions(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [router]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ width: '48px', height: '48px', border: '3px solid var(--border)', borderTop: '3px solid var(--teal)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
      <p style={{ color: '#FFFFFF' }}>Loading your stats...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const totalPoints = predictions.reduce((acc, p) => acc + (p.points?.totalPoints || 0), 0);
  const finished = predictions.filter(p => p.match.status === 'FINISHED');
  const sorted = [...predictions].sort((a, b) => {
    return new Date(b.match.kickoffTime).getTime() - new Date(a.match.kickoffTime).getTime();
  });

  const stats = [
    { label: 'Total Points', value: totalPoints, accent: 'stat-accent-purple', color: 'var(--fifa-purple)' },
    { label: 'Predictions', value: predictions.length, accent: 'stat-accent-green', color: 'var(--fifa-green)' },
    { label: 'Finished', value: finished.length, accent: 'stat-accent-gold', color: 'var(--fifa-orange)' },
  ];

  return (
    <div className="container">
      <div style={{ marginBottom: '2.5rem', animation: 'floatIn 0.6s ease both' }}>
        <p style={{ color: '#FFFFFF', fontSize: '0.8rem', fontFamily: 'Outfit, sans-serif', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.5rem', textShadow: '0 2px 8px #000000, 0 0 4px #000000' }}>Your Dashboard</p>
        <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)' }}>
          Welcome back, <span style={{ color: 'var(--fifa-lime)', textShadow: '0 0 20px rgba(178,255,0,0.3)' }}>{user?.fullName}</span>
        </h1>
      </div>

      <div className="stats-grid">
        {stats.map((stat, i) => (
          <div key={stat.label} className={`card ${stat.accent}`} style={{ textAlign: 'center', animation: `floatIn 0.5s ease ${0.1 + i * 0.05}s both` }}>
            <p style={{ color: '#000000', fontSize: '0.78rem', fontFamily: 'Outfit, sans-serif', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>{stat.label}</p>
            <div style={{ fontSize: '3rem', fontWeight: 900, fontFamily: 'Outfit, sans-serif', color: stat.color, lineHeight: 1 }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', animation: 'floatIn 0.5s ease 0.25s both' }}>Prediction History</h2>

      {predictions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', animation: 'floatIn 0.5s ease 0.3s both' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚽</div>
          <p style={{ color: '#555555', marginBottom: '1.5rem' }}>You have not made any predictions yet.</p>
          <Link href="/matches" className="btn-primary" style={{ width: 'auto', display: 'inline-flex', padding: '0.75rem 2rem' }}>Browse Matches</Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {sorted.map((pred, i) => (
            <div key={pred.id} className="card" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', animation: `floatIn 0.5s ease ${0.3 + i * 0.05}s both` }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--fifa-orange)', marginBottom: '0.25rem', letterSpacing: '0.05em', fontFamily: 'Outfit, sans-serif' }}>
                  {new Date(pred.match.kickoffTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                </div>
                <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.05rem', marginBottom: '0.4rem' }}>
                  {pred.match.team1?.name} <span style={{ color: '#555555' }}>vs</span> {pred.match.team2?.name}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#555555' }}>
                  {pred.skipped ? (
                    <>Your Prediction: <strong style={{ color: '#888888' }}>Opted Out</strong></>
                  ) : (
                    <>
                      Your Prediction: <strong style={{ color: 'var(--fifa-purple)' }}>
                        {pred.team1Goals !== null && pred.team2Goals !== null ? `${pred.team1Goals} - ${pred.team2Goals} ` : ''}
                      </strong>
                      {' '}({pred.result === 'TEAM1' ? `${pred.match.team1?.name} Win` : pred.result === 'TEAM2' ? `${pred.match.team2?.name} Win` : 'Draw'})
                    </>
                  )}
                </div>
                {pred.match.status === 'FINISHED' && (
                  <div style={{ fontSize: '0.85rem', color: '#555555', marginTop: '0.25rem' }}>
                    Actual: <strong style={{ color: 'var(--fifa-black)' }}>{pred.match.team1Goals} - {pred.match.team2Goals}</strong>
                    {' '}({pred.match.team1Goals > pred.match.team2Goals ? `${pred.match.team1?.name} Win` : pred.match.team1Goals < pred.match.team2Goals ? `${pred.match.team2?.name} Win` : 'Draw'})
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {pred.skipped ? (
                  <span style={{
                    fontFamily: 'Outfit, sans-serif',
                    fontWeight: 900,
                    fontSize: '0.85rem',
                    color: '#888888',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Opted Out
                  </span>
                ) : (
                  <>
                    {pred.match.status === 'OPEN' && (
                      <Link
                        href={`/matches/${pred.match.id}`}
                        className="badge badge-open"
                        style={{
                          display: 'inline-flex',
                          textDecoration: 'none',
                          textAlign: 'center'
                        }}
                      >
                        OPEN
                      </Link>
                    )}
                    {(pred.match.status === 'LIVE' || pred.match.status === 'LOCKED') && (
                      <span style={{
                        fontFamily: 'Outfit, sans-serif',
                        fontWeight: 900,
                        fontSize: '0.85rem',
                        color: 'var(--fifa-orange)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                  }}>
                        In Progress
                      </span>
                    )}
                    {pred.match.status === 'FINISHED' && (
                      <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 900, fontSize: '1.1rem', color: 'var(--fifa-green)' }}>+{pred.points?.totalPoints || 0} pts</div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <style>{`@keyframes floatIn { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
}
