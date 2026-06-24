'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '../utils/api';

const TYPE_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  SIGNUP_BONUS:  { label: 'Welcome Bonus',   color: '#6300E4', icon: '🎁' },
  BET_PLACED:    { label: 'Bet Placed',       color: '#E67E22', icon: '🎯' },
  BET_WON:       { label: 'Bet Won',          color: '#27AE60', icon: '🏆' },
  BET_LOST:      { label: 'Bet Lost',         color: '#E74C3C', icon: '❌' },
  BET_REFUNDED:  { label: 'Bet Refunded',     color: '#3498DB', icon: '↩️' },
  ADMIN_ADJUST:  { label: 'Admin Adjustment', color: '#95A5A6', icon: '⚙️' },
};

const BET_TYPE_LABELS: Record<string, string> = {
  MATCH_WINNER:        'Match Winner',
  EXACT_SCORE:         'Exact Score',
  OVER_UNDER_GOALS:    'Over/Under Goals',
  BOTH_TEAMS_TO_SCORE: 'Both Teams to Score',
  CORRECT_MARGIN:      'Correct Margin',
  FIRST_TO_SCORE:      'First to Score',
  DOUBLE_CHANCE:       'Double Chance',
};

export default function WalletPage() {
  const router = useRouter();
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }

    fetch(`${API_BASE_URL}/api/wallet/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setWallet(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load wallet');
        setLoading(false);
      });
  }, []);

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '4rem', color: 'white' }}>
      Loading wallet...
    </div>
  );
  if (error) return (
    <div style={{ textAlign: 'center', padding: '4rem', color: '#E74C3C' }}>
      {error}
    </div>
  );

  return (
    <div style={{ margin: '-3rem -1rem', padding: '3rem 1rem', minHeight: 'calc(100vh - 70px)' }}>
      <div className="container" style={{ maxWidth: '900px' }}>

        {/* Balance Hero */}
        <div style={{
          textAlign: 'center',
          marginBottom: '3rem',
          padding: '3rem 2rem',
          background: 'var(--fifa-purple)',
          border: '4px solid var(--fifa-black)',
          boxShadow: '8px 8px 0px var(--fifa-black)',
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem', filter: 'drop-shadow(4px 4px 0px #000)' }}>🪙</div>
          <div style={{ fontSize: '1rem', fontWeight: 900, color: '#FFFFFF', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.5rem', textShadow: '2px 2px 0px var(--fifa-black)' }}>
            Your KickCoin Balance
          </div>
          <div style={{ fontSize: '4.5rem', fontWeight: 900, color: 'var(--fifa-lime)', letterSpacing: '-0.02em', lineHeight: 1, textShadow: '3px 3px 0px var(--fifa-black)' }}>
            {wallet.balance.toLocaleString()}
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#FFFFFF', marginTop: '0.5rem', textShadow: '2px 2px 0px var(--fifa-black)' }}>
            KC
          </div>
        </div>

        {/* Transaction History */}
        <div className="card" style={{ padding: '2rem' }}>
          <h3 style={{ marginBottom: '2rem', borderBottom: '3px solid var(--fifa-black)', paddingBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 900, fontSize: '1.5rem', textTransform: 'uppercase' }}>
            <span style={{ fontSize: '1.8rem' }}>📋</span> Transaction History
          </h3>

          {wallet.transactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#555555', fontWeight: 700, fontSize: '1.2rem', border: '3px dashed var(--fifa-black)' }}>
              No transactions yet. Place your first bet!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {wallet.transactions.map((tx: any) => {
                const meta = TYPE_LABELS[tx.type] || { label: tx.type, color: 'var(--fifa-black)', icon: '•' };
                const isPositive = tx.amount > 0;
                const match = tx.bet?.match;
                
                // Flat colors for specific transaction types
                let txColor = 'var(--fifa-black)';
                if (tx.amount > 0) txColor = '#27AE60';
                if (tx.amount < 0) txColor = 'var(--fifa-red)';
                if (tx.amount === 0) txColor = '#888888';

                return (
                  <div
                    key={tx.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '1.25rem',
                      background: '#F8F9FA',
                      border: '3px solid var(--fifa-black)',
                      boxShadow: '4px 4px 0px var(--fifa-black)',
                      transition: 'transform 0.15s, box-shadow 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translate(-2px, -2px)';
                      e.currentTarget.style.boxShadow = '6px 6px 0px var(--fifa-black)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.boxShadow = '4px 4px 0px var(--fifa-black)';
                    }}
                  >
                    {/* Icon */}
                    <div style={{
                      width: '48px',
                      height: '48px',
                      background: '#FFFFFF',
                      border: '2px solid var(--fifa-black)',
                      boxShadow: '2px 2px 0px var(--fifa-black)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.5rem',
                      flexShrink: 0,
                    }}>
                      {meta.icon}
                    </div>

                    {/* Details */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 900, fontSize: '1rem', color: 'var(--fifa-black)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {meta.label}
                        {tx.bet && (
                          <span style={{ fontWeight: 800, color: '#555555', fontSize: '0.85rem', background: '#EAEAEA', padding: '0.2rem 0.5rem', border: '1px solid var(--fifa-black)' }}>
                            {BET_TYPE_LABELS[tx.bet.betType] || tx.bet.betType}
                          </span>
                        )}
                      </div>
                      {match && (
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#333333', marginTop: '0.4rem' }}>
                          {match.team1?.name} vs {match.team2?.name}
                        </div>
                      )}
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#666666', marginTop: '0.2rem', textTransform: 'uppercase' }}>
                        {new Date(tx.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                    </div>

                    {/* Amount */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{
                        fontSize: '1.4rem',
                        fontWeight: 900,
                        color: txColor,
                        textShadow: '1px 1px 0px rgba(0,0,0,0.1)'
                      }}>
                        {tx.amount === 0 ? '—' : `${isPositive ? '+' : ''}${tx.amount.toLocaleString()}`}
                        {tx.amount !== 0 && <span style={{ fontSize: '0.9rem', marginLeft: '0.25rem', color: txColor }}>KC</span>}
                      </div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#555555', marginTop: '0.2rem', textTransform: 'uppercase' }}>
                        Balance: {tx.balanceAfter.toLocaleString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
