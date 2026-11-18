/** Shared response helpers for the Pages Functions port — the Web-standard
 *  stand-ins for the old Node `res.status(x).json(y)` plumbing. */

export function json(status, data, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

export function empty(status, headers = {}) {
  return new Response(null, { status, headers });
}

export function html(status, body, headers = {}) {
  return new Response(body, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", ...headers },
  });
}
