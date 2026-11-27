import { useState } from 'react';
import { inr, today, uid } from '../../utils/formatters';
import { Empty } from '../common/Empty';
import { Field } from '../common/Field';
import { Shell } from '../common/Shell';
import { StatusTag } from '../common/StatusTag';
import { EnquiryList } from '../user/EnquiryList';

export function BankDashboard({ db, setDb, sess, toast }) {
  const bank = db.banks.find((b) => b.id === sess.bankId);
  const [tab, setTab] = useState('plans');

  const plans = db.plans.filter((p) => p.bankId === bank.id);
  const enq = db.enq.filter((q) => q.bankId === bank.id);
  const reqs = db.adReq.filter((a) => a.bankId === bank.id);

  const [p, setP] = useState({ name: '', rate: '', tenure: '', min: '' });
  const [a, setA] = useState({ planId: '', headline: '', budget: '', days: '', message: '' });

  const addPlan = (e) => {
    e.preventDefault();
    setDb({
      ...db,
      plans: [
        ...db.plans,
        { id: uid(), bankId: bank.id, name: p.name, rate: +p.rate, tenure: +p.tenure, min: +p.min },
      ],
    });
    setP({ name: '', rate: '', tenure: '', min: '' });
    toast('FD plan added');
  };

  const sendAd = (e) => {
    e.preventDefault();
    setDb({
      ...db,
      adReq: [{ id: uid(), bankId: bank.id, ...a, status: 'pending', date: today() }, ...db.adReq],
    });
    setA({ planId: '', headline: '', budget: '', days: '', message: '' });
    toast('Ad request sent to admin');
  };

  return (
    <Shell
      tabs={[
        ['plans', 'My FD plans'],
        ['ads', 'Ad requests'],
        ['enq', `User enquiries (${enq.length})`],
      ]}
      tab={tab}
      setTab={setTab}
    >
      {tab === 'plans' && (
        <>
          <h2>Add an FD plan</h2>
          <form className="card stack" onSubmit={addPlan}>
            <Field label="Plan name">
              <input required value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} />
            </Field>
            <div className="two">
              <Field label="Interest rate (% p.a.)">
                <input
                  required
                  type="number"
                  step="0.05"
                  value={p.rate}
                  onChange={(e) => setP({ ...p, rate: e.target.value })}
                />
              </Field>
              <Field label="Tenure (months)">
                <input
                  required
                  type="number"
                  value={p.tenure}
                  onChange={(e) => setP({ ...p, tenure: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Minimum deposit (₹)">
              <input
                required
                type="number"
                value={p.min}
                onChange={(e) => setP({ ...p, min: e.target.value })}
              />
            </Field>
            <button className="btn">Add plan</button>
          </form>

          <h2>Your plans</h2>
          {plans.length ? (
            <div className="grid">
              {plans.map((x) => (
                <div className="card stack" key={x.id}>
                  <h3>{x.name}</h3>
                  <div className="rate">{x.rate}%</div>
                  <div className="mut">
                    {x.tenure} months · from {inr(x.min)}
                  </div>
                  <button
                    className="btn bad"
                    onClick={() => setDb({ ...db, plans: db.plans.filter((y) => y.id !== x.id) })}
                  >
                    Remove plan
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <Empty>No plans yet. Add your first FD plan above.</Empty>
          )}
        </>
      )}

      {tab === 'ads' && (
        <>
          <h2>Request an advertisement</h2>
          {plans.length ? (
            <form className="card stack" onSubmit={sendAd}>
              <Field label="Plan to advertise">
                <select
                  required
                  value={a.planId}
                  onChange={(e) => setA({ ...a, planId: e.target.value })}
                >
                  <option value="">Choose a plan</option>
                  {plans.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Ad headline">
                <input
                  required
                  value={a.headline}
                  onChange={(e) => setA({ ...a, headline: e.target.value })}
                />
              </Field>
              <div className="two">
                <Field label="Budget (₹)">
                  <input
                    required
                    type="number"
                    value={a.budget}
                    onChange={(e) => setA({ ...a, budget: e.target.value })}
                  />
                </Field>
                <Field label="Duration (days)">
                  <input
                    required
                    type="number"
                    value={a.days}
                    onChange={(e) => setA({ ...a, days: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Ad text">
                <textarea
                  required
                  rows="3"
                  value={a.message}
                  onChange={(e) => setA({ ...a, message: e.target.value })}
                />
              </Field>
              <button className="btn">Send request to admin</button>
            </form>
          ) : (
            <Empty>Add an FD plan first, then you can request an ad for it.</Empty>
          )}

          <h2>Your requests</h2>
          {reqs.length ? (
            <div className="stack">
              {reqs.map((r) => (
                <div className="card row" key={r.id}>
                  <div>
                    <h3>{r.headline}</h3>
                    <span className="mut">
                      {inr(r.budget)} · {r.days} days · {r.date}
                    </span>
                  </div>
                  <StatusTag s={r.status} />
                </div>
              ))}
            </div>
          ) : (
            <Empty>No ad requests sent.</Empty>
          )}
        </>
      )}

      {tab === 'enq' && (
        <>
          <h2>User enquiries</h2>
          <EnquiryList list={enq} db={db} empty="No user has enquired about your plans yet." />
        </>
      )}
    </Shell>
  );
}