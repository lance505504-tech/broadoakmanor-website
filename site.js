/* ============================================================
   Broad Oak Manor — site.js
   Shared shell, sticky nav, Q&A guided helper.
   ============================================================ */

const TWEAK_KEY = 'bom-tweaks-v1';
const TWEAK_DEFAULTS = { hero: 'full-bleed', typeScale: 'restrained', accent: 'gold' };

function loadTweaks() {
  try { const s = JSON.parse(localStorage.getItem(TWEAK_KEY) || '{}'); return { ...TWEAK_DEFAULTS, ...s }; } catch { return { ...TWEAK_DEFAULTS }; }
}
function saveTweaks(t) { localStorage.setItem(TWEAK_KEY, JSON.stringify(t)); }
function applyTweaks(t) {
  document.body.setAttribute('data-hero', t.hero);
  document.body.setAttribute('data-type-scale', t.typeScale);
  document.body.setAttribute('data-accent', t.accent);
}
let TWEAKS = loadTweaks();

const utilityHTML = `
  <div class="utility">
    <div class="container row">
      <div class="left">
        <a href="tel:01992551900"><i data-lucide="phone"></i>01992 551900</a>
        <span class="sep"></span>
        <a href="mailto:info@broadoakmanor.co.uk"><i data-lucide="mail"></i>info@broadoakmanor.co.uk</a>
      </div>
      <div class="right">
        <a href="events.html"><i data-lucide="calendar-days"></i>Open days</a>
      </div>
    </div>
  </div>
`;

function navHTML(current = '') {
  const items = [
    { href: 'index.html', label: 'Home', key: 'home' },
    { href: 'nursing-home.html', label: 'Nursing Home', key: 'nursing' },
    { href: 'assisted-living.html', label: 'Assisted Living', key: 'assisted' },
    { href: 'stories.html', label: 'Stories', key: 'stories' },
    { href: 'events.html', label: 'Events', key: 'events' },
    { href: 'faq.html', label: 'FAQ', key: 'faq' },
    { href: 'about.html', label: 'About', key: 'about' },
    { href: 'contact.html', label: 'Contact', key: 'contact' },
  ];
  return `
    <div class="nav-wrap" id="navwrap">
      <nav class="nav">
        <div class="container row">
          <a class="nav-logo" href="index.html">
            <img class="logo-dark" src="assets/logo.png" alt="Broad Oak Manor" onerror="this.style.display='none'"/>
            <span style="font-family:'EB Garamond',serif;font-size:1.1rem;font-weight:600;color:#6e5340;display:none" id="nav-text-logo">Broad Oak Manor</span>
          </a>
          <ul class="nav-links">
            ${items.map(i => `<li><a href="${i.href}" class="${i.key === current ? 'current' : ''}">${i.label}</a></li>`).join('')}
          </ul>
          <div class="nav-right">
            <a href="#" class="nav-cta" data-open-qa><i data-lucide="message-circle-question"></i><span class="label-full">Find your path</span></a>
            <button class="nav-toggle" type="button" aria-label="Open menu" data-nav-toggle><i data-lucide="menu"></i></button>
          </div>
        </div>
      </nav>
    </div>
  `;
}

const footerHTML = `
  <footer class="site">
    <div class="container">
      <div class="top">
        <div class="brand">
          <img src="assets/logo.png" alt="Broad Oak Manor" class="footer-logo" onerror="this.style.display='none'"/>
          <p>A privately-run nursing home and assisted-living community, set in a Queen Anne Grade II listed manor on the outskirts of Hertford.</p>
          <div class="values-strip"><span>Independence</span><span>Individuality</span><span>Improvement</span></div>
          <div class="socials">
            <a href="https://www.facebook.com/profile.php?id=61559298362401" target="_blank" rel="noopener" aria-label="Facebook"><i data-lucide="facebook"></i></a>
            <a href="https://www.instagram.com/broadoakmanor_/" target="_blank" rel="noopener" aria-label="Instagram"><i data-lucide="instagram"></i></a>
            <a href="https://www.youtube.com/@broadoakmanor9384" target="_blank" rel="noopener" aria-label="YouTube"><i data-lucide="youtube"></i></a>
          </div>
        </div>
        <div>
          <h5>Visit</h5>
          <ul>
            <li><a href="nursing-home.html">Nursing Home</a></li>
            <li><a href="assisted-living.html">Assisted Living</a></li>
            <li><a href="events.html">Events &amp; open days</a></li>
          </ul>
        </div>
        <div>
          <h5>Find out</h5>
          <ul>
            <li><a href="about.html">Our story</a></li>
            <li><a href="stories.html">Resident stories</a></li>
            <li><a href="https://www.cqc.org.uk/location/1-128948967" target="_blank" rel="noopener">CQC report</a></li>
          </ul>
        </div>
        <div>
          <h5>Contact</h5>
          <div class="contact-rows">
            <div class="row"><i data-lucide="phone"></i><span>01992 551900</span></div>
            <div class="row"><i data-lucide="mail"></i><span>info@broadoakmanor.co.uk</span></div>
            <div class="row"><i data-lucide="map-pin"></i><span>Broad Oak Manor<br/>Bramfield Road<br/>Hertford SG14 2JA</span></div>
          </div>
        </div>
      </div>
      <div class="bottom">
        <span>&copy; 2026 Broad Oak Manor &middot; Established for over 35 years.</span>
        <div class="links"><a href="#">Privacy</a><a href="#">Cookies</a></div>
      </div>
    </div>
  </footer>
`;

