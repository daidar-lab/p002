import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api.js';

export function useRvt() {
  const [rvts, setRvts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage]   = useState(1);
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRvts = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const res = await api.listRvts(params);
      setRvts(res.data);
      setTotal(res.total);
      setPage(res.page);
      setLimit(res.limit);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRvts({ page: 1, limit: 20 });
  }, [fetchRvts]);

  const createRvt = async (data) => {
    const r = await api.post('/rvt', data);
    fetchRvts({ page, limit });
    return r;
  };

  const updateRvt = async (id, data) => {
    const r = await api.put(`/rvt/${id}`, data);
    fetchRvts({ page, limit });
    return r;
  };

  const finalizeRvt = async (id) => {
    const r = await api.post(`/rvt/${id}/finalizar`, {});
    fetchRvts({ page, limit });
    return r;
  };

  return { rvts, total, page, limit, loading, error, createRvt, updateRvt, finalizeRvt, refresh: fetchRvts };
}
