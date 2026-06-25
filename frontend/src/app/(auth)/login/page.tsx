'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { API_BASE_URL } from '@/app/utils/api';

export default function Login() {
  const router = useRouter();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to login');
      }

      // Store token securely (using localStorage for simplicity here, secure cookies preferred for production)
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.dispatchEvent(new Event('storage')); // Force global state sync

      if (data.user.role === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '420px', margin: '4rem auto', animation: 'floatIn 0.6s ease both' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⚽</div>
        <h2 style={{ fontSize: '1.75rem', marginBottom: '0.4rem' }}>Welcome Back</h2>
        <p style={{ color: '#FFFFFF', fontSize: '1.15rem', fontWeight: 600, textShadow: '0 2px 8px #000000, 0 0 4px #000000', letterSpacing: '0.02em' }}>Log in to your KickPredict account</p>
      </div>

      <div className="card" style={{ borderColor: 'rgba(0,229,255,0.12)' }}>
        {error && <div className="alert-error">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="email">Email or Username</label>
            <input id="email" type="text" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="your@email.com or username" />
          </div>
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" required value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="••••••••" />
          </div>
          
          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '1.25rem' }}>
            {loading ? 'Logging in...' : 'Log In →'}
          </button>
        </form>

        <p style={{ marginTop: '1.5rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.9rem' }}>
          Don't have an account? <Link href="/signup" style={{ color: 'var(--fifa-red)', fontWeight: 700, textDecoration: 'underline' }}>Sign Up</Link>
        </p>
      </div>
      <style>{`@keyframes floatIn { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
}
