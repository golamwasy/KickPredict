import MatchesListClient from './MatchesListClient';

async function getMatches() {
  try {
    const res = await fetch('http://127.0.0.1:5001/api/matches', { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed');
    return res.json();
  } catch { return []; }
}

export default async function MatchesPage() {
  const matches = await getMatches();

  return (
    <div className="container">
      <div style={{ textAlign: 'center', marginBottom: '3rem', animation: 'floatIn 0.6s ease both' }}>

        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', marginBottom: '0.75rem' }}>
          <span className="gradient-text">Match Center</span>
        </h1>
        <p style={{ color: '#FFFFFF', fontSize: '1.15rem', fontWeight: 600, textShadow: '0 2px 8px #000000, 0 0 4px #000000', letterSpacing: '0.02em' }}>
          Pick your predictions before kickoff — once the whistle blows, predictions are locked!
        </p>
      </div>

      <MatchesListClient matches={matches} />
      
      <style>{`@keyframes floatIn { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
}

