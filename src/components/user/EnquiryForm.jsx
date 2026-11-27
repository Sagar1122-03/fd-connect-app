import { useState } from 'react';
import { inr } from '../../utils/formatters';
import { Field } from '../common/Field';
import { Modal } from '../common/Modal';

export function EnquiryForm({ plan, bank, onSubmit, onClose }) {
  const [f, setF] = useState({ name: '', phone: '', aadhaar: '', amount: plan.min, file: null });
  const [otp, setOtp] = useState({ sent: false, code: '', ok: false });
  const [e, setE] = useState({});

  const set = (k) => (ev) => setF({ ...f, [k]: ev.target.value });

  const go = (ev) => {
    ev.preventDefault();
    const x = {};
    if (f.name.trim().length < 3) x.name = 'Enter your name as on your Aadhaar card.';
    if (!/^[6-9]\d{9}$/.test(f.phone)) x.phone = 'Enter a 10-digit Indian mobile number.';
    else if (!otp.ok) x.phone = 'Verify your phone number with the OTP.';
    if (!/^\d{12}$/.test(f.aadhaar)) x.aadhaar = 'Aadhaar number must be 12 digits.';
    if (!f.file) x.file = 'Upload a copy of your Aadhaar card.';
    if (Number(f.amount) < plan.min) x.amount = 'Minimum deposit is ' + inr(plan.min) + '.';

    setE(x);
    if (!Object.keys(x).length) onSubmit(f);
  };

  return (
    <Modal onClose={onClose}>
      <h2>Enquire: {plan.name}</h2>
      <form className="stack" onSubmit={go}>
        <div className="two">
          <Field label="Bank code">
            <input value={bank.code} readOnly />
          </Field>
          <Field label="Deposit amount (₹)" error={e.amount}>
            <input type="number" value={f.amount} onChange={set('amount')} />
          </Field>
        </div>

        <Field label="Legal name" error={e.name}>
          <input value={f.name} onChange={set('name')} />
        </Field>

        <Field label="Phone number" error={e.phone}>
          <div className="row" style={{ flexWrap: 'nowrap' }}>
            <input
              inputMode="numeric"
              maxLength="10"
              value={f.phone}
              disabled={otp.ok}
              onChange={set('phone')}
            />
            {otp.ok ? (
              <span className="tag ok">Verified</span>
            ) : (
              <button
                type="button"
                className="btn ghost"
                disabled={f.phone.length !== 10}
                onClick={() => setOtp({ ...otp, sent: true })}
              >
                Send OTP
              </button>
            )}
          </div>
        </Field>

        {otp.sent && !otp.ok && (
          <Field label="Enter OTP (demo code: 123456)">
            <div className="row" style={{ flexWrap: 'nowrap' }}>
              <input
                inputMode="numeric"
                maxLength="6"
                value={otp.code}
                onChange={(ev) => setOtp({ ...otp, code: ev.target.value })}
              />
              <button
                type="button"
                className="btn"
                onClick={() =>
                  otp.code === '123456'
                    ? setOtp({ ...otp, ok: true })
                    : setE({ ...e, phone: 'Wrong OTP. Try 123456.' })
                }
              >
                Verify
              </button>
            </div>
          </Field>
        )}

        <Field label="Aadhaar number" error={e.aadhaar}>
          <input inputMode="numeric" maxLength="12" value={f.aadhaar} onChange={set('aadhaar')} />
        </Field>

        <Field label="Upload Aadhaar card" error={e.file}>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(ev) => setF({ ...f, file: ev.target.files[0] ? ev.target.files[0].name : null })}
          />
        </Field>

        <div className="row">
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn">Send enquiry</button>
        </div>
      </form>
    </Modal>
  );
}