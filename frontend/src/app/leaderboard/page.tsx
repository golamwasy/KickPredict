import Link from "next/link";
import { API_BASE_URL } from "../utils/api";


async function getLeaderboard() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/leaderboard`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed");
    return res.json();
  } catch { return []; }
}

export default async function LeaderboardPage() {
  const leaderboard = await getLeaderboard();

  const medals = ["#FFD600", "#C0C0C0", "#CD7F32"];

  return (
    <div className="container">
      <div style={{ textAlign: 'center', marginBottom: '3rem', animation: 'floatIn 0.6s ease both' }}>

        <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🏆</div>
        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", color: "var(--gold)", textShadow: "0 0 30px rgba(255,214,0,0.3)", marginBottom: "0.75rem" }}>Global Leaderboard</h1>
        <p style={{ color: '#FFFFFF', fontSize: '1.15rem', fontWeight: 600, textShadow: '0 2px 8px #000000, 0 0 4px #000000', letterSpacing: '0.02em' }}>See how you stack up against football fans worldwide</p>
      </div>

      <div className="card" style={{ padding: 0, overflowX: "auto", borderColor: "rgba(255,214,0,0.15)", boxShadow: "0 0 40px rgba(255,214,0,0.05)", animation: "floatIn 0.6s ease 0.1s both" }}>
        <div className="lb-header" style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)", color: "#555555", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
          <span>Rank</span>
          <span>Player</span>
          <span style={{ textAlign: "center" }}>Points</span>
          <span className="lb-col-hide" style={{ textAlign: "center", whiteSpace: "nowrap" }}>Predicted (Done)</span>
          <span className="lb-col-hide" style={{ textAlign: "center" }}>Corrected</span>
          <span className="lb-col-hide" style={{ textAlign: "center" }}>Exact Scores</span>
          <span className="lb-col-hide" style={{ textAlign: "center" }}>Accuracy</span>
        </div>

        {leaderboard.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#555555" }}>No users ranked yet. Be the first to predict!</div>
        ) : (
          leaderboard.map((user: any, i: number) => {
            const colorClass = i === 0 ? "lb-row-0" : i === 1 ? "lb-row-1" : i === 2 ? "lb-row-2" : "lb-row-default";
            return (
              <div key={user.id} className={`lb-row ${colorClass}`} style={{ animation: `floatIn 0.5s ease ${i * 0.05}s both` }}>
                <div>
                  <div className={"rank-badge rank-" + (i < 3 ? (i + 1) : "other")}>
                    {i < 3 ? ["🥇", "🥈", "🥉"][i] : "#" + user.rank}
                  </div>
                </div>
                <div style={{ fontWeight: 900, fontSize: "1.2rem", textTransform: "uppercase" }}>{user.username}</div>
                <div style={{ fontWeight: 900, fontSize: "1.2rem", fontFamily: "Outfit, sans-serif", textAlign: "center" }}>{user.totalPoints} <span style={{ fontSize: "0.7rem", fontWeight: 600 }}>pts</span></div>
                <div className="lb-col-hide" style={{ fontSize: "0.9rem", fontWeight: 700, textAlign: "center" }}>{user.totalPredictions} ({user.resolvedPredictions})</div>
                <div className="lb-col-hide" style={{ fontSize: "0.9rem", fontWeight: 700, textAlign: "center" }}>{user.correctResults}</div>
                <div className="lb-col-hide" style={{ fontSize: "0.9rem", fontWeight: 700, textAlign: "center" }}>{user.exactScores}</div>
                <div className="lb-col-hide" style={{ fontSize: "0.9rem", fontWeight: 700, textAlign: "center" }}>{user.accuracy}%</div>
              </div>
            );
          })
        )}
      </div>
      <style>{"@keyframes floatIn { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }"}</style>
    </div>
  );
}
