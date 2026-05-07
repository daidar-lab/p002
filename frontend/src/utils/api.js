const BASE = 'http://localhost:3000/api';

async function req(method, path, body) {
  const headers = {
    'Content-Type': 'application/json',
  };

  // ✅ JWT: envia Bearer automaticamente
  const token = sessionStorage.getItem('aq_token');
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();

  /**
   * ✅ Token expirado / inválido
   * Força logout automático
   */
  if (res.status === 401) {
    sessionStorage.clear();
    window.location.href = '/';
    return;
  }

  if (!res.ok) {
    throw new Error(data.error || 'Erro na requisição');
  }

  return data;
}

export const api = {
  // Auth
  login: (body) => req('POST', '/auth/login', body),

  // Users (ADMIN)
  getUsers: () => req('GET', '/users'),
  createUser: (b) => req('POST', '/users', b),
  updateUser: (id, b) => req('PUT', `/users/${id}`, b),
  deleteUser: (id) => req('DELETE', `/users/${id}`),

  // Documents
  getDocuments: () => req('GET', '/documents'),
  createDocument: (b) => req('POST', '/documents', b),
  updateDocument: (id, b) => req('PUT', `/documents/${id}`, b),
  deleteDocument: (id) => req('DELETE', `/documents/${id}`),
  patchStatus: (id, s) =>
    req('PATCH', `/documents/${id}/status`, { status: s }),
  getTimeline: (id) =>
    req('GET', `/documents/${id}/timeline`),

  // Suppliers
  getSuppliers: () => req('GET', '/suppliers'),
  createSupplier: (b) => req('POST', '/suppliers', b),
  updateSupplier: (id, b) =>
    req('PUT', `/suppliers/${id}`, b),
  deleteSupplier: (id) =>
    req('DELETE', `/suppliers/${id}`),
};