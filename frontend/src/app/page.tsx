import Link from "next/link";


export default function Home() {
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
        <Link href="/signup" className="btn-primary" style={{ width: "auto", padding: "1rem 2.5rem", fontSize: "1rem" }}>
          Start Predicting Free →
        </Link>
        <Link href="/matches" style={{ display: "inline-flex", alignItems: "center", padding: "1rem 2.5rem", fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "1rem", textTransform: "uppercase", letterSpacing: "0.06em", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "10px", color: "#fff", transition: "all 0.25s" }}>
          View Matches
        </Link>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem", textAlign: "left" }}>
        <div className="card" style={{ borderColor: "rgba(0,229,255,0.2)", animation: "floatIn 0.6s ease 0.4s both" }}>
          <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>🎯</div>
          <h3 style={{ fontSize: "1.1rem", marginBottom: "0.75rem", color: "var(--fifa-blue)" }}>Score Predictions</h3>
          <p style={{ color: "#555555", fontSize: "0.95rem" }}>Predict exact scores or just the result. Earn up to 10 points per match with our layered scoring system.</p>
        </div>
        <div className="card" style={{ borderColor: "rgba(255,214,0,0.2)", animation: "floatIn 0.6s ease 0.5s both" }}>
          <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>🏆</div>
          <h3 style={{ fontSize: "1.1rem", marginBottom: "0.75rem", color: "var(--fifa-purple)" }}>Global Leaderboard</h3>
          <p style={{ color: "#555555", fontSize: "0.95rem" }}>Compete against fans worldwide. See who the real football genius is when the World Cup is over.</p>
        </div>
        <div className="card" style={{ borderColor: "rgba(255,0,102,0.2)", animation: "floatIn 0.6s ease 0.6s both" }}>
          <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⚡</div>
          <h3 style={{ fontSize: "1.1rem", marginBottom: "0.75rem", color: "var(--fifa-red)" }}>Live Updates</h3>
          <p style={{ color: "#555555", fontSize: "0.95rem" }}>Points are calculated automatically after each match. Watch your rank rise in real-time.</p>
        </div>
      </div>
    </div>
  );
}
