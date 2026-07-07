/* ============================================================
   Broad Oak Manor — site.js
   Shared shell, sticky nav, Q&A guided helper, tweaks panel.
   ============================================================ */

/* ---------- Tweaks defaults ---------- */
const TWEAK_DEFAULTS = { "hero": "full-bleed", "typeScale": "restrained", "accent": "gold" };
const TWEAK_KEY = 'bom-tweaks-v1';
function loadTweaks() { try { return { ...TWEAK_DEFAULTS, ...JSON.parse(localStorage.getItem(TWEAK_KEY) || '{}') }; } catch { return { ...TWEAK_DEFAULTS }; } }
function saveTweaks(t) { localStorage.setItem(TWEAK_KEY, JSON.stringify(t)); }
function applyTweaks(t) { document.body.setAttribute('data-hero', t.hero); document.body.setAttribute('data-type-scale', t.typeScale); document.body.setAttribute('data-accent', t.accent); }
let TWEAKS = loadTweaks();

/* ---------- Shared HTML templates ---------- */
const utilityHTML = `<div class="utility"><div class="container row"><div class="left"><a href="tel:01992551900"><i data-lucide="phone"></i>01992 551900</a><span class="sep"></span><a href="mailto:info@broadoakmanor.co.uk"><i data-lucide="mail"></i>info@broadoakmanor.co.uk</a></div><div class="right"><a href="events.html"><i data-lucide="calendar-days"></i>Open days</a></div></div></div>`;

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
  return `<div class="nav-wrap" id="navwrap"><nav class="nav"><div class="container row"><a class="nav-logo" href="index.html"><img class="logo-dark" src="assets/logo.png" alt="Broad Oak Manor"/><img class="logo-light" src="assets/logo.png" alt="Broad Oak Manor"/></a><ul class="nav-links">${items.map(i => `<li><a href="${i.href}" class="${i.key === current ? 'current' : ''}">${i.label}</a></li>`).join('')}</ul><div class="nav-right"><a href="#" class="nav-cta" data-open-qa><i data-lucide="message-circle-question"></i><span class="label-full">Find your path</span></a><button class="nav-toggle" type="button" aria-label="Open menu" data-nav-toggle><i data-lucide="menu"></i></button></div></div></nav></div>`;
}

const footerHTML = `<footer class="site"><div class="container"><div class="top"><div class="brand"><img src="assets/logo.png" alt="Broad Oak Manor" class="footer-logo"/><p>A privately-run nursing home and assisted-living community, set in a Queen Anne Grade II listed manor on the outskirts of Hertford.</p><div class="values-strip"><span>Independence</span><span>Individuality</span><span>Improvement</span></div><div class="socials"><a href="https://www.facebook.com/profile.php?id=61559298362401" target="_blank" rel="noopener" aria-label="Facebook"><i data-lucide="facebook"></i></a><a href="https://www.instagram.com/broadoakmanor_/" target="_blank" rel="noopener" aria-label="Instagram"><i data-lucide="instagram"></i></a><a href="https://www.youtube.com/@broadoakmanor9384" target="_blank" rel="noopener" aria-label="YouTube"><i data-lucide="youtube"></i></a></div></div><div><h5>Visit</h5><ul><li><a href="nursing-home.html">Nursing Home</a></li><li><a href="assisted-living.html">Assisted Living</a></li><li><a href="events.html">Events &amp; open days</a></li></ul></div><div><h5>Find out</h5><ul><li><a href="about.html">Our story</a></li><li><a href="stories.html">Resident stories</a></li><li><a href="https://www.cqc.org.uk/location/1-128948967" target="_blank" rel="noopener">CQC report</a></li></ul></div><div><h5>Contact</h5><div class="contact-rows"><div class="row"><i data-lucide="phone"></i><span>01992 551900</span></div><div class="row"><i data-lucide="mail"></i><span>info@broadoakmanor.co.uk</span></div><div class="row"><i data-lucide="map-pin"></i><span>Broad Oak Manor<br/>Bramfield Road<br/>Hertford SG14 2JA</span></div></div></div></div><div class="bottom"><span>&copy; 2026 Broad Oak Manor &middot; Established for over 35 years.</span><div class="links"><a href="#">Privacy</a><a href="#">Cookies</a><a href="#">Accessibility</a></div></div></div></footer>`;

