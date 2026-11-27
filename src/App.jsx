import { useCallback, useEffect, useState } from 'react';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { Auth } from './components/auth/Auth';
import { BankDashboard } from './components/bank/BankDashboard';
import { UserDashboard } from './components/user/UserDashboard';
import { emptyDb, getSessionContext, loadDb } from './lib/data';
import { isSupabaseConfigured, requireSupabase } from './lib/supabase';

export default function App() {
  const [db, setDb] = useState(emptyDb);
  const [sess, setSess] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const refreshDb = useCallback(async (role) => {
    const nextDb = await loadDb(role);
    setDb(nextDb);
  }, []);

  const loadSession = useCallback(async (user) => {
    if (!user) {
      setSess(null);
      setDb(emptyDb);
      setLoading(false);
      return;
    }
    try {
      const context = await getSessionContext(user);
      const expectedRole = sessionStorage.getItem('fd_connect_expected_role');
      if (expectedRole && context.role !== expectedRole) {
        sessionStorage.removeItem('fd_connect_expected_role');
        await requireSupabase().auth.signOut();
        const roleName = context.role === 'bank' ? 'Bank' : context.role === 'admin' ? 'Admin' : 'User';
        setSess(null);
        setDb(emptyDb);
        setError(`This account belongs to the ${roleName} panel. Select ${roleName} to log in.`);
        setLoading(false);
        return;
      }
      const nextDb = await loadDb(context.role);
      setSess(context);
      setDb(nextDb);
      setError('');
    } catch (loadError) {
      setSess(null);
      setDb(emptyDb);
      const message = loadError.message || '';
      setError(message.includes('PGRST205') || message.includes('Could not find the table')
        ? 'Supabase database schema is not installed. Apply the migration in SUPABASE_SETUP.md, then try logging in again.'
        : `Could not load your account: ${message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const client = requireSupabase();
    let active = true;
    const handleAuth = async (user) => {
      if (active) await loadSession(user);
    };

    client.auth.getSession().then(({ data, error: sessionError }) => {
      if (sessionError) throw sessionError;
      return handleAuth(data.session?.user ?? null);
    }).catch((sessionError) => {
      if (active) {
        setError(`Could not restore your session: ${sessionError.message}`);
        setLoading(false);
      }
    });

    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => {
        void handleAuth(session?.user ?? null);
      }, 0);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadSession]);

  const toast = (message) => {
    setMsg(message);
    window.setTimeout(() => setMsg(''), 2600);
  };

  const logout = async () => {
    try {
      const { error: signOutError } = await requireSupabase().auth.signOut();
      if (signOutError) throw signOutError;
      sessionStorage.removeItem('fd_connect_expected_role');
      setError('');
    } catch (signOutError) {
      setError(`Could not log out: ${signOutError.message}`);
    }
  };

  const label = sess?.role === 'admin'
    ? 'Admin panel'
    : sess?.role === 'bank'
      ? 'Bank panel'
      : 'User panel';

  if (!isSupabaseConfigured) {
    return (
      <main>
        <h1>Supabase configuration required</h1>
        <p className="err">Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local, then restart the dev server.</p>
      </main>
    );
  }

  if (loading) {
    return <main aria-live="polite">Loading FD Connect…</main>;
  }

  return (
    <div>
      {sess && (
        <header className="top">
          <div className="brand">
            FD Connect<small>{label}</small>
          </div>
          <button className="btn ghost" onClick={logout}>Log out</button>
        </header>
      )}

      {error && <p className="err" role="alert">{error}</p>}

      {!sess ? (
        <Auth />
      ) : sess.role === 'admin' ? (
        <AdminDashboard db={db} refreshDb={() => refreshDb(sess.role)} toast={toast} />
      ) : sess.role === 'bank' ? (
        <BankDashboard db={db} refreshDb={() => refreshDb(sess.role)} sess={sess} toast={toast} />
      ) : (
        <UserDashboard db={db} refreshDb={() => refreshDb(sess.role)} sess={sess} toast={toast} />
      )}

      {msg && <div className="toast" role="status">{msg}</div>}
    </div>
  );
}
