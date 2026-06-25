'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '../utils/api';

export default function AdminDashboard() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token || user.role !== 'ADMIN') {
      router.push('/');
      return;
    }

    Promise.all([
      fetch(`${API_BASE_URL}/api/admin/users`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API_BASE_URL}/api/admin/summary`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json())
    ]).then(([usersData, summaryData]) => {
      if (usersData.error) throw new Error(usersData.error);
      setUsers(usersData);
      setSummary(summaryData);
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
      alert(err.message);
    }
  };

  const handleBalanceChange = async (userId: string, currentBalance: number) => {
    const newBalanceStr = prompt(`Enter new balance (Current: ${currentBalance}):`, currentBalance.toString());
    if (newBalanceStr === null) return;
    
    const newBalance = parseInt(newBalanceStr, 10);
    if (isNaN(newBalance) || newBalance < 0) {
      alert('Invalid balance amount');
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
      alert(err.message);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '4rem' }}>Loading admin dashboard...</div>;
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
                  <td style={{ padding: '0.5rem' }}>
                    <button onClick={() => toggleUserStatus(u.id)} style={{ color: u.isActive ? 'var(--danger-color)' : 'var(--success-color)', textDecoration: 'underline' }}>
                      {u.isActive ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>

        <div className="card">
          <h2 style={{ marginBottom: '1.5rem' }}>Recent API Sync Logs (ESPN)</h2>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {summary?.recentSyncLogs.map((log: any) => (
              <div key={log.id} style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span className={`badge ${log.status === 'SUCCESS' ? 'badge-open' : 'badge-locked'}`}>{log.status}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{new Date(log.createdAt).toLocaleString()}</span>
                </div>
                <p>{log.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
