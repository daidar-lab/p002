-- Tabela para armazenar as Ações Corretivas e Preventivas (CAPA)
CREATE TABLE IF NOT EXISTS audit_quality.capas (
    id int8 GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    document_id int8 NOT NULL REFERENCES audit_quality.documents(id) ON DELETE CASCADE,
    type varchar(20) NOT NULL, -- 'CORRECTIVE', 'PREVENTIVE'
    description text NOT NULL,
    root_cause_link text NOT NULL, -- Vínculo lógico com a causa identificada
    responsible text NOT NULL,
    due_date date NOT NULL,
    efficacy_criteria text NOT NULL,
    status varchar(20) DEFAULT 'PENDENTE' NOT NULL, -- 'PENDENTE', 'CONCLUIDO', 'CANCELADO'
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz,
    CONSTRAINT capas_type_check CHECK (type IN ('CORRECTIVE', 'PREVENTIVE')),
    CONSTRAINT capas_status_check CHECK (status IN ('PENDENTE', 'CONCLUIDO', 'CANCELADO'))
);

-- Trigger para updated_at
CREATE TRIGGER trg_updated_capas BEFORE UPDATE ON audit_quality.capas 
FOR EACH ROW EXECUTE FUNCTION audit_quality.set_updated_at();

-- Índice para busca por documento
CREATE INDEX idx_capas_document ON audit_quality.capas(document_id);
CREATE INDEX idx_capas_status ON audit_quality.capas(status);
