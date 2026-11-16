/**
 * Bayan AI — QR links contact API (Cloudflare Worker)
 *
 * POST /contact  { name, email, phone?, organisation?, topic?, message, lang?, website (honeypot), turnstile? }
 *   1. Only accepts requests from ALLOWED_ORIGINS.
 *   2. Drops bots (honeypot) and checks Cloudflare Turnstile when TURNSTILE_SECRET is set.
 *   3. Rate-limits to RATE_LIMIT messages per IP per RATE_WINDOW_MIN minutes.
 *   4. Saves the message in D1, then emails it to NOTIFY_EMAIL via Resend.
 * The recipient address lives only in the NOTIFY_EMAIL secret and is never returned to the browser.
 */

const RATE_LIMIT = 5;
const RATE_WINDOW_MIN = 10;
const TOPICS = ['general', 'partnership', 'demo', 'research', 'other'];
const TOPIC_LABELS = {
  general: 'General enquiry',
  partnership: 'Partnership or collaboration',
  demo: 'Product demo',
  research: 'Research',
  other: 'Other',
};
const LIMITS = { name: 120, email: 200, phone: 40, organisation: 160, message: 4000 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
    const cors = allowed.includes(origin)
      ? {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
          Vary: 'Origin',
        }
      : { Vary: 'Origin' };

    const json = (body, status = 200) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cors },
      });

    if (url.pathname !== '/contact') return json({ ok: false, error: 'not_found' }, 404);
    if (request.method === 'OPTIONS') return new Response(null, { status: allowed.includes(origin) ? 204 : 403, headers: cors });
    if (request.method !== 'POST') return json({ ok: false, error: 'method' }, 405);
    if (!allowed.includes(origin)) return json({ ok: false, error: 'origin' }, 403);

    let input;
    try {
      if (Number(request.headers.get('Content-Length') || 0) > 20000) throw new Error('too large');
      input = await request.json();
    } catch {
      return json({ ok: false, error: 'invalid' }, 400);
    }
    if (!input || typeof input !== 'object') return json({ ok: false, error: 'invalid' }, 400);

    // Honeypot filled: pretend success so bots learn nothing.
    if (typeof input.website === 'string' && input.website.trim() !== '') return json({ ok: true });

    const clean = (v, max) => (typeof v === 'string' ? v.replace(/\u0000/g, '').trim().slice(0, max) : '');
    const msg = {
      name: clean(input.name, LIMITS.name),
      email: clean(input.email, LIMITS.email),
      phone: clean(input.phone, LIMITS.phone),
      organisation: clean(input.organisation, LIMITS.organisation),
      topic: TOPICS.includes(input.topic) ? input.topic : 'general',
      message: clean(input.message, LIMITS.message),
      lang: input.lang === 'ar' ? 'ar' : 'en',
    };
    if (!msg.name || !msg.email || !msg.message) return json({ ok: false, error: 'required' }, 400);
    if (!EMAIL_RE.test(msg.email)) return json({ ok: false, error: 'email' }, 400);

    const ip = request.headers.get('CF-Connecting-IP') || '';

    if (env.TURNSTILE_SECRET) {
      const passed = await verifyTurnstile(env.TURNSTILE_SECRET, clean(input.turnstile, 4096), ip);
      if (!passed) return json({ ok: false, error: 'captcha' }, 400);
    }

    const ipHash = await sha256(`${env.IP_SALT || 'bayan-links'}:${ip}`);
    const recent = await env.DB.prepare(
      `SELECT COUNT(*) AS n FROM messages
       WHERE ip_hash = ?1 AND created_at > strftime('%Y-%m-%dT%H:%M:%SZ', 'now', ?2)`
    )
      .bind(ipHash, `-${RATE_WINDOW_MIN} minutes`)
      .first();
    if (recent && recent.n >= RATE_LIMIT) return json({ ok: false, error: 'rate' }, 429);

    const row = await env.DB.prepare(
      `INSERT INTO messages (name, email, phone, organisation, topic, message, lang, country, user_agent, ip_hash)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10) RETURNING id, created_at`
    )
      .bind(
        msg.name,
        msg.email,
        msg.phone || null,
        msg.organisation || null,
        msg.topic,
        msg.message,
        msg.lang,
        (request.cf && request.cf.country) || null,
        clean(request.headers.get('User-Agent'), 300) || null,
        ipHash
      )
      .first();

    // The message is safely stored; send the email without making the visitor wait.
    ctx.waitUntil(
      notify(env, msg, row).catch((err) => console.error('notify failed', row && row.id, err && err.message))
    );

    return json({ ok: true });
  },
};

async function verifyTurnstile(secret, token, ip) {
  if (!token) return false;
  const form = new FormData();
  form.append('secret', secret);
  form.append('response', token);
  if (ip) form.append('remoteip', ip);
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}

async function notify(env, msg, row) {
  if (!env.RESEND_API_KEY || !env.NOTIFY_EMAIL) {
    console.warn('RESEND_API_KEY or NOTIFY_EMAIL not set; message stored only', row && row.id);
    return;
  }
  const topic = TOPIC_LABELS[msg.topic] || msg.topic;
  const fields = [
    ['Name', msg.name],
    ['Email', msg.email],
    ['Phone', msg.phone],
    ['Organisation', msg.organisation],
    ['Topic', topic],
    ['Language', msg.lang === 'ar' ? 'Arabic' : 'English'],
    ['Received', row && row.created_at],
    ['Message #', row && String(row.id)],
  ].filter(([, v]) => v);

  const text =
    fields.map(([k, v]) => `${k}: ${v}`).join('\n') + `\n\n${msg.message}\n\n— Sent from bayanai.tech/links (QR)`;
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#1b2d3b">
<h2 style="margin:0 0 12px">New message from the QR page</h2>
<table cellpadding="6" style="border-collapse:collapse">${fields
    .map(([k, v]) => `<tr><td style="color:#65717b">${esc(k)}</td><td><strong>${esc(v)}</strong></td></tr>`)
    .join('')}</table>
<p style="white-space:pre-wrap;border-left:3px solid #657e90;padding:8px 12px;margin:16px 0"${
    msg.lang === 'ar' ? ' dir="rtl"' : ''
  }>${esc(msg.message)}</p>
<p style="color:#65717b;font-size:13px">Reply to this email to answer ${esc(msg.name)} directly.</p></div>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.MAIL_FROM || 'Bayan AI Links <onboarding@resend.dev>',
      to: [env.NOTIFY_EMAIL],
      reply_to: msg.email,
      subject: `[QR] ${topic}: ${msg.name}`.replace(/[\r\n]+/g, ' ').slice(0, 150),
      text,
      html,
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
  if (row && row.id) await env.DB.prepare('UPDATE messages SET emailed = 1 WHERE id = ?1').bind(row.id).run();
}

async function sha256(input) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
