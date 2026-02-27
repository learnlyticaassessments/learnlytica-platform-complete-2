import { useMemo, useState } from 'react';

const EMPTY_FORM = {
  customerName: '',
  customerEmail: '',
  category: 'billing',
  priority: 'medium',
  description: ''
};

function buildTicketId(index) {
  return `TKT-${String(index + 1).padStart(4, '0')}`;
}

export default function App() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [tickets, setTickets] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');

  const isValid = useMemo(() => {
    return (
      form.customerName.trim().length >= 2 &&
      /\S+@\S+\.\S+/.test(form.customerEmail) &&
      form.description.trim().length >= 10
    );
  }, [form]);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setSuccessMessage('');
  }

  function validate() {
    const next = {};
    if (form.customerName.trim().length < 2) next.customerName = 'Customer name is required';
    if (!/\S+@\S+\.\S+/.test(form.customerEmail)) next.customerEmail = 'Valid email is required';
    if (!form.category) next.category = 'Category is required';
    if (!form.priority) next.priority = 'Priority is required';
    if (form.description.trim().length < 10) next.description = 'Description must be at least 10 characters';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    setSuccessMessage('');
    if (!validate()) return;

    setTickets((prev) => {
      const nextTicket = {
        id: buildTicketId(prev.length),
        customerName: form.customerName.trim(),
        customerEmail: form.customerEmail.trim(),
        category: form.category,
        priority: form.priority,
        description: form.description.trim(),
        status: 'Open',
        createdAt: new Date().toISOString()
      };
      return [nextTicket, ...prev];
    });

    setForm((prev) => ({ ...EMPTY_FORM, category: prev.category, priority: prev.priority }));
    setSuccessMessage('Ticket created successfully and added to Recent Tickets.');
  }

  return (
    <div className="app-shell">
      <main className="container">
        <header className="hero">
          <div>
            <p className="eyebrow">Customer Ops</p>
            <h1>Support Ticket Intake Portal</h1>
            <p className="subtle">
              Intake customer issues quickly with a clean agent workflow. This demo uses local state only.
            </p>
          </div>
        </header>

        <section className="panel">
          <h2>Create Ticket</h2>
          <form onSubmit={handleSubmit} className="ticket-form" noValidate>
            <div className="grid">
              <label>
                Customer Name
                <input
                  value={form.customerName}
                  onChange={(e) => updateField('customerName', e.target.value)}
                  placeholder="Riya Sharma"
                />
                {errors.customerName ? <span className="error">{errors.customerName}</span> : null}
              </label>

              <label>
                Customer Email
                <input
                  value={form.customerEmail}
                  onChange={(e) => updateField('customerEmail', e.target.value)}
                  placeholder="riya@example.com"
                />
                {errors.customerEmail ? <span className="error">{errors.customerEmail}</span> : null}
              </label>

              <label>
                Issue Category
                <select value={form.category} onChange={(e) => updateField('category', e.target.value)}>
                  <option value="billing">Billing</option>
                  <option value="technical">Technical</option>
                  <option value="account">Account</option>
                  <option value="shipping">Shipping</option>
                </select>
                {errors.category ? <span className="error">{errors.category}</span> : null}
              </label>

              <label>
                Priority
                <select value={form.priority} onChange={(e) => updateField('priority', e.target.value)}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                {errors.priority ? <span className="error">{errors.priority}</span> : null}
              </label>
            </div>

            <label>
              Issue Description
              <textarea
                rows={4}
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Describe the customer issue in detail..."
              />
              <div className="helper-row">
                <span className="helper">{form.description.length}/300 characters</span>
                {errors.description ? <span className="error inline">{errors.description}</span> : null}
              </div>
            </label>

            <div className="actions">
              <button type="submit" disabled={!isValid}>
                Create Ticket
              </button>
              {!isValid && <span className="helper">Fill all required fields to enable submission.</span>}
            </div>

            {successMessage && <div className="success-toast">{successMessage}</div>}
          </form>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Recent Tickets</h2>
            <span className="badge">{tickets.length} total</span>
          </div>
          {tickets.length === 0 ? (
            <p className="empty-state">No tickets created yet. Submit the form to see the latest tickets here.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Ticket ID</th>
                    <th>Customer Name</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => (
                    <tr key={ticket.id}>
                      <td>{ticket.id}</td>
                      <td>{ticket.customerName}</td>
                      <td className="capitalize">{ticket.category}</td>
                      <td>
                        <span className={`priority-pill ${ticket.priority}`}>{ticket.priority}</span>
                      </td>
                      <td>{ticket.status}</td>
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
