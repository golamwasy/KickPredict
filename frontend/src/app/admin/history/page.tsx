'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '../../utils/api';
import { getFlag } from '../../utils/flags';

export default function AdminHistory() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [bets, setBets] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
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
      setTransactions([]);
      return;
    }

    const token = localStorage.getItem('token');
    setLoadingData(true);
    
    Promise.all([
      fetch(`${API_BASE_URL}/api/admin/users/${selectedUserId}/bets`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(res => res.json()),
      fetch(`${API_BASE_URL}/api/admin/users/${selectedUserId}/transactions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(res => res.json())
    ])
    .then(([betsData, txData]) => {
      if (betsData.error) throw new Error(betsData.error);
      if (txData.error) throw new Error(txData.error);
      setBets(betsData);
      setTransactions(txData);
      setLoadingData(false);
    })
    .catch(err => {
      setError(err.message);
      setLoadingData(false);
    });
  }, [selectedUserId]);

  if (loadingUsers) return <div style={{ textAlign: 'center', padding: '4rem' }}>Loading users...</div>;
  if (error) return <div style={{ textAlign: 'center', padding: '4rem', color: 'red' }}>Error: {error}</div>;

  return (
    <div>
      <h1 style={{ marginBottom: '2rem' }}>Admin: User History</h1>
      
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

      {loadingData && <div style={{ textAlign: 'center', padding: '2rem' }}>Loading data for selected user...</div>}

      {!loadingData && selectedUserId && bets.length === 0 && transactions.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📜</div>
          <p style={{ color: 'var(--text-muted)' }}>This user has no history.</p>
        </div>
      )}

      {!loadingData && selectedUserId && (bets.length > 0 || transactions.length > 0) && (
        <>
          <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {(() => {
              const settledBets = bets.filter(b => b.status === 'WON' || b.status === 'LOST');
              const totalStaked = settledBets.reduce((acc, bet) => acc + bet.stake, 0);
              const totalWon = settledBets.filter(b => b.status === 'WON').reduce((acc, bet) => acc + bet.potentialPayout, 0);
              const totalLost = settledBets.filter(b => b.status === 'LOST').reduce((acc, bet) => acc + bet.stake, 0);
              return (
                <>
                  <div className="card" style={{ flex: 1, minWidth: '200px', padding: '1rem', textAlign: 'center', border: '2px solid #000', background: '#fff' }}>
                    <div style={{ fontSize: '0.8rem', color: '#555', textTransform: 'uppercase', fontWeight: 900 }}>Total Staked</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#000' }}>{totalStaked.toLocaleString()} KC</div>
                  </div>
                  <div className="card" style={{ flex: 1, minWidth: '200px', padding: '1rem', textAlign: 'center', border: '2px solid var(--success-color)', background: '#fff' }}>
                    <div style={{ fontSize: '0.8rem', color: '#555', textTransform: 'uppercase', fontWeight: 900 }}>Total Won</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--success-color)' }}>{totalWon.toLocaleString()} KC</div>
                  </div>
                  <div className="card" style={{ flex: 1, minWidth: '200px', padding: '1rem', textAlign: 'center', border: '2px solid #E74C3C', background: '#fff' }}>
                    <div style={{ fontSize: '0.8rem', color: '#555', textTransform: 'uppercase', fontWeight: 900 }}>Total Lost</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#E74C3C' }}>{totalLost.toLocaleString()} KC</div>
                  </div>
                </>
              );
            })()}
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          
          {/* Bet History Column */}
          <div style={{ display: 'flex', flexDirection: 'column', height: '600px' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '3px solid #000', paddingBottom: '0.5rem', flexShrink: 0 }}>
              Bet History ({bets.length})
            </h2>
            {bets.length === 0 && <p>No bets placed.</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto', paddingRight: '0.5rem', flexGrow: 1 }}>
            {bets.map(bet => {
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
                      if (data.margin !== undefined && data.marginSide) parts.push(`Margin: ${getTeamName(data.marginSide)} by ${data.margin} Goal${data.margin === 1 ? '' : 's'}`);
                      if (data.answer !== undefined) parts.push(data.answer ? 'Yes' : 'No');

                      return parts.join(' | ') || JSON.stringify(data);
                    })()}
                  </div>
                </div>
              );
            })}
            </div>
          </div>

          {/* Transaction History Column */}
          <div style={{ display: 'flex', flexDirection: 'column', height: '600px' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '3px solid #000', paddingBottom: '0.5rem', flexShrink: 0 }}>
              Transaction History ({transactions.length})
            </h2>
            {transactions.length === 0 && <p>No transactions found.</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', paddingRight: '0.5rem', flexGrow: 1 }}>
            {transactions.map(tx => (
              <div key={tx.id} className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 900, textTransform: 'uppercase', color: tx.amount > 0 ? 'var(--success-color)' : (tx.amount < 0 ? '#E74C3C' : '#000') }}>
                    {tx.type}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                    {new Date(tx.createdAt).toLocaleString()}
                  </span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8F9FA', padding: '0.5rem', border: '2px solid #000' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 900 }}>Amount</div>
                    <div style={{ fontWeight: 900, fontSize: '1.1rem', color: tx.amount > 0 ? 'var(--success-color)' : (tx.amount < 0 ? '#E74C3C' : '#000') }}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount} KC
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 900 }}>Balance After</div>
                    <div style={{ fontWeight: 900, fontSize: '1.1rem' }}>{tx.balanceAfter} KC</div>
                  </div>
                </div>

                {tx.note && !tx.type.startsWith('BET_') && (
                  <div style={{ fontSize: '0.85rem', color: '#555', fontStyle: 'italic', marginTop: '0.25rem' }}>
                    Note: {tx.note}
                  </div>
                )}
              </div>
            ))}
            </div>
          </div>

        </div>
        </>
      )}
    </div>
  );
}
