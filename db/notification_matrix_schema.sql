-- Matriz de Notificações para Governança de Alertas
CREATE TABLE IF NOT EXISTS audit_quality.notification_matrix (
    id SERIAL PRIMARY KEY,
    defect_category varchar(30) NOT NULL, -- QUALIDADE, PROCESSO, MATERIAL, SEGURANCA
    role_name varchar(50) NOT NULL,      -- COORDENACAO, GERENCIA, DIRETORIA, COMPRAS
    email varchar(255) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX idx_notif_matrix_cat ON audit_quality.notification_matrix(defect_category);

-- Dados Iniciais de Exemplo (Para garantir que o sistema não nasça mudo)
INSERT INTO audit_quality.notification_matrix (defect_category, role_name, email) VALUES
('QUALIDADE', 'COORDENACAO', 'qualidade@cervejariacidadeimperial.com.br'),
('QUALIDADE', 'GERENCIA', 'gerencia.qualidade@cervejariacidadeimperial.com.br'),
('PROCESSO',  'COORDENACAO', 'processos@cervejariacidadeimperial.com.br'),
('SEGURANCA', 'DIRETORIA',   'diretoria@cervejariacidadeimperial.com.br');
