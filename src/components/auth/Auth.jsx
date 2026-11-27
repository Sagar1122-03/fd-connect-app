import { useState } from 'react';
import { ADMIN } from '../../data/seedData';
import { uid } from '../../utils/formatters';
import { Field } from '../common/Field';

export function Auth({ db, setDb, onLogin }) {
  const [role, setRole] = useState('user');
  const [mode, setMode] = useState('login');
  const [f, setF] = useState({ name: '', email: '', pass: '' });
  const [err, setErr] = useState('');

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    setErr('');

    if (role === 'admin') {
      return f.email === ADMIN.email && f.pass === ADMIN.pass
        ? onLogin({ role: 'admin' })
        : setErr('Wrong admin email or password.');
    }

    if (role === 'bank') {
      const b = db.banks.find((b) => b.email === f.email && b.pass === f.pass);
      return b
        ? onLogin({ role: 'bank', bankId: b.id })
        : setErr('Wrong bank email or password.');
    }

    if (mode === 'signup') {
      if (!f.name.trim() || !f.email.includes('@') || f.pass.length < 6) {
        return setErr('Enter your name, a valid email and a password of 6+ characters.');
      }
      if (db.users.some((u) => u.email === f.email)) {
        return setErr('This email already has an account. Log in instead.');
      }
      const u = { id: uid(), name: f.name, email: f.email, pass: f.pass };
      setDb({ ...db, users: [...db.users, u] });
      return onLogin({ role: 'user', userId: u.id, name: u.name, email: u.email });
    }

    const u = db.users.find((u) => u.email === f.email && u.pass === f.pass);
    u
      ? onLogin({ role: 'user', userId: u.id, name: u.name, email: u.email })
      : setErr('Wrong email or password.');
  };

  const googleLogin = () => {
    const email = 'google.user@gmail.com';
    let u = db.users.find((u) => u.email === email);
    if (!u) {
      u = { id: uid(), name: 'Google User', email, pass: '' };
      setDb({ ...db, users: [...db.users, u] });
    }
    onLogin({ role: 'user', userId: u.id, name: u.name, email: u.email });
  };

  return (
    <div className="auth">
      <div className="brand" style={{ fontSize: '1.8rem' }}>
        FD Connect
        <small>Compare fixed deposit plans and reach banks directly</small>
      </div>

      <div className="seg" role="group" aria-label="Log in as">
        {[['user', 'User'], ['bank', 'Bank'], ['admin', 'Admin']].map(([r, label]) => (
          <button
            key={r}
            aria-pressed={role === r}
            onClick={() => {
              setRole(r);
              setErr('');
              setMode('login');
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <form className="card stack" onSubmit={submit}>
        {role === 'user' && mode === 'signup' && (
          <Field label="Full name">
            <input value={f.name} onChange={set('name')} />
          </Field>
        )}
        <Field label="Email">
          <input type="email" required value={f.email} onChange={set('email')} />
        </Field>
        <Field label="Password">
          <input type="password" required value={f.pass} onChange={set('pass')} />
        </Field>

        {err && (
          <p className="err" role="alert">
            {err}
          </p>
        )}

        <button className="btn">
          {role === 'user' && mode === 'signup' ? 'Create account' : 'Log in'}
        </button>

        {role === 'user' && (
          <>
            <button type="button" className="btn ghost" onClick={googleLogin}>
              Continue with Google
            </button>
            <button
              type="button"
              className="btn ghost"
              style={{ border: 0 }}
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login');
                setErr('');
              }}
            >
              {mode === 'login' ? 'New here? Create an account' : 'Have an account? Log in'}
            </button>
          </>
        )}

        {role === 'bank' && (
          <>
            <p className="mut">Banks cannot sign up. To get an account, contact the admin.</p>
            <p className="mut">Demo: sbi@bank.in / bank123</p>
          </>
        )}
        {role === 'admin' && (
          <p className="mut">
            Single admin login. Demo: {ADMIN.email} / {ADMIN.pass}
          </p>
        )}
      </form>
    </div>
  );
}