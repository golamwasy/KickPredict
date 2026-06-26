'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TERMS_AND_CONDITIONS } from '../utils/terms';
import { API_BASE_URL } from '../utils/api';

export default function TermsEnforcer({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setIsClient(true);
    const checkTerms = () => {
      const userStr = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      
      if (userStr && token) {
        try {
          const user = JSON.parse(userStr);
          if (user.hasAcceptedTerms !== true) {
            setShowModal(true);
          } else {
            setShowModal(false);
          }
        } catch (e) {
          console.error('Failed to parse user', e);
        }
      } else {
        setShowModal(false);
      }
    };

    checkTerms();
    window.addEventListener('storage', checkTerms);
    return () => window.removeEventListener('storage', checkTerms);
  }, []);

  const handleAccept = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/auth/accept-terms`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (res.ok) {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          user.hasAcceptedTerms = true;
          localStorage.setItem('user', JSON.stringify(user));
        }
        setShowModal(false);
      } else {
        setError('Failed to accept terms. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecline = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setShowModal(false);
    router.push('/');
    window.dispatchEvent(new Event('storage')); // Force navbar update
  };

  if (!isClient) {
    // Prevent hydration mismatch by rendering children on server, we will check on client immediately
    return <>{children}</>;
  }

  if (!showModal) return <>{children}</>;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#050505',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{
        backgroundColor: '#111111',
        borderRadius: '12px',
        border: '1px solid #333',
        width: '100%',
        maxWidth: '800px',
        maxHeight: '85dvh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
      }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #333' }}>
          <h2 style={{ margin: 0, color: 'var(--fifa-lime)', fontFamily: 'Outfit, sans-serif' }}>
            Action Required: Terms of Use
          </h2>
          <p style={{ margin: '0.5rem 0 0', color: '#ccc', fontSize: '0.9rem' }}>
            To continue using KickPredict, you must review and accept the updated Terms of Use.
          </p>
        </div>

        <div 
          onScroll={(e) => {
            const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
            // Add a small 10px threshold in case zoom/pixel-rounding prevents it from hitting exact zero
            if (scrollHeight - scrollTop <= clientHeight + 10) {
              setHasScrolledToBottom(true);
            }
          }}
          style={{
            flex: 1,
            padding: '1.5rem',
            overflowY: 'auto',
            backgroundColor: '#0a0a0a',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: '0.95rem',
            color: '#bbb',
            lineHeight: '1.6',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word'
          }}
        >
          {TERMS_AND_CONDITIONS}
        </div>

        <div style={{
          padding: '1.5rem',
          borderTop: '1px solid #333',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          backgroundColor: '#111'
        }}>
          {error && <p style={{ color: 'red', margin: 0, textAlign: 'center', fontSize: '0.9rem' }}>{error}</p>}
          <div style={{ display: 'flex', flexWrap: 'wrap-reverse', gap: '1rem', justifyContent: 'flex-end', alignItems: 'center' }}>
            <button 
              onClick={handleDecline}
              disabled={isSubmitting}
              style={{
                padding: '0.8rem 1.5rem',
                backgroundColor: 'transparent',
                border: '1px solid #444',
                color: '#fff',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Decline & Log Out
            </button>
            <button 
              onClick={handleAccept}
              disabled={isSubmitting || !hasScrolledToBottom}
              style={{
                padding: '0.8rem 2rem',
                backgroundColor: hasScrolledToBottom ? 'var(--fifa-lime)' : '#333',
                border: 'none',
                color: hasScrolledToBottom ? '#000' : '#888',
                borderRadius: '6px',
                cursor: hasScrolledToBottom ? 'pointer' : 'not-allowed',
                fontWeight: 800,
                fontFamily: 'Outfit, sans-serif',
                letterSpacing: '0.05em',
                transition: 'all 0.2s'
              }}
            >
              {!hasScrolledToBottom ? 'Scroll to bottom to accept' : isSubmitting ? 'Accepting...' : 'I Accept'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
