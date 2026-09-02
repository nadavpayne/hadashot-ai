// Signup relay: the browser posts here (same origin, so no CORS), and this
// function forwards to the Google Apps Script web app server-to-server.
//
// Going through here rather than posting to Apps Script directly is deliberate:
// Apps Script redirects to googleusercontent.com, and the browser usually cannot
// read the final response, so the page could not tell a real save from a failure
// and would have to claim success either way. It also keeps the webhook URL out
// of the public repo.
//
// Requires the SHEETS_WEBHOOK_URL environment variable in Vercel.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const webhook = process.env.SHEETS_WEBHOOK_URL;
  if (!webhook) {
    // Never pretend it worked — a missing config is a real failure.
    console.error('SHEETS_WEBHOOK_URL is not set');
    return res.status(500).json({ ok: false, error: 'not_configured' });
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body || {};
  const email = String(body.email || '').trim().toLowerCase();

  // A bot filling the hidden field is the only one that ever would.
  if (body.company) return res.status(200).json({ ok: true });

  if (!EMAIL.test(email) || email.length > 254) {
    return res.status(400).json({ ok: false, error: 'invalid_email' });
  }

  try {
    const upstream = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        source: 'hadashot-ai.com',
        at: new Date().toISOString(),
      }),
    });

    if (!upstream.ok) {
      console.error('sheet webhook returned', upstream.status);
      return res.status(502).json({ ok: false, error: 'upstream_failed' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('sheet webhook threw', err);
    return res.status(502).json({ ok: false, error: 'upstream_unreachable' });
  }
}

function safeParse(s) {
  try { return JSON.parse(s); } catch { return {}; }
}
