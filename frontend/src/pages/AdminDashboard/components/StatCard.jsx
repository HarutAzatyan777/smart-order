export default function StatCard({ label, value, hint }) {
  return (
    <div className="stat-card">
      <p className="stat-label">{label}</p>
      <strong>{value}</strong>
      <span className="stat-hint">{hint}</span>
    </div>
  );
}
