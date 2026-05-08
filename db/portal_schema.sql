-- Enum para escopo restrito do Magic Link
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'magic_link_scope') THEN
        CREATE TYPE audit_quality.magic_link_scope AS ENUM ('EVIDENCE_SUBMISSION');
    END IF;
END $$;

-- Tabela para persistência soberana dos Magic Links
CREATE TABLE IF NOT EXISTS audit_quality.magic_links (
    id int8 GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    token_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(), -- Identificador usado no JWT
    document_id int8 NOT NULL REFERENCES audit_quality.documents(id) ON DELETE CASCADE,
    supplier_id int8 NOT NULL REFERENCES audit_quality.suppliers(id) ON DELETE CASCADE,
    scope audit_quality.magic_link_scope NOT NULL DEFAULT 'EVIDENCE_SUBMISSION',
    expires_at timestamptz NOT NULL,
    used_at timestamptz, -- Marcação de Uso Único
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Índices para validação rápida
CREATE INDEX idx_magic_links_token ON audit_quality.magic_links(token_id);
CREATE INDEX idx_magic_links_document ON audit_quality.magic_links(document_id);
