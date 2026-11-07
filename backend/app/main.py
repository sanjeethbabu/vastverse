"""Vastverse API.

Locally:   uvicorn app.main:app --reload   (from the backend folder)
On Vercel: api/index.py imports `app` from here and runs it as a Python function.

Enquiries are emailed to you over SMTP. Supabase storage is optional and stays
off until SUPABASE_URL and SUPABASE_SERVICE_KEY are set.
"""
import html
import logging
import os
import re
import time
from collections import defaultdict, deque
from pathlib import Path


def _load_dotenv() -> None:
    """Local dev convenience: read KEY=VALUE lines from the repo-root .env (real env vars win)."""
    f = Path(__file__).resolve().parents[2] / ".env"
    if not f.exists():
        return
    for line in f.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


_load_dotenv()

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

from . import consultant, mailer, storage
from .content import CONTACT, SERVICES, all_content
from .estimator import estimate

log = logging.getLogger("vastverse")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
SERVICE_NAMES = {s["name"] for s in SERVICES} | {"Not sure yet"}
DIST = Path(os.getenv("FRONTEND_DIST", Path(__file__).resolve().parents[2] / "frontend" / "dist"))
FALLBACK = f"Please email us directly at {CONTACT['email']}."

app = FastAPI(title="Vastverse API", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=[o for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if o],
                   allow_methods=["GET", "POST"], allow_headers=["*"])

# --- simple per-instance rate limit for write endpoints -------------------------
_hits: dict[str, deque] = defaultdict(deque)


def rate_limit(request: Request, limit: int = 6, window: int = 60) -> None:
    key = request.headers.get("x-forwarded-for", request.client.host if request.client else "anon").split(",")[0].strip()
    now, q = time.time(), _hits[key]
    while q and now - q[0] > window:
        q.popleft()
    if len(q) >= limit:
        raise HTTPException(429, "Too many requests. Please wait a minute and try again.")
    q.append(now)


# --- models ------------------------------------------------------------------------
def _email(v: str) -> str:
    v = v.strip()
    if not EMAIL_RE.match(v) or len(v) > 200:
        raise ValueError("Enter a valid email address")
    return v.lower()


class ContactIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: str
    company: str | None = Field(default=None, max_length=160)
    service: str
    details: str = Field(min_length=20, max_length=5000)
    estimate: dict | None = None
    website: str | None = None  # honeypot: real visitors leave this empty

    @field_validator("email")
    @classmethod
    def _v_email(cls, v: str) -> str:
        return _email(v)

    @field_validator("service")
    @classmethod
    def _service(cls, v: str) -> str:
        if v not in SERVICE_NAMES:
            raise ValueError("Choose a service from the list")
        return v


class NewsletterIn(BaseModel):
    email: str
    @field_validator("email")
    @classmethod
    def _v_email(cls, v: str) -> str:
        return _email(v)


class EstimateIn(BaseModel):
    service: str
    features: list[str] = []
    scale: str = "growth"
    timeline: str = "standard"


