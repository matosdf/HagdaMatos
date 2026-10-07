-- ==============================================================================
-- SCHEMA DO BANCO DE DADOS (SUPABASE / POSTGRESQL)
-- Autodiagnóstico de Inteligência Operacional e Risco — HM Presença & Performance
-- ==============================================================================

-- 1. Criação da Tabela de Leads
CREATE TABLE IF NOT EXISTS public.leads_diagnostico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    email TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    whatsapp_e164 TEXT,
    porte TEXT NOT NULL, -- '1 a 10', '11 a 50', '50+'
    pontuacao_total INTEGER NOT NULL, -- 10 a 40
    nivel_numero INTEGER NOT NULL, -- 1 a 4
    nivel_nome TEXT NOT NULL,
    gargalo_id INTEGER NOT NULL, -- 1 a 4
    gargalo_eixo TEXT NOT NULL,
    servico_indicado TEXT NOT NULL,
    respostas JSONB NOT NULL, -- Array de 10 notas [3, 2, 4, ...]
    eixos_stats JSONB NOT NULL, -- Estatísticas detalhadas por eixo
    status_whatsapp_alerta TEXT DEFAULT 'pending', -- 'sent', 'failed', 'pending', 'skipped'
    status_whatsapp_lead TEXT DEFAULT 'pending',   -- 'sent', 'failed', 'pending', 'skipped'
    meta_response_alerta JSONB, -- Retorno bruto da Meta Cloud API para o alerta
    meta_response_lead JSONB,   -- Retorno bruto da Meta Cloud API para o lead
    origem TEXT DEFAULT 'web_site',
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- 2. Índices de Otimização e Busca
CREATE INDEX IF NOT EXISTS idx_leads_diagnostico_created_at ON public.leads_diagnostico (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_diagnostico_email ON public.leads_diagnostico (email);
CREATE INDEX IF NOT EXISTS idx_leads_diagnostico_whatsapp_e164 ON public.leads_diagnostico (whatsapp_e164);
CREATE INDEX IF NOT EXISTS idx_leads_diagnostico_gargalo_id ON public.leads_diagnostico (gargalo_id);
CREATE INDEX IF NOT EXISTS idx_leads_diagnostico_nivel_numero ON public.leads_diagnostico (nivel_numero);

-- 3. Habilitação de Row Level Security (RLS)
ALTER TABLE public.leads_diagnostico ENABLE ROW LEVEL SECURITY;

-- Política: O backend com SERVICE_ROLE tem acesso irrestrito para inserção e consulta
CREATE POLICY "Permitir acesso completo para backend service_role"
    ON public.leads_diagnostico
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Política: Usuários anônimos não podem listar dados de outros leads
-- (Garante total sigilo e conformidade com LGPD)
CREATE POLICY "Bloquear leitura pública anonima"
    ON public.leads_diagnostico
    FOR SELECT
    TO anon
    USING (false);

-- Comentários de Documentação
COMMENT ON TABLE public.leads_diagnostico IS 'Registros de leads qualificados capturados no Autodiagnóstico de Inteligência Operacional';
COMMENT ON COLUMN public.leads_diagnostico.gargalo_eixo IS 'Eixo operacional que obteve a menor pontuação média';
COMMENT ON COLUMN public.leads_diagnostico.servico_indicado IS 'Serviço da HM Presença & Performance recomendado especificamente para o gargalo';
