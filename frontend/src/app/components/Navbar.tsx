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
          {!isAdmin && <Link href="/matches" className={styles.link} onClick={closeMenu}>Matches</Link>}
          <Link href="/leaderboard" className={styles.link} onClick={closeMenu}>Leaderboard</Link>
          {isLoggedIn && !isAdmin && <Link href="/dashboard" className={styles.link} onClick={closeMenu}>Dashboard</Link>}
          {isAdmin && <Link href="/admin" className={styles.link} onClick={closeMenu}>Admin</Link>}

          <div className={styles.auth}>
            {isLoggedIn ? (
              <>
                {kickCoins !== null && !isAdmin && (
                  <Link
                    href="/wallet"
                    onClick={closeMenu}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 1rem',
                      background: 'var(--fifa-lime)',
                      borderRadius: '0px',
                      border: '3px solid #000000',
                      color: '#000000',
                      fontWeight: 900,
                      fontSize: '0.9rem',
                      letterSpacing: '0.05em',
                      textDecoration: 'none',
                      transition: 'transform 0.15s, box-shadow 0.15s',
                      boxShadow: '4px 4px 0px rgba(0,0,0,1)',
                      whiteSpace: 'nowrap',
                      textTransform: 'uppercase'
                    }}
                  >
                    Balance: {kickCoins.toLocaleString()} KC
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
