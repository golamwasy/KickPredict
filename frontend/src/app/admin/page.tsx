'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';

export default function AdminDashboard() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [communityQuestions, setCommunityQuestions] = useState<any[]>([]);
  const [expandedCq, setExpandedCq] = useState<string | null>(null);
  const [cqBets, setCqBets] = useState<any[]>([]);

  // Modal State
  const [resolvingCq, setResolvingCq] = useState<any | null>(null);
  const [modalBets, setModalBets] = useState<any[]>([]);
  const [correctAnswerInput, setCorrectAnswerInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token || user.role !== 'ADMIN') {
      router.push('/');
      return;
    }

    Promise.all([
      fetch(`${API_BASE_URL}/api/admin/users`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API_BASE_URL}/api/admin/summary`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API_BASE_URL}/api/admin/community-questions`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json())
    ]).then(([usersData, summaryData, cqData]) => {
      if (usersData.error) throw new Error(usersData.error);
      setUsers(usersData);
      setSummary(summaryData);
      setCommunityQuestions(cqData || []);
      setLoading(false);
    }).catch(err => {
      setError(err.message);
      setLoading(false);
    });
  }, [router]);

  const toggleUserStatus = async (userId: string) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/toggle-status`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to toggle status');
      
      const updatedUser = await res.json();
      setUsers(users.map(u => u.id === userId ? { ...u, isActive: updatedUser.isActive } : u));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleBalanceChange = async (userId: string, currentBalance: number) => {
    const newBalanceStr = prompt(`Enter new balance (Current: ${currentBalance}):`, currentBalance.toString());
    if (newBalanceStr === null) return;
    
    const newBalance = parseInt(newBalanceStr, 10);
    if (isNaN(newBalance) || newBalance < 0) {
      setError('Invalid balance amount');
      return;
    }

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/balance`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ balance: newBalance })
      });
      if (!res.ok) throw new Error('Failed to update balance');
      
      const updatedWallet = await res.json();
      setUsers(users.map(u => u.id === userId ? { ...u, wallet: { balance: updatedWallet.balance } } : u));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleLoanChange = async (userId: string) => {
    const loanAmountStr = prompt(`Enter loan amount to grant:`, "10000");
    if (loanAmountStr === null) return;
    
    const loanAmount = parseInt(loanAmountStr, 10);
    if (isNaN(loanAmount) || loanAmount <= 0) {
      setError('Invalid loan amount');
      return;
    }

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/loan`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ loanAmount })
      });
      if (!res.ok) throw new Error('Failed to grant loan');
      
      const updatedWallet = await res.json();
      setUsers(users.map(u => u.id === userId ? { ...u, wallet: { balance: updatedWallet.balance } } : u));
      setSuccess(`Successfully granted ${loanAmount.toLocaleString()} KC loan!`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleViewCqBets = async (cqId: string) => {
    if (expandedCq === cqId) {
      setExpandedCq(null);
      return;
    }
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/community-questions/${cqId}/bets`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setCqBets(data);
      setExpandedCq(cqId);
    } catch (err) { setError('Failed to fetch bets'); }
  };

  const handleMarkCqBet = async (cqId: string, betId: string, status: 'WON' | 'LOST' | 'VOID') => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/community-questions/${cqId}/bets/${betId}/status`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('Failed to update bet status');
      const updatedBet = await res.json();
      setCqBets(cqBets.map(b => b.id === betId ? updatedBet : b));
    } catch (err: any) { setError(err.message); }
  };

  const openResolveModal = async (cq: any) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/community-questions/${cq.id}/bets`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setModalBets(data);
      setResolvingCq(cq);
      setCorrectAnswerInput(cq.correctAnswer || '');
    } catch (err) { setError('Failed to fetch bets'); }
  };

  const handleModalMarkBet = async (betId: string, status: 'WON' | 'LOST' | 'VOID') => {
    if (!resolvingCq) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/community-questions/${resolvingCq.id}/bets/${betId}/status`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('Failed to update bet status');
      const updatedBet = await res.json();
      setModalBets(modalBets.map(b => b.id === betId ? updatedBet : b));
      if (expandedCq === resolvingCq.id) {
        setCqBets(cqBets.map(b => b.id === betId ? updatedBet : b));
      }
    } catch (err: any) { setError(err.message); }
  };

  const handleFinalizeResolve = async () => {
    if (!resolvingCq) return;
    if (!correctAnswerInput.trim()) {
      setError("Please enter a correct answer summary.");
      return;
    }
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/community-questions/${resolvingCq.id}/resolve`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ correctAnswer: correctAnswerInput })
      });
      if (!res.ok) throw new Error('Failed to resolve question');
      setCommunityQuestions(communityQuestions.map(q => q.id === resolvingCq.id ? { ...q, isResolved: true, correctAnswer: correctAnswerInput } : q));
      setResolvingCq(null);
    } catch (err: any) { setError(err.message); }
  };

  const handleCqStatus = async (cqId: string, status: string) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/community-questions/${cqId}/status`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('Failed to update status');
      setCommunityQuestions(communityQuestions.map(q => q.id === cqId ? { ...q, status } : q));
    } catch (err: any) { setError(err.message); }
  };

  if (loading) return <LoadingSpinner text="Loading admin dashboard..." />;
  if (error) return <div style={{ textAlign: 'center', padding: '4rem', color: 'red' }}>Error: {error}</div>;

  return (
    <div>
      <h1 style={{ marginBottom: '2rem' }}>Admin Dashboard</h1>
      


      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        <div className="card" style={{ overflow: 'hidden' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>User Management</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '500px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '0.5rem' }}>Username</th>
                <th style={{ padding: '0.5rem' }}>Role</th>
                <th style={{ padding: '0.5rem' }}>Status</th>
                <th style={{ padding: '0.5rem' }}>Balance</th>
                <th style={{ padding: '0.5rem' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.filter(u => u.role !== 'ADMIN').map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.5rem' }}>{u.username}</td>
                  <td style={{ padding: '0.5rem' }}>{u.role}</td>
                  <td style={{ padding: '0.5rem' }}>
                    <span className={`badge ${u.isActive ? 'badge-open' : 'badge-locked'}`}>
                      {u.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td style={{ padding: '0.5rem', fontWeight: 'bold', color: 'var(--fifa-lime)', whiteSpace: 'nowrap' }}>
                    {u.wallet?.balance || 0}
                    <button 
                      onClick={() => handleBalanceChange(u.id, u.wallet?.balance || 0)} 
                      style={{ marginLeft: '10px', background: '#333', color: '#fff', border: 'none', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer' }}
                      title="Adjust Balance"
                    >
                      ✎ Edit
                    </button>
                  </td>
                  <td style={{ padding: '0.5rem', display: 'flex', gap: '10px' }}>
                    <button onClick={() => toggleUserStatus(u.id)} style={{ color: u.isActive ? 'var(--danger-color)' : 'var(--success-color)', textDecoration: 'underline' }}>
                      {u.isActive ? 'Disable' : 'Enable'}
                    </button>
                    <button onClick={() => handleLoanChange(u.id)} style={{ color: '#ff4d4d', textDecoration: 'underline' }}>
                      Grant Loan
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>

        <div className="card">
          <h2 style={{ marginBottom: '1.5rem', color: 'var(--danger-color)' }}>Recent API Sync Errors (ESPN)</h2>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {summary?.recentSyncLogs?.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                ✅ No sync errors logged. Background APIs are running smoothly!
              </div>
            ) : (
              summary?.recentSyncLogs.map((log: any) => (
                <div key={log.id} style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span className="badge badge-locked">{log.status}</span>
                    <span style={{ color: '#555' }}>{new Date(log.createdAt).toLocaleString('en-US', { timeZone: 'Europe/Helsinki' })} (FI Time)</span>
                  </div>
                  <p style={{ color: '#ff6b6b' }}>{log.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '2rem', overflow: 'hidden' }}>
        <h2 style={{ marginBottom: '1.5rem' }}>Community Questions Management</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '0.5rem' }}>Match</th>
                <th style={{ padding: '0.5rem' }}>Question</th>
                <th style={{ padding: '0.5rem' }}>Status</th>
                <th style={{ padding: '0.5rem' }}>Resolved?</th>
                <th style={{ padding: '0.5rem' }}>Bets</th>
                <th style={{ padding: '0.5rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {communityQuestions.length === 0 && (
                <tr><td colSpan={6} style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>No community questions yet</td></tr>
              )}
              {communityQuestions.map(cq => (
                <React.Fragment key={cq.id}>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.5rem', fontSize: '0.85rem' }}>
                      {cq.match?.team1?.code} vs {cq.match?.team2?.code}<br/>
                      <span style={{ color: '#888', fontSize: '0.75rem' }}>{new Date(cq.match?.kickoffTime).toLocaleDateString()}</span>
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      <strong>{cq.question}</strong><br/>
                      <span style={{ fontSize: '0.75rem', color: '#666' }}>by @{cq.creator?.username}</span>
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      <select value={cq.status} onChange={e => handleCqStatus(cq.id, e.target.value)} disabled={cq.isResolved} style={{ padding: '0.2rem' }}>
                        <option value="PENDING">PENDING</option>
                        <option value="APPROVED">APPROVED</option>
                        <option value="REJECTED">REJECTED</option>
                      </select>
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      {cq.isResolved ? <span style={{ color: 'green', fontWeight: 'bold' }}>Yes ({cq.correctAnswer})</span> : 'No'}
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      {cq._count?.bets || 0}
                      <button onClick={() => handleViewCqBets(cq.id)} style={{ marginLeft: '10px', fontSize: '0.8rem', padding: '0.2rem 0.5rem', cursor: 'pointer' }}>
                        {expandedCq === cq.id ? 'Hide' : 'View'}
                      </button>
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      {!cq.isResolved && cq.status === 'APPROVED' && (
                        <button className="btn-primary" onClick={() => openResolveModal(cq)} style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}>
                          Resolve Question
                        </button>
                      )}
                    </td>
                  </tr>
                  {expandedCq === cq.id && (
                    <tr style={{ backgroundColor: '#f9f9f9', borderBottom: '2px solid #ccc' }}>
                      <td colSpan={6} style={{ padding: '1rem' }}>
                        <h4 style={{ marginBottom: '0.5rem' }}>Bets for: {cq.question}</h4>
                        {cqBets.length === 0 ? <p>No bets placed.</p> : (
                          <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid #ddd' }}>
                                <th style={{ padding: '0.4rem' }}>User</th>
                                <th style={{ padding: '0.4rem' }}>Answer</th>
                                <th style={{ padding: '0.4rem' }}>Stake</th>
                                <th style={{ padding: '0.4rem' }}>Status</th>
                                <th style={{ padding: '0.4rem' }}>Mark As</th>
                              </tr>
                            </thead>
                            <tbody>
                              {cqBets.map(bet => (
                                <tr key={bet.id} style={{ borderBottom: '1px solid #eee' }}>
                                  <td style={{ padding: '0.4rem' }}>@{bet.user?.username}</td>
                                  <td style={{ padding: '0.4rem', fontWeight: 'bold' }}>{bet.predictedData?.answer}</td>
                                  <td style={{ padding: '0.4rem' }}>{bet.stake} KC</td>
                                  <td style={{ padding: '0.4rem' }}>
                                    <span style={{ color: bet.status === 'WON' ? 'green' : bet.status === 'LOST' ? 'red' : 'orange' }}>{bet.status}</span>
                                  </td>
                                  <td style={{ padding: '0.4rem' }}>
                                    {bet.status === 'PENDING' && !cq.isResolved && (
                                      <>
                                        <button onClick={() => handleMarkCqBet(cq.id, bet.id, 'WON')} style={{ backgroundColor: '#27AE60', color: '#fff', border: 'none', padding: '0.2rem 0.5rem', marginRight: '5px', borderRadius: '3px', cursor: 'pointer' }}>WON</button>
                                        <button onClick={() => handleMarkCqBet(cq.id, bet.id, 'LOST')} style={{ backgroundColor: '#E74C3C', color: '#fff', border: 'none', padding: '0.2rem 0.5rem', marginRight: '5px', borderRadius: '3px', cursor: 'pointer' }}>LOST</button>
                                        <button onClick={() => handleMarkCqBet(cq.id, bet.id, 'VOID')} style={{ backgroundColor: '#95A5A6', color: '#fff', border: 'none', padding: '0.2rem 0.5rem', borderRadius: '3px', cursor: 'pointer' }}>REFUND</button>
                                      </>
                                    )}
                                    {!cq.isResolved && (
                                      <button onClick={() => openResolveModal(cq)} style={{ backgroundColor: '#F39C12', color: '#fff', border: 'none', padding: '0.2rem 0.5rem', borderRadius: '3px', cursor: 'pointer' }}>
                                        Resolve Question
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {resolvingCq && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{ background: '#fff', color: '#000', padding: '2rem', borderRadius: '8px', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: '1rem', borderBottom: '2px solid #ccc', paddingBottom: '0.5rem' }}>Resolve: {resolvingCq.question}</h2>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>Correct Answer Description</label>
              <input 
                type="text" 
                value={correctAnswerInput} 
                onChange={e => setCorrectAnswerInput(e.target.value)} 
                placeholder="e.g. Yes, Messi scored 3 goals" 
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }} 
              />
            </div>

            <h4 style={{ marginBottom: '0.5rem' }}>User Answers</h4>
            {modalBets.length === 0 ? (
              <p style={{ color: '#666', fontStyle: 'italic', marginBottom: '1.5rem' }}>No bets placed on this question.</p>
            ) : (
              <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '1.5rem', border: '1px solid #eee', borderRadius: '4px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead style={{ backgroundColor: '#f9f9f9', position: 'sticky', top: 0 }}>
                    <tr>
                      <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>User</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Answer</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Status</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Mark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalBets.map(bet => (
                      <tr key={bet.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '0.5rem' }}>@{bet.user?.username}</td>
                        <td style={{ padding: '0.5rem', fontWeight: 'bold' }}>{bet.predictedData?.answer}</td>
                        <td style={{ padding: '0.5rem' }}>
                          <span style={{ color: bet.status === 'WON' ? 'green' : bet.status === 'LOST' ? 'red' : 'orange' }}>{bet.status}</span>
                        </td>
                        <td style={{ padding: '0.5rem' }}>
                          <button onClick={() => handleModalMarkBet(bet.id, 'WON')} style={{ backgroundColor: bet.status === 'WON' ? '#27AE60' : '#ddd', color: bet.status === 'WON' ? '#fff' : '#000', border: 'none', padding: '0.2rem 0.5rem', marginRight: '5px', borderRadius: '3px', cursor: 'pointer' }}>WON</button>
                          <button onClick={() => handleModalMarkBet(bet.id, 'LOST')} style={{ backgroundColor: bet.status === 'LOST' ? '#E74C3C' : '#ddd', color: bet.status === 'LOST' ? '#fff' : '#000', border: 'none', padding: '0.2rem 0.5rem', marginRight: '5px', borderRadius: '3px', cursor: 'pointer' }}>LOST</button>
                          <button onClick={() => handleModalMarkBet(bet.id, 'VOID')} style={{ backgroundColor: bet.status === 'VOID' ? '#95A5A6' : '#ddd', color: bet.status === 'VOID' ? '#fff' : '#000', border: 'none', padding: '0.2rem 0.5rem', borderRadius: '3px', cursor: 'pointer' }}>REFUND</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button onClick={() => setResolvingCq(null)} style={{ padding: '0.5rem 1rem', background: '#ccc', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleFinalizeResolve} style={{ padding: '0.5rem 1rem', background: '#27AE60', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Finalize Resolution</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
