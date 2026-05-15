import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api.js';

export function useDocumentos() {
  const [documents, setDocuments] = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [limit, setLimit]         = useState(20);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  const load = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getDocuments(params);
      setDocuments(res.data);
      setTotal(res.total);
      setPage(res.page);
      setLimit(res.limit);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load({ page: 1, limit: 20 }); }, [load]);

  const addDocument = async (body) => {
    const doc = await api.createDocument(body);
    load({ page, limit }); // Reload to maintain pagination state
    return doc;
  };

  const updateDocument = async (id, body) => {
    const doc = await api.updateDocument(id, body);
    setDocuments(prev => prev.map(d => d.id === id ? doc : d));
    return doc;
  };

  const deleteDocument = async (id) => {
    await api.deleteDocument(id);
    load({ page, limit }); // Reload
  };

  const patchStatus = async (id, status) => {
    const doc = await api.patchStatus(id, status);
    setDocuments(prev => prev.map(d => d.id === id ? doc : d));
    return doc;
  };

  return { documents, total, page, limit, loading, error, reload: load, addDocument, updateDocument, deleteDocument, patchStatus };
}

export function useFornecedores() {
  const [suppliers, setSuppliers] = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [limit, setLimit]         = useState(20);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  const load = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getSuppliers(params);
      setSuppliers(res.data);
      setTotal(res.total);
      setPage(res.page);
      setLimit(res.limit);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load({ page: 1, limit: 20 }); }, [load]);

  const addSupplier = async (body) => {
    const s = await api.createSupplier(body);
    load({ page, limit });
    return s;
  };

  const updateSupplier = async (id, body) => {
    const s = await api.updateSupplier(id, body);
    setSuppliers(prev => prev.map(x => x.id === id ? s : x));
    return s;
  };

  const deleteSupplier = async (id) => {
    await api.deleteSupplier(id);
    load({ page, limit });
  };

  return { suppliers, total, page, limit, loading, error, reload: load, addSupplier, updateSupplier, deleteSupplier };
}
