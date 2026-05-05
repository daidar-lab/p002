const BASE = 'http://localhost:3000/api';

async function req(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json();

  if (!res.ok) throw new Error(data.error || 'Erro na requisição');
  return data;
}

export const api = {
  // Documents
  getDocuments:    ()       => req('GET',    '/documents'),
  createDocument:  (body)   => req('POST',   '/documents', body),
  updateDocument:  (id, b)  => req('PUT',    `/documents/${id}`, b),
  deleteDocument:  (id)     => req('DELETE', `/documents/${id}`),
  patchStatus:     (id, s)  => req('PATCH',  `/documents/${id}/status`, { status: s }),
  getTimeline:     (id)     => req('GET',    `/documents/${id}/timeline`),

  // Suppliers
  getSuppliers:    ()       => req('GET',    '/suppliers'),
  createSupplier:  (body)   => req('POST',   '/suppliers', body),
  updateSupplier:  (id, b)  => req('PUT',    `/suppliers/${id}`, b),
  deleteSupplier:  (id)     => req('DELETE', `/suppliers/${id}`),
};
