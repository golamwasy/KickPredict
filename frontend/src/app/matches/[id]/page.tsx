'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { getFlag } from '../../utils/flags';
import { API_BASE_URL } from '../../utils/api';

export default function MatchDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [prediction, setPrediction] = useState<{ team1Goals: number | null, team2Goals: number | null, result: string }>({ team1Goals: null, team2Goals: null, result: '' });
  const [predError, setPredError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [userPrediction, setUserPrediction] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/matches/${id}`)
      .then(res => res.json())
      .then(data => {
        setMatch(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    const token = localStorage.getItem('token');
    if (token) {
      setIsLoggedIn(true);
      fetch(`${API_BASE_URL}/api/predictions/me`, { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            const pred = data.find((p: any) => p.matchId === id);
            if (pred) {
              setUserPrediction(pred);
              setPrediction({ team1Goals: pred.team1Goals, team2Goals: pred.team2Goals, result: pred.result });
            }
          }
        })
        .catch(console.error);
    } else {
      setIsLoggedIn(false);
    }
  }, [id]);

  useEffect(() => {
    if (match?.status !== 'OPEN') return;
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const kickoff = new Date(match.kickoffTime).getTime();
      const distance = kickoff - now;
      if (distance < 0) {
        setTimeLeft('Locked');
        clearInterval(interval);
      } else {
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s remaining`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [match]);

  const submitPrediction = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setPredError('');
    
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/predictions/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(prediction),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit prediction');

      window.location.reload();
    } catch (err: any) {
      setPredError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '4rem' }}>Loading match...</div>;
  if (!match || match.error) return <div style={{ textAlign: 'center', padding: '4rem' }}>Match not found</div>;

  return (
    <div className="bg-vibe-matches" style={{ margin: '-3rem -1rem', padding: '3rem 1rem', minHeight: 'calc(100vh - 70px)' }}>
      <div className="container" style={{ maxWidth: '900px' }}>
        <div className="match-card" style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
          <span className={`badge badge-${match.status.toLowerCase()}`}>{match.status}</span>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.95)', marginBottom: '2rem', fontWeight: 600 }}>
          Kickoff: {new Date(match.kickoffTime).toLocaleString('en-US', { timeZone: 'Europe/Helsinki', dateStyle: 'short', timeStyle: 'medium', hour12: true })} (Helsinki Time)
        </p>

        <div className="vs-container">
          <div className="vs-team">
            <div className="vs-flag">{getFlag(match.team1?.code)}</div>
            <h2 className="vs-team-name">{match.team1?.name}</h2>
            <div className="vs-team-code">{match.team1?.code}</div>
          </div>
          <div className="vs-divider">
            {match.status === 'FINISHED' || match.status === 'LIVE' 
              ? `${match.team1Goals} – ${match.team2Goals}` 
              : 'VS'}
          </div>
          <div className="vs-team">
            <div className="vs-flag">{getFlag(match.team2?.code)}</div>
            <h2 className="vs-team-name">{match.team2?.name}</h2>
            <div className="vs-team-code">{match.team2?.code}</div>
          </div>
        </div>
      </div>

      <div className="responsive-grid-2" style={match.status === 'FINISHED' && !isLoggedIn ? { gridTemplateColumns: '1fr' } : {}}>
        {/* Prediction Form - Hidden if match is finished and user is logged out */}
        {!(match.status === 'FINISHED' && !isLoggedIn) && (
          <div className="card" style={{ height: '100%' }}>
            <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Your Prediction</h3>
            
            {match.status !== 'OPEN' ? (
              <div style={{ padding: '0.5rem 0' }}>
                {/* Match is FINISHED */}
                {match.status === 'FINISHED' ? (
                  userPrediction ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <div style={{ padding: '1rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>YOUR PREDICTED OUTCOME</p>
                        <p style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                          {userPrediction.result === 'TEAM1' ? `${match.team1?.name} Win` : userPrediction.result === 'TEAM2' ? `${match.team2?.name} Win` : 'Draw'}
                        </p>
                        
                        {userPrediction.team1Goals !== null && userPrediction.team2Goals !== null && (
                          <div style={{ marginTop: '0.5rem' }}>
                            <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>YOUR PREDICTED SCORE</p>
                            <p style={{ fontSize: '1.4rem', fontWeight: 900, letterSpacing: '2px', color: 'var(--fifa-lime)' }}>
                              {userPrediction.team1Goals} – {userPrediction.team2Goals}
                            </p>
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <p style={{ fontWeight: 'bold', fontSize: '0.8rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Scoring Breakdown</p>
                        
                        {/* Match Outcome Result Points */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                          <span style={{ fontSize: '0.95rem' }}>Match Outcome Prediction</span>
                          {userPrediction.points && userPrediction.points.pointsResult > 0 ? (
                            <span className="badge" style={{ background: 'rgba(46, 204, 113, 0.15)', color: '#2ecc71', border: 'none', boxShadow: 'none' }}>Correct (+3 pts)</span>
                          ) : (
                            <span className="badge" style={{ background: 'rgba(231, 76, 60, 0.15)', color: '#e74c3c', border: 'none', boxShadow: 'none' }}>Incorrect (+0 pts)</span>
                          )}
                        </div>

                        {userPrediction.team1Goals !== null && userPrediction.team2Goals !== null && userPrediction.points && (
                          <>
                            {/* Exact Score Points */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                              <span style={{ fontSize: '0.95rem' }}>Exact Score Prediction</span>
                              {userPrediction.points.pointsExactScore > 0 ? (
                                <span className="badge" style={{ background: 'rgba(46, 204, 113, 0.15)', color: '#2ecc71', border: 'none', boxShadow: 'none' }}>Correct (+5 pts)</span>
                              ) : (
                                <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#888888', border: 'none', boxShadow: 'none' }}>Incorrect (+0 pts)</span>
                              )}
                            </div>

                            {/* Team 1 Goals Points */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                              <span style={{ fontSize: '0.95rem' }}>{match.team1?.code} Goals ({userPrediction.team1Goals})</span>
                              {userPrediction.points.pointsTeam1Goals > 0 ? (
                                <span className="badge" style={{ background: 'rgba(46, 204, 113, 0.15)', color: '#2ecc71', border: 'none', boxShadow: 'none' }}>Correct (+1 pt)</span>
                              ) : (
                                <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#888888', border: 'none', boxShadow: 'none' }}>Incorrect (+0 pts)</span>
                              )}
                            </div>

                            {/* Team 2 Goals Points */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                              <span style={{ fontSize: '0.95rem' }}>{match.team2?.code} Goals ({userPrediction.team2Goals})</span>
                              {userPrediction.points.pointsTeam2Goals > 0 ? (
                                <span className="badge" style={{ background: 'rgba(46, 204, 113, 0.15)', color: '#2ecc71', border: 'none', boxShadow: 'none' }}>Correct (+1 pt)</span>
                              ) : (
                                <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#888888', border: 'none', boxShadow: 'none' }}>Incorrect (+0 pts)</span>
                              )}
                            </div>
                          </>
                        )}
                      </div>

                      {userPrediction.points && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', padding: '1rem', background: 'var(--fifa-purple)', borderRadius: '8px', border: '3px solid #000000', boxShadow: '4px 4px 0px #000000' }}>
                          <span style={{ fontWeight: 900, textTransform: 'uppercase', color: 'white', letterSpacing: '0.05em' }}>Total Points Earned</span>
                          <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--fifa-lime)' }}>+{userPrediction.points.totalPoints} pts</span>
                        </div>
                      )}
                    </div>
                  ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '280px', padding: '1.5rem', border: '3px dashed var(--fifa-black)', background: '#FFF5F5', textAlign: 'center', gap: '1rem', margin: '0.5rem 0' }}>
                    <svg width="52" height="52" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="var(--fifa-red)" strokeWidth="2.5" strokeLinejoin="round"/>
                      <path d="M12 8V13" stroke="var(--fifa-red)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 16H12.01" stroke="var(--fifa-red)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <div>
                      <h4 style={{ color: 'var(--fifa-red)', fontSize: '1.15rem', fontWeight: 900, marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.02em' }}>No Prediction Placed</h4>
                      <p style={{ color: 'var(--fifa-black)', fontSize: '0.88rem', fontWeight: 600, lineHeight: 1.4 }}>
                        Predictions locked when this match kicked off. No points were accumulated.
                      </p>
                    </div>
                  </div>
                )
                ) : (
                  /* Match is LOCKED or LIVE but NOT finished yet */
                  <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
                    <div style={{ color: 'var(--fifa-orange)', marginBottom: '1.25rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      <span>🔒</span> Predictions are locked for this match.
                    </div>
                    {userPrediction ? (
                      <div style={{ padding: '1rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', border: '1px solid var(--border)', textAlign: 'left' }}>
                        <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>YOUR PREDICTED OUTCOME</p>
                        <p style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.75rem' }}>
                          {userPrediction.result === 'TEAM1' ? `${match.team1?.name} Win` : userPrediction.result === 'TEAM2' ? `${match.team2?.name} Win` : 'Draw'}
                        </p>
                        {userPrediction.team1Goals !== null && userPrediction.team2Goals !== null && (
                          <div>
                            <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>YOUR PREDICTED SCORE</p>
                            <p style={{ fontSize: '1.4rem', fontWeight: 900, letterSpacing: '2px', color: 'var(--fifa-lime)' }}>
                              {userPrediction.team1Goals} – {userPrediction.team2Goals}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ padding: '1rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <div style={{ color: 'var(--muted)', fontWeight: 'bold' }}>You didn't predict this match.</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={submitPrediction}>
                <div style={{ color: '#2F6131', marginBottom: '1rem', fontWeight: 'bold' }}>
                  ⏳ Time remaining: {timeLeft}
                </div>
                
                {predError && <div style={{ color: 'var(--danger-color)', marginBottom: '1rem' }}>{predError}</div>}
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="input-group">
                    <label>{match.team1?.name} Goals (Optional)</label>
                    <input type="number" min="0" value={prediction.team1Goals ?? ''} onChange={(e) => setPrediction({...prediction, team1Goals: e.target.value === '' ? null : parseInt(e.target.value)})} />
                  </div>
                  <div className="input-group">
                    <label>{match.team2?.name} Goals (Optional)</label>
                    <input type="number" min="0" value={prediction.team2Goals ?? ''} onChange={(e) => setPrediction({...prediction, team2Goals: e.target.value === '' ? null : parseInt(e.target.value)})} />
                  </div>
                </div>

                <div className="input-group">
                  <label>Match Result Prediction</label>
                  <select 
                    style={{ width: '100%', padding: '0.75rem', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'white' }}
                    value={prediction.result} 
                    onChange={(e) => setPrediction({...prediction, result: e.target.value})}
                  >
                    <option value="" disabled>Select Result</option>
                    <option value="TEAM1">{match.team1?.name} to Win</option>
                    <option value="DRAW">Match will end in a Draw</option>
                    <option value="TEAM2">{match.team2?.name} to Win</option>
                  </select>
                </div>

                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Prediction'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Community Stats */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Community Stats</h3>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ color: '#555555', marginBottom: '0.5rem' }}>Total Predictions: <strong>{match.stats?.totalPredictions}</strong></p>
          </div>

          {isLoggedIn ? (
            /* Bar Chart (Vertical) for logged in users to fill vertical space */
            <div style={{ flex: 1, display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', minHeight: '260px', padding: '1.5rem 0', margin: '1rem 0', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', background: 'rgba(255,255,255,0.01)' }}>
              {/* Team 1 Win Bar */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', width: '30%' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--fifa-purple)' }}>{match.stats?.team1WinPercentage || 0}%</span>
                <div style={{ 
                  width: '100%', 
                  maxWidth: '40px', 
                  height: `${Math.max(match.stats?.team1WinPercentage || 0, 4)}%`, 
                  backgroundColor: 'var(--fifa-purple)', 
                  borderRadius: '6px 6px 0 0',
                  boxShadow: '0 0 15px rgba(100,50,255,0.2)',
                  transition: 'height 0.4s ease-out'
                }}></div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, marginTop: '0.75rem', whiteSpace: 'nowrap' }}>{match.team1?.code} Win</span>
              </div>

              {/* Draw Bar */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', width: '30%' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#CCCCCC' }}>{match.stats?.drawPercentage || 0}%</span>
                <div style={{ 
                  width: '100%', 
                  maxWidth: '40px', 
                  height: `${Math.max(match.stats?.drawPercentage || 0, 4)}%`, 
                  backgroundColor: '#CCCCCC', 
                  borderRadius: '6px 6px 0 0',
                  boxShadow: '0 0 15px rgba(255,255,255,0.05)',
                  transition: 'height 0.4s ease-out'
                }}></div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, marginTop: '0.75rem', whiteSpace: 'nowrap' }}>Draw</span>
              </div>

              {/* Team 2 Win Bar */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', width: '30%' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--secondary-color)' }}>{match.stats?.team2WinPercentage || 0}%</span>
                <div style={{ 
                  width: '100%', 
                  maxWidth: '40px', 
                  height: `${Math.max(match.stats?.team2WinPercentage || 0, 4)}%`, 
                  backgroundColor: 'var(--secondary-color)', 
                  borderRadius: '6px 6px 0 0',
                  boxShadow: '0 0 15px rgba(230,126,34,0.2)',
                  transition: 'height 0.4s ease-out'
                }}></div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, marginTop: '0.75rem', whiteSpace: 'nowrap' }}>{match.team2?.code} Win</span>
              </div>
            </div>
          ) : (
            /* Horizontal Progress Bars for logged out users (expands full-width) */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '0.5rem 0' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontWeight: 600 }}>
                  <span>{match.team1?.code} Win</span>
                  <span>{match.stats?.team1WinPercentage}%</span>
                </div>
                <div style={{ width: '100%', height: '10px', backgroundColor: 'var(--bg-color)', borderRadius: '5px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ width: `${match.stats?.team1WinPercentage}%`, height: '100%', backgroundColor: 'var(--fifa-purple)' }}></div>
                </div>
              </div>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontWeight: 600 }}>
                  <span>Draw</span>
                  <span>{match.stats?.drawPercentage}%</span>
                </div>
                <div style={{ width: '100%', height: '10px', backgroundColor: 'var(--bg-color)', borderRadius: '5px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ width: `${match.stats?.drawPercentage}%`, height: '100%', backgroundColor: '#CCCCCC' }}></div>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontWeight: 600 }}>
                  <span>{match.team2?.code} Win</span>
                  <span>{match.stats?.team2WinPercentage}%</span>
                </div>
                <div style={{ width: '100%', height: '10px', backgroundColor: 'var(--bg-color)', borderRadius: '5px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ width: `${match.stats?.team2WinPercentage}%`, height: '100%', backgroundColor: 'var(--secondary-color)' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