/* ---------- Q&A Modal ---------- */
const qaHTML = `
  <div class="qa-overlay" id="qaOverlay" role="dialog" aria-modal="true">
    <div class="qa-modal" id="qaModal">
      <button class="qa-close" data-close-qa aria-label="Close"><i data-lucide="x"></i></button>
      <div class="qa-body">
        <div class="qa-progress" id="qaProgress"></div>
        <div class="qa-step active" data-step="who">
          <div class="eyebrow"><span class="num">01</span>Find your path</div>
          <h3 id="qaTitle">Tell us a little — and we'll <em>guide you</em> to the right place.</h3>
          <p class="sub">A few quick questions. No forms, no commitment.</p>
          <div class="qa-options" data-q="who">
            <button class="qa-option" data-value="family"><span class="check"></span><span class="text"><span class="t">I'm helping a loved one</span><span class="d">Looking at nursing care or assisted living for a parent, partner or relative.</span></span></button>
            <button class="qa-option" data-value="self"><span class="check"></span><span class="text"><span class="t">I'm thinking about my own next move</span><span class="d">A smaller home, fewer worries, support nearby when I want it.</span></span></button>
            <button class="qa-option" data-value="referrer"><span class="check"></span><span class="text"><span class="t">I'm a referrer (NHS, GP, case manager)</span><span class="d">I'm placing someone and need to know what's available.</span></span></button>
            <button class="qa-option" data-value="brochure"><span class="check"></span><span class="text"><span class="t">I'd like a brochure to read at home</span><span class="d">By post or by email.</span></span></button>
          </div>
        </div>
        <div class="qa-step" data-step="contact">
          <div class="eyebrow"><span class="num">02</span>How to reach you</div>
          <h3>How can we <em>get back to you</em>?</h3>
          <p class="sub">A member of our management team will get back to you as soon as we can.</p>
          <div class="qa-grid-2">
            <input class="qa-input" type="text" placeholder="Your name" id="qaName"/>
            <input class="qa-input" type="text" placeholder="Phone (optional)" id="qaPhone"/>
          </div>
          <input class="qa-input" type="email" placeholder="Email" id="qaEmail" style="margin-bottom:16px;"/>
          <textarea class="qa-input" rows="3" placeholder="Anything else you'd like us to know? (optional)" id="qaNotes" style="resize:vertical;"></textarea>
        </div>
        <div class="qa-step" data-step="result">
          <div class="qa-result">
            <div class="icon"><i data-lucide="check"></i></div>
            <h3 id="qaResultTitle">Thank you — we'll be <em>in touch</em>.</h3>
            <p id="qaResultBody">A member of our team will reply as soon as we can.</p>
            <div class="qa-actions" id="qaResultActions"></div>
          </div>
        </div>
      </div>
      <div class="qa-footer" id="qaFooter">
        <button type="button" class="qa-back" data-back hidden><i data-lucide="arrow-left"></i>Back</button>
        <span></span>
        <button type="button" class="qa-next" data-next disabled>Continue<i data-lucide="arrow-right"></i></button>
      </div>
    </div>
  </div>
`;

function injectShell(currentPage) {
  const top = document.createElement('div');
  top.innerHTML = utilityHTML + navHTML(currentPage);
  const frag = document.createDocumentFragment();
  while (top.firstChild) frag.appendChild(top.firstChild);
  document.body.insertBefore(frag, document.body.firstChild);
  const bottom = document.createElement('div');
  bottom.innerHTML = footerHTML + qaHTML;
  while (bottom.firstChild) document.body.appendChild(bottom.firstChild);
  applyTweaks(TWEAKS);
  // Fix logo fallback
  const logoImg = document.querySelector('.nav-logo .logo-dark');
  if (logoImg) logoImg.addEventListener('error', () => { logoImg.style.display='none'; const t=document.getElementById('nav-text-logo'); if(t) t.style.display=''; });
}

function initStickyNav(transparent) {
  const wrap = document.getElementById('navwrap');
  if (!wrap) return;
  if (transparent) wrap.classList.add('transparent');
  const update = () => wrap.classList.toggle('scrolled', window.scrollY > 40);
  update();
  window.addEventListener('scroll', update, { passive: true });
  const toggle = wrap.querySelector('[data-nav-toggle]');
  const links = wrap.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => links.classList.toggle('open'));
    links.addEventListener('click', e => { if (e.target.closest('a')) links.classList.remove('open'); });
  }
}

/* Minimal Q&A flow */
const qaState = { path: ['who'], answers: {}, currentStep: 'who', context: null };
const WEB3FORMS_KEY = 'b18e3f57-a85b-43dc-8e6c-ca84689212be';

