export function StatusTag({ s }) {
  const variant = s === 'approved' ? 'ok' : s === 'rejected' ? 'no' : 'wait';
  return <span className={`tag ${variant}`}>{s[0].toUpperCase() + s.slice(1)}</span>;
}