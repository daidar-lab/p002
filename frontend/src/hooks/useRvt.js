import { useState, useEffect, useCallback } from 'react';

export function useRvt() {
  const [rvts, setRvts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRvts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/rvt`, {
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('aq_token')}` }
      });
      if (!res.ok) throw new Error('Falha ao buscar RVTs');
      const data = await res.json();
      setRvts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRvts();
  }, [fetchRvts]);

  const createRvt = async (data) => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/rvt`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionStorage.getItem('aq_token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Falha ao criar RVT');
    }
    fetchRvts();
    return await res.json();
  };

  const updateRvt = async (id, data) => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/rvt/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${sessionStorage.getItem('aq_token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Falha ao atualizar RVT');
    fetchRvts();
    return await res.json();
  };

  const finalizeRvt = async (id) => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/rvt/${id}/finalizar`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${sessionStorage.getItem('aq_token')}` }
    });
    if (!res.ok) throw new Error('Falha ao finalizar RVT');
    fetchRvts();
    return await res.json();
  };

  return { rvts, loading, error, createRvt, updateRvt, finalizeRvt, refresh: fetchRvts };
}
