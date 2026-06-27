'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Home() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsLoggedIn(true);
      setIsRedirecting(true);
      router.push('/matches');
    }
  }, [router]);

  if (isRedirecting) {
    return null;
  }

  return (
    <div className="container" style={{ textAlign: "center", paddingTop: "3rem", paddingBottom: "4rem" }}>

      <h1 style={{ fontSize: "clamp(3rem, 8vw, 5.5rem)", marginBottom: "1.5rem", lineHeight: 1, animation: "floatIn 0.6s ease 0.1s both" }}>
        <span className="gradient-text">Predict.</span>{" "}
        <span style={{ color: "var(--gold)" }}>Compete.</span>{" "}
        <span style={{ color: "#fff" }}>Win.</span>
      </h1>
      <p style={{ color: '#FFFFFF', fontSize: '1.2rem', fontWeight: 600, textShadow: '0 2px 8px #000000, 0 0 4px #000000', letterSpacing: '0.02em', maxWidth: '560px', margin: '0 auto 2.5rem', lineHeight: 1.7, animation: 'floatIn 0.6s ease 0.2s both' }}>
        The ultimate FIFA World Cup 2026 prediction platform. Guess exact scores, climb the global leaderboard, and prove you know the beautiful game.
      </p>
      <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap", marginBottom: "6rem", animation: "floatIn 0.6s ease 0.3s both" }}>
        <Link href={isLoggedIn ? "/matches" : "/signup"} className="btn-primary" style={{ width: "auto", padding: "1rem 2.5rem", fontSize: "1rem" }}>
          Start Predicting Free →
        </Link>
        <Link href="/matches" style={{ display: "inline-flex", alignItems: "center", padding: "1rem 2.5rem", fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "1rem", textTransform: "uppercase", letterSpacing: "0.06em", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "10px", color: "#fff", transition: "all 0.25s" }}>
          View Matches
        </Link>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem", textAlign: "left" }}>
        {/* Score Predictions Card */}
        <div className="card" style={{ border: "3px solid var(--fifa-black)", boxShadow: "6px 6px 0px var(--fifa-cyan)", animation: "floatIn 0.6s ease 0.4s both" }}>
          <div style={{ marginBottom: "1.25rem" }}>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="var(--fifa-black)" strokeWidth="3" fill="var(--fifa-cyan)" />
              <circle cx="12" cy="12" r="6" stroke="var(--fifa-black)" strokeWidth="2.5" fill="var(--fifa-white)" />
              <circle cx="12" cy="12" r="2.5" fill="var(--fifa-red)" stroke="var(--fifa-black)" strokeWidth="1.5" />
            </svg>
          </div>
          <h3 style={{ fontSize: "1.2rem", marginBottom: "0.75rem", fontWeight: 900, color: "var(--fifa-black)" }}>Score Predictions</h3>
          <p style={{ color: "#555555", fontSize: "0.95rem", lineHeight: 1.5, fontWeight: 500 }}>
            Predict exact scores or just the result. Earn up to 10 points per match with our layered scoring system.
          </p>
        </div>

        {/* Global Leaderboard Card */}
        <div className="card" style={{ border: "3px solid var(--fifa-black)", boxShadow: "6px 6px 0px var(--fifa-lime)", animation: "floatIn 0.6s ease 0.5s both" }}>
          <div style={{ marginBottom: "1.25rem" }}>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 9H4.5C3.67157 9 3 9.67157 3 10.5V11.5C3 12.3284 3.67157 13 4.5 13H6M18 9H19.5C20.3284 9 21 9.67157 21 10.5V11.5C21 12.3284 20.3284 13 19.5 13H18" stroke="var(--fifa-black)" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M6 6H18V13C18 16.3137 15.3137 19 12 19C8.68629 19 6 16.3137 6 13V6Z" fill="var(--fifa-lime)" stroke="var(--fifa-black)" strokeWidth="3" />
              <path d="M12 19V22M9 22H15" stroke="var(--fifa-black)" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
          <h3 style={{ fontSize: "1.2rem", marginBottom: "0.75rem", fontWeight: 900, color: "var(--fifa-black)" }}>Global Leaderboard</h3>
          <p style={{ color: "#555555", fontSize: "0.95rem", lineHeight: 1.5, fontWeight: 500 }}>
            Compete against fans worldwide. See who the real football genius is when the World Cup is over.
          </p>
        </div>

        {/* Live Updates Card */}
        <div className="card" style={{ border: "3px solid var(--fifa-black)", boxShadow: "6px 6px 0px var(--fifa-red)", animation: "floatIn 0.6s ease 0.6s both" }}>
          <div style={{ marginBottom: "1.25rem" }}>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="var(--fifa-red)" stroke="var(--fifa-black)" strokeWidth="3" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 style={{ fontSize: "1.2rem", marginBottom: "0.75rem", fontWeight: 900, color: "var(--fifa-black)" }}>Live Updates</h3>
          <p style={{ color: "#555555", fontSize: "0.95rem", lineHeight: 1.5, fontWeight: 500 }}>
            Points are calculated automatically after each match. Watch your rank rise in real-time.
          </p>
        </div>
      </div>
    </div>
  );
}
