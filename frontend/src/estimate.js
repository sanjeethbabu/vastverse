/* Offline mirror of backend/app/estimator.py, driven by the same config. */
export function estimateLocal(cfg, service, features, scale, timeline) {
  const base = cfg.services[service];
  const breakdown = [{ label: 'Core build', amount: base }];
  [...new Set(features)].forEach(f => { const [label, amount] = cfg.features[f]; breakdown.push({ label, amount }); });
  const subtotal = breakdown.reduce((s, b) => s + b.amount, 0);
  const total = subtotal * cfg.scale[scale][1] * cfg.timeline[timeline][1];
  const low = Math.max(cfg.minimum, Math.round(total * .85 / 1000) * 1000);
  const high = Math.max(low + 5000, Math.round(total * 1.2 / 1000) * 1000);
  let weeks = Math.round(subtotal * cfg.scale[scale][1] / 4200);
  if (timeline === 'rush') weeks = Math.round(weeks * .75); else if (timeline === 'flexible') weeks = Math.round(weeks * 1.15);
  weeks = Math.max(4, Math.min(52, weeks));
  const team = total < 40000 ? 2 : total < 80000 ? 3 : total < 140000 ? 5 : 7;
  return { low, high, weeks, team, breakdown, note: 'Indicative range only. Your final quote follows a free discovery call.' };
}
export const money = n => '$' + (n >= 1000 ? Math.round(n / 1000) + 'K' : n);
