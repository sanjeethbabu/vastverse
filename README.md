# Vastverse website

Vastverse — Innovation from Vision. A 3D, scroll-driven company website that runs entirely on Vercel.

- **Frontend:** Vite, JavaScript modules, Three.js particle planets and GSAP scroll animation. Vercel serves it as a static site.
- **Backend:** Python FastAPI, running as a single Vercel Python function at `/api/*`.
- **AI assistant:** Mr. Smart uses a LangGraph workflow in `backend/mr_smart/` with the existing server-side xAI chat integration.
- **Enquiries:** the contact form and newsletter email you over SMTP. There's no database.
- **Supabase (optional):** the code is included but off until you add two environment variables.

## Deploy to Vercel

1. Push this folder to a GitHub repository.
2. In Vercel, choose **Add New → Project**, import the repository and keep **Root Directory** as the repo root. `vercel.json` already sets the build:
   - the frontend builds from `frontend/` into `frontend/dist`
   - `api/index.py` becomes the Python function
   - every `/api/*` request goes to FastAPI
3. Add these **Environment Variables** (Project → Settings → Environment Variables):

   | Name | Example | Notes |
   |---|---|---|
   | `SMTP_HOST` | `smtp.gmail.com` | |
   | `SMTP_PORT` | `587` | Use `465` for SSL-only providers |
   | `SMTP_USER` | `you@gmail.com` | |
   | `SMTP_PASSWORD` | 16-character app password | See the Gmail steps below |
   | `SMTP_FROM` | `Vastverse website <you@gmail.com>` | Optional |
   | `NOTIFY_TO` | `you@gmail.com` | Where enquiries arrive. Separate several addresses with commas. |
   | `AUTO_REPLY` | `true` | Optional: sends visitors a "we got your message" email |
   | `XAI_API_KEY` | xAI API key | Enables Mr. Smart. Kept on the server. |
   | `XAI_MODEL` | `grok-4` | Optional model override. |

4. Deploy, then open `https://your-site.vercel.app/api/health`. It should show `"email": true`.
5. Send yourself a test enquiry from the contact page.

### Gmail app password

Gmail won't accept your normal password over SMTP:

1. Turn on 2-Step Verification for the Google account.
2. Create an app password at https://myaccount.google.com/apppasswords.
3. Paste the 16 characters (no spaces) into `SMTP_PASSWORD`.

Google Workspace, Zoho, Outlook and most other providers work the same way with their own SMTP host and port.

## What happens when someone contacts you

- You get an email with their name, company, service, estimate (if they used the estimator) and message. **Reply-To is the visitor**, so you can just press reply.
- With `AUTO_REPLY=true`, the visitor gets a short confirmation email.
- **Spam protection:** a hidden honeypot field and a per-instance rate limit.
- **If email isn't configured or the SMTP server fails,** the visitor sees an honest message with your email address instead of a false "sent".

## Switching on Supabase later (optional)

1. Create a Supabase project and run `supabase/schema.sql` in its SQL Editor.
2. In Vercel, add:
   - `SUPABASE_URL`: `https://<project>.supabase.co`
   - `SUPABASE_SERVICE_KEY`: the **service_role** key. It's server-side only and is never sent to the browser.
   - `ADMIN_TOKEN`: any secret, used to read leads at `/api/admin/leads` with the `x-admin-token` header
3. Redeploy. Enquiries are then emailed **and** saved. Email still works if Supabase is down.

## Run locally

```bash
cp .env.example .env            # fill in SMTP details (optional locally)

# backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
pytest -q
set -a && source ../.env && set +a
uvicorn app.main:app --reload   # http://localhost:8000

# frontend (another terminal)
cd frontend && npm install && npm run dev   # http://localhost:5173 (proxies /api to :8000)
```

You can also run `vercel dev` from the repo root (with the Vercel CLI) to run it exactly as Vercel does.

## Project layout

```
api/index.py           Vercel function entrypoint (imports the FastAPI app)
vercel.json            build, function and routing config
requirements.txt       Python dependencies for the Vercel function
frontend/              Vite site (index.html, src/*.js, public/frames)
  src/verse.js         particle planets: collapse, zoom, explode, cursor and click effects
  src/film.js          scroll-scrubbed hand-touch hero
  src/main.js          content, router, sections, estimator, forms
backend/app/
  main.py              API routes
  consultant.py        xAI response client (server-side key)
  mailer.py            SMTP email
  storage.py           optional Supabase storage (off by default)
  content.py           all site content (single source of truth)
  estimator.py         project estimate logic
backend/mr_smart/
  graph.py             LangGraph analysis and answer workflow for Mr. Smart
backend/tests/         pytest suite (email and storage mocked)
supabase/schema.sql    tables for when you switch storage on
```

## Edit content

Edit `backend/app/content.py`, then refresh the frontend's offline copy:

```bash
cd backend && python -m app.export_content
```

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Status, including whether email and storage are configured |
| GET | `/api/content` | All site content |
| POST | `/api/estimate` | Indicative project estimate |
| POST | `/api/mr-smart/chat` | Chat with Mr. Smart using the LangGraph workflow |
| POST | `/api/chat` | Backwards-compatible alias for Mr. Smart |
| POST | `/api/contact` | Email the enquiry to `NOTIFY_TO` (and save it if Supabase is on) |
| POST | `/api/newsletter` | Email you about the new subscriber (and save it if Supabase is on) |
| GET | `/api/admin/leads` | List saved leads (Supabase only, needs `x-admin-token`) |

## Before launch

- Replace the placeholder address and phone number in `backend/app/content.py`.
- Review the estimator prices in `ESTIMATOR` in the same file.
- Mr. Smart provides general information, not personalized investment, tax, or legal advice. Verify current or high-stakes financial decisions with a qualified professional.
