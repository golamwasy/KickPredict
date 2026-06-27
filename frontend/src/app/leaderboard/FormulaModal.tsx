"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

export default function FormulaModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const modalContent = (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(8px)',
      zIndex: 99999, // Ensure it's above everything
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
      animation: 'fadeIn 0.2s ease both'
    }}>
      <div style={{
        background: 'linear-gradient(180deg, rgba(30,30,30,0.95) 0%, rgba(15,15,15,0.98) 100%)',
        border: '1px solid rgba(255, 214, 0, 0.2)',
        borderRadius: '20px',
        padding: '2.5rem 2rem',
        maxWidth: '550px',
        width: '100%',
        maxHeight: '85vh',
        overflowY: 'auto',
        color: '#fff',
        position: 'relative',
        animation: 'slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) both',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
        textAlign: 'left'
      }}>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            position: 'absolute', top: '1.25rem', right: '1.25rem',
            background: 'rgba(255,255,255,0.1)', border: 'none',
            color: '#fff', width: '32px', height: '32px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.2rem', cursor: 'pointer', transition: 'background 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
        >
          &times;
        </button>

        <h2 style={{ color: 'var(--gold)', marginBottom: '1rem', fontSize: '1.6rem', fontWeight: 800 }}>Your Kick Score is based on three things:</h2>

        <ul style={{ listStyle: 'none', padding: 0, marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <li style={{ background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '12px', borderLeft: '4px solid #27AE60' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem', color: '#fff' }}>1. Your Accuracy & Profitability</div>
            <div style={{ color: '#ccc', fontSize: '0.95rem', lineHeight: 1.5 }}>We look at both your <b>Win Rate</b> (how often you predict correctly) and your <b>Profit</b> (how much you've won compared to what you've risked). This ensures a high-accuracy player isn't penalized just because they didn't hit one massive multiplier bet. We reward genuine skill over pure luck.</div>
          </li>
          <li style={{ background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '12px', borderLeft: '4px solid #3498DB' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem', color: '#fff' }}>2. How many bets you've placed</div>
            <div style={{ color: '#ccc', fontSize: '0.95rem', lineHeight: 1.5 }}>A score based on just 1 or 2 bets isn't very meaningful yet — it could easily be luck. The more bets you place, the more your score reflects real skill instead of one good or bad result. Keep predicting throughout the tournament and your score becomes more "trusted."</div>
          </li>
          <li style={{ background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '12px', borderLeft: '4px solid #E74C3C' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem', color: '#fff' }}>3. How much you've actually played</div>
            <div style={{ color: '#ccc', fontSize: '0.95rem', lineHeight: 1.5 }}>Staying active and placing real stakes over time is rewarded. Sitting on a big balance without playing doesn't move your score.</div>
          </li>
        </ul>

        <p style={{ color: '#fff', marginBottom: '1.5rem', fontSize: '0.95rem', lineHeight: 1.6, background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
          <b>Put simply:</b> Kick Score rewards players who predict accurately and consistently over the course of the tournament. That's why someone with a smaller balance but a high hit-rate might rank higher than someone sitting on a big balance from a single lucky bet.
        </p>

        <div style={{
          background: 'linear-gradient(90deg, rgba(255,214,0,0.1) 0%, rgba(255,214,0,0.05) 100%)',
          border: '1px solid rgba(255,214,0,0.3)',
          padding: '1.25rem',
          borderRadius: '12px',
          textAlign: 'center',
          fontWeight: 800,
          color: 'var(--gold)',
          fontSize: '1.2rem',
          letterSpacing: '0.05em'
        }}>
          SCORE = 100 + ( [ROI + ACCURACY] × CONFIDENCE × ACTIVITY )
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        style={{
          background: '#fc8803',
          border: '4px solid var(--fifa-black)',
          color: 'var(--fifa-black)',
          padding: '0.75rem 1.75rem',
          cursor: 'pointer',
          fontSize: '1rem',
          fontWeight: 900,
          marginTop: '1.5rem',
          boxShadow: '6px 6px 0px var(--fifa-black)',
          transition: 'all 0.1s ease',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.transform = 'translate(4px, 4px)';
          e.currentTarget.style.boxShadow = '2px 2px 0px var(--fifa-black)';
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = 'translate(0px, 0px)';
          e.currentTarget.style.boxShadow = '6px 6px 0px var(--fifa-black)';
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = '#fda43a'; // Slightly brighter orange on hover
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = '#fc8803';
          e.currentTarget.style.transform = 'translate(0px, 0px)';
          e.currentTarget.style.boxShadow = '6px 6px 0px var(--fifa-black)';
        }}
      >
        <span>ℹ️</span> How is the Kick Score calculated?
      </button>

      {mounted && isOpen && createPortal(modalContent, document.body)}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>
    </>
  );
}
