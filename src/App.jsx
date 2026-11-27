import { useEffect, useState } from 'react';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { Auth } from './components/auth/Auth';
import { BankDashboard } from './components/bank/BankDashboard';
import { UserDashboard } from './components/user/UserDashboard';
import { initialSeed } from './data/seedData';

export default function App() {
  const [db, setDb] = useState(() => {
    const saved = localStorage.getItem('fd_connect_db');
    return saved ? JSON.parse(saved) : initialSeed;
  });

  const [sess, setSess] = useState(() => {
    const savedSess = localStorage.getItem('fd_connect_sess');
    return savedSess ? JSON.parse(savedSess) : null;
  });

  const [msg, setMsg] = useState('');

  useEffect(() => {
    localStorage.setItem('fd_connect_db', JSON.stringify(db));
  }, [db]);

  useEffect(() => {
    if (sess) localStorage.setItem('fd_connect_sess', JSON.stringify(sess));
    else localStorage.removeItem('fd_connect_sess');
  }, [sess]);

  const toast = (m) => {
    setMsg(m);
    setTimeout(() => setMsg(''), 2600);
  };

  const label = !sess
    ? ''
    : sess.role === 'admin'
    ? 'Admin panel'
    : sess.role === 'bank'
    ? 'Bank panel'
    : 'User panel';

  return (
    <div>
      {sess && (
        <header className="top">
          <div className="brand">
            FD Connect<small>{label}</small>
          </div>
          <button className="btn ghost" onClick={() => setSess(null)}>
            Log out
          </button>
        </header>
      )}

      {!sess ? (
        <Auth db={db} setDb={setDb} onLogin={setSess} />
      ) : sess.role === 'admin' ? (
        <AdminDashboard db={db} setDb={setDb} toast={toast} />
      ) : sess.role === 'bank' ? (
        <BankDashboard db={db} setDb={setDb} sess={sess} toast={toast} />
      ) : (
        <UserDashboard db={db} setDb={setDb} sess={sess} toast={toast} />
      )}

      {msg && (
        <div className="toast" role="status">
          {msg}
        </div>
      )}
    </div>
  );
}