const qaHTML = `<div class="qa-overlay" id="qaOverlay" role="dialog" aria-modal="true"><div class="qa-modal" id="qaModal"><button class="qa-close" data-close-qa aria-label="Close"><i data-lucide="x"></i></button><div class="qa-body"><div class="qa-progress" id="qaProgress"></div><div class="qa-step active" data-step="who"><div class="eyebrow"><span class="num">01</span>Find your path</div><h3 id="qaTitle">Tell us a little — and we'll <em>guide you</em> to the right place.</h3><p class="sub">A few quick questions. No forms, no commitment.</p><div class="qa-options" data-q="who"><button class="qa-option" data-value="family"><span class="check"></span><span class="text"><span class="t">I'm helping a loved one</span><span class="d">Looking at nursing care or assisted living for a parent, partner or relative.</span></span></button><button class="qa-option" data-value="self"><span class="check"></span><span class="text"><span class="t">I'm thinking about my own next move</span><span class="d">A smaller home, fewer worries, support nearby when I want it.</span></span></button><button class="qa-option" data-value="referrer"><span class="check"></span><span class="text"><span class="t">I'm a referrer (NHS, GP, case manager)</span><span class="d">I'm placing someone and need to know what's available.</span></span></button><button class="qa-option" data-value="brochure"><span class="check"></span><span class="text"><span class="t">I'd like a brochure to read at home</span><span class="d">By post or by email — and we'll be in touch if and when you're ready.</span></span></button></div></div><div class="qa-step" data-step="family-type"><div class="eyebrow"><span class="num">02</span>Which kind of care</div><h3>What are you <em>looking at</em> for them?</h3><div class="qa-options" data-q="type"><button class="qa-option" data-value="nursing"><span class="check"></span><span class="text"><span class="t">Nursing care, in the manor</span><span class="d">A private bedroom inside the manor house, with a registered nurse 24/7.</span></span></button><button class="qa-option" data-value="assisted"><span class="check"></span><span class="text"><span class="t">Assisted living, on Broad Oak Lane</span><span class="d">Their own house on the lane, with care on site as much or as little as needed.</span></span></button><button class="qa-option" data-value="unsure"><span class="check"></span><span class="text"><span class="t">I'm not sure which is right</span><span class="d">Help me work it out.</span></span></button></div></div><div class="qa-step" data-step="nursing-needs"><div class="eyebrow"><span class="num">03</span>What care is needed</div><h3>What kind of <em>nursing care</em> are they likely to need?</h3><div class="qa-options" data-q="needs" data-multi="true"><button class="qa-option" data-value="nursing"><span class="check"></span><span class="text"><span class="t">General nursing care</span></span></button><button class="qa-option" data-value="dementia"><span class="check"></span><span class="text"><span class="t">Dementia care</span></span></button><button class="qa-option" data-value="palliative"><span class="check"></span><span class="text"><span class="t">Palliative or end-of-life care</span></span></button><button class="qa-option" data-value="respite"><span class="check"></span><span class="text"><span class="t">Respite or a short stay</span></span></button><button class="qa-option" data-value="unsure"><span class="check"></span><span class="text"><span class="t">Not sure yet</span></span></button></div></div><div class="qa-step" data-step="assisted-level"><div class="eyebrow"><span class="num">03</span>How much support</div><h3>Would you like a <em>care package</em>?</h3><div class="qa-options" data-q="level"><button class="qa-option" data-value="none"><span class="check"></span><span class="text"><span class="t">Just the house, no care for now</span></span></button><button class="qa-option" data-value="low"><span class="check"></span><span class="text"><span class="t">Level One — Home support</span></span></button><button class="qa-option" data-value="medium"><span class="check"></span><span class="text"><span class="t">Level Two — Home support &amp; care</span></span></button><button class="qa-option" data-value="high"><span class="check"></span><span class="text"><span class="t">Level Three — Advanced care</span></span></button><button class="qa-option" data-value="unsure"><span class="check"></span><span class="text"><span class="t">I'd like to talk it through</span></span></button></div></div><div class="qa-step" data-step="living"><div class="eyebrow"><span class="num">02</span>The kind of home</div><h3 id="qaLivingTitle">Which feels closer to what they're <em>looking for</em>?</h3><div class="qa-options" data-q="living"><button class="qa-option" data-value="own-home"><span class="check"></span><span class="text"><span class="t">A home of their own</span><span class="d">Their own house on the lane with care brought in as needed.</span></span></button><button class="qa-option" data-value="supported"><span class="check"></span><span class="text"><span class="t">A fully supported room</span><span class="d">A private bedroom inside the manor, with everything looked after.</span></span></button><button class="qa-option" data-value="unsure"><span class="check"></span><span class="text"><span class="t">Not sure yet</span></span></button></div></div><div class="qa-step" data-step="clinical"><div class="eyebrow"><span class="num">03</span>Level of care</div><h3>How much <em>hands-on care</em> is needed?</h3><div class="qa-options" data-q="clinical"><button class="qa-option" data-value="visiting"><span class="check"></span><span class="text"><span class="t">Occasional or visiting care</span></span></button><button class="qa-option" data-value="daily"><span class="check"></span><span class="text"><span class="t">Regular care, day and night</span></span></button><button class="qa-option" data-value="continuous"><span class="check"></span><span class="text"><span class="t">A registered nurse on hand at all times</span></span></button><button class="qa-option" data-value="unsure"><span class="check"></span><span class="text"><span class="t">Not sure — it's complex</span></span></button></div></div><div class="qa-step" data-step="recommend"><div class="eyebrow"><span class="num">·</span>Our suggestion</div><h3>Here's what we'd <em>suggest</em>.</h3><p class="sub" id="qaRecBody"></p><a class="qa-rec" id="qaRecLink" href="#"><span class="qa-rec-tag" id="qaRecTag"></span><span class="qa-rec-name" id="qaRecName"></span><ul class="qa-rec-points" id="qaRecPoints"></ul><span class="qa-rec-cta"><span id="qaRecCtaLabel">See more</span><i data-lucide="arrow-right"></i></span></a><p class="qa-rec-note">This is only a guide. If you'd rather talk, <a href="contact.html">get in touch</a>.</p></div><div class="qa-step" data-step="when"><div class="eyebrow"><span class="num">04</span>How soon</div><h3>When are you hoping to <em>arrange</em> this?</h3><div class="qa-options" data-q="when"><button class="qa-option" data-value="immediate"><span class="check"></span><span class="text"><span class="t">Within the next week</span></span></button><button class="qa-option" data-value="soon"><span class="check"></span><span class="text"><span class="t">In the next month</span></span></button><button class="qa-option" data-value="planning"><span class="check"></span><span class="text"><span class="t">In the next few months</span></span></button><button class="qa-option" data-value="unsure"><span class="check"></span><span class="text"><span class="t">I genuinely don't know yet</span></span></button></div></div><div class="qa-step" data-step="service-referrer"><div class="eyebrow"><span class="num">02</span>What you need</div><h3>What kind of placement are you looking <em>to make</em>?</h3><div class="qa-options" data-q="service"><button class="qa-option" data-value="nursing-perm"><span class="check"></span><span class="text"><span class="t">Permanent nursing placement</span></span></button><button class="qa-option" data-value="nursing-respite"><span class="check"></span><span class="text"><span class="t">Respite or short stay</span></span></button><button class="qa-option" data-value="discharge"><span class="check"></span><span class="text"><span class="t">Hospital discharge</span></span></button><button class="qa-option" data-value="other-r"><span class="check"></span><span class="text"><span class="t">Something else</span></span></button></div></div><div class="qa-step" data-step="brochure-which"><div class="eyebrow"><span class="num">02</span>Which brochure</div><h3>Which <em>brochure</em> would you like?</h3><div class="qa-options" data-q="brochureWhich" data-multi="true"><button class="qa-option" data-value="nursing"><span class="check"></span><span class="text"><span class="t">Nursing Home brochure</span></span></button><button class="qa-option" data-value="assisted"><span class="check"></span><span class="text"><span class="t">Assisted Living brochure</span></span></button><button class="qa-option" data-value="both"><span class="check"></span><span class="text"><span class="t">Both, please</span></span></button></div></div><div class="qa-step" data-step="contact"><div class="eyebrow"><span class="num">05</span>How to reach you</div><h3>How can we <em>get back to you</em>?</h3><div class="qa-grid-2"><input class="qa-input" type="text" placeholder="Your name" id="qaName"/><input class="qa-input" type="text" placeholder="Phone (optional)" id="qaPhone"/></div><input class="qa-input" type="email" placeholder="Email" id="qaEmail" style="margin-bottom:16px;"/><input class="qa-input" type="text" placeholder="Postal address (for printed brochure)" id="qaAddress" style="margin-bottom:16px;"/><textarea class="qa-input" rows="3" placeholder="Anything else? (optional)" id="qaNotes" style="resize:vertical;"></textarea></div><div class="qa-step" data-step="result"><div class="qa-result"><div class="icon"><i data-lucide="check"></i></div><h3 id="qaResultTitle">Thank you — we'll be <em>in touch</em>.</h3><p id="qaResultBody">A member of our team will reply as soon as they can.</p><div class="qa-actions" id="qaResultActions"></div></div></div></div><div class="qa-footer" id="qaFooter"><button type="button" class="qa-back" data-back hidden><i data-lucide="arrow-left"></i>Back</button><span></span><button type="button" class="qa-next" data-next disabled>Continue<i data-lucide="arrow-right"></i></button></div></div></div>`;

