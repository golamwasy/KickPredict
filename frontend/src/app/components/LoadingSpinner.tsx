'use client';

import { useEffect, useState } from 'react';

export default function LoadingSpinner({ text = 'Loading...', onComplete }: { text?: string, onComplete?: () => void }) {
  const [progress, setProgress] = useState(0);
  const [isGoal, setIsGoal] = useState(false);

  useEffect(() => {
    // Simulate loading progress approaching 100%
    const duration = 2500; // 2.5 seconds to reach 100%
    const interval = 30;
    const steps = duration / interval;
    const increment = 100 / steps;

    const timer = setInterval(() => {
      setProgress(p => {
        const next = p + increment;
        if (next >= 100) {
          clearInterval(timer);
          setIsGoal(true);
          
          if (onComplete) {
            setTimeout(onComplete, 1000); // Show goal animation for 1 second before calling onComplete
          }
          return 100;
        }
        return next;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [onComplete]);

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
        
        {isGoal ? (
          <div style={{ position: 'relative', width: '130px', height: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Goalpost at the back (Bigger) */}
            <div style={{ position: 'absolute', fontSize: '6.5rem', zIndex: 1, animation: 'popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
              🥅
            </div>
            {/* Blast in the middle (Slightly smaller, moved down) */}
            <div style={{ position: 'absolute', fontSize: '2.5rem', zIndex: 2, marginTop: '20px', animation: 'blast 0.4s ease-out 0.1s both' }}>
              💥
            </div>
            {/* Football in the front (Smaller, moved down) */}
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

        <p style={{ color: '#FFFFFF', margin: 0, fontWeight: 700, fontSize: '1.1rem', letterSpacing: '0.05em' }}>
          {isGoal ? 'GOAL!' : text}
        </p>
        
        {/* Progress Bar Container */}
        <div style={{ width: '220px', height: '8px', backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ 
            height: '100%', 
            width: `${progress}%`, 
            backgroundColor: isGoal ? 'var(--success, #0ED64B)' : 'var(--warning, #FFC107)', 
            transition: 'width 0.1s linear, background-color 0.3s ease',
            boxShadow: isGoal ? '0 0 15px var(--success, #0ED64B)' : '0 0 10px var(--warning, #FFC107)'
          }} />
        </div>
        
        <div style={{ color: '#FFFFFF', fontSize: '0.9rem', fontWeight: 600 }}>
          {Math.round(progress)}%
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
        `}</style>
      </div>
    </div>
  );
}
