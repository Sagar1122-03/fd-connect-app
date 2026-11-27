import { useState } from 'react';
import { inr } from '../../utils/formatters';
import { Field } from '../common/Field';
import { Modal } from '../common/Modal';

export function EnquiryForm({ plan, bank, onSubmit, onClose }) {
  const [f, setF] = useState({ name: '', phone: '', amount: plan.min, file: null, consent: false });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const set = (key) => (event) => setF({ ...f, [key]: event.target.value });

  const go = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (f.name.trim().length < 3) nextErrors.name = 'Enter your legal name.';
    if (!/^[6-9]\d{9}$/.test(f.phone)) nextErrors.phone = 'Enter a 10-digit Indian mobile number.';
    if (!f.file) nextErrors.file = 'Upload a copy of your Aadhaar card.';
    else if (!['image/jpeg', 'image/png', 'application/pdf'].includes(f.file.type)) {
      nextErrors.file = 'Choose a JPG, PNG, or PDF file.';
    } else if (f.file.size > 5 * 1024 * 1024) {
      nextErrors.file = 'The file must be 5 MB or smaller.';
    }
    if (Number(f.amount) < plan.min) nextErrors.amount = `Minimum deposit is ${inr(plan.min)}.`;
    if (!f.consent) nextErrors.consent = 'Consent is required to share this document with the bank.';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setBusy(true);
    try {
      await onSubmit(f);
    } catch (error) {
      setErrors({ form: `Could not send enquiry: ${error.message}` });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <h2>Enquire: {plan.name}</h2>
      <form className="stack" onSubmit={go}>
        <div className="two">
          <Field label="Bank code">
            <input value={bank.code} readOnly />
          </Field>
          <Field label="Deposit amount (₹)" error={errors.amount}>
            <input type="number" min={plan.min} value={f.amount} onChange={set('amount')} />
          </Field>
        </div>

        <Field label="Legal name" error={errors.name}>
          <input autoComplete="name" value={f.name} onChange={set('name')} />
        </Field>

        <Field label="Phone number" error={errors.phone}>
          <input
            type="tel"
            inputMode="numeric"
            maxLength="10"
            value={f.phone}
            onChange={(event) => setF({ ...f, phone: event.target.value.replace(/\D/g, '') })}
          />
        </Field>

        <Field label="Upload Aadhaar card" error={errors.file}>
          <input
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            onChange={(event) => setF({ ...f, file: event.target.files?.[0] || null })}
          />
        </Field>
        <p className="mut">This document is stored privately and shared only with this bank and the admin.</p>
        <label className="consent">
          <input
            type="checkbox"
            checked={f.consent}
            onChange={(event) => setF({ ...f, consent: event.target.checked })}
          />
          I consent to share my uploaded identity document and enquiry details with this bank.
        </label>
        {errors.consent && <p className="err" role="alert">{errors.consent}</p>}
        {errors.form && <p className="err" role="alert">{errors.form}</p>}

        <div className="row">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={busy}>{busy ? 'Sending…' : 'Send enquiry'}</button>
        </div>
      </form>
    </Modal>
  );
}
