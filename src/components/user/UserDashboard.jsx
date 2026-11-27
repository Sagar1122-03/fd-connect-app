import { useState } from 'react';
import { createEnquiry } from '../../lib/data';
import { inr } from '../../utils/formatters';
import { Empty } from '../common/Empty';
import { Shell } from '../common/Shell';
import { EnquiryForm } from './EnquiryForm';
import { EnquiryList } from './EnquiryList';

export function UserDashboard({ db, refreshDb, sess, toast }) {
  const [tab, setTab] = useState('plans');
  const [pick, setPick] = useState(null);
  const plans = db.plans.filter((plan) => plan.status === 'approved');
  const ads = db.adReq.filter((ad) => ad.status === 'approved');
  const mine = db.enq.filter((enquiry) => enquiry.userId === sess.userId);

  const send = async (form) => {
    const bank = db.banks.find((item) => item.id === pick.bankId);
    if (!bank) throw new Error('The selected bank is no longer available.');
    await createEnquiry({
      ...form,
      planId: pick.id,
      bankId: bank.id,
    }, sess.userId);
    await refreshDb();
    setPick(null);
    setTab('mine');
    toast(`Enquiry sent to ${bank.name}`);
  };

  return (
    <Shell
      tabs={[['plans', 'FD plans'], ['mine', `My enquiries (${mine.length})`]]}
      tab={tab}
      setTab={setTab}
    >
      {tab === 'plans' ? (
        <>
          <h2>FD plans</h2>
          <div>
            {ads.map((ad) => {
              const bank = db.banks.find((item) => item.id === ad.bankId);
              const plan = plans.find((item) => item.id === ad.planId);
              return (
                <article className="sponsored-ad" key={ad.id}>
                  <div className="sponsored-ad__header">
                    <div className="sponsored-ad__brand">
                      <span className="sponsored-ad__mark" aria-hidden="true">
                        {(bank?.name || 'FD').slice(0, 1).toUpperCase()}
                      </span>
                      <div>
                        <span className="sponsored-ad__eyebrow">Sponsored offer</span>
                        <strong>{bank ? bank.name : 'Featured bank'}</strong>
                      </div>
                    </div>
                    <span className="sponsored-ad__badge">Featured</span>
                  </div>
                  <div className="sponsored-ad__content">
                    <h3>{ad.headline}</h3>
                    <p>{ad.message}</p>
                  </div>
                  {plan && (
                    <div className="sponsored-ad__details">
                      <div>
                        <span>Interest rate</span>
                        <strong>{plan.rate}% <small>p.a.</small></strong>
                      </div>
                      <div>
                        <span>Tenure</span>
                        <strong>{plan.tenure} <small>months</small></strong>
                      </div>
                      <div>
                        <span>Minimum deposit</span>
                        <strong>{inr(plan.min)}</strong>
                      </div>
                    </div>
                  )}
                  {plan && (
                    <div className="sponsored-ad__footer">
                      <span>Explore this fixed deposit offer</span>
                      <button type="button" className="sponsored-ad__button" onClick={() => setPick(plan)}>
                        Enquire now <span aria-hidden="true">→</span>
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
            <div className="grid">
              {plans.map((plan) => {
                const bank = db.banks.find((item) => item.id === plan.bankId);
                return (
                  <div className="card stack" key={plan.id}>
                    <div>
                      <h3>{plan.name}</h3>
                      <span className="mut">{bank ? bank.name : 'Bank'}</span>
                    </div>
                    <div className="rate">{plan.rate}% <span className="mut">p.a.</span></div>
                    <div className="mut">{plan.tenure} months · from {inr(plan.min)}</div>
                    <button type="button" className="btn" onClick={() => setPick(plan)}>
                      Send enquiry
                    </button>
                  </div>
                );
              })}
            </div>
            {!plans.length && <Empty>No approved FD plans yet.</Empty>}
          </div>
        </>
      ) : (
        <>
          <h2>My enquiries</h2>
          <EnquiryList
            list={mine}
            db={db}
            empty="You have not sent any enquiry yet. Pick a plan to start."
            canDelete
            refreshDb={refreshDb}
            toast={toast}
          />
        </>
      )}

      {pick && (
        <EnquiryForm
          plan={pick}
          bank={db.banks.find((bank) => bank.id === pick.bankId)}
          onSubmit={send}
          onClose={() => setPick(null)}
        />
      )}
    </Shell>
  );
}
