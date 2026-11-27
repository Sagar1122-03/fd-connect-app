export function Shell({ tabs, tab, setTab, children }) {
  return (
    <div>
      <nav aria-label="Sections">
        {tabs.map(([key, label]) => (
          <button key={key} aria-current={tab === key} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </nav>
      <main>{children}</main>
    </div>
  );
}