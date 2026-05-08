-- Tabela para snapshots de auditoria de meta-governança
CREATE TABLE IF NOT EXISTS audit_quality.process_audits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_type varchar(30) NOT NULL, -- 'FLOW', 'DECISION', 'CAPA', 'SIGNATURE', 'RECURRENCE'
    period_start timestamptz NOT NULL,
    period_end timestamptz NOT NULL,
    result_snapshot jsonb NOT NULL, -- Snapshot métrico com esquema fixo por tipo
    executed_by int8 REFERENCES audit_quality.users(id),
    generated_at timestamptz DEFAULT now() NOT NULL
);

-- Índices para busca histórica
CREATE INDEX idx_process_audits_type ON audit_quality.process_audits(audit_type);
CREATE INDEX idx_process_audits_period ON audit_quality.process_audits(period_start, period_end);