const tweaksHTML = `<div class="tweaks-panel" id="tweaksPanel"><h4>Tweaks <span class="close" data-close-tweaks>×</span></h4><div class="tweaks-group"><div class="label">Hero treatment</div><div class="tweaks-options" data-tweak="hero"><button data-value="full-bleed">Full-bleed</button><button data-value="split">Split</button><button data-value="editorial">Editorial</button></div></div><div class="tweaks-group"><div class="label">Type scale</div><div class="tweaks-options two" data-tweak="typeScale"><button data-value="restrained">Restrained</button><button data-value="dramatic">Dramatic</button></div></div><div class="tweaks-group"><div class="label">Accent palette</div><div class="tweaks-options" data-tweak="accent"><button data-value="gold"><span class="swatch" style="background:#b08c4a"></span>Gold</button><button data-value="walnut"><span class="swatch" style="background:#6e5340"></span>Walnut</button><button data-value="forest"><span class="swatch" style="background:#3d5a3f"></span>Forest</button></div></div></div>`;

function injectShell(currentPage) {
  const top = document.createElement('div');
  top.innerHTML = utilityHTML + navHTML(currentPage);
  const frag = document.createDocumentFragment();
  while (top.firstChild) frag.appendChild(top.firstChild);
  document.body.insertBefore(frag, document.body.firstChild);
  const bottom = document.createElement('div');
  bottom.innerHTML = footerHTML + qaHTML + tweaksHTML;
  while (bottom.firstChild) document.body.appendChild(bottom.firstChild);
  applyTweaks(TWEAKS);
}

