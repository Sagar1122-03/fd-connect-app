import { useState } from 'react';
import { inr, today, uid } from '../../utils/formatters';
import { Empty } from '../common/Empty';
import { Shell } from '../common/Shell';
import { EnquiryForm } from './EnquiryForm';
import { EnquiryList } from './EnquiryList';
import { MaturityCalculator } from './MaturityCalculator';

export function UserDashboard({ db, setDb, sess, toast }) {
  const [tab, setTab] = useState('plans');
  const [pick, setPick] = useState(null);
  const [calcPlan, setCalcPlan] = useState(null);

  const ads = db.adReq.filter((a) => a.status === 'approved');
  const mine = db.enq.filter((q) => q.userId === sess.userId);

  const send = (f) => {
    const b = db.banks.find((b) => b.id === pick.bankId);
    const newEnq = {
      id: uid(),
      planId: pick.id,
      bankId: b.id,
      userId: sess.userId,
      email: sess.email,
      name: f.name,
      phone: f.phone,
      aadhaar: f.aadhaar,
      file: f.file,
      amount: f.amount,
      code: b.code,
      date: today(),
    };
    setDb({ ...db, enq: [newEnq, ...db.enq] });
    setPick(null);
    setTab('mine');
    toast('Enquiry sent to ' + b.name);
  };

  return (
    <Shell
      tabs={[['plans', 'FD plans'], ['mine', `My enquiries (${mine.length})`]]}
      tab={tab}
      setTab={setTab}
    >
      {tab === 'plans' ? (
        <>
          <h2>Returns Estimator</h2>
          <MaturityCalculator
            plans={db.plans}
            banks={db.banks}
            selectedPlan={calcPlan}
            onEnquire={(plan) => setPick(plan)}
          />

          <h2>FD plans</h2>
          <div>
            {ads.map((a) => (
              <div className="ad" key={a.id}>
                <span className="tag wait">Sponsored</span> <h3>{a.headline}</h3>
                <span className="mut">{a.message}</span>
              </div>
            ))}
            <div className="grid">
              {db.plans.map((p) => {
                const b = db.banks.find((b) => b.id === p.bankId);
                return (
                  <div className="card stack" key={p.id}>
                    <div>
                      <h3>{p.name}</h3>
                      <span className="mut">{b ? b.name : 'Bank'}</span>
                    </div>
                    <div className="rate">
                      {p.rate}% <span className="mut">p.a.</span>
                    </div>
                    <div className="mut">
                      {p.tenure} months · from {inr(p.min)}
                    </div>
                    <div className="row" style={{ gap: '8px' }}>
                      <button
                        type="button"
                        className="btn ghost"
                        style={{ flex: 1 }}
                        onClick={() => {
                          setCalcPlan(p);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                      >
                        Calculate
                      </button>
                      <button
                        type="button"
                        className="btn"
                        style={{ flex: 1 }}
                        onClick={() => setPick(p)}
                      >
                        Send enquiry
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {!db.plans.length && <Empty>No FD plans yet.</Empty>}
          </div>
        </>
      ) : (
        <>
          <h2>My enquiries</h2>
          <EnquiryList
            list={mine}
            db={db}
            empty="You have not sent any enquiry yet. Pick a plan to start."
          />
        </>
      )}

      {pick && (
        <EnquiryForm
          plan={pick}
          bank={db.banks.find((b) => b.id === pick.bankId)}
          onSubmit={send}
          onClose={() => setPick(null)}
        />
      )}
    </Shell>
  );
}