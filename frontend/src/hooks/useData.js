import { useState, useEffect } from 'react';
import { mockDocuments, mockSuppliers } from '../utils/mockData.js';

// Troque os mocks por fetch() quando o backend estiver pronto
// Ex: const res = await fetch('http://localhost:3000/api/documents');

export function useDocumentos() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setDocuments(mockDocuments);
      setLoading(false);
    }, 300);
  }, []);

  const addDocument = (doc) => {
    const newDoc = {
      ...doc,
      id: Date.now(),
      created_at: new Date().toISOString().slice(0, 10),
      gravity: 5, urgency: 5, tendency: 5,
    };
    setDocuments(prev => [newDoc, ...prev]);
    return newDoc;
  };

  const updateDocument = (id, updates) => {
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
  };

  const deleteDocument = (id) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  return { documents, loading, addDocument, updateDocument, deleteDocument };
}

export function useFornecedores() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setSuppliers(mockSuppliers);
      setLoading(false);
    }, 200);
  }, []);

  const addSupplier = (s) => {
    const newS = { ...s, id: Date.now(), active: true };
    setSuppliers(prev => [newS, ...prev]);
  };

  const updateSupplier = (id, updates) => {
    setSuppliers(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const deleteSupplier = (id) => {
    setSuppliers(prev => prev.filter(s => s.id !== id));
  };

  return { suppliers, loading, addSupplier, updateSupplier, deleteSupplier };
}
