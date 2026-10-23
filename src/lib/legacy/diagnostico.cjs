/**
 * Serverless Function (Vercel) — /api/diagnostico
 * HM Presença & Performance
 * 
 * Responsabilidades:
 * 1. Receber e validar o payload do lead e resultado do autodiagnóstico.
 * 2. Persistir os dados no banco de dados (Supabase / PostgreSQL).
 * 3. Disparar notificação em tempo real via Meta WhatsApp Business Cloud API para a Hagda Matos.
 * 4. (Opcional) Disparar mensagem ativa pré-aprovada para o WhatsApp do Lead.
 */

let createClient = null;
try {
  createClient = require('@supabase/supabase-js').createClient;
} catch (err) {
  // Em ambiente local sem npm install executado, o módulo pode não estar presente
  createClient = null;
}

// Configuração do Supabase Client
function getSupabaseClient() {
  if (!createClient) {
    console.warn('[Supabase] Módulo @supabase/supabase-js não instalado ou não disponível.');
    return null;
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('[Supabase] Credenciais não configuradas. Dados não foram gravados no banco.');
    return null;
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });
}

// Normaliza números de telefone para padrão E.164 (somente dígitos com DDI 55)
function normalizePhoneE164(phone) {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');

  // Se já possui DDI 55 e tem 12 ou 13 dígitos
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }

  // Se é número local brasileiro com DDD (10 ou 11 dígitos), adiciona DDI 55
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  return digits;
}

// Envia mensagem via Meta WhatsApp Business Cloud API
async function sendMetaWhatsAppMessage({ to, type = 'text', textBody, templateName, templateParams = [] }) {
  const token = process.env.META_WHATSAPP_TOKEN;
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
  const graphVersion = process.env.META_GRAPH_VERSION || 'v21.0';

  if (!token || !phoneNumberId) {
    console.warn('[Meta WhatsApp] META_WHATSAPP_TOKEN ou META_PHONE_NUMBER_ID não configurados.');
    return { skipped: true, reason: 'credentials_missing' };
  }

  const url = `https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`;
  let payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: to
  };

  if (templateName) {
    // Envio estruturado por Template (HSM pré-aprovado pela Meta)
    payload.type = 'template';
    payload.template = {
      name: templateName,
      language: { code: 'pt_BR' },
      components: templateParams.length > 0 ? [
        {
          type: 'body',
          parameters: templateParams.map(val => ({ type: 'text', text: String(val) }))
        }
      ] : []
    };
  } else {
    // Envio direto de texto
    payload.type = 'text';
    payload.text = {
      preview_url: false,
      body: textBody
    };
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch (error) {
    console.error('[Meta WhatsApp] Erro na requisição HTTP:', error);
    return { ok: false, error: error.message };
  }
}

