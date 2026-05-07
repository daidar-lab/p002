-- Tabela para armazenar as Análises de Causa Raiz (5 Porquês / Ishikawa)
CREATE TABLE IF NOT EXISTS audit_quality.root_cause_analyses (
    id int8 GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    document_id int8 NOT NULL REFERENCES audit_quality.documents(id) ON DELETE CASCADE,
    type varchar(20) NOT NULL, -- '5_WHYS', 'ISHIKAWA'
    data jsonb NOT NULL,      -- Estrutura da análise
    root_cause text NOT NULL,  -- Conclusão consolidada
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz,
    CONSTRAINT root_cause_type_check CHECK (type IN ('5_WHYS', 'ISHIKAWA'))
);

-- Trigger para updated_at
CREATE TRIGGER trg_updated_acr BEFORE UPDATE ON audit_quality.root_cause_analyses 
FOR EACH ROW EXECUTE FUNCTION audit_quality.set_updated_at();

-- Índice para busca rápida por documento
CREATE INDEX idx_acr_document ON audit_quality.root_cause_analyses(document_id);
