import { useEffect, useState } from 'react';
import { inr } from '../../utils/formatters';
import { Field } from '../common/Field';

export function MaturityCalculator({ plans, banks, selectedPlan, onEnquire }) {
  const [principal, setPrincipal] = useState(50000);
  const [rate, setRate] = useState(7.5);
  const [months, setMonths] = useState(36);
  const [compounding, setCompounding] = useState(4);

  useEffect(() => {
    if (selectedPlan) {
      setPrincipal(Math.max(selectedPlan.min, 10000));
      setRate(selectedPlan.rate);
      setMonths(selectedPlan.tenure);
    }
  }, [selectedPlan]);

  const p = Math.max(0, Number(principal) || 0);
  const r = Math.max(0, Number(rate) || 0) / 100;
  const t = Math.max(0, Number(months) || 0) / 12;
  const n = Number(compounding);

  const maturityAmount = p * Math.pow(1 + r / n, n * t);
  const interestEarned = Math.max(0, maturityAmount - p);
  const principalPct = maturityAmount > 0 ? Math.round((p / maturityAmount) * 100) : 100;

  return (
    <div className="card stack" style={{ marginBottom: '20px' }}>
      <div className="row">
        <div>
          <h3>FD Maturity Calculator</h3>
          <span className="mut">Estimate returns with quarterly or annual compounding</span>
        </div>
        {selectedPlan && <span className="tag ok">Loaded: {selectedPlan.name}</span>}
      </div>

      {plans.length > 0 && (
        <Field label="Prefill from an available bank plan (optional)">
          <select
            value={selectedPlan ? selectedPlan.id : ''}
            onChange={(e) => {
              const found = plans.find((x) => String(x.id) === e.target.value);
              if (found) {
                setPrincipal(found.min);
                setRate(found.rate);
                setMonths(found.tenure);
              }
            }}
          >
            <option value="">-- Custom values --</option>
            {plans.map((pl) => {
              const bk = banks.find((b) => b.id === pl.bankId);
              return (
                <option key={pl.id} value={pl.id}>
                  {bk ? `${bk.name} - ` : ''}
                  {pl.name} ({pl.rate}% p.a. · {pl.tenure}m)
                </option>
              );
            })}
          </select>
        </Field>
      )}

      <div className="two">
        <Field label="Deposit Amount (₹)">
          <input
            type="number"
            min="1000"
            step="1000"
            value={principal}
            onChange={(e) => setPrincipal(e.target.value)}
          />
        </Field>

        <Field label="Interest Rate (% p.a.)">
          <input
            type="number"
            min="0.1"
            max="20"
            step="0.05"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
        </Field>
      </div>

      <div className="two">
        <Field label="Tenure (Months)">
          <input
            type="number"
            min="1"
            max="120"
            value={months}
            onChange={(e) => setMonths(e.target.value)}
          />
        </Field>

        <Field label="Compounding Frequency">
          <select value={compounding} onChange={(e) => setCompounding(e.target.value)}>
            <option value={4}>Quarterly (Standard)</option>
            <option value={12}>Monthly</option>
            <option value={2}>Half-Yearly</option>
            <option value={1}>Annually</option>
          </select>
        </Field>
      </div>

      <div style={{ marginTop: '6px' }}>
        <div
          style={{
            display: 'flex',
            height: '10px',
            borderRadius: '99px',
            overflow: 'hidden',
            background: 'var(--line)',
          }}
        >
          <div style={{ width: `${principalPct}%`, background: 'var(--pri)' }} />
          <div style={{ flex: 1, background: 'var(--gold)' }} />
        </div>
        <div className="row" style={{ marginTop: '6px', fontSize: '0.82rem' }}>
          <span className="mut">● Principal ({principalPct}%)</span>
          <span className="mut">● Interest ({100 - principalPct}%)</span>
        </div>
      </div>

      <div
        className="row"
        style={{
          padding: '12px',
          borderRadius: '8px',
          background: 'var(--bg)',
          border: '1px solid var(--line)',
        }}
      >
        <div>
          <div className="mut">Invested</div>
          <strong>{inr(Math.round(p))}</strong>
        </div>
        <div>
          <div className="mut">Est. Interest</div>
          <strong style={{ color: 'var(--gold)' }}>+{inr(Math.round(interestEarned))}</strong>
        </div>
        <div>
          <div className="mut">Maturity Value</div>
          <div className="rate" style={{ fontSize: '1.45rem' }}>
            {inr(Math.round(maturityAmount))}
          </div>
        </div>
      </div>

      {selectedPlan && onEnquire && (
        <button className="btn" onClick={() => onEnquire(selectedPlan)}>
          Proceed with {selectedPlan.name}
        </button>
      )}
    </div>
  );
}