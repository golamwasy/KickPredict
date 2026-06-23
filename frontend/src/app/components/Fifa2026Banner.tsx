// FIFA World Cup 2026 Official Branding Banner
export function Fifa2026Banner({ compact = false }: { compact?: boolean }) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '0.5rem 1.5rem',
      borderRadius: '999px',
      border: '1px solid rgba(255,255,255,0.2)',
      background: 'rgba(255,255,255,0.05)',
      fontFamily: 'Outfit, sans-serif',
      fontWeight: 900,
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
      fontSize: compact ? '0.8rem' : '1.1rem'
    }}>
      <span style={{ fontSize: compact ? '1rem' : '1.3rem' }}>🏆</span>
      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
        <span style={{ color: '#00F0FF' }}>FIFA</span>
        <span style={{ color: '#82E0AA' }}>WORLD CUP</span>
        <span style={{ color: '#FFD700' }}>2026</span>
      </div>
      <div style={{ display: 'flex', gap: '0.4rem', color: 'rgba(255,255,255,0.5)', fontSize: compact ? '0.7rem' : '0.9rem', alignItems: 'center' }}>
        <span>🇺🇸</span>
        <span>&middot;</span>
        <span>🇨🇦</span>
        <span>&middot;</span>
        <span>🇲🇽</span>
      </div>
    </div>
  );
}
