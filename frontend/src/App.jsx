import React, { useState, useEffect } from 'react';
import './index.css'; // Isso carrega todo aquele seu estilo automaticamente

function App() {
  const [documents, setDocuments] = useState([]);

  // Esta função vai buscar os dados do seu Backend (Node.js)
  useEffect(() => {
    fetch('http://localhost:3000/api/documents') // Endereço da sua API
      .then(res => res.json())
      .then(data => setDocuments(data))
      .catch(err => console.error("Erro ao buscar documentos:", err));
  }, []);

  return (
    <div className="aq-shell">
      {/* Sidebar - Fixa */}
      <div className="sidebar">
        <div className="logo">AQ</div>
        <div className="nav-item active">D</div>
        <div className="nav-item">A</div>
        <div className="nav-item">S</div>
      </div>

      <div className="main">
        <div className="topbar">
          <div className="topbar-title">Audit Quality</div>
        </div>

        <div className="content-area">
          <div className="list-panel">
            <div className="table-card">
              <table>
                <thead>
                  <tr>
                    <th>ID Code</th>
                    <th>Type</th>
                    <th>Supplier</th>
                    <th>Status</th>
                    <th>GUT</th>
                  </tr>
                </thead>
                <tbody>
                  {/* O React vai criar uma linha para cada documento no seu Banco */}
                  {documents.map(doc => (
                    <tr key={doc.id}>
                      <td><span className="code">{doc.code}</span></td>
                      <td><span className={`badge badge-${doc.type.toLowerCase()}`}>{doc.type}</span></td>
                      <td>{doc.supplier_name}</td>
                      <td>{doc.status}</td>
                      <td>{doc.gut_score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;