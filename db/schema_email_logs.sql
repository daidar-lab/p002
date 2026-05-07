-- ══════════════════════════════════════════════════
--  Adicionar ao schema existente
--  Execute: psql -U <user> -d <database> -f schema_email_logs.sql
-- ══════════════════════════════════════════════════

SET search_path TO audit_quality;

CREATE TABLE IF NOT EXISTS email_logs (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  recipient    VARCHAR(255) NOT NULL,
  subject      VARCHAR(500) NOT NULL,
  body         TEXT,
  status       VARCHAR(20)  NOT NULL DEFAULT 'ENVIADO'
                 CHECK (status IN ('ENVIADO', 'FALHOU')),
  error_msg    TEXT,                        -- preenchido quando status = 'FALHOU'
  document_id  BIGINT REFERENCES audit_quality.documents(id) ON DELETE SET NULL,
  triggered_by VARCHAR(100),               -- username de quem disparou, ou 'cron'
  sent_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_document  ON audit_quality.email_logs (document_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status    ON audit_quality.email_logs (status);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at   ON audit_quality.email_logs (sent_at DESC);
