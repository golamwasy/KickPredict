'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { getFlag } from '../../utils/flags';
import { API_BASE_URL } from '../../utils/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type BetType =
  | 'MATCH_WINNER'
  | 'EXACT_SCORE'
  | 'OVER_UNDER_GOALS'
  | 'BOTH_TEAMS_TO_SCORE'
  | 'CORRECT_MARGIN'
  | 'FIRST_TO_SCORE'
  | 'DOUBLE_CHANCE';

interface BetTab {
  type: BetType;
  label: string;
  icon: string;
  multiplierHint: string;
}

const BET_TABS: BetTab[] = [
  { type: 'MATCH_WINNER',        label: 'Match Winner',       icon: '🏆', multiplierHint: '×1.8 – ×2.8' },
  { type: 'EXACT_SCORE',         label: 'Exact Score',        icon: '🎯', multiplierHint: '×8 – ×25' },
  { type: 'DOUBLE_CHANCE',       label: 'Double Chance',      icon: '🛡️', multiplierHint: '×1.3' },
  { type: 'OVER_UNDER_GOALS',    label: 'Over / Under',       icon: '📊', multiplierHint: '×1.9' },
  { type: 'BOTH_TEAMS_TO_SCORE', label: 'Both Teams Score',   icon: '⚽', multiplierHint: '×1.75 – ×1.85' },
  { type: 'CORRECT_MARGIN',      label: 'Goal Margin',        icon: '📏', multiplierHint: '×2.8 – ×10' },
  { type: 'FIRST_TO_SCORE',      label: 'First to Score',     icon: '⚡', multiplierHint: '×2.2 – ×5' },
];

