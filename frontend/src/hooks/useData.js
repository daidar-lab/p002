import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api.js';

export function useDocumentos() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getDocuments();
      setDocuments(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addDocument = async (body) => {
    const doc = await api.createDocument(body);
    setDocuments(prev => [doc, ...prev]);
    return doc;
  };

  const updateDocument = async (id, body) => {
    const doc = await api.updateDocument(id, body);
    setDocuments(prev => prev.map(d => d.id === id ? doc : d));
    return doc;
  };

  const deleteDocument = async (id) => {
    await api.deleteDocument(id);
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  const patchStatus = async (id, status) => {
    const doc = await api.patchStatus(id, status);
    setDocuments(prev => prev.map(d => d.id === id ? doc : d));
    return doc;
  };

  return { documents, loading, error, reload: load, addDocument, updateDocument, deleteDocument, patchStatus };
}

export function useFornecedores() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getSuppliers();
      // SupplierService.listAll() retorna { data: [...] } ou array direto
      setSuppliers(Array.isArray(data) ? data : data.data ?? []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addSupplier = async (body) => {
    const s = await api.createSupplier(body);
    setSuppliers(prev => [s, ...prev]);
    return s;
  };

  const updateSupplier = async (id, body) => {
    const s = await api.updateSupplier(id, body);
    setSuppliers(prev => prev.map(x => x.id === id ? s : x));
    return s;
  };

  const deleteSupplier = async (id) => {
    await api.deleteSupplier(id);
    setSuppliers(prev => prev.filter(x => x.id !== id));
  };

  return { suppliers, loading, error, reload: load, addSupplier, updateSupplier, deleteSupplier };
}
