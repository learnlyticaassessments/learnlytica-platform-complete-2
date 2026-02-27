import { useMemo, useState } from 'react';

const EMPTY_FORM = {
  visitorName: '',
  companyName: '',
  hostName: '',
  purpose: 'meeting'
};

function buildVisitorId(index) {
  return `VIS-${String(index + 1).padStart(4, '0')}`;
}

export default function App() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [visitors, setVisitors] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');

  const isValid = useMemo(() => (
    form.visitorName.trim().length >= 2 &&
    form.companyName.trim().length >= 2 &&
    form.hostName.trim().length >= 2 &&
    !!form.purpose
  ), [form]);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setSuccessMessage('');
  }

  function validate() {
    const next = {};
    if (form.visitorName.trim().length < 2) next.visitorName = 'Visitor name is required';
    if (form.companyName.trim().length < 2) next.companyName = 'Company name is required';
    if (form.hostName.trim().length < 2) next.hostName = 'Host name is required';
    if (!form.purpose) next.purpose = 'Purpose is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    setSuccessMessage('');
    if (!validate()) return;

    setVisitors((prev) => [{
      id: buildVisitorId(prev.length),
      visitorName: form.visitorName.trim(),
      companyName: form.companyName.trim(),
      hostName: form.hostName.trim(),
      purpose: form.purpose,
      status: 'Checked In'
    }, ...prev]);

    setForm({ ...EMPTY_FORM, purpose: form.purpose });
    setSuccessMessage('Visitor checked in successfully and added to Today\'s Visitors.');
  }

  return (
    <div className="app-shell">
      <main className="container">
        <header className="hero">
          <div>
            <p className="eyebrow">Front Desk Ops</p>
            <h1>Visitor Check-In Desk</h1>
            <p className="subtle">Register office visitors quickly and track who is currently checked in.</p>
          </div>
        </header>

        <section className="panel">
          <h2>Check In Visitor</h2>
          <form onSubmit={handleSubmit} className="ticket-form" noValidate>
            <div className="grid">
              <label>
                Visitor Name
                <input value={form.visitorName} onChange={(e) => updateField('visitorName', e.target.value)} placeholder="Rahul Nair" />
                {errors.visitorName ? <span className="error">{errors.visitorName}</span> : null}
              </label>
              <label>
                Company
                <input value={form.companyName} onChange={(e) => updateField('companyName', e.target.value)} placeholder="Acme Corp" />
                {errors.companyName ? <span className="error">{errors.companyName}</span> : null}
              </label>
              <label>
                Host Name
                <input value={form.hostName} onChange={(e) => updateField('hostName', e.target.value)} placeholder="Priya Menon" />
                {errors.hostName ? <span className="error">{errors.hostName}</span> : null}
              </label>
              <label>
                Purpose
                <select value={form.purpose} onChange={(e) => updateField('purpose', e.target.value)}>
                  <option value="meeting">Meeting</option>
                  <option value="interview">Interview</option>
                  <option value="delivery">Delivery</option>
                  <option value="vendor">Vendor Visit</option>
                </select>
              </label>
            </div>
            <div className="actions">
              <button type="submit" disabled={!isValid}>Check In</button>
              {!isValid && <span className="helper">Complete required fields to check in a visitor.</span>}
            </div>
            {successMessage && <div className="success-toast">{successMessage}</div>}
          </form>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Today’s Visitors</h2>
            <span className="badge">{visitors.length} checked in</span>
          </div>
          {visitors.length === 0 ? (
            <p className="empty-state">No visitors checked in yet.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Visitor ID</th>
                    <th>Name</th>
                    <th>Company</th>
                    <th>Host</th>
                    <th>Purpose</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visitors.map((v) => (
                    <tr key={v.id}>
                      <td>{v.id}</td>
                      <td>{v.visitorName}</td>
                      <td>{v.companyName}</td>
                      <td>{v.hostName}</td>
                      <td className="capitalize">{v.purpose}</td>
                      <td>{v.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