const BET_STATUS_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  PENDING: { color: '#E67E22', bg: 'rgba(230,126,34,0.15)', label: 'Pending' },
  WON:     { color: '#27AE60', bg: 'rgba(39,174,96,0.15)',  label: 'Won 🏆' },
  LOST:    { color: '#E74C3C', bg: 'rgba(231,76,60,0.15)',  label: 'Lost' },
  VOID:    { color: '#95A5A6', bg: 'rgba(149,165,166,0.15)',label: 'Refunded' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatKC = (n: number) => n.toLocaleString() + ' 🪙';

function buildPredictedData(type: BetType, form: Record<string, any>) {
  switch (type) {
    case 'MATCH_WINNER':        return { outcome: form.outcome };
    case 'DOUBLE_CHANCE':       return { outcomes: form.outcomes };
    case 'EXACT_SCORE':         return { homeScore: Number(form.homeScore), awayScore: Number(form.awayScore) };
    case 'OVER_UNDER_GOALS':    return { line: 2.5, side: form.side };
    case 'BOTH_TEAMS_TO_SCORE': return { answer: form.answer === 'true' || form.answer === true };
    case 'CORRECT_MARGIN':      return { marginSide: form.marginSide, margin: Number(form.margin) };
    case 'FIRST_TO_SCORE':      return { team: form.team };
    default: return {};
  }
}

function predictedDataSummary(type: BetType, data: Record<string, any>, team1: string, team2: string): string {
  switch (type) {
    case 'MATCH_WINNER':
      return data.outcome === 'HOME' ? `${team1} Win` : data.outcome === 'AWAY' ? `${team2} Win` : 'Draw';
    case 'DOUBLE_CHANCE':
      return (data.outcomes as string[]).map(o => o === 'HOME' ? team1 : o === 'AWAY' ? team2 : 'Draw').join(' or ');
    case 'EXACT_SCORE':        return `${data.homeScore} – ${data.awayScore}`;
    case 'OVER_UNDER_GOALS':   return `${data.side === 'OVER' ? 'Over' : 'Under'} ${data.line} Goals`;
    case 'BOTH_TEAMS_TO_SCORE':return data.answer ? 'Yes — Both Score' : 'No — One team kept clean';
    case 'CORRECT_MARGIN':
      if (data.marginSide === 'DRAW') return 'Draw (0 goal margin)';
      return `${data.marginSide === 'HOME' ? team1 : team2} wins by ${data.margin}`;
    case 'FIRST_TO_SCORE':
      return data.team === 'HOME' ? `${team1} scores first` : data.team === 'AWAY' ? `${team2} scores first` : 'No goals';
    default: return JSON.stringify(data);
  }
}

// ─── Bet Form per type ────────────────────────────────────────────────────────

function BetForm({
  type,
  form,
  setForm,
  team1,
  team2,
}: {
  type: BetType;
  form: Record<string, any>;
  setForm: (f: Record<string, any>) => void;
  team1: string;
  team2: string;
}) {
  const optionStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '0.65rem 0.5rem',
    border: active ? '3px solid var(--fifa-black)' : '2px solid var(--fifa-black)',
    background: active ? 'var(--fifa-purple)' : '#FFFFFF',
    color: active ? '#FFFFFF' : 'var(--fifa-black)',
    fontWeight: active ? 900 : 700,
    fontSize: '0.82rem',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s',
    boxShadow: active ? '4px 4px 0px var(--fifa-black)' : '2px 2px 0px var(--fifa-black)',
    transform: active ? 'translate(-2px, -2px)' : 'none',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  });

  switch (type) {
    case 'MATCH_WINNER':
      return (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {[{ v: 'HOME', l: team1 + ' Win' }, { v: 'DRAW', l: 'Draw' }, { v: 'AWAY', l: team2 + ' Win' }].map(o => (
            <button key={o.v} style={optionStyle(form.outcome === o.v)} onClick={() => setForm({ outcome: o.v })}>{o.l}</button>
          ))}
        </div>
      );

    case 'DOUBLE_CHANCE': {
      const pairs: [string, string][] = [['HOME', 'DRAW'], ['HOME', 'AWAY'], ['DRAW', 'AWAY']];
      const pairLabel = (p: [string, string]) =>
        p.map(x => x === 'HOME' ? team1 : x === 'AWAY' ? team2 : 'Draw').join(' / ');
      const isActive = (p: [string, string]) =>
        JSON.stringify(form.outcomes) === JSON.stringify(p);
      return (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {pairs.map(p => (
            <button key={p.join()} style={optionStyle(isActive(p))} onClick={() => setForm({ outcomes: p })}>
              {pairLabel(p)}
            </button>
          ))}
        </div>
      );
    }

    case 'EXACT_SCORE':
      return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="input-group">
            <label>{team1} Goals</label>
            <input type="number" min="0" max="20" placeholder="e.g. 2"
              value={form.homeScore ?? ''}
              onChange={e => setForm({ ...form, homeScore: e.target.value })} />
          </div>
          <div className="input-group">
            <label>{team2} Goals</label>
            <input type="number" min="0" max="20" placeholder="e.g. 1"
              value={form.awayScore ?? ''}
              onChange={e => setForm({ ...form, awayScore: e.target.value })} />
          </div>
        </div>
      );

    case 'OVER_UNDER_GOALS':
      return (
        <div>
          <p style={{ fontSize: '0.8rem', color: '#555555', marginBottom: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Total goals in the match (line: 2.5)</p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {[{ v: 'OVER', l: 'Over 2.5 Goals' }, { v: 'UNDER', l: 'Under 2.5 Goals' }].map(o => (
              <button key={o.v} style={optionStyle(form.side === o.v)} onClick={() => setForm({ side: o.v })}>{o.l}</button>
            ))}
          </div>
        </div>
      );

    case 'BOTH_TEAMS_TO_SCORE':
      return (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {[{ v: 'true', l: 'Yes — Both Score' }, { v: 'false', l: 'No — Clean Sheet' }].map(o => (
            <button key={o.v} style={optionStyle(String(form.answer) === o.v)} onClick={() => setForm({ answer: o.v })}>{o.l}</button>
          ))}
        </div>
      );

    case 'CORRECT_MARGIN':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <p style={{ fontSize: '0.8rem', color: '#555555', marginBottom: '0.5rem', fontWeight: 700, textTransform: 'uppercase' }}>Winner</p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {[{ v: 'HOME', l: team1 }, { v: 'DRAW', l: 'Draw' }, { v: 'AWAY', l: team2 }].map(o => (
                <button key={o.v} style={optionStyle(form.marginSide === o.v)}
                  onClick={() => setForm({ ...form, marginSide: o.v, margin: o.v === 'DRAW' ? 0 : form.margin })}>{o.l}</button>
              ))}
            </div>
          </div>
          {form.marginSide && form.marginSide !== 'DRAW' && (
            <div className="input-group">
              <label>Goal Margin</label>
              <input type="number" min="1" max="10" placeholder="e.g. 2"
                value={form.margin ?? ''}
                onChange={e => setForm({ ...form, margin: e.target.value })} />
            </div>
          )}
        </div>
      );

    case 'FIRST_TO_SCORE':
      return (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {[{ v: 'HOME', l: team1 + ' scores first' }, { v: 'AWAY', l: team2 + ' scores first' }, { v: 'NONE', l: 'No goals' }].map(o => (
            <button key={o.v} style={optionStyle(form.team === o.v)} onClick={() => setForm({ team: o.v })}>{o.l}</button>
          ))}
        </div>
      );

    default:
      return null;
  }
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MatchDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  // Betting state
  const [activeBetType, setActiveBetType] = useState<BetType>('MATCH_WINNER');
  const [betForm, setBetForm] = useState<Record<string, any>>({});
  const [stake, setStake] = useState<number | ''>('');
  const [multiplier, setMultiplier] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [betError, setBetError] = useState('');
  const [betSuccess, setBetSuccess] = useState('');
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [existingBets, setExistingBets] = useState<any[]>([]);

  const fetchWalletAndBets = async (token: string) => {
    try {
      const [walletRes, betsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/wallet/me`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/bets/match/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (walletRes.ok) {
        const w = await walletRes.json();
        setWalletBalance(w.balance);
      }
      if (betsRes.ok) {
        const b = await betsRes.json();
        setExistingBets(b);
      }
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/matches/${id}`)
      .then(res => res.json())
      .then(data => { setMatch(data); setLoading(false); })
      .catch(() => setLoading(false));

    const token = localStorage.getItem('token');
    if (token) {
      setIsLoggedIn(true);
      fetchWalletAndBets(token);
    }
  }, [id]);

  // Countdown timer
  useEffect(() => {
    if (match?.status !== 'OPEN') return;
    const interval = setInterval(() => {
      const distance = new Date(match.kickoffTime).getTime() - Date.now();
      if (distance < 0) { setTimeLeft('Locked'); clearInterval(interval); return; }
      const h = Math.floor((distance % 86400000) / 3600000);
      const m = Math.floor((distance % 3600000) / 60000);
      const s = Math.floor((distance % 60000) / 1000);
      setTimeLeft(`${h}h ${m}m ${s}s remaining`);
    }, 1000);
    return () => clearInterval(interval);
  }, [match]);

  const betFormStr = JSON.stringify(betForm);

  // Fetch dynamic odds from API when form changes
  useEffect(() => {
    // If the bet type needs specific fields filled before calculating, check them first
    if (activeBetType === 'MATCH_WINNER' && !betForm.outcome) { setMultiplier(null); return; }
    if (activeBetType === 'DOUBLE_CHANCE' && !betForm.outcomes) { setMultiplier(null); return; }
    if (activeBetType === 'EXACT_SCORE' && (betForm.homeScore === undefined || betForm.homeScore === '' || betForm.awayScore === undefined || betForm.awayScore === '')) { setMultiplier(null); return; }
    if (activeBetType === 'OVER_UNDER_GOALS' && !betForm.side) { setMultiplier(null); return; }
    if (activeBetType === 'BOTH_TEAMS_TO_SCORE' && betForm.answer === undefined) { setMultiplier(null); return; }
    if (activeBetType === 'CORRECT_MARGIN' && !betForm.marginSide) { setMultiplier(null); return; }
    if (activeBetType === 'CORRECT_MARGIN' && betForm.marginSide !== 'DRAW' && !betForm.margin) { setMultiplier(null); return; }
    if (activeBetType === 'FIRST_TO_SCORE' && !betForm.team) { setMultiplier(null); return; }

    const fetchOdds = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/matches/${id}/odds`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            betType: activeBetType,
            predictedData: buildPredictedData(activeBetType, betForm)
          })
        });
        if (res.ok) {
          const data = await res.json();
          setMultiplier(data.multiplier);
        }
      } catch (err) {
        console.error('Failed to fetch odds', err);
      }
    };
    fetchOdds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBetType, betFormStr, id]);

  const handleTabChange = (type: BetType) => {
    setActiveBetType(type);
    setBetForm({});
    setBetError('');
    setBetSuccess('');
  };

  const submitBet = async () => {
    setBetError('');
    setBetSuccess('');
    if (!stake || Number(stake) <= 0) { setBetError('Enter a valid stake amount.'); return; }
    if (!multiplier) { setBetError('Please complete your prediction.'); return; }

    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/bets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          matchId: id,
          betType: activeBetType,
          predictedData: buildPredictedData(activeBetType, betForm),
          stake: Number(stake),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to place bet');

      setBetSuccess(`Bet placed! Potential payout: ${formatKC(data.potentialPayout)}`);
      setWalletBalance(data.newBalance);
      setStake('');
      setBetForm({});
      // Refresh bets list
      await fetchWalletAndBets(token);
      // Notify navbar
      window.dispatchEvent(new Event('walletUpdated'));
    } catch (err: any) {
      setBetError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '4rem' }}>Loading match...</div>;
  if (!match || match.error) return <div style={{ textAlign: 'center', padding: '4rem' }}>Match not found</div>;

  const canBet = match.status === 'OPEN' && isLoggedIn && new Date() < new Date(match.kickoffTime);
  const potentialPayout = multiplier && stake ? Math.round(Number(stake) * multiplier) : null;

  return (
    <div className="bg-vibe-matches" style={{ margin: '-3rem -1rem', padding: '3rem 1rem', minHeight: 'calc(100vh - 70px)' }}>
      <div className="container" style={{ maxWidth: '960px' }}>

        {/* Match Header Card */}
        <div className="match-card" style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <span className={`badge badge-${match.status.toLowerCase()}`}>{match.status}</span>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.85)', marginBottom: '2rem', fontWeight: 600 }}>
            Kickoff: {new Date(match.kickoffTime).toLocaleString('en-US', { timeZone: 'Europe/Helsinki', dateStyle: 'short', timeStyle: 'medium', hour12: true })} (Helsinki Time)
          </p>
          <div className="vs-container">
            <div className="vs-team">
              <div className="vs-flag">{getFlag(match.team1?.code)}</div>
              <h2 className="vs-team-name">{match.team1?.name}</h2>
              <div className="vs-team-code">{match.team1?.code}</div>
            </div>
            <div className="vs-divider">
              {match.status === 'FINISHED' || match.status === 'LIVE'
                ? `${match.team1Goals} – ${match.team2Goals}` : 'VS'}
            </div>
            <div className="vs-team">
              <div className="vs-flag">{getFlag(match.team2?.code)}</div>
              <h2 className="vs-team-name">{match.team2?.name}</h2>
              <div className="vs-team-code">{match.team2?.code}</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          {/* ─── Betting Panel ─── */}
          <div className="card" style={{ width: '100%', maxWidth: '800px' }}>
            <h3 style={{ marginBottom: '1.5rem', borderBottom: '3px solid var(--fifa-black)', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textTransform: 'uppercase', fontWeight: 900 }}>
              <span>Place Your Bet</span>
              {walletBalance !== null && (
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>
                  🪙 {walletBalance.toLocaleString()} KC
                </span>
              )}
            </h3>

            {!isLoggedIn ? (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <p style={{ color: '#555555', marginBottom: '1rem', fontWeight: 700 }}>Log in to place bets</p>
                <button className="btn-primary" onClick={() => router.push('/login')}>Login to Bet</button>
              </div>
            ) : !canBet ? (
              <div>
                <div style={{ color: 'var(--fifa-orange)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  🔒 Betting is {match.status === 'FINISHED' ? 'closed' : 'locked'} for this match.
                </div>
                {/* Show user's existing bets */}
                {existingBets.length > 0 && (
                  <div>
                    <p style={{ fontSize: '0.8rem', fontWeight: 900, color: '#555555', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>
                      Your Bets on this Match
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {existingBets.map(bet => {
                        const s = BET_STATUS_STYLE[bet.status] || BET_STATUS_STYLE.PENDING;
                        return (
                          <div key={bet.id} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                                {BET_TABS.find(t => t.type === bet.betType)?.label}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.2rem' }}>
                                {predictedDataSummary(bet.betType, bet.predictedData, match.team1?.name, match.team2?.name)}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, background: s.bg, color: s.color }}>{s.label}</span>
                              <div style={{ fontSize: '0.72rem', color: '#555555', marginTop: '0.25rem', fontWeight: 700 }}>
                                {bet.stake.toLocaleString()} KC → {bet.potentialPayout.toLocaleString()} KC
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                {/* Countdown */}
                <div style={{ color: '#2F6131', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  ⏳ {timeLeft}
                </div>

                {/* Existing bets summary */}
                {existingBets.length > 0 && (
                  <div style={{ marginBottom: '1.25rem', padding: '0.75rem', background: 'rgba(39,174,96,0.06)', border: '1px solid rgba(39,174,96,0.2)', borderRadius: '8px' }}>
                    <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#27AE60', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {existingBets.length} Bet{existingBets.length > 1 ? 's' : ''} Placed
                    </p>
                    {existingBets.map(bet => (
                      <div key={bet.id} style={{ fontSize: '0.78rem', color: '#000', fontWeight: 700 }}>
                        {BET_TABS.find(t => t.type === bet.betType)?.label} — {bet.stake.toLocaleString()} KC @ {bet.multiplier}×
                      </div>
                    ))}
                  </div>
                )}

                {/* Bet Type Tabs */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.25rem' }}>
                  {BET_TABS.map(tab => {
                    const alreadyBet = existingBets.some(b => b.betType === tab.type);
                    return (
                      <button
                        key={tab.type}
                        onClick={() => handleTabChange(tab.type)}
                        disabled={alreadyBet}
                        style={{
                          padding: '0.4rem 0.75rem',
                          borderRadius: '20px',
                          border: activeBetType === tab.type ? '3px solid var(--fifa-black)' : '2px solid var(--fifa-black)',
                          background: activeBetType === tab.type ? 'var(--fifa-purple)' : '#FFFFFF',
                          color: alreadyBet ? '#AAAAAA' : activeBetType === tab.type ? '#FFFFFF' : 'var(--fifa-black)',
                          fontWeight: 900,
                          fontSize: '0.75rem',
                          cursor: alreadyBet ? 'not-allowed' : 'pointer',
                          transition: 'all 0.15s',
                          opacity: alreadyBet ? 0.5 : 1,
                          boxShadow: activeBetType === tab.type ? '4px 4px 0px var(--fifa-black)' : '2px 2px 0px var(--fifa-black)',
                          transform: activeBetType === tab.type ? 'translate(-2px, -2px)' : 'none',
                        }}
                        title={alreadyBet ? 'Already bet on this type' : tab.multiplierHint}
                      >
                        {tab.icon} {tab.label} {alreadyBet ? '✓' : ''}
                      </button>
                    );
                  })}
                </div>

                {/* Active bet type info */}
                <div style={{ marginBottom: '1rem', padding: '0.8rem 1rem', background: '#F8F9FA', border: '2px solid var(--fifa-black)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '4px 4px 0px var(--fifa-black)' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--fifa-black)', fontWeight: 900, textTransform: 'uppercase' }}>
                    {BET_TABS.find(t => t.type === activeBetType)?.icon} {BET_TABS.find(t => t.type === activeBetType)?.label}
                  </span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--fifa-purple)' }}>
                    Multiplier: {multiplier ? `${multiplier}×` : 'Dynamic'}
                  </span>
                </div>

                {/* Prediction form */}
                <div style={{ marginBottom: '1rem' }}>
                  <BetForm
                    type={activeBetType}
                    form={betForm}
                    setForm={setBetForm}
                    team1={match.team1?.name || 'Home'}
                    team2={match.team2?.name || 'Away'}
                  />
                </div>

                {/* Stake input */}
                <div className="input-group" style={{ marginBottom: '0.75rem' }}>
                  <label>Stake (KickCoins)</label>
                  <input
                    type="number"
                    min="1"
                    max={walletBalance ?? undefined}
                    placeholder={`Max: ${walletBalance?.toLocaleString() ?? '—'} KC`}
                    value={stake}
                    onChange={e => setStake(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>

                {/* Quick stake buttons */}
                <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                  {[100, 500, 1000, 2500].map(v => (
                    <button
                      key={v}
                      onClick={() => setStake(Math.min(v, walletBalance ?? v))}
                      style={{
                        padding: '0.4rem 0.75rem',
                        border: '2px solid var(--fifa-black)',
                        background: '#FFFFFF',
                        color: 'var(--fifa-black)',
                        fontSize: '0.8rem',
                        fontWeight: 900,
                        cursor: 'pointer',
                        boxShadow: '2px 2px 0px var(--fifa-black)',
                        transition: 'all 0.1s'
                      }}
                    >
                      +{v.toLocaleString()}
                    </button>
                  ))}
                  {walletBalance && (
                    <button
                      onClick={() => setStake(walletBalance)}
                      style={{
                        padding: '0.4rem 0.75rem',
                        border: '2px solid var(--fifa-black)',
                        background: 'var(--fifa-purple)',
                        color: '#FFFFFF',
                        fontSize: '0.8rem',
                        fontWeight: 900,
                        cursor: 'pointer',
                        boxShadow: '2px 2px 0px var(--fifa-black)',
                        transition: 'all 0.1s'
                      }}
                    >
                      All In 🔥
                    </button>
                  )}
                </div>

                {/* Payout preview */}
                {multiplier && stake && Number(stake) > 0 && (
                  <div style={{
                    marginBottom: '1.5rem',
                    padding: '1rem',
                    background: 'var(--fifa-lime)',
                    border: '3px solid var(--fifa-black)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: '6px 6px 0px var(--fifa-black)'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--fifa-black)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Potential Payout</div>
                      <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--fifa-black)' }}>
                        {potentialPayout?.toLocaleString()} <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>KC 🪙</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--fifa-black)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Multiplier</div>
                      <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--fifa-black)' }}>{multiplier}×</div>
                    </div>
                  </div>
                )}

                {betError && <div style={{ color: '#E74C3C', fontSize: '0.85rem', marginBottom: '0.75rem', padding: '0.5rem 0.75rem', background: 'rgba(231,76,60,0.1)', borderRadius: '6px' }}>{betError}</div>}
                {betSuccess && <div style={{ color: '#27AE60', fontSize: '0.85rem', marginBottom: '0.75rem', padding: '0.5rem 0.75rem', background: 'rgba(39,174,96,0.1)', borderRadius: '6px' }}>{betSuccess}</div>}

                <button
                  className="btn-primary"
                  onClick={submitBet}
                  disabled={submitting || !multiplier || !stake || Number(stake) <= 0}
                  style={{ opacity: (!multiplier || !stake || Number(stake) <= 0) ? 0.5 : 1 }}
                >
                  {submitting ? 'Placing Bet...' : (stake && multiplier) ? `Bet ${Number(stake).toLocaleString()} KC @ ${multiplier}×` : 'Bet'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
