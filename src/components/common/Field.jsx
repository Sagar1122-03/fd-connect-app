export function Field({ label, children, error }) {
  return (
    <label>
      {label}
      {children}
      {error && <p className="err">{error}</p>}
    </label>
  );
}