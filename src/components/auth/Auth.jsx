import { useState } from 'react';
import { requireSupabase } from '../../lib/supabase';
import { Field } from '../common/Field';

export function Auth() {
  const [role, setRole] = useState('user');
  const [mode, setMode] = useState('login');
  const [f, setF] = useState({ name: '', email: '', pass: '' });
  const [err, setErr] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key) => (event) => setF({ ...f, [key]: event.target.value });

  const submit = async (event) => {
    event.preventDefault();
    setErr('');
    setNotice('');
    setBusy(true);
    try {
      const client = requireSupabase();
      if (role === 'user' && mode === 'signup') {
        const { data, error } = await client.auth.signUp({
          email: f.email.trim().toLowerCase(),
          password: f.pass,
          options: {
            data: { full_name: f.name.trim() },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        if (!data.session) {
          setNotice('Account created. Check your email to confirm it, then log in.');
        }
      } else {
        sessionStorage.setItem('fd_connect_expected_role', role);
        const { data, error } = await client.auth.signInWithPassword({
          email: f.email.trim().toLowerCase(),
          password: f.pass,
        });
        if (error) throw error;
        const { data: profile, error: profileError } = await client
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();
        if (profileError) throw profileError;
        if (profile.role !== role) {
          throw new Error(`This account is registered for the ${profile.role} panel. Select that panel to log in.`);
        }
      }
    } catch (authError) {
      setErr(authError.message || 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  };

  const googleLogin = async () => {
    setErr('');
    setNotice('');
    try {
      sessionStorage.setItem('fd_connect_expected_role', 'user');
      const { data, error } = await requireSupabase().auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          skipBrowserRedirect: true,
        },
      });
      if (error) throw error;
      if (!data.url) throw new Error('Supabase did not return a Google sign-in URL.');
      const authorizeUrl = new URL(data.url);
      authorizeUrl.searchParams.set('skip_http_redirect', 'true');
      const response = await fetch(authorizeUrl, {
        headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
      });
      let result;
      try {
        result = await response.json();
      } catch {
        throw new Error('Supabase returned an unreadable Google sign-in response.');
      }
      if (!response.ok) {
        throw new Error(result.msg || result.message || 'Google sign-in is unavailable.');
      }
      if (!result.url) throw new Error('Supabase did not return a Google provider URL.');
      window.location.assign(result.url);
    } catch (authError) {
      sessionStorage.removeItem('fd_connect_expected_role');
      const message = authError.message || '';
      setErr(message.includes('provider is not enabled')
        ? 'Google sign-in is not enabled in Supabase Auth. Enable the Google provider and configure its OAuth client credentials.'
        : message || 'Google sign-in failed.');
    }
  };

  return (
    <div className="auth">
      <div className="brand" style={{ fontSize: '1.8rem' }}>
        FD Connect
        <small>Compare fixed deposit plans and reach banks directly</small>
      </div>

      <div className="seg" role="group" aria-label="Log in as">
        {[[ 'user', 'User' ], [ 'bank', 'Bank' ], [ 'admin', 'Admin' ]].map(([value, label]) => (
          <button
            type="button"
            key={value}
            aria-pressed={role === value}
            onClick={() => {
              setRole(value);
              sessionStorage.removeItem('fd_connect_expected_role');
              setErr('');
              setNotice('');
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
            <input autoComplete="name" required value={f.name} onChange={set('name')} />
          </Field>
        )}
        <Field label="Email">
          <input autoComplete="email" type="email" required value={f.email} onChange={set('email')} />
        </Field>
        <Field label="Password">
          <input
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            type="password"
            minLength="6"
            required
            value={f.pass}
            onChange={set('pass')}
          />
        </Field>

        {err && <p className="err" role="alert">{err}</p>}
        {notice && <p className="mut" role="status">{notice}</p>}

        <button className="btn" disabled={busy}>
          {busy ? 'Please wait…' : role === 'user' && mode === 'signup' ? 'Create account' : 'Log in'}
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
                setNotice('');
              }}
            >
              {mode === 'login' ? 'New here? Create an account' : 'Have an account? Log in'}
            </button>
          </>
        )}

        {role === 'bank' && (
          <p className="mut">Banks cannot sign up. To get an account, contact the admin.</p>
        )}
        {role === 'admin' && <p className="mut">Admin access is provisioned by the system owner.</p>}
      </form>
    </div>
  );
}
