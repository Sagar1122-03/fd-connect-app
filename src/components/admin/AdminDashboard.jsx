import { useState } from 'react';
import { deleteBank, registerBank, setAdStatus, setPlanStatus } from '../../lib/data';
import { inr } from '../../utils/formatters';
import { Empty } from '../common/Empty';
import { Field } from '../common/Field';
import { Shell } from '../common/Shell';
import { StatusTag } from '../common/StatusTag';
import { EnquiryList } from '../user/EnquiryList';

export function AdminDashboard({ db, refreshDb, toast }) {
  const [tab, setTab] = useState('banks');
  const [b, setB] = useState({ name: '', code: '', email: '', pass: '' });
  const [busy, setBusy] = useState(false);

  const add = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await registerBank(b);
      setB({ name: '', code: '', email: '', pass: '' });
      await refreshDb();
      toast('Bank registered');
    } catch (error) {
      toast(`Could not register bank: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (bank) => {
    if (!window.confirm(`Delete ${bank.name} and its FD plans?`)) return;
    try {
      await deleteBank(bank.id);
      await refreshDb();
      toast('Bank deleted');
    } catch (error) {
      toast(`Could not delete bank: ${error.message}`);
    }
  };

  const decide = async (request, status) => {
    try {
      await setAdStatus(request.id, status);
      await refreshDb();
      toast(status === 'approved' ? 'Ad is now live for users' : 'Ad request rejected');
    } catch (error) {
      toast(`Could not update ad request: ${error.message}`);
    }
  };

  const decidePlan = async (plan, status) => {
    try {
      await setPlanStatus(plan.id, status);
      await refreshDb();
      toast(status === 'approved' ? 'FD plan approved and published' : 'FD plan rejected');
    } catch (error) {
      toast(`Could not update FD plan: ${error.message}`);
    }
  };

  const pendingPlans = db.plans.filter((plan) => plan.status === 'pending').length;
  const pending = db.adReq.filter((ad) => ad.status === 'pending').length;

  return (
    <Shell
      tabs={[
        ['banks', 'Banks'],
        ['plans', `FD plan requests${pendingPlans ? ` (${pendingPlans})` : ''}`],
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
              <input required value={b.name} onChange={(event) => setB({ ...b, name: event.target.value })} />
            </Field>
            <div className="two">
              <Field label="Bank code">
                <input required value={b.code} onChange={(event) => setB({ ...b, code: event.target.value })} />
              </Field>
              <Field label="Login email">
                <input required type="email" value={b.email} onChange={(event) => setB({ ...b, email: event.target.value })} />
              </Field>
            </div>
            <Field label="Temporary password">
              <input
                type="password"
                required
                minLength="8"
                autoComplete="new-password"
                value={b.pass}
                onChange={(event) => setB({ ...b, pass: event.target.value })}
              />
            </Field>
            <button className="btn" disabled={busy}>{busy ? 'Registering…' : 'Register bank'}</button>
          </form>

          <h2>Registered banks</h2>
          {db.banks.length ? (
            <div className="grid">
              {db.banks.map((bank) => (
                <div className="card stack" key={bank.id}>
                  <div>
                    <h3>{bank.name}</h3>
                    <span className="mut">{bank.code} · {bank.email}</span>
                  </div>
                  <div className="mut">
                    {db.plans.filter((plan) => plan.bankId === bank.id).length} FD plans
                  </div>
                  <button className="btn bad" onClick={() => remove(bank)}>Delete bank</button>
                </div>
              ))}
            </div>
          ) : <Empty>No banks registered.</Empty>}
        </>
      )}

      {tab === 'plans' && (
        <>
          <h2>FD plan submissions</h2>
          {db.plans.length ? (
            <div className="stack">
              {db.plans.map((plan) => {
                const bank = db.banks.find((item) => item.id === plan.bankId);
                return (
                  <div className="card stack" key={plan.id}>
                    <div className="row">
                      <h3>{plan.name}</h3>
                      <StatusTag s={plan.status} />
                    </div>
                    <div className="mut">
                      {bank ? bank.name : 'Bank'} · {plan.rate}% p.a. · {plan.tenure} months · minimum {inr(plan.min)}
                    </div>
                    {plan.status === 'pending' && (
                      <div className="row" style={{ justifyContent: 'flex-start' }}>
                        <button className="btn" onClick={() => decidePlan(plan, 'approved')}>Approve</button>
                        <button className="btn bad" onClick={() => decidePlan(plan, 'rejected')}>Reject</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : <Empty>No FD plan requests yet.</Empty>}
        </>
      )}

      {tab === 'ads' && (
        <>
          <h2>Ad requests from banks</h2>
          {db.adReq.length ? (
            <div className="stack">
              {db.adReq.map((request) => {
                const bank = db.banks.find((item) => item.id === request.bankId);
                const plan = db.plans.find((item) => item.id === request.planId);
                return (
                  <div className="card stack" key={request.id}>
                    <div className="row">
                      <h3>{request.headline}</h3>
                      <StatusTag s={request.status} />
                    </div>
                    <div className="mut">
                      {bank ? bank.name : 'Bank'} · {plan ? plan.name : 'Plan'} · {inr(request.budget)} ·{' '}
                      {request.days} days · {request.date}
                    </div>
                    <div>{request.message}</div>
                    {request.status === 'pending' && (
                      <div className="row" style={{ justifyContent: 'flex-start' }}>
                        <button className="btn" onClick={() => decide(request, 'approved')}>
                          Approve and publish
                        </button>
                        <button className="btn bad" onClick={() => decide(request, 'rejected')}>Reject</button>
                      </div>
                    )}
                    {request.status === 'approved' && (
                      <button className="btn bad" onClick={() => decide(request, 'rejected')}>Take ad down</button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : <Empty>No ad requests yet.</Empty>}
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
