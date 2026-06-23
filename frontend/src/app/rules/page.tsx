export default function Rules() {
  return (
    <div className="container" style={{ maxWidth: "860px" }}>
      <div style={{ textAlign: "center", marginBottom: "3rem", animation: "floatIn 0.6s ease both" }}>
        <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>📋</div>
        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", marginBottom: "0.75rem" }}>Official Rules</h1>
        <p style={{ color: '#FFFFFF', fontSize: '1.15rem', fontWeight: 600, textShadow: '0 2px 8px #000000, 0 0 4px #000000', letterSpacing: '0.02em' }}>Understand how to earn maximum points every match</p>
      </div>

      <div style={{ display: "grid", gap: "1.5rem" }}>
        {/* Card 1 */}
        <div className="card" style={{ background: "rgba(255, 255, 255, 0.95)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.4)", boxShadow: "0 8px 32px rgba(0,0,0,0.15)", animation: "floatIn 0.6s ease 0.1s both", padding: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.25rem" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "rgba(0,229,255,0.15)", border: "1px solid rgba(0,229,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem", flexShrink: 0 }}>🎯</div>
            <div>
              <h2 style={{ fontSize: "1.3rem", color: "#1A1A1A", marginBottom: "0.2rem", fontWeight: 800 }}>Correct Result — <span style={{ color: "var(--fifa-blue)" }}>3 Points</span></h2>
              <p style={{ fontSize: "0.95rem", color: "#555555", fontWeight: 500 }}>Predict the winning team or a draw</p>
            </div>
          </div>
          <div style={{ background: "rgba(0,0,0,0.04)", borderRadius: "10px", padding: "1rem 1.25rem", fontSize: "0.95rem", color: "#444444", border: "1px solid rgba(0,0,0,0.05)" }}>
            💡 <strong style={{ color: "#000000" }}>Example:</strong> You predict a 2-1 Team 1 win. Final score: 1-0. You earn <strong style={{ color: "var(--fifa-blue)" }}>3 pts</strong> for the correct result.
          </div>
        </div>

        {/* Card 2 */}
        <div className="card" style={{ background: "rgba(255, 255, 255, 0.95)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.4)", boxShadow: "0 8px 32px rgba(0,0,0,0.15)", animation: "floatIn 0.6s ease 0.2s both", padding: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.25rem" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "rgba(255,214,0,0.2)", border: "1px solid rgba(255,214,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem", flexShrink: 0 }}>⭐</div>
            <div>
              <h2 style={{ fontSize: "1.3rem", color: "#1A1A1A", marginBottom: "0.2rem", fontWeight: 800 }}>Exact Score — <span style={{ color: "var(--fifa-purple)" }}>5 Bonus Points</span></h2>
              <p style={{ fontSize: "0.95rem", color: "#555555", fontWeight: 500 }}>Nail the exact final scoreline for a massive bonus</p>
            </div>
          </div>
          <div style={{ background: "rgba(0,0,0,0.04)", borderRadius: "10px", padding: "1rem 1.25rem", fontSize: "0.95rem", color: "#444444", border: "1px solid rgba(0,0,0,0.05)" }}>
            💡 <strong style={{ color: "#000000" }}>Example:</strong> You predict 2-1. Final: 2-1. You earn <strong style={{ color: "var(--fifa-purple)" }}>5 + 3 = 8 pts</strong>!
          </div>
        </div>

        {/* Card 3 */}
        <div className="card" style={{ background: "rgba(255, 255, 255, 0.95)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.4)", boxShadow: "0 8px 32px rgba(0,0,0,0.15)", animation: "floatIn 0.6s ease 0.3s both", padding: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.25rem" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "rgba(255,0,102,0.15)", border: "1px solid rgba(255,0,102,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem", flexShrink: 0 }}>⚽</div>
            <div>
              <h2 style={{ fontSize: "1.3rem", color: "#1A1A1A", marginBottom: "0.2rem", fontWeight: 800 }}>Correct Goals — <span style={{ color: "var(--fifa-red)" }}>1 Point Each</span></h2>
              <p style={{ fontSize: "0.95rem", color: "#555555", fontWeight: 500 }}>Earn 1 point per team whose goals you predict correctly</p>
            </div>
          </div>
          <div style={{ background: "rgba(0,0,0,0.04)", borderRadius: "10px", padding: "1rem 1.25rem", fontSize: "0.95rem", color: "#444444", border: "1px solid rgba(0,0,0,0.05)" }}>
            💡 <strong style={{ color: "#000000" }}>Example:</strong> You predict 2-0 Team 1. Final: 2-2. Team 1 scored exactly 2 — earn <strong style={{ color: "var(--fifa-red)" }}>1 pt</strong>.
          </div>
        </div>

        {/* Card 4 */}
        <div className="card" style={{ background: "rgba(255, 255, 255, 0.95)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.4)", boxShadow: "0 8px 32px rgba(0,0,0,0.15)", animation: "floatIn 0.6s ease 0.4s both", padding: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "rgba(108,17,255,0.15)", border: "1px solid rgba(108,17,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem", flexShrink: 0 }}>⏰</div>
            <div>
              <h2 style={{ fontSize: "1.3rem", color: "#1A1A1A", marginBottom: "0.2rem", fontWeight: 800 }}>Deadline: Lock at Kickoff</h2>
              <p style={{ color: "#555555", fontSize: "0.95rem", lineHeight: 1.6, fontWeight: 500 }}>Predictions open 24 hours before kickoff and lock permanently when the whistle blows. <strong style={{ color: "#000000" }}>No late entries.</strong></p>
            </div>
          </div>
        </div>

        {/* Card 5 - Max Points */}
        <div className="card" style={{ textAlign: "center", background: "rgba(255, 255, 255, 0.95)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.4)", boxShadow: "0 8px 32px rgba(0,0,0,0.15)", animation: "floatIn 0.6s ease 0.5s both", padding: "2.5rem" }}>
          <p style={{ color: "#777777", marginBottom: "0.5rem", fontSize: "1rem", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 800 }}>Maximum points per match</p>
          <div style={{ fontSize: "5rem", fontWeight: 900, color: "var(--fifa-green)", fontFamily: "Outfit, sans-serif", textShadow: "0 8px 24px rgba(0,230,118,0.25)" }}>10</div>
          <p style={{ color: "#444444", fontSize: "1.05rem", fontWeight: 600 }}>3 (result) + 5 (exact score) + 1 + 1 (goals)</p>
        </div>
      </div>
      <style>{"@keyframes floatIn { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }"}</style>
    </div>
  );
}