function initStickyNav(transparent) {
  const wrap = document.getElementById('navwrap');
  if (!wrap) return;
  if (transparent) wrap.classList.add('transparent');
  const update = () => { const y = window.scrollY; if (y > 40) wrap.classList.add('scrolled'); else wrap.classList.remove('scrolled'); };
  update();
  window.addEventListener('scroll', update, { passive: true });
  const toggle = wrap.querySelector('[data-nav-toggle]');
  const links = wrap.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => { links.classList.toggle('open'); });
    links.addEventListener('click', e => { if (e.target.closest('a')) links.classList.remove('open'); });
  }
}

const qaState = { path: [], answers: {}, currentStep: 'who', context: null };

function qaComputePath(answers, context) {
  const who = answers.who;
  if (!who) return ['who'];
  if (who === 'family' || who === 'self') {
    if (context === 'nursing')  return ['who', 'nursing-needs', 'when', 'contact', 'result'];
    if (context === 'assisted') return ['who', 'assisted-level', 'when', 'contact', 'result'];
    return ['who', 'living', 'clinical', 'recommend'];
  }
  if (who === 'referrer')  return ['who', 'service-referrer', 'when', 'contact', 'result'];
  if (who === 'brochure')  return ['who', 'brochure-which', 'contact', 'result'];
  return ['who', 'contact', 'result'];
}

