'use client';

import { useEffect, useState } from 'react';

export default function LoadingSpinner({ text = 'Loading...' }: { text?: string }) {
  const [showGoal, setShowGoal] = useState(false);

  useEffect(() => {
    // Toggle between bouncing balls and GOAL! every 1.5 seconds
    const timer = setInterval(() => {
      setShowGoal(prev => !prev);
    }, 1500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>

      {/* Container with dark glass background for readability */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.5rem',
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(8px)',
        padding: '2.5rem 4rem',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
      }}>

        <div style={{ height: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {showGoal ? (
            <div style={{ position: 'relative', width: '130px', height: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {/* Goalpost at the back */}
              <div style={{ position: 'absolute', fontSize: '6.5rem', zIndex: 1, animation: 'popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
                🥅
              </div>
              {/* Blast in the middle */}
              <div style={{ position: 'absolute', fontSize: '2.5rem', zIndex: 2, marginTop: '20px', animation: 'blast 0.4s ease-out 0.1s both' }}>
                💥
              </div>
              {/* Football in the front */}
              <div style={{ position: 'absolute', fontSize: '2rem', zIndex: 3, marginTop: '20px', animation: 'shootIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) both' }}>
                ⚽️
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <div className="football fb-1">⚽️</div>
              <div className="football fb-2">⚽️</div>
              <div className="football fb-3">⚽️</div>
            </div>
          )}
        </div>

        <p style={{ color: '#FFFFFF', margin: 0, fontWeight: 700, fontSize: '1.1rem', letterSpacing: '0.05em' }}>
          {text}
        </p>

        {/* Indeterminate Progress Bar Container */}
        <div style={{ width: '220px', height: '8px', backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
          <div className="indeterminate-bar" style={{
            height: '100%',
            width: '40%',
            backgroundColor: 'var(--fifa-lime, #D4FF00)',
            borderRadius: '4px',
            boxShadow: '0 0 10px var(--fifa-lime, #D4FF00)',
            position: 'absolute'
          }} />
        </div>

        <style>{`
          .football {
            font-size: 2.5rem;
            animation: bounce 0.5s infinite alternate ease-in;
            transform-origin: bottom;
            filter: drop-shadow(0 4px 6px rgba(0,0,0,0.4));
          }
          .fb-1 { animation-delay: 0s; }
          .fb-2 { animation-delay: 0.15s; }
          .fb-3 { animation-delay: 0.3s; }

          @keyframes bounce {
            0% { transform: translateY(0) scaleY(0.85); }
            100% { transform: translateY(-25px) scaleY(1); }
          }
          
          @keyframes popIn {
            0% { transform: scale(0.5); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }

          @keyframes blast {
            0% { transform: scale(0) rotate(-45deg); opacity: 0; }
            50% { transform: scale(1.5) rotate(10deg); opacity: 1; }
            100% { transform: scale(1) rotate(0deg); opacity: 1; }
          }
          
          @keyframes shootIn {
            0% { transform: scale(3) translateY(50px); opacity: 0; }
            100% { transform: scale(1) translateY(0); opacity: 1; }
          }

          .indeterminate-bar {
            animation: scan 1.5s cubic-bezier(0.65, 0.05, 0.36, 1) infinite alternate;
          }

          @keyframes scan {
            0% { left: -10%; }
            100% { left: 70%; }
          }
        `}</style>
      </div>
    </div>
  );
}
