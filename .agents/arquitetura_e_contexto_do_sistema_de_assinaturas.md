# Contexto de Arquitetura: Sistema de Assinaturas e Área de Membros

> **Propósito deste documento:** Servir como fonte da verdade (System Prompt / Contexto de Projeto) para ferramentas de desenvolvimento e assistentes de IA na implementação do controle de acesso recorrente do site.

---

## 1. Visão Geral do Projeto
O projeto consiste na evolução de um site institucional/profissional para incluir uma **Área Exclusiva de Membros** (conteúdo fechado). O acesso a essa área é liberado exclusivamente mediante **pagamento recorrente mensal** (Assinatura), validado de forma segura pelo backend antes de conceder permissão de leitura/acesso à cliente.

### Stack Tecnológica Principal
* **Hospedagem e Backend Serverless:** Vercel
* **Framework Full-stack:** Next.js (App Router, Server Actions, Route Handlers, Middleware)
* **Banco de Dados e Autenticação:** Supabase (PostgreSQL + Supabase Auth + Row Level Security)
* **Gateway de Pagamento Principal:** Asaas (API REST v3) — *Escolhido pelo custo-benefício em Pix/Cartão e régua de cobrança via WhatsApp/NFS-e.*
* **Requisito Arquitetural Crítico:** **Gateway Agnostic (Desacoplamento)**. O banco de dados e o front-end não devem depender diretamente da estrutura do Asaas, permitindo troca rápida para *Stripe*, *AbacatePay* ou *Kiwify* no futuro sem refatoração de regras de negócio.

---

## 2. Princípios de Arquitetura e Segurança

1. **Zero Confiança no Front-end:** O redirecionamento pós-checkout nunca libera acesso sozinho. Toda liberação, renovação ou bloqueio de acesso ocorre exclusivamente via **Webhooks** autenticados no backend.
2. **Service Role Restrita:** A chave `SUPABASE_SERVICE_ROLE_KEY` só pode ser instanciada dentro de rotas de API de backend (como o receptor de Webhook) para atualizar o status da assinatura ignorando o RLS.
3. **Dupla Camada de Proteção (Defense in Depth):**
   * **Camada 1 (Roteamento Next.js):** `middleware.ts` ou verificação em Server Components redirecionando usuárias sem assinatura ativa para a página de planos/renovação.
   * **Camada 2 (Banco de Dados Supabase):** Políticas de *Row Level Security (RLS)* garantindo que queries nas tabelas de conteúdo exclusivo retornem vazio caso o `auth.uid()` não possua assinatura com status ativo.
4. **Idempotência nos Webhooks:** O endpoint de webhook deve registrar ou validar eventos já processados para evitar duplicidade caso o gateway envie o mesmo aviso mais de uma vez.

---

## 3. Modelagem do Banco de Dados (Supabase SQL)

Abaixo está a estrutura agnóstica recomendada para o banco de dados PostgreSQL no Supabase:

```sql
-- 1. Enum para padronizar os status independente do Gateway (Asaas, Stripe, Kiwify)
CREATE TYPE subscription_status AS ENUM (
  'active',       -- Pagamento em dia, acesso liberado
  'past_due',     -- Pagamento atrasado (pode ter período de carência ou bloqueio imediato)
  'canceled',     -- Assinatura cancelada
  'incomplete',   -- Aguardando primeiro pagamento (Pix/Boleto gerado mas não pago)
  'unpaid'        -- Inadimplente / suspenso
);

-- 2. Tabela de Assinaturas (Desacoplada do Provedor)
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Identificadores do Provedor (Permite trocar Asaas por Stripe facilmente)
  provider TEXT NOT NULL DEFAULT 'asaas', -- 'asaas' | 'stripe' | 'abacatepay' | 'kiwify'
  provider_customer_id TEXT NOT NULL,     -- Ex: cus_000005113026 (Asaas)
  provider_subscription_id TEXT UNIQUE,   -- Ex: sub_000005113026 (Asaas)
  
  -- Estado da Assinatura
  status subscription_status NOT NULL DEFAULT 'incomplete',
  plan_type TEXT NOT NULL DEFAULT 'monthly',
  payment_method TEXT,                    -- 'PIX' | 'CREDIT_CARD' | 'BOLETO'
  
  -- Controle de Vigência
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ NOT NULL, -- Data limite de acesso da cliente
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para busca rápida no Webhook e Middleware
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_provider_sub_id ON public.subscriptions(provider_subscription_id);
CREATE INDEX idx_subscriptions_provider_cust_id ON public.subscriptions(provider_customer_id);

-- 3. Habilitar RLS na tabela de assinaturas
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- A própria cliente pode ler apenas a sua assinatura no Front-end
CREATE POLICY "Usuárias podem ver sua própria assinatura"
  ON public.subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Nenhuma política de INSERT/UPDATE/DELETE para usuários comuns.
-- Apenas o Backend (via SERVICE_ROLE_KEY no Webhook) pode alterar assinaturas.

-- 4. Função Helper para verificar se a usuária tem acesso ativo (útil para RLS de conteúdos)
CREATE OR REPLACE FUNCTION public.has_active_subscription(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.subscriptions
    WHERE user_id = check_user_id
      AND status = 'active'
      AND current_period_end > NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Exemplo de proteção RLS em uma tabela de conteúdo exclusivo
-- CREATE POLICY "Apenas assinantes ativas acessam conteúdos exclusivos"
--   ON public.exclusive_contents
--   FOR SELECT
--   USING (public.has_active_subscription(auth.uid()));
```

---

## 4. Padrão de Desacoplamento no Código (Adapter Pattern)

Para evitar acoplamento com a API do Asaas, toda comunicação com o gateway deve ficar isolada em `src/lib/payments/`.