function qaOpen(context) {
  const o = document.getElementById('qaOverlay');
  o.classList.add('open');
  document.body.style.overflow = 'hidden';
  resetQA(context);
  if (window.lucide) window.lucide.createIcons();
}
function qaClose() {
  document.getElementById('qaOverlay').classList.remove('open');
  document.body.style.overflow = '';
  if (qaState.redirectTimer) { clearTimeout(qaState.redirectTimer); qaState.redirectTimer = null; }
}
function resetQA(context) {
  qaState.path = ['who'];
  qaState.answers = {};
  qaState.currentStep = 'who';
  qaState.context = context || null;
  if (context) qaState.answers.type = context;
  document.querySelectorAll('.qa-option.selected').forEach(o => o.classList.remove('selected'));
  ['qaName','qaEmail','qaPhone','qaAddress','qaNotes'].forEach(id => { const el = document.getElementById(id); if (el) el.value=''; });
  renderQAStep();
}
function renderQAStep() {
  document.querySelectorAll('.qa-step').forEach(s => s.classList.toggle('active', s.dataset.step === qaState.currentStep));
  const isResult = qaState.currentStep === 'result';
  const isRecommend = qaState.currentStep === 'recommend';
  const projected = qaComputePath(qaState.answers, qaState.context);
  const visibleSteps = projected.filter(s => s !== 'result' && s !== 'recommend');
  const currentIdx = visibleSteps.indexOf(qaState.currentStep);
  const progress = document.getElementById('qaProgress');
  if (progress) {
    progress.innerHTML = '';
    visibleSteps.forEach((s, i) => {
      const d = document.createElement('div');
      d.className = 'dot' + (i < currentIdx ? ' done' : i === currentIdx ? ' current' : '');
      progress.appendChild(d);
    });
    progress.style.display = (isResult || isRecommend) ? 'none' : 'flex';
  }
  const footer = document.getElementById('qaFooter');
  const back = footer.querySelector('[data-back]');
  const next = footer.querySelector('[data-next]');
  if (isResult) {
    footer.style.display = 'none';
  } else {
    footer.style.display = 'flex';
    back.hidden = qaState.path.length <= 1;
    if (isRecommend) { next.style.display = 'none'; } else {
      next.style.display = '';
      next.disabled = !isStepAnswered(qaState.currentStep);
      next.innerHTML = qaState.currentStep === 'contact' ? 'Send enquiry<i data-lucide="send"></i>' : 'Continue<i data-lucide="arrow-right"></i>';
    }
  }
  if (window.lucide) window.lucide.createIcons();
}
function isStepAnswered(step) {
  if (step === 'contact') {
    const name = document.getElementById('qaName')?.value.trim();
    const email = document.getElementById('qaEmail')?.value.trim();
    return name && email && /.+@.+\..+/.test(email);
  }
  const stepEl = document.querySelector(`.qa-step[data-step="${step}"]`);
  if (!stepEl) return true;
  const optsEl = stepEl.querySelector('.qa-options');
  if (!optsEl) return true;
  const q = optsEl.dataset.q;
  const v = qaState.answers[q];
  if (optsEl.dataset.multi === 'true') return Array.isArray(v) && v.length > 0;
  return !!v;
}
function qaNext() {
  const path = qaComputePath(qaState.answers, qaState.context);
  const idx = path.indexOf(qaState.currentStep);
  const nextStep = path[idx + 1];
  if (!nextStep) return;
  if (nextStep === 'result') qaSubmitEnquiry();
  qaState.path.push(nextStep);
  qaState.currentStep = nextStep;
  renderQAStep();
  if (nextStep === 'recommend') buildRecommend();
  if (nextStep === 'result') buildResult();
  document.getElementById('qaModal').scrollTop = 0;
}
function qaBack() {
  qaState.path.pop();
  qaState.currentStep = qaState.path[qaState.path.length - 1];
  renderQAStep();
}

