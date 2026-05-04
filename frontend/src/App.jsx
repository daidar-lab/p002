import React, { useEffect, useState } from 'react';
import './index.css';

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [open, setOpen] = useState(false);

  const [form, setForm] = useState({
    code: '',
    type: 'RNC',
    supplier_id: '',
    item_description: '',
    defect_category: 'QUALIDADE'
  });

  useEffect(() => {
    fetch('http://localhost:3000/api/documents')
      .then(res => res.json())
      .then(setDocuments);

    fetch('http://localhost:3000/api/suppliers')
      .then(res => res.json())
      .then(setSuppliers);
  }, []);

  const submit = async e => {
    e.preventDefault();

    const res = await fetch('http://localhost:3000/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });

    if (res.ok) {
      setOpen(false);
      window.location.reload();
    } else {
      alert('Erro ao salvar');
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="logo">AQ</div>
        <nav>
          <button className="nav-item active">⌘</button>
          <button className="nav-item">📄</button>
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h1>Audit Quality</h1>
            <span>Dashboard</span>
          </div>

          <button className="btn-primary" onClick={() => setOpen(true)}>
            + Novo Documento
          </button>
        </header>

        <section className="content">
          <div className="card table-card">
            <div className="card-head">
              <h2>Documentos</h2>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Tipo</th>
                  <th>Fornecedor</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {documents.map(d => (
                  <tr key={d.id}>
                    <td className="mono">{d.code}</td>
                    <td>
                      <span className={`badge ${d.type.toLowerCase()}`}>
                        {d.type}
                      </span>
                    </td>
                    <td>{d.supplier_name || 'Externo'}</td>
                    <td>{d.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* DRAWER */}
      {open && (
        <div className="drawer-overlay" onClick={() => setOpen(false)}>
          <aside className="drawer" onClick={e => e.stopPropagation()}>
            <header>
              <h3>Novo Documento</h3>
            </header>

            <form onSubmit={submit}>
              <input
                placeholder="Código"
                onChange={e => setForm({ ...form, code: e.target.value })}
                required
              />

              <select onChange={e => setForm({ ...form, type: e.target.value })}>
                <option>RNC</option>
                <option>RAQ</option>
                <option>RHE</option>
              </select>

              <select
                onChange={e =>
                  setForm({ ...form, supplier_id: e.target.value })
                }
                required
              >
                <option value="">Fornecedor</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              <textarea
                placeholder="Descrição"
                onChange={e =>
                  setForm({ ...form, item_description: e.target.value })
                }
                required
              />

              <button type="submit" className="btn-primary full">
                Salvar
              </button>
            </form>
          </aside>
        </div>
      )}
    </div>
  );
}
