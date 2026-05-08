-- Tabela para evidências objetivas vinculadas às CAPAs
CREATE TABLE IF NOT EXISTS audit_quality.capa_evidences (
    id int8 GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    capa_id int8 NOT NULL REFERENCES audit_quality.capas(id) ON DELETE CASCADE,
    description text NOT NULL,
    is_objective boolean DEFAULT false NOT NULL, -- Flag crucial para BR-EVE-02
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Tabela para persistência soberana de decisões de eficácia
CREATE TABLE IF NOT EXISTS audit_quality.efficacy_decisions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), -- UUID imutável para auditoria
    document_id int8 NOT NULL REFERENCES audit_quality.documents(id) ON DELETE CASCADE,
    decision varchar(30) NOT NULL, -- 'ENCERRAMENTO_DEFINITIVO', 'BLOCK_WORKFLOW', 'REABERTURA_AUTOMATICA'
    rules_applied jsonb NOT NULL,
    evidence_summary text,
    created_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT efficacy_decision_check CHECK (decision IN ('ENCERRAMENTO_DEFINITIVO', 'BLOCK_WORKFLOW', 'REABERTURA_AUTOMATICA'))
);

-- Índices para performance
CREATE INDEX idx_capa_evidences_capa ON audit_quality.capa_evidences(capa_id);
CREATE INDEX idx_efficacy_decisions_doc ON audit_quality.efficacy_decisions(document_id);
