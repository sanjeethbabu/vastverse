/* AI consultant chat box on the home page. Talks to POST /api/chat (Grok on the server). */
import { api } from './api.js';
import { $, $$, esc } from './ui.js';

// tiny, safe markdown: escape first, then **bold** and "- " bullets
function md(text) {
  const out = []; let list = null;
  esc(text).split(/\n+/).forEach(raw => {
    const line = raw.trim().replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    if (!line) return;
    const li = line.match(/^(?:[-*•]|\d+[.)])\s+(.*)/);
    if (li) { if (!list) { list = []; out.push(list); } list.push(li[1]); }
    else { list = null; out.push(line); }
  });
  return out.map(b => Array.isArray(b) ? `<ul>${b.map(i => `<li>${i}</li>`).join('')}</ul>` : `<p>${b}</p>`).join('');
}

export function initChat() {
  const log = $('#chatLog'), form = $('#chatForm'), input = $('#chatIn'), chips = $('#chatChips'), send = $('.chat-send', form);
  if (!log || log._init) return; log._init = true;
  const history = [];
  let busy = false, ctaShown = false;

  const scroll = () => { log.scrollTop = log.scrollHeight; };
  const add = (cls, html) => { const d = document.createElement('div'); d.className = 'msg ' + cls; d.innerHTML = html; log.appendChild(d); scroll(); return d; };
  const grow = () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 120) + 'px'; };

  async function ask(text) {
    text = text.trim();
    if (!text || busy) return;
    busy = true; send.disabled = true; chips.hidden = true;
    add('user', `<p>${esc(text)}</p>`);
    history.push({ role: 'user', content: text });
    input.value = ''; grow();
    const typing = add('bot', '<span class="typing" aria-label="AI is typing"><i></i><i></i><i></i></span>');
    try {
      const { reply } = await api('/api/chat', { method: 'POST', body: { messages: history.slice(-12) }, timeout: 50000 });
      history.push({ role: 'assistant', content: reply });
      typing.innerHTML = md(reply);
      if (!ctaShown && history.length >= 4) {
        ctaShown = true;
        typing.insertAdjacentHTML('beforeend', '<a class="btn btn-light cta" href="#contact" data-link>Discuss this with our team</a>');
      }
    } catch (e) {
      history.pop();   // let them retry the same message
      typing.classList.add('err');
      typing.innerHTML = `<p>${esc(e.offline ? "I can't reach our servers right now. Please try again in a moment." : e.message)}</p>`;
    } finally {
      busy = false; send.disabled = false; scroll();
      if (matchMedia('(hover: hover)').matches) input.focus({ preventScroll: true });
    }
  }

  form.addEventListener('submit', e => { e.preventDefault(); ask(input.value); });
  input.addEventListener('input', grow);
  input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(input.value); } });
  $$('button', chips).forEach(b => b.addEventListener('click', () => ask(b.textContent)));
}
