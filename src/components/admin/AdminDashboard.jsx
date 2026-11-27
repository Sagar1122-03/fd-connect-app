import { useState } from 'react';
import { inr, uid } from '../../utils/formatters';
import { Empty } from '../common/Empty';
import { Field } from '../common/Field';
import { Shell } from '../common/Shell';
import { StatusTag } from '../common/StatusTag';
import { EnquiryList } from '../user/EnquiryList';

export function AdminDashboard({ db, setDb, toast }) {
  const [tab, setTab] = useState('banks');
  const [b, setB] = useState({ name: '', code: '', email: '', pass: '' });

  const add = (e) => {
    e.preventDefault();
    if (db.banks.some((x) => x.email === b.email)) {
      return toast('That bank email is already registered');
    }
    setDb({
      ...db,
      banks: [...db.banks, { id: uid(), ...b, code: b.code.toUpperCase() }],
    });
    setB({ name: '', code: '', email: '', pass: '' });
    toast('Bank registered');
  };

  const del = (x) => {
    if (window.confirm(`Delete ${x.name} and its FD plans?`)) {
      setDb({
        ...db,
        banks: db.banks.filter((y) => y.id !== x.id),
        plans: db.plans.filter((p) => p.bankId !== x.id),
      });
    }
  };

  const decide = (r, s) => {
    setDb({
      ...db,
      adReq: db.adReq.map((x) => (x.id === r.id ? { ...x, status: s } : x)),
    });
  };

  const pending = db.adReq.filter((a) => a.status === 'pending').length;

  return (
    <Shell
      tabs={[
        ['banks', 'Banks'],
        ['ads', `Ad requests${pending ? ` (${pending})` : ''}`],
        ['enq', `User enquiries (${db.enq.length})`],
      ]}
      tab={tab}
      setTab={setTab}
    >
      {tab === 'banks' && (
        <>
          <h2>Register a bank</h2>
          <form className="card stack" onSubmit={add}>
            <Field label="Bank name">
              <input required value={b.name} onChange={(e) => setB({ ...b, name: e.target.value })} />
            </Field>
            <div className="two">
              <Field label="Bank code">
                <input
                  required
                  value={b.code}
                  onChange={(e) => setB({ ...b, code: e.target.value })}
                />
              </Field>
              <Field label="Login email">
                <input
                  required
                  type="email"
                  value={b.email}
                  onChange={(e) => setB({ ...b, email: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Temporary password">
              <input
                required
                minLength="6"
                value={b.pass}
                onChange={(e) => setB({ ...b, pass: e.target.value })}
              />
            </Field>
            <button className="btn">Register bank</button>
          </form>

          <h2>Registered banks</h2>
          {db.banks.length ? (
            <div className="grid">
              {db.banks.map((x) => (
                <div className="card stack" key={x.id}>
                  <div>
                    <h3>{x.name}</h3>
                    <span className="mut">
                      {x.code} · {x.email}
                    </span>
                  </div>
                  <div className="mut">
                    {db.plans.filter((p) => p.bankId === x.id).length} FD plans
                  </div>
                  <button className="btn bad" onClick={() => del(x)}>
                    Delete bank
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <Empty>No banks registered.</Empty>
          )}
        </>
      )}

      {tab === 'ads' && (
        <>
          <h2>Ad requests from banks</h2>
          {db.adReq.length ? (
            <div className="stack">
              {db.adReq.map((r) => {
                const bk = db.banks.find((x) => x.id === r.bankId);
                const pl = db.plans.find((x) => x.id == r.planId);
                return (
                  <div className="card stack" key={r.id}>
                    <div className="row">
                      <h3>{r.headline}</h3>
                      <StatusTag s={r.status} />
                    </div>
                    <div className="mut">
                      {bk ? bk.name : 'Bank'} · {pl ? pl.name : 'Plan'} · {inr(r.budget)} ·{' '}
                      {r.days} days · {r.date}
                    </div>
                    <div>{r.message}</div>
                    {r.status === 'pending' && (
                      <div className="row" style={{ justifyContent: 'flex-start' }}>
                        <button
                          className="btn"
                          onClick={() => {
                            decide(r, 'approved');
                            toast('Ad is now live for users');
                          }}
                        >
                          Approve and publish
                        </button>
                        <button className="btn bad" onClick={() => decide(r, 'rejected')}>
                          Reject
                        </button>
                      </div>
                    )}
                    {r.status === 'approved' && (
                      <div>
                        <button className="btn bad" onClick={() => decide(r, 'rejected')}>
                          Take ad down
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <Empty>No ad requests yet.</Empty>
          )}
        </>
      )}

      {tab === 'enq' && (
        <>
          <h2>User enquiries</h2>
          <EnquiryList list={db.enq} db={db} empty="No user enquiries yet." />
        </>
      )}
    </Shell>
  );
}