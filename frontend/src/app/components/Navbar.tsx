'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import styles from './Navbar.module.css';
import { API_BASE_URL } from '../utils/api';

export default function Navbar() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [kickCoins, setKickCoins] = useState<number | null>(null);

  const fetchWallet = async (token: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/wallet/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setKickCoins(data.balance);
      }
    } catch {
      // silently fail
    }
  };

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      setIsLoggedIn(!!token);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      setIsAdmin(user.role === 'ADMIN');
      if (token) fetchWallet(token);
      else setKickCoins(null);
    };
    checkAuth();

    // Poll for auth changes and wallet balance refresh
    const interval = setInterval(checkAuth, 10000);
    window.addEventListener('storage', checkAuth);
    // Allow other components to trigger a wallet refresh
    window.addEventListener('walletUpdated', checkAuth as EventListener);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', checkAuth);
      window.removeEventListener('walletUpdated', checkAuth as EventListener);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setIsAdmin(false);
    setIsMobileMenuOpen(false);
    setKickCoins(null);
    router.push('/');
  };

  const closeMenu = () => setIsMobileMenuOpen(false);

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          KickPredict
        </Link>
        <button className={styles.mobileMenuBtn} onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? '✕' : '☰'}
        </button>
        <div className={`${styles.mobileMenu} ${isMobileMenuOpen ? styles.open : ''}`}>
          <Link href="/matches" className={styles.link} onClick={closeMenu}>Matches</Link>
          <Link href="/leaderboard" className={styles.link} onClick={closeMenu}>Leaderboard</Link>
          <Link href="/dashboard" className={styles.link} onClick={closeMenu}>Dashboard</Link>
          {isAdmin && <Link href="/admin" className={styles.link} onClick={closeMenu}>Admin</Link>}
          <Link href="/wallet" className={styles.link} onClick={closeMenu}>Wallet</Link>
          <div className={styles.auth}>
            {isLoggedIn ? (
              <>
                {kickCoins !== null && (
                  <Link
                    href="/wallet"
                    onClick={closeMenu}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.35rem 0.75rem',
                      background: 'linear-gradient(135deg, #6300E4 0%, #9B40FF 100%)',
                      borderRadius: '20px',
                      border: '1.5px solid rgba(255,255,255,0.2)',
                      color: '#FFFFFF',
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      letterSpacing: '0.02em',
                      textDecoration: 'none',
                      transition: 'transform 0.15s, box-shadow 0.15s',
                      boxShadow: '0 2px 12px rgba(99,0,228,0.4)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span style={{ fontSize: '1rem' }}>🪙</span>
                    {kickCoins.toLocaleString()} KC
                  </Link>
                )}
                <button onClick={handleLogout} className={styles.logoutBtn}>Log Out</button>
              </>
            ) : (
              <>
                <Link href="/login" className={styles.loginBtn} onClick={closeMenu}>Login</Link>
                <Link href="/signup" className={styles.signupBtn} onClick={closeMenu}>Sign Up</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
