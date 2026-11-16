# bayan-links-api

This Cloudflare Worker receives the **Contact us** form at `https://www.bayanai.tech/links/contact`. For each message it:

1. checks the request with a honeypot field, Turnstile and a rate limit,
2. stores the message in **D1**,
3. emails it through **Resend** to the address in the `NOTIFY_EMAIL` secret.

That address is kept only as a Worker secret. It never appears in the page code or in any response.

The pages themselves are static files in `/links` and are served by Vercel with the rest of the site. Vercel does not serve this folder (see `.vercelignore`).

## One-time setup

Run these from `workers/links-api/`:

```sh
npx wrangler login

# 1. Database
npx wrangler d1 create bayan-links          # copy the database_id into wrangler.toml
npx wrangler d1 execute bayan-links --remote --file=schema.sql
```

2. **Turnstile:** in the Cloudflare dashboard, go to Turnstile → Add widget. Add the hostnames `bayanai.tech` and `www.bayanai.tech`, and choose the Managed mode.
3. **Resend:** sign up at resend.com with the inbox that should receive the messages. Go to API Keys → Create.

   Until you verify a domain with Resend, its test sender (`onboarding@resend.dev`) can only send to that account's own address.

```sh
# 4. Secrets (each command prompts for the value)
npx wrangler secret put NOTIFY_EMAIL        # inbox that receives messages
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put TURNSTILE_SECRET    # Turnstile widget secret key
npx wrangler secret put IP_SALT             # any long random string

# 5. Deploy
npx wrangler deploy                         # prints https://bayan-links-api.<account>.workers.dev
```

6. In `links/links.js`, set `WORKER_URL` to the workers.dev URL and `TURNSTILE_SITEKEY` to the Turnstile site key. Then push to `main`.

Until `WORKER_URL` is set, the form opens the visitor's email app addressed to info@bayanai.tech.

## Reading messages

You can read messages in two places:

- In the dashboard: D1 → bayan-links → Console.
- From the command line:

```sh
npx wrangler d1 execute bayan-links --remote --command "SELECT id, created_at, name, email, phone, organisation, topic, message, emailed FROM messages ORDER BY id DESC LIMIT 50"
```

If a row has `emailed = 0`, it was saved but its email failed. Run `npx wrangler tail` to see the error.

## Local testing

```sh
cp .dev.vars.example .dev.vars              # allows http://localhost:8080 and uses Turnstile's test secret
npx wrangler d1 execute bayan-links --local --file=schema.sql
npx wrangler dev --port 8787
```

## Optional: send from your own domain

Once bayanai.tech is verified in Resend, change `MAIL_FROM` in `wrangler.toml` to something like `Bayan AI <links@bayanai.tech>`. Emails can then go to any address.