### Estrutura de Pastas Sugerida
```text
src/
├── app/
│   ├── (public)/               # Landing Page, Login, Cadastro, Preços
│   ├── (protected)/
│   │   └── membros/            # Área Exclusiva da Cliente (Protegida)
│   └── api/
│       ├── checkout/route.ts   # Cria cliente/assinatura no Gateway
│       └── webhooks/
│           └── asaas/route.ts  # Recebe eventos de pagamento do Asaas
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # Cliente Browser
│   │   ├── server.ts           # Cliente SSR (Cookies)
│   │   └── admin.ts            # Cliente Service Role (Uso exclusivo em API Routes seguras)
│   └── payments/
│       ├── types.ts            # Interfaces agnósticas (PaymentGateway, CreateSubscriptionDTO)
│       ├── asaas.provider.ts   # Implementação específica da API v3 do Asaas
│       └── index.ts            # Exporta o provedor ativo no momento
└── middleware.ts               # Proteção de rotas e sessão do Supabase
```

### Contrato da Interface (`src/lib/payments/types.ts`)
```typescript
export interface CreateCheckoutInput {
  userId: string;
  email: string;
  name: string;
  cpfCnpj: string;
  phone?: string;
  billingType: 'PIX' | 'CREDIT_CARD' | 'UNDEFINED';
}

export interface CheckoutResponse {
  providerCustomerId: string;
  providerSubscriptionId: string;
  paymentUrl: string; // URL da fatura/checkout do Asaas ou QR Code
}

export interface PaymentGateway {
  createSubscription(input: CreateCheckoutInput): Promise<CheckoutResponse>;
  cancelSubscription(providerSubscriptionId: string): Promise<void>;
}
```

---

## 5. Fluxo de Integração com o Asaas (Passo a Passo)

### Passo 1: Criação da Assinatura (`POST /api/checkout`)
1. A cliente autenticada no Supabase preenche seus dados básicos (Nome, CPF e Telefone são obrigatórios no Asaas) e clica em "Assinar".
2. O backend verifica na tabela `subscriptions` se ela já possui um `provider_customer_id`.
3. Se não possuir, chama `POST https://api.asaas.com/v3/customers` enviando `"externalReference": user.id` (UUID do Supabase).
4. Em seguida, chama `POST https://api.asaas.com/v3/subscriptions` passando:
   * `customer`: ID do cliente no Asaas.
   * `billingType`: `'UNDEFINED'` (permite à cliente escolher Pix ou Cartão na tela do Asaas) ou específico (`'PIX'`, `'CREDIT_CARD'`).
   * `value`: Valor mensal (ex: `97.00`).
   * `nextDueDate`: Data de hoje (`YYYY-MM-DD`).
   * `cycle`: `'MONTHLY'`.
   * `externalReference`: `user.id` (UUID do Supabase).
5. Salva o registro inicial na tabela `public.subscriptions` com `status = 'incomplete'` e redireciona a cliente para o link de pagamento da primeira cobrança gerada.

### Passo 2: Processamento do Webhook (`POST /api/webhooks/asaas`)
O Asaas envia requisições `POST` para a Vercel sempre que o estado de uma cobrança muda.

1. **Validação de Segurança:** Verificar o header `asaas-access-token` comparando com a variável de ambiente `ASAAS_WEBHOOK_SECRET`. Se não bater, retornar `401 Unauthorized`.
2. **Mapeamento de Eventos do Asaas para o Supabase:**
   * `PAYMENT_CONFIRMED` ou `PAYMENT_RECEIVED`:
     * Atualizar `status` para `'active'`.
     * Atualizar `current_period_end` para `data_do_pagamento + 1 mês` (ou usar o `nextDueDate` da assinatura + margem de segurança de 2 dias para compensação).
   * `PAYMENT_OVERDUE` (Cobrança vencida):
     * Atualizar `status` para `'past_due'`.
   * `PAYMENT_DELETED` / `PAYMENT_REFUNDED` / `SUBSCRIPTION_DELETED`:
     * Atualizar `status` para `'canceled'`.
3. Responder rapidamente com status `200 OK` (`{ received: true }`) para o Asaas não reenviar o evento na fila.

---

## 6. Variáveis de Ambiente Necessárias (`.env.local` / Vercel)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://seu-projeto.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbG..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbG..." # NUNCA expor no client-side

# Asaas (Trocar URL de sandbox para produção após testes)
ASAAS_API_URL="https://sandbox.asaas.com/api/v3" # Produção: https://api.asaas.com/v3
ASAAS_API_KEY="$aact_..."
ASAAS_WEBHOOK_SECRET="seu_token_secreto_gerado_no_painel_do_asaas"

# Configuração do Produto
SUBSCRIPTION_MONTHLY_PRICE="97.00"
NEXT_PUBLIC_APP_URL="https://sitedaesposa.com.br"
```

---

## 7. Checklist Operacional e Prevenção de Riscos (Asaas)
* [ ] **Conta CNPJ / Documentação:** Realizar a abertura e validação completa da conta (envio de documentos, biometria e aprovação comercial) no painel do Asaas **antes** de receber o primeiro pagamento real para evitar bloqueios preventivos de PLD/Compliance no saque.
* [ ] **Uso do Sandbox:** Testar todo o ciclo de vida (`incomplete` -> `active` -> `past_due` -> `canceled`) usando o ambiente Sandbox do Asaas antes de virar a chave para produção.
* [ ] **Suporte Técnico Dedicado:** Em caso de dúvidas técnicas na API ou Webhooks, acionar diretamente o canal de engenharia (`integracoes@asaas.com.br` ou Discord oficial de Devs do Asaas) em vez do suporte comercial comum.