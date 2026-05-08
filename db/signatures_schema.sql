-- Tabela de Configuração: Papéis obrigatórios por tipo de documento
CREATE TABLE IF NOT EXISTS audit_quality.signature_roles_required (
    id int8 GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    document_type varchar(20) NOT NULL, -- 'RAQ', 'RNC'
    role varchar(50) NOT NULL,          -- 'Analista', 'Coordenador', 'Qualidade', etc.
    UNIQUE(document_type, role)
);

-- Tabela de Registros: Assinaturas eletrônicas realizadas
CREATE TABLE IF NOT EXISTS audit_quality.signatures (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id int8 NOT NULL REFERENCES audit_quality.documents(id) ON DELETE CASCADE,
    user_id int8 NOT NULL REFERENCES audit_quality.users(id),
    role varchar(50) NOT NULL,
    decision_uuid uuid NOT NULL REFERENCES audit_quality.efficacy_decisions(id),
    signed_at timestamptz DEFAULT now() NOT NULL,
    signature_hash text NOT NULL, -- Hash SHA-256 para integridade
    UNIQUE(document_id, role, decision_uuid) -- Um papel assina uma única vez por decisão técnica
);

-- Seeding inicial de papéis obrigatórios para RNC
INSERT INTO audit_quality.signature_roles_required (document_type, role) VALUES 
('RNC', 'analista'),
('RNC', 'coordenador'),
('RNC', 'qualidade')
ON CONFLICT DO NOTHING;

-- Índices
CREATE INDEX idx_signatures_doc ON audit_quality.signatures(document_id);
CREATE INDEX idx_signatures_decision ON audit_quality.signatures(decision_uuid);
