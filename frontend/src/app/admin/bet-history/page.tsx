'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '../../utils/api';
import { getFlag } from '../../utils/flags';

export default function AdminBetHistory() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [bets, setBets] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingBets, setLoadingBets] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token || user.role !== 'ADMIN') {
      router.push('/');
      return;
    }

    fetch(`${API_BASE_URL}/api/admin/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setUsers(data);
        setLoadingUsers(false);
      })
      .catch(err => {
        setError(err.message);
        setLoadingUsers(false);
      });
  }, [router]);

  useEffect(() => {
    if (!selectedUserId) {
      setBets([]);
      return;
    }

    const token = localStorage.getItem('token');
    setLoadingBets(true);
    fetch(`${API_BASE_URL}/api/admin/users/${selectedUserId}/bets`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setBets(data);
        setLoadingBets(false);
      })
      .catch(err => {
        setError(err.message);
        setLoadingBets(false);
      });
  }, [selectedUserId]);

  if (loadingUsers) return <div style={{ textAlign: 'center', padding: '4rem' }}>Loading users...</div>;
  if (error) return <div style={{ textAlign: 'center', padding: '4rem', color: 'red' }}>Error: {error}</div>;

  return (
    <div>
      <h1 style={{ marginBottom: '2rem' }}>Admin: User Bet History</h1>
      
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="input-group">
          <label htmlFor="userSelect">Select User</label>
          <select 
            id="userSelect"
            value={selectedUserId} 
            onChange={(e) => setSelectedUserId(e.target.value)}
          >
            <option value="">-- Choose a user --</option>
            {users.filter(u => u.role !== 'ADMIN').map(u => (
              <option key={u.id} value={u.id}>
                {u.username} {u.fullName ? `(${u.fullName})` : ''} - {u.email}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loadingBets && <div style={{ textAlign: 'center', padding: '2rem' }}>Loading bets for selected user...</div>}

      {!loadingBets && selectedUserId && bets.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📜</div>
          <p style={{ color: 'var(--text-muted)' }}>This user has not placed any bets yet.</p>
        </div>
      )}

      {!loadingBets && bets.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem' }}>Total Bets: {bets.length}</h2>
          </div>
          
          {bets.map(bet => {
            const isMatchOpen = bet.match.status === 'OPEN';
            
            return (
              <div key={bet.id} className="card" style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span className={`badge ${
                      bet.status === 'WON' ? 'badge-open' : 
                      bet.status === 'LOST' ? 'badge-live' : 
                      bet.status === 'PENDING' ? 'badge-upcoming' : 'badge-finished'
                    }`}>
                      {bet.status}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                      {new Date(bet.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 900 }}>
                    ID: {bet.id}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', background: '#F8F9FA', padding: '0.5rem', border: '2px solid #000' }}>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontSize: '2rem' }}>{getFlag(bet.match.team1?.code)}</div>
                    <div style={{ fontWeight: 900, color: '#000' }}>{bet.match.team1?.code}</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '0 1rem', fontWeight: 900, color: '#000' }}>
                    {bet.match.status === 'FINISHED' || bet.match.status === 'LIVE' ? `${bet.match.team1Goals} - ${bet.match.team2Goals}` : 'VS'}
                  </div>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontSize: '2rem' }}>{getFlag(bet.match.team2?.code)}</div>
                    <div style={{ fontWeight: 900, color: '#000' }}>{bet.match.team2?.code}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid var(--border-color)', paddingTop: '0.5rem' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 900, color: 'var(--text-muted)' }}>Bet Type</div>
                    <div style={{ fontWeight: 900, color: '#000' }}>{bet.betType}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 900, color: 'var(--text-muted)' }}>Stake</div>
                    <div style={{ fontWeight: 900, color: '#000' }}>{bet.stake} KC</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 900, color: 'var(--text-muted)' }}>Potential</div>
                    <div style={{ fontWeight: 900, color: 'var(--success-color)' }}>{bet.potentialPayout} KC</div>
                  </div>
                </div>

                <div style={{ marginTop: '0.5rem', background: '#EAEAEA', padding: '0.5rem', borderRadius: '4px', fontSize: '0.9rem', color: '#000' }}>
                  <strong>Prediction: </strong> 
                  {(() => {
                    const data = bet.predictedData as any;
                    const getTeamName = (side: string) => {
                      if (side === 'HOME') return bet.match.team1?.name || bet.match.team1?.code;
                      if (side === 'AWAY') return bet.match.team2?.name || bet.match.team2?.code;
                      return side;
                    };
                    
                    let parts = [];
                    if (data.outcome) parts.push(`Outcome: ${getTeamName(data.outcome)}`);
                    if (data.outcomes) parts.push(`Outcome: ${data.outcomes.map((o: string) => getTeamName(o)).join(' or ')}`);
                    if (data.team) parts.push(`Team: ${getTeamName(data.team)}`);
                    if (data.homeScore !== undefined) parts.push(`Score: ${bet.match.team1?.code} ${data.homeScore} - ${data.awayScore} ${bet.match.team2?.code}`);
                    if (data.side && data.line) parts.push(`${data.side} ${data.line} Goals`);
                    if (data.answer !== undefined) parts.push(data.answer ? 'Yes' : 'No');
                    if (data.marginSide) parts.push(`Margin: ${getTeamName(data.marginSide)} by ${data.margin}`);

                    return parts.join(' | ') || JSON.stringify(data);
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