class ChatMsg(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    content: str = Field(min_length=1, max_length=2000)


class ChatIn(BaseModel):
    messages: list[ChatMsg] = Field(min_length=1, max_length=30)

    @field_validator("messages")
    @classmethod
    def _last_is_user(cls, v: list[ChatMsg]) -> list[ChatMsg]:
        if v[-1].role != "user":
            raise ValueError("The last message must come from you")
        return v


# --- routes ------------------------------------------------------------------------
@app.get("/api/health")
def health():
    return {"ok": True, "email": mailer.configured(), "storage": "supabase" if storage.enabled() else "off", "ai": consultant.configured()}


@app.get("/api/content")
def content():
    return all_content()


@app.post("/api/estimate")
def post_estimate(body: EstimateIn):
    try:
        return estimate(body.service, body.features, body.scale, body.timeline)
    except ValueError as e:
        raise HTTPException(422, str(e))


def _money(n) -> str:
    return f"${round(n / 1000)}K"


@app.post("/api/contact", status_code=201)
def post_contact(body: ContactIn, request: Request):
    rate_limit(request)
    first = body.name.strip().split()[0]
    ok_msg = f"Thanks, {first}. Your message is in. We'll reply within 24 hours."
    if body.website:  # bot filled the hidden field: pretend success, send nothing
        return {"ok": True, "message": ok_msg}
    if not mailer.configured() and not storage.enabled():
        raise HTTPException(503, f"Our contact form isn't connected yet. {FALLBACK}")

    est = body.estimate or {}
    est_line = f"{_money(est['low'])} – {_money(est['high'])}, about {est.get('weeks')} weeks" if est.get("low") else "none"
    lead = {"name": body.name.strip(), "email": body.email, "company": (body.company or "").strip(), "service": body.service,
            "details": body.details.strip(), "estimate": est or None}
    storage.save_lead(lead)

    if mailer.configured():
        text = (f"New enquiry from the Vastverse website\n\nName: {lead['name']}\nEmail: {lead['email']}\nCompany: {lead['company'] or '-'}\n"
                f"Service: {lead['service']}\nEstimate: {est_line}\n\n{lead['details']}\n")
        e = {k: html.escape(str(v)) for k, v in lead.items() if k != "estimate"}
        html_body = (f"<h2 style='font-family:sans-serif'>New enquiry</h2><table style='font-family:sans-serif;font-size:14px'>"
                     f"<tr><td><b>Name</b></td><td>{e['name']}</td></tr><tr><td><b>Email</b></td><td><a href='mailto:{e['email']}'>{e['email']}</a></td></tr>"
                     f"<tr><td><b>Company</b></td><td>{e['company'] or '-'}</td></tr><tr><td><b>Service</b></td><td>{e['service']}</td></tr>"
                     f"<tr><td><b>Estimate</b></td><td>{html.escape(est_line)}</td></tr></table>"
                     f"<p style='font-family:sans-serif;white-space:pre-wrap'>{e['details']}</p>")
        try:
            mailer.send(mailer.notify_to(), f"New enquiry: {lead['service']} from {lead['name']}", text, html_body, reply_to=lead["email"])
        except Exception:
            log.exception("SMTP send failed")
            if not storage.enabled():
                raise HTTPException(502, f"We couldn't send your message just now. {FALLBACK}")
        if mailer.auto_reply_enabled():
            try:
                mailer.send(lead["email"], "We received your message — Vastverse",
                            f"Hi {first},\n\nThanks for contacting Vastverse. We've received your message about {lead['service']} "
                            f"and will reply within 24 hours.\n\nVastverse — Innovation from Vision\n{CONTACT['email']}")
            except Exception:
                log.exception("Auto-reply failed")
    return {"ok": True, "message": ok_msg}


@app.post("/api/chat")
def post_chat(body: ChatIn, request: Request):
    rate_limit(request, limit=15)
    if not consultant.configured():
        raise HTTPException(503, f"Our AI consultant is offline right now. {FALLBACK}")
    try:
        return {"reply": consultant.reply([m.model_dump() for m in body.messages])}
    except consultant.ConsultantError:
        raise HTTPException(502, f"Our AI consultant couldn't answer just now. Please try again, or {FALLBACK[0].lower() + FALLBACK[1:]}")


@app.post("/api/newsletter", status_code=201)
def post_newsletter(body: NewsletterIn, request: Request):
    rate_limit(request)
    if not mailer.configured() and not storage.enabled():
        raise HTTPException(503, f"Newsletter sign-up isn't connected yet. {FALLBACK}")
    storage.save_subscriber(body.email)
    if mailer.configured():
        try:
            mailer.send(mailer.notify_to(), "New newsletter subscriber", f"{body.email} subscribed to the Vastverse insights digest.")
        except Exception:
            log.exception("SMTP send failed")
            if not storage.enabled():
                raise HTTPException(502, f"We couldn't subscribe you just now. {FALLBACK}")
    return {"ok": True, "message": "You're subscribed. Watch your inbox for the next digest."}


@app.get("/api/admin/leads")
def admin_leads(x_admin_token: str | None = Header(default=None)):
    token = os.getenv("ADMIN_TOKEN")
    if not token or x_admin_token != token:
        raise HTTPException(401, "Unauthorized")
    if not storage.enabled():
        raise HTTPException(404, "Storage is off. Enquiries are delivered by email.")
    return storage.list_leads()


# Local / Docker only: serve the built frontend from the same origin.
# On Vercel the static site is served by Vercel's CDN instead.
if DIST.exists() and not os.getenv("VERCEL"):
    from fastapi.staticfiles import StaticFiles
    app.mount("/", StaticFiles(directory=DIST, html=True), name="site")
