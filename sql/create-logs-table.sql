-- Tabela de logs para rastrear operações de reservas
CREATE TABLE IF NOT EXISTS reservation_logs (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Tipo de operação
    operation_type VARCHAR(20) NOT NULL CHECK (operation_type IN ('CREATE', 'DELETE', 'UPDATE')),
    
    -- Dados da reserva
    reservation_id INTEGER,
    desk_id UUID,
    reservation_date DATE,
    reservation_note VARCHAR(255),
    is_recurring BOOLEAN DEFAULT FALSE,
    recurring_days INTEGER[],
    
    -- Informações do usuário/sessão
    user_agent TEXT,
    browser_name VARCHAR(100),
    browser_version VARCHAR(50),
    operating_system VARCHAR(100),
    device_type VARCHAR(50), -- desktop, mobile, tablet
    screen_resolution VARCHAR(20),
    
    -- Informações de rede/localização
    ip_address INET,
    timezone VARCHAR(50),
    computer_name VARCHAR(255),
    
    -- Dados da sessão
    session_id VARCHAR(255),
    referrer_url TEXT,
    page_url TEXT,
    
    -- Metadados adicionais
    processing_time_ms INTEGER, -- tempo que levou para processar a operação
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    
    -- Dados específicos da operação
    operation_details JSONB, -- dados extras específicos da operação
    
    -- Índices para performance
    CONSTRAINT fk_reservation_logs_desk FOREIGN KEY (desk_id) REFERENCES desks(id) ON DELETE SET NULL
);

-- Índices para melhor performance nas consultas
CREATE INDEX IF NOT EXISTS idx_reservation_logs_created_at ON reservation_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_reservation_logs_operation_type ON reservation_logs(operation_type);
CREATE INDEX IF NOT EXISTS idx_reservation_logs_desk_id ON reservation_logs(desk_id);
CREATE INDEX IF NOT EXISTS idx_reservation_logs_reservation_date ON reservation_logs(reservation_date);
CREATE INDEX IF NOT EXISTS idx_reservation_logs_ip_address ON reservation_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_reservation_logs_session_id ON reservation_logs(session_id);

-- Comentários para documentação
COMMENT ON TABLE reservation_logs IS 'Logs de todas as operações de reservas (criação, exclusão, atualização)';
COMMENT ON COLUMN reservation_logs.operation_type IS 'Tipo de operação: CREATE, DELETE, UPDATE';
COMMENT ON COLUMN reservation_logs.operation_details IS 'Dados extras em formato JSON para operações específicas';
COMMENT ON COLUMN reservation_logs.processing_time_ms IS 'Tempo de processamento da operação em milissegundos';
COMMENT ON COLUMN reservation_logs.device_type IS 'Tipo de dispositivo: desktop, mobile, tablet';
COMMENT ON COLUMN reservation_logs.recurring_days IS 'Array de dias da semana para reservas recorrentes (0=domingo, 1=segunda, etc.)';
