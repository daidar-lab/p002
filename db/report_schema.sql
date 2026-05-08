-- Tabela para rastro de auditoria de documentos oficiais gerados (PDFs)
CREATE TABLE IF NOT EXISTS audit_quality.generated_documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id int8 NOT NULL REFERENCES audit_quality.documents(id) ON DELETE CASCADE,
    decision_uuid uuid NOT NULL REFERENCES audit_quality.efficacy_decisions(id),
    file_name text NOT NULL,
    file_hash text NOT NULL, -- SHA-256 para garantir imutabilidade do snapshot
    generated_at timestamptz DEFAULT now() NOT NULL,
    created_by int8 REFERENCES audit_quality.users(id)
);

-- Índices
CREATE INDEX idx_gen_docs_document ON audit_quality.generated_documents(document_id);
CREATE INDEX idx_gen_docs_decision ON audit_quality.generated_documents(decision_uuid);
