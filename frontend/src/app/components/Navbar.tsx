'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import styles from './Navbar.module.css';

export default function Navbar() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      setIsLoggedIn(!!localStorage.getItem('token'));
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      setIsAdmin(user.role === 'ADMIN');
    };
    checkAuth();
    
    // Poll for changes since Next.js transitions might not trigger storage events in same window
    const interval = setInterval(checkAuth, 1000);
    window.addEventListener('storage', checkAuth);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', checkAuth);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setIsAdmin(false);
    setIsMobileMenuOpen(false);
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
          <Link href="/rules" className={styles.link} onClick={closeMenu}>Rules</Link>
          <div className={styles.auth}>
            {isLoggedIn ? (
              <button onClick={handleLogout} className={styles.logoutBtn}>Log Out</button>
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
