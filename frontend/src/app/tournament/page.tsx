'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '../utils/api';
import Link from 'next/link';

export default function TournamentQuestions() {
  const router = useRouter();
  const [questions, setQuestions] = useState<any[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [cqError, setCqError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  const [cqBetForms, setCqBetForms] = useState<Record<string, { answer: string; stake: number | '' }>>({});
  const [cqSubmitting, setCqSubmitting] = useState<string | null>(null);
  const [betError, setBetError] = useState('');

  const [existingBets, setExistingBets] = useState<any[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsLoggedIn(true);
      fetchWalletAndBets(token);
    }

    fetch(`${API_BASE_URL}/api/tournament/questions`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setQuestions(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const fetchWalletAndBets = async (token: string) => {
    try {
      const [walletRes, betsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/wallet/me`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/bets/me`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (walletRes.ok) {
        const w = await walletRes.json();
        setWalletBalance(w.balance);
      }
      if (betsRes.ok) {
        const b = await betsRes.json();
        // Only keep tournament bets
        setExistingBets(b.filter((bet: any) => bet.isTournament));
      }
    } catch { /* ignore */ }
  };

  const addTournamentQuestion = async () => {
    if (!newQuestion.trim()) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/tournament/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ question: newQuestion }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setQuestions([data, ...questions]);
      setNewQuestion('');
      setCqError('');
    } catch (err: any) {
      setCqError(err.message || 'Failed to add question');
    }
  };

  const placeCommunityBet = async (cqId: string, existingBetId?: string) => {
    const form = cqBetForms[cqId];
    if (!form || !form.answer.trim() || !form.stake || Number(form.stake) <= 0) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    setCqSubmitting(cqId);
    setBetError('');
    try {
      const method = existingBetId ? 'PUT' : 'POST';
      const url = existingBetId ? `${API_BASE_URL}/api/bets/${existingBetId}` : `${API_BASE_URL}/api/bets`;

      const payload: any = {
        betType: 'COMMUNITY_QUESTION',
        predictedData: { answer: form.answer },
        stake: Number(form.stake),
      };

      if (!existingBetId) {
        payload.communityQuestionId = cqId;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to place bet');

      setWalletBalance(data.newBalance);
      setCqBetForms(prev => {
        const next = { ...prev };
        delete next[cqId];
        return next;
      });

      await fetchWalletAndBets(token);
      window.dispatchEvent(new Event('walletUpdated'));
    } catch (err: any) {
      setBetError(err.message);
    } finally {
      setCqSubmitting(null);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '4rem' }}>Loading questions...</div>;

  return (
    <div className="bg-vibe-matches" style={{ margin: '-3rem -1rem', padding: '3rem 1rem', minHeight: 'calc(100vh - 70px)' }}>
      <div className="container" style={{ maxWidth: '800px' }}>

        <div style={{ marginBottom: '2rem' }}>
          <Link href="/matches" style={{ color: 'var(--fifa-lime)', textDecoration: 'none', fontWeight: 700 }}>
            ← Back to Matches
          </Link>
        </div>

        <div className="card" style={{ marginBottom: '2rem', textAlign: 'center', background: 'var(--fifa-purple)', color: '#fff', border: '3px solid var(--fifa-black)', boxShadow: '6px 6px 0px var(--fifa-black)' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, textTransform: 'uppercase', margin: 0, letterSpacing: '0.05em' }}>
            🏆 World Cup Questions
          </h1>
          <p style={{ marginTop: '0.5rem', fontWeight: 600, fontSize: '1.1rem' }}>
            Predict on tournament-wide events. All questions here have a massive <span style={{ color: 'var(--fifa-lime)' }}>x5 Multiplier</span>!
          </p>
        </div>

        {isLoggedIn && (
          <div className="card" style={{ marginBottom: '2rem' }}>
            <h4 style={{ marginBottom: '1rem', fontSize: '1.2rem', fontWeight: 900, textTransform: 'uppercase' }}>Ask a Tournament Question</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input
                type="text"
                value={newQuestion}
                onChange={e => setNewQuestion(e.target.value)}
                placeholder="e.g., Will Mbappe win the Golden Boot?"
                style={{ width: '100%', padding: '1rem', border: '2px solid var(--fifa-black)', borderRadius: '4px', fontSize: '1rem' }}
              />
              <button className="btn-primary" onClick={addTournamentQuestion} style={{ width: '100%', padding: '1rem', fontWeight: 900, fontSize: '1.1rem' }}>
                Post Question
              </button>
            </div>
            {cqError && <p style={{ color: 'red', marginTop: '1rem', fontWeight: 700 }}>{cqError}</p>}
          </div>
        )}

        {!isLoggedIn && (
          <div className="card" style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <p style={{ color: '#555555', marginBottom: '1rem', fontWeight: 700 }}>Log in to place bets and ask questions</p>
            <button className="btn-primary" onClick={() => router.push('/login')}>Login</button>
          </div>
        )}

        {betError && <div style={{ color: '#E74C3C', marginBottom: '1rem', padding: '1rem', background: 'rgba(231,76,60,0.1)', border: '2px solid #E74C3C', borderRadius: '6px', fontWeight: 700 }}>{betError}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {questions.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <p style={{ color: '#555', fontStyle: 'italic', fontSize: '1.2rem' }}>No tournament questions yet. Be the first to ask!</p>
            </div>
          ) : (
            questions.map(cq => {
              const existingBet = existingBets.find(b => b.communityQuestionId === cq.id);
              const hasBet = !!existingBet;
              const isLocked = cq.isResolved;

              const form = cqBetForms[cq.id] ?? { answer: existingBet?.predictedData?.answer || '', stake: existingBet?.stake || '' };

              return (
                <div key={cq.id} className="card" style={{ position: 'relative' }}>
                  <div style={{ marginBottom: '1rem' }}>
                    <p style={{ fontSize: '1.25rem', fontWeight: 900 }}>{cq.question}</p>
                    <p style={{ fontSize: '0.85rem', color: '#666' }}>Asked by @{cq.creator?.username} • Placed bets: {cq._count?.bets || 0}</p>
                  </div>

                  {hasBet && isLocked ? (
                    <div style={{
                      padding: '1rem',
                      background: existingBet.status === 'WON' ? 'rgba(39,174,96,0.1)' : existingBet.status === 'LOST' ? 'rgba(231,76,60,0.1)' : 'rgba(230,126,34,0.1)',
                      border: `2px solid ${existingBet.status === 'WON' ? 'rgba(39,174,96,1)' : existingBet.status === 'LOST' ? 'rgba(231,76,60,1)' : 'rgba(230,126,34,1)'}`,
                      borderRadius: '4px'
                    }}>
                      <p style={{
                        color: existingBet.status === 'WON' ? '#27AE60' : existingBet.status === 'LOST' ? '#E74C3C' : '#E67E22',
                        fontWeight: 900,
                        fontSize: '1rem',
                        display: 'flex',
                        justifyContent: 'space-between'
                      }}>
                        <span>
                          {existingBet.status === 'WON' ? '✓ ' : existingBet.status === 'LOST' ? '✗ ' : ''}
                          Your Answer: {existingBet.predictedData?.answer} (Stake: {existingBet.stake})
                        </span>
                        <span>{existingBet.status === 'VOID' ? 'REFUND' : existingBet.status}</span>
                      </p>
                      {(existingBet.status === 'LOST' || existingBet.status === 'VOID') && cq.correctAnswer && (
                        <p style={{ marginTop: '0.5rem', color: '#555', fontStyle: 'italic', fontWeight: 600 }}>Correct Answer: {cq.correctAnswer}</p>
                      )}
                    </div>
                  ) : isLocked ? (
                    <div style={{ padding: '1rem', background: '#f5f5f5', border: '2px solid #ddd', borderRadius: '4px', fontWeight: 700, color: '#555' }}>
                      🔒 This question has been resolved.
                      {cq.correctAnswer && <span style={{ display: 'block', marginTop: '0.5rem' }}>Correct Answer: {cq.correctAnswer}</span>}
                    </div>
                  ) : isLoggedIn ? (
                    <div>
                      {hasBet && (
                        <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(39,174,96,0.1)', border: '1px solid #27AE60', borderRadius: '4px', color: '#27AE60', fontWeight: 700 }}>
                          ✓ Bet placed! You can update your answer or stake below.
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <input
                          type="text"
                          placeholder="Your answer..."
                          value={form.answer}
                          onChange={e => setCqBetForms({ ...cqBetForms, [cq.id]: { ...form, answer: e.target.value } })}
                          style={{ flex: 2, padding: '0.75rem', border: '2px solid var(--fifa-black)', minWidth: '200px' }}
                        />
                        <input
                          type="number"
                          placeholder="Stake (KC)"
                          min="1"
                          max={walletBalance ?? undefined}
                          value={form.stake}
                          onChange={e => setCqBetForms({ ...cqBetForms, [cq.id]: { ...form, stake: e.target.value === '' ? '' : Number(e.target.value) } })}
                          style={{ flex: 1, padding: '0.75rem', border: '2px solid var(--fifa-black)', minWidth: '100px' }}
                        />
                        <button
                          className="btn-primary"
                          onClick={() => placeCommunityBet(cq.id, existingBet?.id)}
                          disabled={cqSubmitting === cq.id || !form.answer.trim() || !form.stake}
                          style={{ flex: 1, minWidth: '120px', padding: '0.75rem' }}
                        >
                          {cqSubmitting === cq.id ? 'Processing...' : (hasBet ? 'Update' : 'Bet (x5)')}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