const ENQUIRY_EMAIL = 'info@broadoakmanor.co.uk';
const WEB3FORMS_KEY = 'b18e3f57-a85b-43dc-8e6c-ca84689212be';

function qaSubmitEnquiry() {
  const val = id => (document.getElementById(id)?.value || '').trim();
  const name = val('qaName'), email = val('qaEmail'), phone = val('qaPhone');
  const a = qaState.answers;
  const type = a.type || qaState.context;
  const lines = [['Enquiry type', a.who], ['Looking for', type], ['Name', name]];
  if (phone) lines.push(['Phone', phone]);
  lines.push(['Email', email]);
  if (val('qaNotes')) lines.push(['Notes', val('qaNotes')]);
  const subject = `Website enquiry — ${type || a.who}${name ? ' — ' + name : ''}`;
  const bodyText = 'New enquiry from the Broad Oak Manor website\n\n' + lines.map(([k,v]) => `${k}: ${v}`).join('\n');
  if (WEB3FORMS_KEY) {
    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ access_key: WEB3FORMS_KEY, subject, from_name: 'Broad Oak Manor website', replyto: email, message: bodyText })
    }).catch(() => {});
    return;
  }
  try { window.location.href = 'mailto:' + ENQUIRY_EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(bodyText); } catch(e) {}
}

