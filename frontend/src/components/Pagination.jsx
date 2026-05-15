import React from 'react';

export function Pagination({ currentPage, totalItems, itemsPerPage, onPageChange }) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  if (totalPages <= 1) return null;

  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    pages.push(i);
  }

  return (
    <div className="pagination" style={{ display: 'flex', gap: '8px', marginTop: '20px', justifyContent: 'center', alignItems: 'center' }}>
      <button 
        className="btn btn--secondary" 
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        style={{ padding: '4px 12px' }}
      >
        Anterior
      </button>
      
      {pages.map(page => (
        <button 
          key={page} 
          className={`btn ${currentPage === page ? 'btn--primary' : 'btn--secondary'}`}
          onClick={() => onPageChange(page)}
          style={{ padding: '4px 12px', minWidth: '40px' }}
        >
          {page}
        </button>
      ))}

      <button 
        className="btn btn--secondary" 
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        style={{ padding: '4px 12px' }}
      >
        Próximo
      </button>

      <span className="text-sub" style={{ marginLeft: '12px', fontSize: '13px' }}>
        Total: {totalItems} registros
      </span>
    </div>
  );
}
