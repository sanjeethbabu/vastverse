"""Indicative project estimate. Mirrors frontend/src/estimate.js."""
from .content import ESTIMATOR


def estimate(service: str, features: list[str], scale: str, timeline: str) -> dict:
    cfg = ESTIMATOR
    if service not in cfg["services"]:
        raise ValueError("Unknown service")
    if scale not in cfg["scale"] or timeline not in cfg["timeline"]:
        raise ValueError("Unknown scale or timeline")
    unknown = [f for f in features if f not in cfg["features"]]
    if unknown:
        raise ValueError(f"Unknown features: {', '.join(unknown)}")

    base = cfg["services"][service]
    breakdown = [{"label": "Core build", "amount": base}]
    for f in dict.fromkeys(features):  # de-duplicate, keep order
        label, amount = cfg["features"][f]
        breakdown.append({"label": label, "amount": amount})

    subtotal = sum(b["amount"] for b in breakdown)
    total = subtotal * cfg["scale"][scale][1] * cfg["timeline"][timeline][1]
    low = max(cfg["minimum"], round(total * 0.85 / 1000) * 1000)
    high = max(low + 5000, round(total * 1.2 / 1000) * 1000)

    weeks = round(subtotal * cfg["scale"][scale][1] / 4200)
    if timeline == "rush":
        weeks = round(weeks * 0.75)
    elif timeline == "flexible":
        weeks = round(weeks * 1.15)
    weeks = max(4, min(52, weeks))
    team = 2 if total < 40000 else 3 if total < 80000 else 5 if total < 140000 else 7

    return {"low": low, "high": high, "weeks": weeks, "team": team, "breakdown": breakdown,
            "note": "Indicative range only. Your final quote follows a free discovery call."}
