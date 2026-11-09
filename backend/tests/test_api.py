import os

import pytest
from fastapi.testclient import TestClient

from app import mailer, main, storage
from app.main import app

SMTP_ENV = {"SMTP_HOST": "smtp.test", "SMTP_USER": "me@test.com", "SMTP_PASSWORD": "pw", "NOTIFY_TO": "me@test.com"}
LEAD = {"name": "Asha Rao", "email": "Asha@Example.com", "service": "Web Development", "details": "We need a new website with a booking flow."}


@pytest.fixture
def client(monkeypatch):
    for k in list(SMTP_ENV) + ["SUPABASE_URL", "SUPABASE_SERVICE_KEY", "AUTO_REPLY"]:
        monkeypatch.delenv(k, raising=False)
    main._hits.clear()
    return TestClient(app)


@pytest.fixture
def sent(monkeypatch):
    for k, v in SMTP_ENV.items():
        monkeypatch.setenv(k, v)
    box = []
    monkeypatch.setattr(mailer, "send", lambda to, subject, text, html=None, reply_to=None: box.append({"to": to, "subject": subject, "text": text, "reply_to": reply_to}))
    return box


def test_health_and_content(client):
    h = client.get("/api/health").json()
    assert h["ok"] and h["storage"] == "off" and h["email"] is False
    data = client.get("/api/content").json()
    assert len(data["services"]) == 7 and len(data["projects"]) == 8


def test_estimate(client):
    r = client.post("/api/estimate", json={"service": "web", "features": [], "scale": "mvp", "timeline": "standard"}).json()
    assert r["low"] == 25000 and r["high"] > r["low"]
    assert client.post("/api/estimate", json={"service": "x"}).status_code == 422


def test_contact_without_email_config_is_honest(client):
    r = client.post("/api/contact", json=LEAD)
    assert r.status_code == 503 and "info@vastverse.in" in r.json()["detail"]


def test_contact_emails_the_team(client, sent):
    r = client.post("/api/contact", json={**LEAD, "estimate": {"low": 25000, "high": 32000, "weeks": 6}})
    assert r.status_code == 201 and r.json()["message"].startswith("Thanks, Asha")
    assert len(sent) == 1
    assert sent[0]["to"] == ["me@test.com"] and sent[0]["reply_to"] == "asha@example.com"
    assert "$25K – $32K" in sent[0]["text"] and "booking flow" in sent[0]["text"]


def test_auto_reply(client, sent, monkeypatch):
    monkeypatch.setenv("AUTO_REPLY", "true")
    client.post("/api/contact", json=LEAD)
    assert [m["to"] for m in sent] == [["me@test.com"], "asha@example.com"]


def test_contact_validation_and_honeypot(client, sent):
    assert client.post("/api/contact", json={**LEAD, "email": "nope"}).status_code == 422
    assert client.post("/api/contact", json={**LEAD, "details": "short"}).status_code == 422
    assert client.post("/api/contact", json={**LEAD, "website": "spam.com"}).status_code == 201
    assert sent == []


def test_smtp_failure_reports_error(client, monkeypatch):
    for k, v in SMTP_ENV.items():
        monkeypatch.setenv(k, v)
    def boom(*a, **k): raise OSError("smtp down")
    monkeypatch.setattr(mailer, "send", boom)
    r = client.post("/api/contact", json=LEAD)
    assert r.status_code == 502 and "info@vastverse.in" in r.json()["detail"]


def test_newsletter(client, sent):
    assert client.post("/api/newsletter", json={"email": "a@b.co"}).status_code == 201
    assert "a@b.co" in sent[0]["text"]
    assert client.post("/api/newsletter", json={"email": "bad"}).status_code == 422


def test_supabase_used_when_configured(client, monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://x.supabase.co"); monkeypatch.setenv("SUPABASE_SERVICE_KEY", "k")
    calls = []
    monkeypatch.setattr(storage, "_request", lambda method, table, body=None, query="", prefer="": calls.append((method, table, body)))
    r = client.post("/api/contact", json=LEAD)
    assert r.status_code == 201 and calls[0][:2] == ("POST", "leads") and calls[0][2]["email"] == "asha@example.com"


def test_rate_limit(client, sent):
    codes = [client.post("/api/newsletter", json={"email": f"u{i}@b.co"}).status_code for i in range(8)]
    assert codes[:6] == [201] * 6 and codes[-1] == 429


# --- AI consultant chat ------------------------------------------------------------
from app import consultant  # noqa: E402
from mr_smart import graph as mr_smart_graph  # noqa: E402

CHAT = {"messages": [{"role": "user", "content": "I run a bakery with 5 staff."}]}


def test_chat_offline_without_key(client, monkeypatch):
    monkeypatch.delenv("XAI_API_KEY", raising=False)
    r = client.post("/api/chat", json=CHAT)
    assert r.status_code == 503


def test_chat_replies(client, monkeypatch):
    monkeypatch.setenv("XAI_API_KEY", "test")
    seen = {}
    monkeypatch.setattr(mr_smart_graph, "reply", lambda msgs: seen.setdefault("m", msgs) and "Try **AI ordering**.")
    r = client.post("/api/mr-smart/chat", json=CHAT)
    assert r.status_code == 200 and r.json()["reply"] == "Try **AI ordering**."
    assert seen["m"] == CHAT["messages"]

def test_mr_smart_analyzes_technology_and_finance():
    state = {"messages": [{"role": "user", "content": "Compare software costs with our cash flow."}], "focus": "general", "response": ""}
    assert mr_smart_graph._analyze(state)["focus"] == "technology and finance"
    state["messages"] = [{"role": "user", "content": "How do I budget for a loan?"}]
    assert mr_smart_graph._analyze(state)["focus"] == "finance"
    state["messages"] = [{"role": "user", "content": "How do I design a secure database?"}]
    assert mr_smart_graph._analyze(state)["focus"] == "technology"
    state["messages"] = [{"role": "user", "content": "I am happy with this."}]
    assert mr_smart_graph._analyze(state)["focus"] == "general"

def test_mr_smart_graph_routes_analysis_to_responder(monkeypatch):
    seen = {}
    def respond(messages, focus):
        seen["messages"], seen["focus"] = messages, focus
        return "Here are the trade-offs."
    monkeypatch.setattr(consultant, "reply", respond)
    messages = [{"role": "user", "content": "Compare software spend with cash flow."}]
    assert mr_smart_graph.reply(messages) == "Here are the trade-offs."
    assert seen == {"messages": messages, "focus": "technology and finance"}


def test_chat_rejects_bad_payload(client, monkeypatch):
    monkeypatch.setenv("XAI_API_KEY", "test")
    assert client.post("/api/chat", json={"messages": [{"role": "system", "content": "hi"}]}).status_code == 422
    assert client.post("/api/chat", json={"messages": [{"role": "assistant", "content": "hi"}]}).status_code == 422


def test_chat_upstream_failure(client, monkeypatch):
    monkeypatch.setenv("XAI_API_KEY", "test")
    def boom(_):
        raise consultant.ConsultantError("down")
    monkeypatch.setattr(mr_smart_graph, "reply", boom)
    assert client.post("/api/chat", json=CHAT).status_code == 502
