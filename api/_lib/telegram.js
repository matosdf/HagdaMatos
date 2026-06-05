async function sendTelegramMessage(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_OWNER_CHAT_ID;

  if (!token || !chatId) {
    const error = new Error("Telegram não configurado. Defina TELEGRAM_BOT_TOKEN e TELEGRAM_OWNER_CHAT_ID.");
    error.code = "TELEGRAM_NOT_CONFIGURED";
    throw error;
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true
    })
  });
  const payload = await response.json();

  if (!response.ok || !payload.ok) {
    const error = new Error(payload.description || "Falha ao enviar mensagem pelo Telegram.");
    error.code = "TELEGRAM_SEND_FAILED";
    throw error;
  }

  return payload.result;
}

module.exports = { sendTelegramMessage };