function qaOpen(context) {
  const o = document.getElementById('qaOverlay');
  if (!o) return;
  o.classList.add('open');
  document.body.style.overflow = 'hidden';
  qaState.path = ['who']; qaState.answers = {}; qaState.currentStep = 'who'; qaState.context = context || null;
  renderQAStep();
  if (window.lucide) window.lucide.createIcons();
}
function qaClose() {
  const o = document.getElementById('qaOverlay');
  if (o) o.classList.remove('open');
  document.body.style.overflow = '';
}
function isStepAnswered(step) {
  if (step === 'contact') {
    const n = document.getElementById('qaName')?.value.trim();
    const e = document.getElementById('qaEmail')?.value.trim();
    return n && e && /.+@.+\..+/.test(e);
  }
  const stepEl = document.querySelector(`.qa-step[data-step="${step}"]`);
  if (!stepEl) return true;
  const optsEl = stepEl.querySelector('.qa-options');
  if (!optsEl) return true;
  return !!qaState.answers[optsEl.dataset.q];
}
function renderQAStep() {
  document.querySelectorAll('.qa-step').forEach(s => s.classList.toggle('active', s.dataset.step === qaState.currentStep));
  const footer = document.getElementById('qaFooter');
  const back = footer?.querySelector('[data-back]');
  const next = footer?.querySelector('[data-next]');
  if (!footer) return;
  if (qaState.currentStep === 'result') { footer.style.display = 'none'; return; }
  footer.style.display = 'flex';
  if (back) back.hidden = qaState.path.length <= 1;
  if (next) {
    next.disabled = !isStepAnswered(qaState.currentStep);
    next.innerHTML = qaState.currentStep === 'contact' ? 'Send enquiry<i data-lucide="send"></i>' : 'Continue<i data-lucide="arrow-right"></i>';
  }
  if (window.lucide) window.lucide.createIcons();
}
function qaNext() {
  const flow = ['who', 'contact', 'result'];
  const idx = flow.indexOf(qaState.currentStep);
  const nextStep = flow[idx + 1];
  if (!nextStep) return;
  if (nextStep === 'result') qaSubmitEnquiry();
  qaState.path.push(nextStep);
  qaState.currentStep = nextStep;
  renderQAStep();
  document.getElementById('qaModal')?.scrollTo(0, 0);
}
function qaBack() {
  qaState.path.pop();
  qaState.currentStep = qaState.path[qaState.path.length - 1];
  renderQAStep();
}
function qaSubmitEnquiry() {
  const name = document.getElementById('qaName')?.value.trim();
  const email = document.getElementById('qaEmail')?.value.trim();
  const phone = document.getElementById('qaPhone')?.value.trim();
  const notes = document.getElementById('qaNotes')?.value.trim();
  const who = qaState.answers.who || 'unknown';
  const subject = `Website enquiry — ${who} — ${name || 'Anonymous'}`;
  const body = `New enquiry from the Broad Oak Manor website\n\nType: ${who}\nName: ${name}\nEmail: ${email}\nPhone: ${phone || 'not provided'}\nNotes: ${notes || 'none'}`;
  if (WEB3FORMS_KEY) {
    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ access_key: WEB3FORMS_KEY, subject, from_name: 'Broad Oak Manor website', replyto: email, message: body })
    }).catch(() => {});
  }
}
function initQA() {
  const overlay = document.getElementById('qaOverlay');
  if (!overlay) return;
  document.addEventListener('click', e => {
    const opener = e.target.closest('[data-open-qa]');
    if (opener) { e.preventDefault(); qaOpen(opener.getAttribute('data-open-qa') || null); }
    const closer = e.target.closest('[data-close-qa]');
    if (closer) { e.preventDefault(); qaClose(); }
  });
  overlay.addEventListener('click', e => { if (e.target === overlay) qaClose(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') qaClose(); });
  overlay.addEventListener('click', e => {
    const opt = e.target.closest('.qa-option');
    if (!opt) return;
    const group = opt.closest('.qa-options');
    group.querySelectorAll('.qa-option').forEach(o => o.classList.remove('selected'));
    opt.classList.add('selected');
    qaState.answers[group.dataset.q] = opt.dataset.value;
    document.querySelector('[data-next]').disabled = !isStepAnswered(qaState.currentStep);
  });
  const nextBtn = document.querySelector('[data-next]');
  const backBtn = document.querySelector('[data-back]');
  if (nextBtn) nextBtn.addEventListener('click', qaNext);
  if (backBtn) backBtn.addEventListener('click', qaBack);
  ['qaName','qaEmail','qaPhone'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => { if (qaState.currentStep === 'contact') document.querySelector('[data-next]').disabled = !isStepAnswered('contact'); });
  });
}

window.initSite = function(opts) {
  const { page = '', heroTransparent = false } = opts || {};
  injectShell(page);
  initStickyNav(heroTransparent);
  initQA();
  if (window.lucide) window.lucide.createIcons();
};