module.exports = async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  try {
    const body = req.body || {};
    const { lead, answers, results } = body;

    // Validação mínima dos campos obrigatórios
    if (!lead || !lead.name || !lead.email || !lead.phone || !lead.companySize) {
      return res.status(400).json({ error: 'Dados do lead incompletos.' });
    }

    if (!results || typeof results.totalScore !== 'number') {
      return res.status(400).json({ error: 'Resultados do diagnóstico ausentes.' });
    }

    const leadPhoneE164 = normalizePhoneE164(lead.phone);
    const notifyPhone = process.env.META_NOTIFY_PHONE || '5512992006109';
    const clientIp = (req.headers && req.headers['x-forwarded-for']) || (req.socket && req.socket.remoteAddress) || null;
    const userAgent = (req.headers && req.headers['user-agent']) || null;

    // 1. Gravação no Banco de Dados (Supabase)
    const supabase = getSupabaseClient();
    let leadRecordId = null;
    let savedToDb = false;

    if (supabase) {
      const { data: dbData, error: dbError } = await supabase
        .from('leads_diagnostico')
        .insert({
          nome: lead.name,
          email: lead.email,
          whatsapp: lead.phone,
          whatsapp_e164: leadPhoneE164,
          porte: lead.companySize,
          pontuacao_total: results.totalScore,
          nivel_numero: results.level.level,
          nivel_nome: results.level.title,
          gargalo_id: results.bottleneck.axisId,
          gargalo_eixo: results.bottleneck.config.fullName,
          servico_indicado: results.bottleneck.config.solution,
          respostas: answers || [],
          eixos_stats: results.axesStats || [],
          ip_address: clientIp,
          user_agent: userAgent
        })
        .select('id')
        .single();

      if (dbError) {
        console.error('[Supabase] Erro ao gravar lead:', dbError);
      } else {
        savedToDb = true;
        leadRecordId = dbData ? dbData.id : null;
      }
    }

    // 2. Disparo do Alerta para a Hagda Matos via Meta Cloud API
    const alertMessageText = [
      `🚨 *Novo Lead no Autodiagnóstico de Inteligência!*`,
      ``,
      `*Dados do Empresário:*`,
      `• *Nome:* ${lead.name}`,
      `• *Porte:* ${lead.companySize} colaboradores`,
      `• *WhatsApp:* ${lead.phone}`,
      `• *E-mail:* ${lead.email}`,
      ``,
      `*Resultado da Operação:*`,
      `• *Pontuação:* ${results.totalScore}/40 pontos`,
      `• *Classificação:* ${results.level.title}`,
      `• *Maior Gargalo:* ${results.bottleneck.config.fullName}`,
      `• *Solução Indicada:* ${results.bottleneck.config.solution}`,
      ``,
      `_Lead capturado via hagda.com.br/diagnostico_`
    ].join('\n');

    const alertTemplateName = process.env.META_TEMPLATE_ALERT_NAME || null;
    const metaAlertResponse = await sendMetaWhatsAppMessage({
      to: notifyPhone,
      textBody: alertMessageText,
      templateName: alertTemplateName,
      templateParams: alertTemplateName ? [
        lead.name,
        lead.companySize,
        lead.phone,
        `${results.totalScore}/40`,
        results.bottleneck.config.fullName,
        results.bottleneck.config.solution
      ] : []
    });

    const statusAlerta = metaAlertResponse.ok ? 'sent' : (metaAlertResponse.skipped ? 'skipped' : 'failed');

    // 3. (Opcional) Disparo ativo para o próprio Lead via Meta Cloud API se configurado template
    let statusLead = 'skipped';
    let metaLeadResponse = null;
    const leadTemplateName = process.env.META_TEMPLATE_LEAD_NAME || null;

    if (leadTemplateName && leadPhoneE164) {
      metaLeadResponse = await sendMetaWhatsAppMessage({
        to: leadPhoneE164,
        templateName: leadTemplateName,
        templateParams: [
          lead.name,
          results.bottleneck.config.shortName,
          results.bottleneck.config.solution
        ]
      });
      statusLead = metaLeadResponse.ok ? 'sent' : 'failed';
    }

    // 4. Atualização do status de disparo no Supabase (se registro foi criado)
    if (supabase && leadRecordId) {
      await supabase
        .from('leads_diagnostico')
        .update({
          status_whatsapp_alerta: statusAlerta,
          status_whatsapp_lead: statusLead,
          meta_response_alerta: metaAlertResponse.data || metaAlertResponse,
          meta_response_lead: metaLeadResponse ? (metaLeadResponse.data || metaLeadResponse) : null
        })
        .eq('id', leadRecordId);
    }

    return res.status(200).json({
      success: true,
      leadId: leadRecordId,
      savedToDb,
      whatsappAlertStatus: statusAlerta,
      whatsappLeadStatus: statusLead
    });

  } catch (error) {
    console.error('[API Diagnóstico] Erro inesperado:', error);
    return res.status(500).json({
      error: 'Erro interno ao processar diagnóstico.'
    });
  }
};
