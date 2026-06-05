const { query } = require("./_lib/db");
const { sendJson, methodNotAllowed } = require("./_lib/http");
const { requireRole } = require("./_lib/security");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res);

  try {
    requireRole(req, ["owner"]);
    const clientsResult = await query(
      `select id, full_name, birth_date, contact_phone, email, completed_services, important_notes, seasonal_pdf_url
       from clients
       order by full_name asc`
    );
    const clientIds = clientsResult.rows.map(client => client.id);

    if (!clientIds.length) {
      return sendJson(res, 200, { clients: [] });
    }

    const photosResult = await query(
      `select id, client_id, title, image_url, notes, created_at
       from client_photos
       where client_id = any($1::uuid[])
       order by created_at desc`,
      [clientIds]
    );
    const pinsResult = await query(
      `select id, client_id, pin_url, title, notes, created_at
       from client_pinterest_selections
       where client_id = any($1::uuid[])
       order by created_at desc`,
      [clientIds]
    );

    const photosByClient = groupByClient(photosResult.rows);
    const pinsByClient = groupByClient(pinsResult.rows);
    const clients = clientsResult.rows.map(client => ({
      ...client,
      photos: photosByClient[client.id] || [],
      pinterestSelections: pinsByClient[client.id] || []
    }));

    return sendJson(res, 200, { clients });
  } catch (error) {
    return sendJson(res, error.code === "UNAUTHORIZED" ? 401 : 500, {
      error: error.message || "Erro ao carregar clientes."
    });
  }
};

function groupByClient(rows) {
  return rows.reduce((groups, row) => {
    if (!groups[row.client_id]) groups[row.client_id] = [];
    groups[row.client_id].push(row);
    return groups;
  }, {});
}
