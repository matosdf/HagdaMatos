const { query } = require("./_lib/db");
const { sendJson, methodNotAllowed } = require("./_lib/http");
const { authHeaders, requireRole } = require("./_lib/security");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res);

  try {
    const session = await requireRole(req, ["client"]);
    const clientResult = await query(
      `select id, full_name, contact_phone, email, completed_services, important_notes, seasonal_pdf_url
       from clients
       where id = $1`,
      [session.clientId]
    );
    const client = clientResult.rows[0];

    if (!client) {
      return sendJson(res, 404, { error: "Cliente não encontrada." });
    }

    const photos = await query(
      `select id, title, image_url, notes, created_at
       from client_photos
       where client_id = $1
       order by created_at desc
       limit 24`,
      [client.id]
    );
    const pins = await query(
      `select id, pin_url, title, notes, created_at
       from client_pinterest_selections
       where client_id = $1
       order by created_at desc
       limit 24`,
      [client.id]
    );

    return sendJson(res, 200, {
      client,
      seasonalGuide: {
        title: "Guia de tendências da estação",
        pdfUrl: client.seasonal_pdf_url
      },
      photos: photos.rows,
      pinterestSelections: pins.rows
    }, authHeaders(session));
  } catch (error) {
    return sendJson(res, error.code === "UNAUTHORIZED" ? 401 : 500, {
      error: error.code === "UNAUTHORIZED" ? "Acesso não autorizado." : "Erro ao carregar área da cliente."
    }, authHeaders(error));
  }
};
