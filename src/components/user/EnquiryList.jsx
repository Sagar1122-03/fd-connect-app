import { useState } from 'react';
import { deleteEnquiry, openEnquiryDocument } from '../../lib/data';
import { inr } from '../../utils/formatters';
import { Empty } from '../common/Empty';

export function EnquiryList({ list, db, empty, canDelete = false, refreshDb, toast }) {
  const [openingId, setOpeningId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');
  if (!list.length) return <Empty>{empty}</Empty>;

  const openDocument = async (enquiry) => {
    setOpeningId(enquiry.id);
    setError('');
    try {
      await openEnquiryDocument(enquiry.aadhaarPath);
    } catch (openError) {
      setError(`Could not open identity document: ${openError.message}`);
    } finally {
      setOpeningId(null);
    }
  };

  const removeEnquiry = async (enquiry) => {
    if (!window.confirm('Delete this enquiry and its uploaded identity document?')) return;
    setDeletingId(enquiry.id);
    setError('');
    try {
      await deleteEnquiry(enquiry);
    } catch (deleteError) {
      setError(`Could not delete enquiry: ${deleteError.message}`);
      setDeletingId(null);
      return;
    }

    toast('Enquiry deleted');
    try {
      await refreshDb();
    } catch (refreshError) {
      setError(`Enquiry deleted, but the list could not be refreshed: ${refreshError.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="stack">
      {error && <p className="err" role="alert">{error}</p>}
      {list.map((enquiry) => {
        const plan = db.plans.find((item) => item.id === enquiry.planId);
        const bank = db.banks.find((item) => item.id === enquiry.bankId);
        return (
          <div className="card stack" key={enquiry.id}>
            <div className="row">
              <h3>{plan ? plan.name : 'FD plan'} · {bank ? bank.name : 'Bank'}</h3>
              <span className="mut">{enquiry.date}</span>
            </div>
            <div>{enquiry.name} · {enquiry.phone}</div>
            <div className="mut">{inr(enquiry.amount)} · bank code {bank ? bank.code : ''}</div>
            <div className="row" style={{ justifyContent: 'flex-start' }}>
              <button
                type="button"
                className="btn ghost"
                disabled={openingId === enquiry.id || deletingId === enquiry.id}
                onClick={() => openDocument(enquiry)}
              >
                {openingId === enquiry.id ? 'Opening…' : 'View identity document'}
              </button>
              {canDelete && (
                <button
                  type="button"
                  className="btn bad"
                  disabled={Boolean(deletingId) || openingId === enquiry.id}
                  onClick={() => removeEnquiry(enquiry)}
                >
                  {deletingId === enquiry.id ? 'Deleting…' : 'Delete enquiry'}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
