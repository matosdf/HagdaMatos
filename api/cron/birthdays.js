const { query } = require("../_lib/db");
const { sendJson } = require("../_lib/http");
const { sendTelegramMessage } = require("../_lib/telegram");
const crypto = require("crypto");

const TIME_ZONE = "America/Sao_Paulo";

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return sendJson(res, 405, { error: "Método não permitido." });
  }

  const expectedSecret = process.env.CRON_SECRET;
  const receivedSecret =
    req.headers.authorization?.replace(/^Bearer\s+/i, "") ||
    req.headers["x-vercel-cron-signature"];

  if (!expectedSecret) {
    return sendJson(res, 503, { error: "Cron não configurado." });
  }

  if (!sameSecret(receivedSecret, expectedSecret)) {
    return sendJson(res, 401, { error: "Cron não autorizado." });
  }

  try {
    const today = getDateInSaoPaulo();
    const todayClients = await findBirthdays(today, 0);
    const weeklyClients = await findBirthdays(today, 7);
    const pendingToday = await filterAlreadyNotified(todayClients, "daily", today);
    const pendingWeek = await filterAlreadyNotified(weeklyClients, "weekly", today);

    if (!pendingToday.length && !pendingWeek.length) {
      return sendJson(res, 200, {
        ok: true,
        message: "Nenhuma aniversariante nova para notificar.",
        date: today
      });
    }

    const message = buildBirthdayMessage(today, pendingToday, pendingWeek);
    await sendTelegramMessage(message);
    await markNotified(pendingToday, "daily", today);
    await markNotified(pendingWeek, "weekly", today);

    return sendJson(res, 200, {
      ok: true,
      notified: {
        today: pendingToday.length,
        week: pendingWeek.length
      }
    });
  } catch (error) {
    const status = error.code === "TELEGRAM_NOT_CONFIGURED" ? 503 : 500;
    return sendJson(res, status, { error: error.message || "Erro ao processar aniversários." });
  }
};

function sameSecret(received, expected) {
  if (!received || !expected) return false;
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
}

function getDateInSaoPaulo() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(new Date());
}

async function findBirthdays(startDate, daysAhead) {
  const result = await query(
    `with window_days as (
       select ($1::date + offset)::date as target_date
       from generate_series(0, $2::int) as offset
     )
     select distinct
       c.id,
       c.full_name,
       c.contact_phone,
       c.email,
       c.birth_date,
       w.target_date,
       to_char(w.target_date, 'DD/MM') as birthday_label
     from clients c
     join window_days w
       on extract(month from c.birth_date) = extract(month from w.target_date)
      and extract(day from c.birth_date) = extract(day from w.target_date)
     where c.birth_date is not null
     order by w.target_date asc, c.full_name asc`,
    [startDate, daysAhead]
  );
  return result.rows;
}

async function filterAlreadyNotified(clients, type, date) {
  if (!clients.length) return [];
  const ids = clients.map(client => client.id);
  const result = await query(
    `select client_id
     from birthday_notifications
     where notification_type = $1
       and notification_date = $2::date
       and client_id = any($3::uuid[])`,
    [type, date, ids]
  );
  const notifiedIds = new Set(result.rows.map(row => row.client_id));
  return clients.filter(client => !notifiedIds.has(client.id));
}

async function markNotified(clients, type, date) {
  if (!clients.length) return;
  await query(
    `insert into birthday_notifications (client_id, notification_type, notification_date)
     select unnest($1::uuid[]), $2, $3::date
     on conflict (client_id, notification_type, notification_date) do nothing`,
    [clients.map(client => client.id), type, date]
  );
}

function buildBirthdayMessage(today, todayClients, weeklyClients) {
  const parts = [`Bom dia, Hagda.\n\nResumo de aniversários (${formatIsoDate(today)}):`];

  if (todayClients.length) {
    parts.push(`\nAniversariantes de hoje:\n${todayClients.map(formatClientLine).join("\n")}`);
  }

  const weeklyOnly = weeklyClients.filter(
    client => !todayClients.some(todayClient => todayClient.id === client.id)
  );
  if (weeklyOnly.length) {
    parts.push(`\nPróximos 7 dias:\n${weeklyOnly.map(formatClientLine).join("\n")}`);
  }

  parts.push("\nDetalhes completos estão na área da proprietária.");
  return parts.join("\n");
}

function formatClientLine(client) {
  const phone = client.contact_phone ? ` — ${client.contact_phone}` : "";
  return `- ${client.full_name} (${client.birthday_label})${phone}`;
}

function formatIsoDate(value) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}
