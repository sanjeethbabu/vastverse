/* Mr. Smart chat uses the server-side LangGraph workflow. */
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
  const dialog = $('#agentDialog'), opener = $('#agentOpen'), close = $('#agentClose');
  const cursor = $('#cur'), cursorParent = cursor.parentElement;
  const mic = $('#chatMic'), speechStatus = $('#speechStatus');
  opener.addEventListener('click', () => {
    if (dialog.open) return;
    dialog.showModal();
    dialog.append(cursor);
  });
  initBuddy(opener, dialog);
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => cursorParent.append(cursor));
  dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null, listening = false;
  if (!SpeechRecognition) {
    mic.disabled = true;
    mic.title = 'Speech input is not supported in this browser';
  } else {
    mic.addEventListener('click', () => {
      if (listening) { recognition.stop(); return; }
      recognition = new SpeechRecognition();
      recognition.lang = document.documentElement.lang || 'en-US';
      recognition.interimResults = false;
      recognition.continuous = false;
      recognition.onstart = () => {
        listening = true;
        mic.classList.add('is-listening');
        mic.setAttribute('aria-label', 'Stop speaking');
        speechStatus.textContent = 'Listening. Speak now.';
      };
      recognition.onresult = event => {
        const transcript = Array.from(event.results).map(result => result[0].transcript).join(' ').trim();
        if (transcript) {
          input.value = `${input.value.trimEnd()}${input.value.trim() ? ' ' : ''}${transcript}`;
          grow();
          speechStatus.textContent = 'Voice message added.';
        }
      };
      recognition.onerror = event => {
        const errors = {
          'not-allowed': 'Microphone access was denied. Allow microphone access to use speech input.',
          'no-speech': 'No speech was detected. Try again.',
          'audio-capture': 'No microphone is available.'
        };
        speechStatus.textContent = errors[event.error] || 'Speech recognition failed. Please try again.';
      };
      recognition.onend = () => {
        listening = false;
        mic.classList.remove('is-listening');
        mic.setAttribute('aria-label', 'Speak your message');
      };
      try {
        recognition.start();
      } catch {
        speechStatus.textContent = 'Could not start speech recognition. Check microphone permissions.';
      }
    });
  }
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
      const { reply } = await api('/api/mr-smart/chat', { method: 'POST', body: { messages: history.slice(-12) }, timeout: 50000 });
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

/* Mr. Smart buddy: eyes follow the pointer; on hover it says hi. */
function initBuddy(btn, dialog) {
  const nudge = $('#agentNudge'), bubble = $('#agentBubble'), text = $('#agentBubbleText');
  const eyes = $('.buddy-eyes', btn);
  if (!nudge || !eyes) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const LINE = 'Hi, I’m Mr. Smart';

  // eyes look toward the pointer (max ~2px), rAF-throttled
  if (!reduce) {
    let px = 0, py = 0, raf = 0;
    addEventListener('pointermove', e => {
      px = e.clientX; py = e.clientY;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const r = btn.getBoundingClientRect();
        const dx = px - (r.left + r.width / 2), dy = py - (r.top + r.height / 2);
        const d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 220) * 2;
        eyes.style.transform = `translate(${(dx / d * k).toFixed(2)}px,${(dy / d * k).toFixed(2)}px)`;
      });
    }, { passive: true });
  }

  let typer = 0, leaveT = 0, shown = false;
  function show() {
    clearTimeout(leaveT);
    if (shown || dialog.open) return;
    shown = true;
    nudge.classList.remove('is-leaving'); nudge.hidden = false;
    btn.classList.add('has-nudge');
    if (reduce) { text.textContent = LINE; return; }
    const chars = Array.from(LINE); let i = 0;
    clearInterval(typer);
    typer = setInterval(() => {
      i++;
      text.innerHTML = esc(chars.slice(0, i).join('')) + (i < chars.length ? '<span class="caret"></span>' : '');
      if (i >= chars.length) clearInterval(typer);
    }, 35);
  }
  function hide(now) {
    clearTimeout(leaveT);
    leaveT = setTimeout(() => {
      if (!shown) return;
      shown = false; clearInterval(typer);
      btn.classList.remove('has-nudge');
      nudge.classList.add('is-leaving');
      setTimeout(() => { if (!shown) { nudge.hidden = true; nudge.classList.remove('is-leaving'); } }, reduce ? 0 : 250);
    }, now ? 0 : 180);
  }

  [btn, nudge].forEach(el => {
    el.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') show(); });
    el.addEventListener('pointerleave', () => hide());
  });
  btn.addEventListener('focus', () => { if (btn.matches(':focus-visible')) show(); });
  btn.addEventListener('blur', () => hide());
  btn.addEventListener('click', () => hide(true));
  bubble.addEventListener('click', () => { hide(true); btn.click(); });
}
