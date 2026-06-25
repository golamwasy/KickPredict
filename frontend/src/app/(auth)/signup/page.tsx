'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { API_BASE_URL } from '@/app/utils/api';
import { TERMS_AND_CONDITIONS } from '@/app/utils/terms';

export default function Signup() {
  const router = useRouter();
  const [formData, setFormData] = useState({ fullName: '', email: '', username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!acceptedTerms) {
        throw new Error('You must accept the Terms of Use to create an account');
      }
      const res = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to sign up');
      }

      router.push(`/verify?email=${encodeURIComponent(formData.email)}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div style={{ maxWidth: '420px', margin: '4rem auto', animation: 'floatIn 0.6s ease both' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⚽</div>
        <h2 style={{ fontSize: '1.75rem', marginBottom: '0.4rem' }}>Join KickPredict</h2>
        <p style={{ color: '#FFFFFF', fontSize: '1.15rem', fontWeight: 600, textShadow: '0 2px 8px #000000, 0 0 4px #000000', letterSpacing: '0.02em' }}>Create your free account and start predicting</p>
      </div>

      <div className="card" style={{ borderColor: 'rgba(255,0,102,0.12)' }}>
        {error && <div className="alert-error">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="fullName">Full Name</label>
            <input id="fullName" type="text" required value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} placeholder="Your name" />
          </div>
          <div className="input-group">
            <label htmlFor="username">Username</label>
            <input id="username" type="text" required value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} placeholder="Choose a username" />
          </div>
          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="your@email.com" />
          </div>
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" required value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="••••••••" />
          </div>
          <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
            <input 
              type="checkbox" 
              id="terms" 
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              style={{ marginTop: '0.25rem', cursor: 'pointer' }}
            />
            <label htmlFor="terms" style={{ fontSize: '0.85rem', color: '#ccc', lineHeight: '1.4' }}>
              I have read and agree to the{' '}
              <button 
                type="button" 
                onClick={(e) => { e.preventDefault(); setShowTerms(true); }}
                style={{ background: 'none', border: 'none', color: 'var(--fifa-lime)', padding: 0, textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}
              >
                Terms of Use & Disclaimer
              </button>
            </label>
          </div>
          
          <button type="submit" className="btn-primary" disabled={loading || !acceptedTerms} style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
            {loading ? (
              <>
                <div style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #ffffff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                Creating account...
              </>
            ) : 'Sign Up Free →'}
          </button>
        </form>

        <p style={{ marginTop: '1.5rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.9rem' }}>
          Already have an account? <Link href="/login" style={{ color: 'var(--fifa-red)', fontWeight: 700, textDecoration: 'underline' }}>Log In</Link>
        </p>
      </div>
      <style>{`
        @keyframes floatIn { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      </div>

      {showTerms && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.95)', zIndex: 9999, display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: '1rem',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{
            backgroundColor: '#111111', borderRadius: '12px', border: '1px solid #333',
            width: '100%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
          }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: 'var(--fifa-lime)', fontFamily: 'Outfit, sans-serif' }}>Terms of Use & Disclaimer</h3>
              <button onClick={() => setShowTerms(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.2rem', padding: '0.5rem' }}>✕</button>
            </div>
            <div style={{ 
              flex: 1, 
              overflowY: 'auto', 
              padding: '1.5rem', 
              backgroundColor: '#0a0a0a',
              fontFamily: 'system-ui, -apple-system, sans-serif', 
              fontSize: '0.95rem', 
              color: '#bbb', 
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word'
            }}>
              {TERMS_AND_CONDITIONS}
            </div>
            <div style={{ padding: '1.5rem', borderTop: '1px solid #333', textAlign: 'right', backgroundColor: '#111' }}>
              <button onClick={() => { setShowTerms(false); setAcceptedTerms(true); }} className="btn-primary" style={{ padding: '0.8rem 2rem', fontWeight: 800, letterSpacing: '0.05em' }}>
                I Agree
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
