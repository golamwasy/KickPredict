'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { getFlag } from '../../utils/flags';

export default function MatchDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [prediction, setPrediction] = useState<{ team1Goals: number | null, team2Goals: number | null, result: string }>({ team1Goals: null, team2Goals: null, result: '' });
  const [predError, setPredError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [userPrediction, setUserPrediction] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    fetch(`http://localhost:5001/api/matches/${id}`)
      .then(res => res.json())
      .then(data => {
        setMatch(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    const token = localStorage.getItem('token');
    if (token) {
      fetch('http://localhost:5001/api/predictions/me', { headers: { 'Authorization': `Bearer ${token}` } })
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
      setPredError('You must be logged in to predict.');
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch(`http://localhost:5001/api/predictions/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(prediction),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit prediction');

      alert('Prediction submitted successfully!');
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

        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', gap: '1rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: '0.5rem' }}>{getFlag(match.team1?.code)}</div>
            <h2 style={{ fontSize: '1.75rem' }}>{match.team1?.name}</h2>
            <div style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.85)' }}>{match.team1?.code}</div>
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--fifa-lime)', textAlign: 'center', padding: '0 1rem' }}>
            {match.status === 'FINISHED' || match.status === 'LIVE' 
              ? `${match.team1Goals} – ${match.team2Goals}` 
              : 'VS'}
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: '0.5rem' }}>{getFlag(match.team2?.code)}</div>
            <h2 style={{ fontSize: '1.75rem' }}>{match.team2?.name}</h2>
            <div style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.85)' }}>{match.team2?.code}</div>
          </div>
        </div>
      </div>

      <div className="responsive-grid-2">
        {/* Prediction Form */}
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Your Prediction</h3>
          
          {match.status !== 'OPEN' ? (
            <div style={{ padding: '2rem 0', textAlign: 'center' }}>
              <div style={{ color: 'var(--fifa-orange)', marginBottom: '1rem', fontWeight: 'bold' }}>Predictions are currently locked for this match.</div>
              {userPrediction && (
                <div style={{ padding: '1rem', background: 'var(--bg-color)', borderRadius: '8px' }}>
                  <p>You predicted: <strong>
                    {userPrediction.team1Goals !== null && userPrediction.team2Goals !== null ? `${userPrediction.team1Goals} - ${userPrediction.team2Goals} ` : ''}
                    ({userPrediction.result === 'TEAM1' ? `${match.team1?.name} Win` : userPrediction.result === 'TEAM2' ? `${match.team2?.name} Win` : 'Draw'})
                  </strong></p>
                  {match.status === 'FINISHED' && userPrediction.points && (
                    <p style={{ marginTop: '0.5rem', color: 'var(--fifa-purple)', fontWeight: 'bold' }}>
                      Points Earned: +{userPrediction.points.totalPoints}
                    </p>
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

        {/* Community Stats */}
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Community Stats</h3>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ color: '#555555', marginBottom: '0.5rem' }}>Total Predictions: <strong>{match.stats?.totalPredictions}</strong></p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span>{match.team1?.code} Win</span>
                <span>{match.stats?.team1WinPercentage}%</span>
              </div>
              <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-color)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${match.stats?.team1WinPercentage}%`, height: '100%', backgroundColor: 'var(--fifa-purple)' }}></div>
              </div>
            </div>
            
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span>Draw</span>
                <span>{match.stats?.drawPercentage}%</span>
              </div>
              <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-color)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${match.stats?.drawPercentage}%`, height: '100%', backgroundColor: '#CCCCCC' }}></div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span>{match.team2?.code} Win</span>
                <span>{match.stats?.team2WinPercentage}%</span>
              </div>
              <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-color)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${match.stats?.team2WinPercentage}%`, height: '100%', backgroundColor: 'var(--secondary-color)' }}></div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
