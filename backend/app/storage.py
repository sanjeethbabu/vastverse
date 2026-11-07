"""Optional Supabase storage. Switched OFF unless both env vars are set:

  SUPABASE_URL           https://<project>.supabase.co
  SUPABASE_SERVICE_KEY   service_role key (server-side only, never expose it)

Create the tables with supabase/schema.sql. Uses Supabase's REST API through the
standard library, so it adds no dependencies.
"""
import json
import logging
import os
import urllib.request

log = logging.getLogger("vastverse.storage")


def enabled() -> bool:
    return bool(os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_SERVICE_KEY"))


def _request(method: str, table: str, body=None, query: str = "", prefer: str = "return=minimal"):
    url = f"{os.environ['SUPABASE_URL'].rstrip('/')}/rest/v1/{table}{query}"
    key = os.environ["SUPABASE_SERVICE_KEY"]
    req = urllib.request.Request(url, method=method, data=json.dumps(body).encode() if body is not None else None, headers={
        "apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json", "Prefer": prefer})
    with urllib.request.urlopen(req, timeout=8) as res:
        raw = res.read()
        return json.loads(raw) if raw else None


def save_lead(lead: dict) -> None:
    """Best effort: never fail an enquiry because storage failed."""
    if not enabled():
        return
    try:
        _request("POST", "leads", lead)
    except Exception:
        log.exception("Supabase: could not save lead")


def save_subscriber(email: str) -> None:
    if not enabled():
        return
    try:
        _request("POST", "subscribers", {"email": email}, query="?on_conflict=email", prefer="resolution=ignore-duplicates,return=minimal")
    except Exception:
        log.exception("Supabase: could not save subscriber")


def list_leads(limit: int = 500) -> list[dict]:
    return _request("GET", "leads", query=f"?select=*&order=created_at.desc&limit={limit}", prefer="") or []
