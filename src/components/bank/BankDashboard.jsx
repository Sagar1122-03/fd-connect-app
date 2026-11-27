import { useState } from 'react';
import { createAdRequest, createPlan, deletePlan } from '../../lib/data';
import { inr } from '../../utils/formatters';
import { Empty } from '../common/Empty';
import { Field } from '../common/Field';
import { Shell } from '../common/Shell';
import { StatusTag } from '../common/StatusTag';
import { EnquiryList } from '../user/EnquiryList';

export function BankDashboard({ db, refreshDb, sess, toast }) {
  const bank = db.banks.find((item) => item.id === sess.bankId);
  const [tab, setTab] = useState('plans');
  const plans = db.plans.filter((plan) => plan.bankId === sess.bankId);
  const approvedPlans = plans.filter((plan) => plan.status === 'approved');
  const enquiries = db.enq.filter((enquiry) => enquiry.bankId === sess.bankId);
  const requests = db.adReq.filter((request) => request.bankId === sess.bankId);
  const [p, setP] = useState({ name: '', rate: '', tenure: '', min: '' });
  const [a, setA] = useState({ planId: '', headline: '', budget: '', days: '', message: '' });

  const addPlan = async (event) => {
    event.preventDefault();
    try {
      await createPlan(sess.bankId, p);
      setP({ name: '', rate: '', tenure: '', min: '' });
      await refreshDb();
      toast('FD plan submitted for admin approval');
    } catch (error) {
      toast(`Could not add FD plan: ${error.message}`);
    }
  };

  const sendAd = async (event) => {
    event.preventDefault();
    try {
      await createAdRequest(sess.bankId, a);
      setA({ planId: '', headline: '', budget: '', days: '', message: '' });
      await refreshDb();
      toast('Ad request sent to admin');
    } catch (error) {
      toast(`Could not send ad request: ${error.message}`);
    }
  };

  const removePlan = async (plan) => {
    if (!window.confirm(`Remove ${plan.name}?`)) return;
    try {
      await deletePlan(plan.id);
      await refreshDb();
      toast('FD plan removed');
    } catch (error) {
      toast(`Could not remove FD plan: ${error.message}`);
    }
  };

  if (!bank) {
    return <main><p className="err" role="alert">This bank account is not linked to an active bank. Contact the admin.</p></main>;
  }

  return (
    <Shell
      tabs={[
        ['plans', 'My FD plans'],
        ['ads', 'Ad requests'],
        ['enq', `User enquiries (${enquiries.length})`],
      ]}
      tab={tab}
      setTab={setTab}
    >
      {tab === 'plans' && (
        <>
          <h2>Submit an FD plan</h2>
          <form className="card stack" onSubmit={addPlan}>
            <Field label="Plan name">
              <input required value={p.name} onChange={(event) => setP({ ...p, name: event.target.value })} />
            </Field>
            <div className="two">
              <Field label="Interest rate (% p.a.)">
                <input required type="number" min="0.01" max="100" step="0.05" value={p.rate} onChange={(event) => setP({ ...p, rate: event.target.value })} />
              </Field>
              <Field label="Tenure (months)">
                <input required type="number" min="1" step="1" value={p.tenure} onChange={(event) => setP({ ...p, tenure: event.target.value })} />
              </Field>
            </div>
            <Field label="Minimum deposit (₹)">
              <input required type="number" min="1" step="1" value={p.min} onChange={(event) => setP({ ...p, min: event.target.value })} />
            </Field>
            <button className="btn">Submit for approval</button>
          </form>

          <h2>Your plans</h2>
          {plans.length ? (
            <div className="grid">
              {plans.map((plan) => (
                <div className="card stack" key={plan.id}>
                  <div className="row">
                    <h3>{plan.name}</h3>
                    <StatusTag s={plan.status} />
                  </div>
                  <div className="rate">{plan.rate}%</div>
                  <div className="mut">{plan.tenure} months · from {inr(plan.min)}</div>
                  <button className="btn bad" onClick={() => removePlan(plan)}>Remove plan</button>
                </div>
              ))}
            </div>
          ) : <Empty>No plans yet. Submit your first FD plan above.</Empty>}
        </>
      )}

      {tab === 'ads' && (
        <>
          <h2>Request an advertisement</h2>
          {approvedPlans.length ? (
            <form className="card stack" onSubmit={sendAd}>
              <Field label="Plan to advertise">
                <select required value={a.planId} onChange={(event) => setA({ ...a, planId: event.target.value })}>
                  <option value="">Choose a plan</option>
                  {approvedPlans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
                </select>
              </Field>
              <Field label="Ad headline">
                <input required value={a.headline} onChange={(event) => setA({ ...a, headline: event.target.value })} />
              </Field>
              <div className="two">
                <Field label="Budget (₹)">
                  <input required type="number" min="1" value={a.budget} onChange={(event) => setA({ ...a, budget: event.target.value })} />
                </Field>
                <Field label="Duration (days)">
                  <input required type="number" min="1" step="1" value={a.days} onChange={(event) => setA({ ...a, days: event.target.value })} />
                </Field>
              </div>
              <Field label="Ad text">
                <textarea required rows="3" value={a.message} onChange={(event) => setA({ ...a, message: event.target.value })} />
              </Field>
              <button className="btn">Send request to admin</button>
            </form>
          ) : <Empty>Only approved FD plans can be advertised.</Empty>}

          <h2>Your requests</h2>
          {requests.length ? (
            <div className="stack">
              {requests.map((request) => (
                <div className="card row" key={request.id}>
                  <div>
                    <h3>{request.headline}</h3>
                    <span className="mut">{inr(request.budget)} · {request.days} days · {request.date}</span>
                  </div>
                  <StatusTag s={request.status} />
                </div>
              ))}
            </div>
          ) : <Empty>No ad requests sent.</Empty>}
        </>
      )}

      {tab === 'enq' && (
        <>
          <h2>User enquiries</h2>
          <EnquiryList
            list={enquiries}
            db={db}
            empty="No user has enquired about your plans yet."
            canDelete
            refreshDb={refreshDb}
            toast={toast}
          />
        </>
      )}
    </Shell>
  );
}
