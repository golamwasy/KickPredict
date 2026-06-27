'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getFlag, getFlagImgUrl } from '../utils/flags';
import { API_BASE_URL } from '../utils/api';

type TabType = 'open' | 'upcoming' | 'past';

export default function MatchesListClient({ matches, settings = {} }: { matches: any[], settings?: Record<string, string> }) {
  const [activeTab, setActiveTab] = useState<TabType>('open');
  const [predictedMatchIds, setPredictedMatchIds] = useState<Set<string>>(new Set());
  const [userPredictions, setUserPredictions] = useState<any[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [tournamentQuestionCount, setTournamentQuestionCount] = useState<number>(0);

  useEffect(() => {
    // Fetch tournament questions count
    fetch(`${API_BASE_URL}/api/tournament/questions`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setTournamentQuestionCount(data.length);
        }
      })
      .catch(console.error);

    const token = localStorage.getItem('token');
    if (!token) {
      setIsLoggedIn(false);
      return;
    }
    setIsLoggedIn(true);

    fetch(`${API_BASE_URL}/api/bets/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setUserPredictions(data);
          const ids = data.map((b: any) => b.matchId);
          setPredictedMatchIds(new Set(ids));
        }
      })
      .catch(console.error);
  }, []);

  const now = new Date().toISOString();
  const openMatches = matches.filter(m => m.status === 'OPEN' && m.kickoffTime > now && (m.stage === 'group-stage' || settings[`show_${m.stage}`] === 'true'));
  const upcomingMatches = matches.filter(m => m.status === 'UPCOMING' && (m.stage === 'group-stage' || settings[`show_${m.stage}`] === 'true'));
  const pastMatches = matches.filter(m => ['FINISHED', 'LIVE', 'LOCKED'].includes(m.status) && (m.stage === 'group-stage' || settings[`show_${m.stage}`] === 'true'));

  const filteredMatches = (activeTab === 'open' ? openMatches : activeTab === 'upcoming' ? upcomingMatches : pastMatches).sort((a: any, b: any) => {
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
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#FFFFFF', margin: 0 }}>
              Live Now
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2.5rem' }}>
            {ongoingMatches.map((match: any) => {


              return (
                <Link href={`/matches/${match.id}`} key={match.id} style={{ display: 'block', textDecoration: 'none', marginBottom: '1.25rem' }}>
                  {/* TV Scoreboard Pill Graphic as the Card */}
                  <div className="scoreboard-pill-card">
                    {/* Team 1 Name & Flag */}
                    <div className="scoreboard-team-wrap">
                      <span className="scoreboard-team-flag">{getFlag(match.team1?.code)}</span>
                      <span className="scoreboard-team-text hide-mobile">
                        {match.team1?.name || 'TBD'}
                      </span>
                      <span className="scoreboard-team-text hide-desktop">
                        {match.team1?.code || 'TBD'}
                      </span>
                    </div>

                    {/* Score Capsule & Prediction Wrapper */}
                    <div className="score-capsule-wrapper">

                      <div className="live-score-capsule">
                        <span className="live-score-text">{match.team1Goals ?? 0}</span>

                        {/* FIFA 26 Logo Badge */}
                        <div className="fifa-logo-badge">
                          <img
                            src="/fifa-logo-2026.png"
                            alt="FIFA 2026"
                            className="fifa-logo-img"
                          />
                        </div>

                        <span className="live-score-text">{match.team2Goals ?? 0}</span>
                      </div>
                    </div>

                    {/* Team 2 Name & Flag */}
                    <div className="scoreboard-team-wrap team-right">
                      <span className="scoreboard-team-text hide-mobile">
                        {match.team2?.name || 'TBD'}
                      </span>
                      <span className="scoreboard-team-text hide-desktop">
                        {match.team2?.code || 'TBD'}
                      </span>
                      <span className="scoreboard-team-flag">{getFlag(match.team2?.code)}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          <style>{`
            @keyframes livePulse {
              0%   { box-shadow: 0 0 0 0 rgba(255,13,30,0.6); opacity: 0.3; }
              50%  { opacity: 1; }
              70%  { box-shadow: 0 0 0 8px rgba(255,13,30,0); }
              100% { box-shadow: 0 0 0 0 rgba(255,13,30,0); opacity: 0.3; }
            }
          `}</style>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '3rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', maxWidth: '100%' }}>
          <div className="match-tabs" style={{ marginBottom: '1rem' }}>
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

          {/* ── World Cup Tournament Questions Banner ── */}
          <Link
            href="/tournament"
            style={{
              display: 'block',
              position: 'relative',
              width: '100%',
              background: 'var(--fifa-purple)',
              color: '#FFFFFF',
              border: '3px solid #000000',
              padding: '1rem',
              textAlign: 'center',
              textDecoration: 'none',
              boxShadow: '4px 4px 0px #000000',
              transition: 'transform 0.15s, box-shadow 0.15s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translate(-2px, -2px)';
              e.currentTarget.style.boxShadow = '6px 6px 0px #000000';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '4px 4px 0px #000000';
            }}
          >
            <div style={{ position: 'absolute', top: '-12px', right: '1rem', display: 'flex', gap: '0.5rem' }}>
              {tournamentQuestionCount > 0 && (
                <div style={{ background: 'var(--fifa-cyan)', color: '#000', padding: '0.2rem 0.8rem', borderRadius: '20px', fontWeight: 900, border: '2px solid #000', fontSize: '0.75rem' }}>
                  {tournamentQuestionCount} {tournamentQuestionCount === 1 ? 'QUESTION' : 'QUESTIONS'}
                </div>
              )}
            </div>

            <div style={{ fontSize: '1.25rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
              🏆 World Cup Tournament Questions
            </div>
          </Link>
        </div>
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
                {group.matches.map((match: any) => {
                  const isUpcoming = match.status === 'UPCOMING';
                  const isPlaceholder = (name: string) => name && (name.includes('Place') || name.includes('Winner'));
                  const isGroup32Match = isPlaceholder(match.team1?.name) || isPlaceholder(match.team2?.name);
                  
                  // Disable if upcoming OR if it's a placeholder (like Group 32 matches)
                  const isDisabled = isUpcoming || (activeTab === 'open' && isGroup32Match);
                  
                  const CardWrapper = isDisabled ? 'div' : Link;
                  const wrapperProps = isDisabled
                    ? { style: { display: 'block', cursor: 'default', opacity: 0.85 } }
                    : { href: !isLoggedIn && match.status === 'OPEN' ? '/login' : `/matches/${match.id}`, style: { display: 'block' } };

                  return (
                    <CardWrapper key={match.id} {...(wrapperProps as any)}>
                      <div className="premium-match-card" style={{ height: '100%', ...(isDisabled ? { boxShadow: 'none' } : {}) }}>
                        <div className="match-content">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                              {activeTab === 'open' && (
                                predictedMatchIds.has(match.id) ? (
                                  <span className="badge" style={{ background: 'var(--fifa-green)', color: '#000000', boxShadow: 'none', border: 'none', padding: '0.4rem 0.8rem' }}>✓ BET PLACED</span>
                                ) : (
                                  <span className="badge badge-open" style={{ boxShadow: 'none', border: 'none', padding: '0.4rem 0.8rem', opacity: isGroup32Match ? 0.5 : 1 }}>⚡ OPEN</span>
                                )
                              )}
                              {activeTab === 'upcoming' && <span className="badge badge-upcoming" style={{ boxShadow: 'none', border: 'none', padding: '0.4rem 0.8rem' }}>📅 UPCOMING</span>}
                              {activeTab === 'past' && <span className="badge" style={{ background: 'rgba(255,255,255,0.15)', color: '#FFFFFF', boxShadow: 'none', border: 'none', padding: '0.4rem 0.8rem' }}>🏆 FINISHED</span>}
                            </div>

                            <span style={{ fontSize: '0.85rem', color: '#AAAAAA', fontWeight: 700, fontFamily: 'Outfit, sans-serif', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                              {new Date(match.kickoffTime).toLocaleString('en-US', { timeZone: 'Europe/Helsinki', hour: 'numeric', minute: '2-digit', hour12: true })}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ textAlign: 'center', flex: 1 }}>
                              <div className="team-flag-lg">{getFlag(match.team1?.code)}</div>
                              <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 900, fontSize: '1.4rem', letterSpacing: '0.05em' }}>{match.team1?.code || 'TBD'}</div>
                              <div style={{ fontSize: '0.85rem', color: '#888888', marginTop: '0.2rem' }}>{match.team1?.name}</div>
                            </div>

                            <div style={{ textAlign: 'center', padding: '0 0.5rem', flexShrink: 0 }}>
                              {match.status === 'FINISHED' || match.status === 'LIVE' ? (
                                <div className="score-pill" style={{ whiteSpace: 'nowrap' }}>{match.team1Goals} – {match.team2Goals}</div>
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

                          {/* Community Questions Badge below teams */}
                          {activeTab === 'open' && match._count?.communityQuestions > 0 && (
                            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: 'rgba(0, 229, 255, 0.1)',
                                color: 'var(--fifa-cyan)',
                                padding: '0.4rem 0.8rem',
                                borderRadius: '20px',
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                border: '1px solid rgba(0, 229, 255, 0.3)'
                              }}>
                                💬 {match._count.communityQuestions} Community {match._count.communityQuestions === 1 ? 'Question' : 'Questions'}
                              </span>
                            </div>
                          )}
                        </div>

                        {activeTab === 'open' && (
                          <div className="action-area">
                            <span className="action-text" style={{ color: isGroup32Match ? '#888888' : 'var(--fifa-lime)' }}>
                              {isGroup32Match ? 'TEAMS TBD' : (predictedMatchIds.has(match.id) ? 'View / Add Bets →' : 'Bet Now →')}
                            </span>
                          </div>
                        )}
                        {activeTab === 'past' && isLoggedIn && (
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
