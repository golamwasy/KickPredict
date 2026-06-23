'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getFlag } from '../utils/flags';
import { API_BASE_URL } from '../utils/api';

type TabType = 'open' | 'upcoming' | 'past';

export default function MatchesListClient({ matches }: { matches: any[] }) {
  const [activeTab, setActiveTab] = useState<TabType>('open');
  const [predictedMatchIds, setPredictedMatchIds] = useState<Set<string>>(new Set());
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setIsLoggedIn(false);
      return;
    }
    setIsLoggedIn(true);

    fetch(`${API_BASE_URL}/api/predictions/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (Array.isArray(data)) {
        const ids = data.map((p: any) => p.matchId);
        setPredictedMatchIds(new Set(ids));
      }
    })
    .catch(console.error);
  }, []);

  const filteredMatches = matches.filter((m: any) => {
    if (activeTab === 'open') return m.status === 'OPEN';
    if (activeTab === 'upcoming') return m.status === 'UPCOMING';
    if (activeTab === 'past') return m.status === 'FINISHED';
    return false;
  }).sort((a: any, b: any) => {
    const timeA = new Date(a.kickoffTime).getTime();
    const timeB = new Date(b.kickoffTime).getTime();
    if (activeTab === 'upcoming' || activeTab === 'open') {
      return timeA - timeB; // Ascending (recent to future)
    }
    return timeB - timeA; // Descending (Past Results)
  });

  const groupedArray: { date: string, matches: any[] }[] = [];
  filteredMatches.forEach((match: any) => {
    const dateStr = new Date(match.kickoffTime).toLocaleDateString('en-US', {
      timeZone: 'Europe/Helsinki',
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
    const lastGroup = groupedArray[groupedArray.length - 1];
    if (lastGroup && lastGroup.date === dateStr) {
      lastGroup.matches.push(match);
    } else {
      groupedArray.push({ date: dateStr, matches: [match] });
    }
  });

  const ongoingMatches = matches
    .filter((m: any) => m.status === 'LOCKED' || m.status === 'LIVE')
    .sort((a: any, b: any) => new Date(a.kickoffTime).getTime() - new Date(b.kickoffTime).getTime());

  return (
    <>
      {/* ── Live Now section (always visible when matches are ongoing) ── */}
      {ongoingMatches.length > 0 && (
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem', paddingBottom: '0.5rem', borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
            {/* pulsing red dot */}
            <span style={{
              display: 'inline-block',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: 'var(--fifa-red)',
              boxShadow: '0 0 0 0 rgba(255,13,30,0.6)',
              animation: 'livePulse 1.4s ease-in-out infinite',
            }} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fifa-red)', margin: 0 }}>
              Live Now
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {ongoingMatches.map((match: any) => (
              <Link href={`/matches/${match.id}`} key={match.id} style={{ display: 'block' }}>
                <div className="premium-match-card" style={{ height: '100%' }}>
                  <div className="match-content">
                    {/* status badge + time */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                      {match.status === 'LIVE' ? (
                        <span className="badge badge-live" style={{ boxShadow: 'none', border: 'none', padding: '0.4rem 0.8rem' }}>🔴 LIVE</span>
                      ) : (
                        <span className="badge badge-locked" style={{ boxShadow: 'none', border: 'none', padding: '0.4rem 0.8rem' }}>🔒 LOCKED</span>
                      )}
                      <span style={{ fontSize: '0.85rem', color: '#AAAAAA', fontWeight: 700, fontFamily: 'Outfit, sans-serif', letterSpacing: '0.05em' }}>
                        {new Date(match.kickoffTime).toLocaleString('en-US', { timeZone: 'Europe/Helsinki', hour: 'numeric', minute: '2-digit', hour12: true })}
                      </span>
                    </div>

                    {/* teams */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ textAlign: 'center', flex: 1 }}>
                        <div className="team-flag-lg">{getFlag(match.team1?.code)}</div>
                        <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 900, fontSize: '1.4rem', letterSpacing: '0.05em' }}>{match.team1?.code || 'TBD'}</div>
                        <div style={{ fontSize: '0.85rem', color: '#888888', marginTop: '0.2rem' }}>{match.team1?.name}</div>
                      </div>

                      <div style={{ textAlign: 'center', padding: '0 0.5rem' }}>
                        <div className="score-pill">
                          {match.team1Goals ?? 0} – {match.team2Goals ?? 0}
                        </div>
                      </div>

                      <div style={{ textAlign: 'center', flex: 1 }}>
                        <div className="team-flag-lg">{getFlag(match.team2?.code)}</div>
                        <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 900, fontSize: '1.4rem', letterSpacing: '0.05em' }}>{match.team2?.code || 'TBD'}</div>
                        <div style={{ fontSize: '0.85rem', color: '#888888', marginTop: '0.2rem' }}>{match.team2?.name}</div>
                      </div>
                    </div>
                  </div>

                  {/* footer cta */}
                  <div className="action-area">
                    <span className="action-text" style={{ color: 'var(--fifa-lime)' }}>
                      View Live Stats →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <style>{`
            @keyframes livePulse {
              0%   { box-shadow: 0 0 0 0 rgba(255,13,30,0.6); }
              70%  { box-shadow: 0 0 0 8px rgba(255,13,30,0); }
              100% { box-shadow: 0 0 0 0 rgba(255,13,30,0); }
            }
          `}</style>
        </div>
      )}

      <div className="match-tabs">
        <button
          onClick={() => setActiveTab('open')}
          style={{
            background: activeTab === 'open' ? 'var(--fifa-lime)' : '#FFFFFF',
            color: '#000000',
            border: '3px solid #000000',
            padding: '0.75rem 1.5rem',
            fontFamily: 'Outfit, sans-serif',
            fontWeight: 900,
            fontSize: '1rem',
            textTransform: 'uppercase',
            boxShadow: activeTab === 'open' ? 'inset 0 0 0 0 transparent' : '4px 4px 0px #000000',
            transform: activeTab === 'open' ? 'translate(4px, 4px)' : 'none',
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
        >
          Today's Matches
        </button>
        <button
          onClick={() => setActiveTab('upcoming')}
          style={{
            background: activeTab === 'upcoming' ? 'var(--fifa-purple)' : '#FFFFFF',
            color: activeTab === 'upcoming' ? '#FFFFFF' : '#000000',
            border: '3px solid #000000',
            padding: '0.75rem 1.5rem',
            fontFamily: 'Outfit, sans-serif',
            fontWeight: 900,
            fontSize: '1rem',
            textTransform: 'uppercase',
            boxShadow: activeTab === 'upcoming' ? 'inset 0 0 0 0 transparent' : '4px 4px 0px #000000',
            transform: activeTab === 'upcoming' ? 'translate(4px, 4px)' : 'none',
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
        >
          Upcoming
        </button>
        <button
          onClick={() => setActiveTab('past')}
          style={{
            background: activeTab === 'past' ? 'var(--fifa-red)' : '#FFFFFF',
            color: activeTab === 'past' ? '#FFFFFF' : '#000000',
            border: '3px solid #000000',
            padding: '0.75rem 1.5rem',
            fontFamily: 'Outfit, sans-serif',
            fontWeight: 900,
            fontSize: '1rem',
            textTransform: 'uppercase',
            boxShadow: activeTab === 'past' ? 'inset 0 0 0 0 transparent' : '4px 4px 0px #000000',
            transform: activeTab === 'past' ? 'translate(4px, 4px)' : 'none',
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
        >
          Past Results
        </button>
      </div>

      {filteredMatches.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{activeTab === 'past' ? '📜' : '⏳'}</div>
          <p style={{ color: '#555555', fontSize: '1.1rem' }}>
            {activeTab === 'open' && "No open matches right now. Check back soon!"}
            {activeTab === 'upcoming' && "No upcoming matches scheduled."}
            {activeTab === 'past' && "No past match results available yet."}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          {groupedArray.map((group, index) => (
            <div key={group.date} style={{ animation: `floatIn 0.5s ease ${index * 0.1}s both` }}>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', paddingBottom: '0.5rem', borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                {group.date}
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                {group.matches.map((match: any) => {
                  const isUpcoming = match.status === 'UPCOMING';
                  const CardWrapper = isUpcoming ? 'div' : Link;
                  const wrapperProps = isUpcoming
                    ? { key: match.id, style: { display: 'block', cursor: 'default', opacity: 0.85 } }
                    : { href: !isLoggedIn && match.status === 'OPEN' ? '/login' : `/matches/${match.id}`, key: match.id, style: { display: 'block' } };

                  return (
                    <CardWrapper {...(wrapperProps as any)}>
                      <div className="premium-match-card" style={{ height: '100%', ...(isUpcoming ? { boxShadow: 'none' } : {}) }}>
                        <div className="match-content">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            {activeTab === 'open' && (
                              predictedMatchIds.has(match.id) ? (
                                <span className="badge" style={{ background: 'var(--fifa-green)', color: '#000000', boxShadow: 'none', border: 'none', padding: '0.4rem 0.8rem' }}>✓ PREDICTED</span>
                              ) : (
                                <span className="badge badge-open" style={{ boxShadow: 'none', border: 'none', padding: '0.4rem 0.8rem' }}>⚡ OPEN</span>
                              )
                            )}
                            {activeTab === 'upcoming' && <span className="badge badge-upcoming" style={{ boxShadow: 'none', border: 'none', padding: '0.4rem 0.8rem' }}>📅 UPCOMING</span>}
                            {activeTab === 'past' && <span className="badge" style={{ background: 'rgba(255,255,255,0.15)', color: '#FFFFFF', boxShadow: 'none', border: 'none', padding: '0.4rem 0.8rem' }}>🏆 FINISHED</span>}

                            <span style={{ fontSize: '0.85rem', color: '#AAAAAA', fontWeight: 700, fontFamily: 'Outfit, sans-serif', letterSpacing: '0.05em' }}>
                              {new Date(match.kickoffTime).toLocaleString('en-US', { timeZone: 'Europe/Helsinki', hour: 'numeric', minute: '2-digit', hour12: true })}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ textAlign: 'center', flex: 1 }}>
                              <div className="team-flag-lg">{getFlag(match.team1?.code)}</div>
                              <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 900, fontSize: '1.4rem', letterSpacing: '0.05em' }}>{match.team1?.code || 'TBD'}</div>
                              <div style={{ fontSize: '0.85rem', color: '#888888', marginTop: '0.2rem' }}>{match.team1?.name}</div>
                            </div>

                            <div style={{ textAlign: 'center', padding: '0 0.5rem' }}>
                              {match.status === 'FINISHED' || match.status === 'LIVE' ? (
                                <div className="score-pill">{match.team1Goals} – {match.team2Goals}</div>
                              ) : (
                                <div className="vs-pill">VS</div>
                              )}
                            </div>

                            <div style={{ textAlign: 'center', flex: 1 }}>
                              <div className="team-flag-lg">{getFlag(match.team2?.code)}</div>
                              <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 900, fontSize: '1.4rem', letterSpacing: '0.05em' }}>{match.team2?.code || 'TBD'}</div>
                              <div style={{ fontSize: '0.85rem', color: '#888888', marginTop: '0.2rem' }}>{match.team2?.name}</div>
                            </div>
                          </div>
                        </div>

                        {activeTab === 'open' && (
                          <div className="action-area">
                            <span className="action-text" style={{ color: 'var(--fifa-lime)' }}>
                              {predictedMatchIds.has(match.id) ? 'Update Prediction →' : 'Predict Now →'}
                            </span>
                          </div>
                        )}
                        {activeTab === 'past' && (
                          <div className="action-area">
                            <span className="action-text" style={{ color: '#AAAAAA' }}>
                              View Details →
                            </span>
                          </div>
                        )}
                      </div>
                    </CardWrapper>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