function qaGuidedRecommendation() {
  const a = qaState.answers;
  if (a.clinical === 'continuous') return 'nursing';
  if (a.living === 'supported') return 'nursing';
  return 'assisted';
}
function buildRecommend() {
  const rec = qaGuidedRecommendation();
  qaState.answers.type = rec;
  const a = qaState.answers;
  const self = a.who === 'self';
  const their = self ? 'your' : 'their';
  const tag = document.getElementById('qaRecTag');
  const name = document.getElementById('qaRecName');
  const body = document.getElementById('qaRecBody');
  const points = document.getElementById('qaRecPoints');
  const link = document.getElementById('qaRecLink');
  const ctaLabel = document.getElementById('qaRecCtaLabel');
  if (rec === 'nursing') {
    tag.textContent = 'Nursing Home · in the manor';
    name.innerHTML = 'Skilled <em>nursing care</em>, in the manor';
    body.textContent = "Based on what you've described, a place within the manor with a nurse always on site is what we'd suggest.";
    points.innerHTML = ['A private bedroom inside the Queen Anne manor','A registered nurse on the premises, 24 hours a day','Dementia, palliative and respite care','All meals, company and the gardens, taken care of'].map(t => `<li><i data-lucide="check"></i><span>${t}</span></li>`).join('');
    link.setAttribute('href', 'nursing-home.html');
    ctaLabel.textContent = 'See the Nursing Home';
  } else {
    tag.textContent = 'Assisted Living · Broad Oak Lane';
    name.innerHTML = self ? 'Your <em>own home</em> on Broad Oak Lane' : 'A <em>home of their own</em> on Broad Oak Lane';
    body.textContent = "Based on what you've described, a house of " + their + " own with support brought in is what we'd suggest.";
    points.innerHTML = [self ? 'Your own house — front door, kitchen and garden' : 'A house of their own — front door, kitchen and garden','Care from 1 to 24 hours a day','Living with medical conditions, with GP and community nurse visits','Care that grows without having to move'].map(t => `<li><i data-lucide="check"></i><span>${t}</span></li>`).join('');
    link.setAttribute('href', 'assisted-living.html');
    ctaLabel.textContent = 'See Broad Oak Lane';
  }
  if (window.lucide) window.lucide.createIcons();
}
function buildResult() {
  const a = qaState.answers;
  const type = a.type || qaState.context;
  document.getElementById('qaResultTitle').innerHTML = "Thank you — we'll be <em>in touch</em>.";
  document.getElementById('qaResultBody').textContent = "A member of our management team will be in touch as soon as they can.";
  const targetUrl = (type === 'nursing') ? 'nursing-home.html' : 'assisted-living.html';
  const targetLabel = (type === 'nursing') ? 'the Nursing Home' : 'Assisted Living';
  const actsEl = document.getElementById('qaResultActions');
  actsEl.innerHTML = `<div class="qa-redirect"><div class="qa-redirect-text">Taking you to <em>${targetLabel}</em>&hellip;</div><div class="qa-redirect-bar"><div class="qa-redirect-fill"></div></div></div><div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:8px;"><a href="${targetUrl}" class="btn primary">Go now</a><button data-close-qa class="btn ghost">Stay here</button></div>`;
  qaState.redirectTimer = setTimeout(() => { window.location.href = targetUrl; }, 4200);
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
    const q = group.dataset.q;
    const multi = group.dataset.multi === 'true';
    if (multi) {
      opt.classList.toggle('selected');
      qaState.answers[q] = [...group.querySelectorAll('.qa-option.selected')].map(o => o.dataset.value);
    } else {
      group.querySelectorAll('.qa-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      qaState.answers[q] = opt.dataset.value;
    }
    document.querySelector('[data-next]').disabled = !isStepAnswered(qaState.currentStep);
  });
  document.querySelector('[data-next]').addEventListener('click', qaNext);
  document.querySelector('[data-back]').addEventListener('click', qaBack);
  ['qaName','qaEmail'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => { if (qaState.currentStep === 'contact') document.querySelector('[data-next]').disabled = !isStepAnswered('contact'); });
  });
}

function initTweaks() {
  const panel = document.getElementById('tweaksPanel');
  if (!panel) return;
  function syncTweakUI() {
    panel.querySelectorAll('.tweaks-options').forEach(group => {
      const k = group.dataset.tweak;
      group.querySelectorAll('button').forEach(b => { b.classList.toggle('active', b.dataset.value === TWEAKS[k]); });
    });
  }
  syncTweakUI();
  panel.addEventListener('click', e => {
    const btn = e.target.closest('button[data-value]');
    if (btn) { const k = btn.parentElement.dataset.tweak; TWEAKS[k] = btn.dataset.value; saveTweaks(TWEAKS); applyTweaks(TWEAKS); syncTweakUI(); }
    if (e.target.closest('[data-close-tweaks]')) panel.classList.remove('open');
  });
  window.addEventListener('message', e => {
    if (!e?.data?.type) return;
    if (e.data.type === '__activate_edit_mode') panel.classList.add('open');
    if (e.data.type === '__deactivate_edit_mode') panel.classList.remove('open');
  });
}

window.initSite = function (opts) {
  const { page = '', heroTransparent = false } = opts || {};
  injectShell(page);
  initStickyNav(heroTransparent);
  initQA();
  initTweaks();
  if (window.lucide) window.lucide.createIcons();
};