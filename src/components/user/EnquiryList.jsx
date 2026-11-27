import { inr } from '../../utils/formatters';
import { Empty } from '../common/Empty';

export function EnquiryList({ list, db, empty }) {
  if (!list.length) return <Empty>{empty}</Empty>;

  return (
    <div className="stack">
      {list.map((q) => {
        const p = db.plans.find((p) => p.id === q.planId);
        const b = db.banks.find((b) => b.id === q.bankId);
        return (
          <div className="card" key={q.id}>
            <div className="row">
              <h3>
                {p ? p.name : 'Plan'} · {b ? b.name : ''}
              </h3>
              <span className="mut">{q.date}</span>
            </div>
            <div>
              {q.name} · {q.phone} <span className="tag ok">Phone verified</span>
            </div>
            <div className="mut">
              {inr(q.amount)} · Aadhaar XXXX XXXX {q.aadhaar.slice(-4)} · file: {q.file} · bank code{' '}
              {q.code}
            </div>
            <div className="mut">{q.email}</div>
          </div>
        );
      })}
    </div>
  );
}