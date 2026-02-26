import { useMemo, useState } from 'react';

const EMPTY_FORM = {
  employeeName: '',
  employeeEmail: '',
  category: 'travel',
  amount: '',
  expenseDate: '',
  description: ''
};

function buildClaimId(index) {
  return `CLM-${String(index + 1).padStart(4, '0')}`;
}

export default function App() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [claims, setClaims] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');

  const isValid = useMemo(() => (
    form.employeeName.trim().length >= 2 &&
    /\S+@\S+\.\S+/.test(form.employeeEmail) &&
    Number(form.amount) > 0 &&
    !!form.expenseDate &&
    form.description.trim().length >= 8
  ), [form]);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setSuccessMessage('');
  }

  function validate() {
    const next = {};
    if (form.employeeName.trim().length < 2) next.employeeName = 'Employee name is required';
    if (!/\S+@\S+\.\S+/.test(form.employeeEmail)) next.employeeEmail = 'Valid employee email is required';
    if (!form.category) next.category = 'Category is required';
    if (!(Number(form.amount) > 0)) next.amount = 'Amount must be greater than 0';
    if (!form.expenseDate) next.expenseDate = 'Expense date is required';
    if (form.description.trim().length < 8) next.description = 'Description must be at least 8 characters';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    setSuccessMessage('');
    if (!validate()) return;

    setClaims((prev) => [{
      id: buildClaimId(prev.length),
      employeeName: form.employeeName.trim(),
      employeeEmail: form.employeeEmail.trim(),
      category: form.category,
      amount: Number(form.amount).toFixed(2),
      expenseDate: form.expenseDate,
      description: form.description.trim(),
      status: 'Pending Review'
    }, ...prev]);

    setForm({ ...EMPTY_FORM, category: form.category });
    setSuccessMessage('Expense claim submitted successfully and added to Recent Claims.');
  }

  return (
    <div className="app-shell">
      <main className="container">
        <header className="hero">
          <div>
            <p className="eyebrow">Finance Ops</p>
            <h1>Expense Claim Submission Portal</h1>
            <p className="subtle">Submit employee expense claims with category, amount, and date. Demo uses local state only.</p>
          </div>
        </header>

        <section className="panel">
          <h2>Submit Claim</h2>
          <form onSubmit={handleSubmit} className="ticket-form" noValidate>
            <div className="grid">
              <label>
                Employee Name
                <input value={form.employeeName} onChange={(e) => updateField('employeeName', e.target.value)} placeholder="Asha Verma" />
                {errors.employeeName ? <span className="error">{errors.employeeName}</span> : null}
              </label>
              <label>
                Employee Email
                <input value={form.employeeEmail} onChange={(e) => updateField('employeeEmail', e.target.value)} placeholder="asha@example.com" />
                {errors.employeeEmail ? <span className="error">{errors.employeeEmail}</span> : null}
              </label>
              <label>
                Category
                <select value={form.category} onChange={(e) => updateField('category', e.target.value)}>
                  <option value="travel">Travel</option>
                  <option value="meals">Meals</option>
                  <option value="supplies">Supplies</option>
                </select>
              </label>
              <label>
                Amount
                <input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => updateField('amount', e.target.value)} placeholder="1250.00" />
                {errors.amount ? <span className="error">{errors.amount}</span> : null}
              </label>
              <label>
                Date
                <input type="date" value={form.expenseDate} onChange={(e) => updateField('expenseDate', e.target.value)} />
                {errors.expenseDate ? <span className="error">{errors.expenseDate}</span> : null}
              </label>
            </div>
            <label>
              Expense Description
              <textarea rows={4} value={form.description} onChange={(e) => updateField('description', e.target.value)} placeholder="Describe the expense..." />
              {errors.description ? <span className="error">{errors.description}</span> : null}
            </label>
            <div className="actions">
              <button type="submit" disabled={!isValid}>Submit Claim</button>
              {!isValid && <span className="helper">Complete all required fields to submit.</span>}
            </div>
            {successMessage && <div className="success-toast">{successMessage}</div>}
          </form>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Recent Claims</h2>
            <span className="badge">{claims.length} total</span>
          </div>
          {claims.length === 0 ? (
            <p className="empty-state">No claims yet. Submit a claim to see it listed here.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Claim ID</th>
                    <th>Employee Name</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {claims.map((claim) => (
                    <tr key={claim.id}>
                      <td>{claim.id}</td>
                      <td>{claim.employeeName}</td>
                      <td className="capitalize">{claim.category}</td>
                      <td>{claim.amount}</td>
                      <td>{claim.expenseDate}</td>
                      <td>{claim.status}</td>
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
