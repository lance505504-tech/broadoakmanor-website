/*
 * ╔══════════════════════════════════════════════════════╗
 *   CMM Widgets — cmm-widgets-2405-va.js
 *   Standalone content widgets for any webpage.
 *   Reads from a Supabase backend.
 *   Zero opinions on colour or typography —
 *   inherits host page design system.
 *
 *   v2 — May 2026 — Generic platform release
 *   Backward compatible with Cape31 v1 deployments.
 * ╚══════════════════════════════════════════════════════╝
 *
 *  DEVELOPER INSTALL — add once before </body>:
 *
 *    <script
 *      src="cmm-widgets.js"
 *      data-url="https://xxxx.supabase.co"
 *      data-key="your-anon-key"
 *      data-region="uk"
 *      data-config='{"region":false,"tables":{"events":"open_days"}}'
 *    ></script>
 *
 *  Then place widget elements anywhere in your HTML:
 *
 *    <cmm-news></cmm-news>
 *    <cmm-news limit="3"></cmm-news>
 *
 *    <cmm-gallery></cmm-gallery>
 *    <cmm-gallery columns="3" limit="9"></cmm-gallery>
 *
 *    <cmm-events upcoming="5"></cmm-events>
 *
 *    <cmm-notices></cmm-notices>
 *
 *    <cmm-video limit="6" columns="3"></cmm-video>
 *
 *    <cmm-text slot="hero-headline"></cmm-text>
 *
 *    <cmm-qa categories="Health,Practical,Costs"></cmm-qa>
 *
 *    <cmm-capture offer="info-pack" fields="name,organisation,email"></cmm-capture>
 *
 *  data-config options:
 *    region      — false to disable region filtering entirely
 *    tables      — map widget names to custom table names
 *    roles       — custom notice role taxonomy
 *    events      — yearFilter (bool), badges (array)
 *
 *  Widget attributes:
 *    limit       — max items to show (default varies per widget)
 *    columns     — gallery/video columns on desktop (default 3)
 *    upcoming    — events: show only future events (default true)
 *    compact     — news/video: condensed display
 *    data-region — override global region for this widget instance
 */

(function () {

  /* ── Read config from script tag ──────────────────── */
  const _selfScript = document.currentScript;

  function _getScript() {
    return _selfScript || document.querySelector('script[data-url]');
  }

  function _getCfg() {
    var s = _getScript();
    var cfg = {
      url:    (s && s.dataset && s.dataset.url)    || '',
      key:    (s && s.dataset && s.dataset.key)    || '',
      region: (s && s.dataset && s.dataset.region) || 'uk',
      config: {}
    };
    // Parse data-config JSON block if present
    if (s && s.dataset && s.dataset.config) {
      try { cfg.config = JSON.parse(s.dataset.config); } catch(e) {
        console.warn('[CMM Widgets] Could not parse data-config JSON:', e.message);
      }
    }
    return cfg;
  }

  var _raw     = _getCfg();
  var SUPA_URL = window.CMM_SUPA_URL    || _raw.url    || '';
  var SUPA_KEY = window.CMM_SUPA_KEY    || _raw.key    || '';

  // Region: false = disabled, string = active filter value
  // Priority: window global > data-config > data-region attr > default 'uk'
  var _cfgRegion = _raw.config.region;
  var REGION;
  if (window.CMM_SUPA_REGION !== undefined) {
    REGION = window.CMM_SUPA_REGION;
  } else if (_cfgRegion === false) {
    REGION = false;
  } else {
    REGION = _cfgRegion || _raw.region || 'uk';
  }

  // Table name map — defaults match Cape31 v1 for backward compatibility
  var TABLES = Object.assign({
    news:     'news',
    gallery:  'gallery',
    events:   'regattas',
    notices:  'notices',
    videos:   'videos',
    page_text:'page_text',
    qa:       'qa_entries',
    capture:  'email_captures'
  }, (_raw.config.tables || {}));

  // Role taxonomy — defaults are Cape31 sailing roles (backward compatible)
  // Each key maps to { label, colour }
  var _cfgRoles = _raw.config.roles || {};
  var ROLE_COLOURS = Object.assign({
    ro: '#e67e22',
    cs: '#00b89c',
    to: '#a569bd',
    ex: '#c0392b',
    ad: '#7a8fa3'
  }, Object.fromEntries(Object.entries(_cfgRoles).map(([k,v]) => [k, v.colour])));
  var ROLE_LABELS = Object.assign({
    ro: 'Race Officer',
    cs: 'Class Secretary',
    to: 'Technical Office',
    ex: 'ExCom',
    ad: 'Admin'
  }, Object.fromEntries(Object.entries(_cfgRoles).map(([k,v]) => [k, v.label])));

  // Events config
  var _cfgEvents   = _raw.config.events || {};
  var EVT_YEAR_FILTER = _cfgEvents.yearFilter !== false; // default true (Cape31 compatible)
  var EVT_BADGES      = _cfgEvents.badges || null;       // null = use legacy Cape31 badge logic

  if (!SUPA_URL || !SUPA_KEY) {
    console.warn('[CMM Widgets] No Supabase config found. Set data-url and data-key on the script tag.');
  }

  /* ── Region query helper ──────────────────────────── */
  // Returns the region filter string to append to a query, or '' if region disabled
  function regionFilter(instanceRegion) {
    var r = (instanceRegion !== undefined) ? instanceRegion : REGION;
    if (r === false || r === 'false' || r === '') return '';
    return '&region=eq.' + r;
  }

  /* ── Supabase fetch helper ────────────────────────── */
  async function supa(path) {
    try {
      const res = await fetch(SUPA_URL + '/rest/v1/' + path, {
        headers: {
          apikey: SUPA_KEY,
          Authorization: 'Bearer ' + SUPA_KEY
        }
      });
      return res.ok ? await res.json() : [];
    } catch (e) {
      return [];
    }
  }

  /* ── Escape helpers ───────────────────────────────── */
  function esc(s) {
    return (s || '')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;');
  }
  function escAttr(s) {
    return (s || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
  }

  /* ── Date helpers ─────────────────────────────────── */
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun',
                  'Jul','Aug','Sep','Oct','Nov','Dec'];

  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return MONTHS[d.getMonth()] + ' ' + d.getDate() + ' · ' + d.getFullYear();
  }

  function fmtDateRange(start, end) {
    if (!start) return '';
    const s = new Date(start);
    const sm = MONTHS[s.getMonth()];
    const sd = s.getDate();
    const yr = s.getFullYear();
    if (!end || end === start) return `${sm} ${sd} · ${yr}`;
    const e  = new Date(end);
    const em = MONTHS[e.getMonth()];
    const ed = e.getDate();
    if (sm === em) return `${sm} ${sd}–${ed} · ${yr}`;
    return `${sm} ${sd} – ${em} ${ed} · ${yr}`;
  }

  /* ── Inject shared base styles once ──────────────── */
  let _stylesInjected = false;
  function injectBaseStyles() {
    if (_stylesInjected) return;
    _stylesInjected = true;

    const style = document.createElement('style');
    style.id = 'cmm-widget-styles';
    style.textContent = `

/* ── Reset for all CMM widgets ─────────────────────── */
cmm-news, cmm-gallery, cmm-events, cmm-notices, cmm-video, cmm-text, cmm-qa, cmm-capture {
  display: block;
  font-family: inherit;
  color: inherit;
  line-height: inherit;
}

/* ── Loading state ──────────────────────────────────── */
.cmm-loading {
  padding: 2em 0;
  text-align: center;
  opacity: 0.4;
  font-size: 0.85em;
  letter-spacing: 0.1em;
}

/* ── Empty state ────────────────────────────────────── */
.cmm-empty {
  padding: 2em 0;
  opacity: 0.4;
  font-size: 0.85em;
}

/* ── Accent variable fallback ───────────────────────── */
cmm-news, cmm-gallery, cmm-events, cmm-notices, cmm-video, cmm-text, cmm-qa, cmm-capture {
  --cmm-accent: var(--accent, var(--primary, #1a1a1a));
  --cmm-accent-faint: color-mix(in srgb, var(--cmm-accent) 10%, transparent);
  --cmm-surface: var(--surface, rgba(0,0,0,0.04));
  --cmm-border: var(--border-color, rgba(0,0,0,0.1));
  --cmm-mute: var(--text-muted, rgba(0,0,0,0.45));
  --cmm-radius: var(--radius, 4px);
}

/* ═══════════════════════════════════════════════════════
   NEWS WIDGET
═══════════════════════════════════════════════════════ */

.cmm-lead {
  display: block;
  position: relative;
  overflow: hidden;
  border-radius: var(--cmm-radius);
  cursor: pointer;
  text-decoration: none;
  color: inherit;
  margin-bottom: 3px;
  background: var(--cmm-surface);
}
.cmm-lead-has-img {
  aspect-ratio: 16 / 7;
  min-height: 220px;
  max-height: 520px;
}
.cmm-lead-no-img { padding: 2em; }
.cmm-lead-img {
  width: 100%; height: 100%;
  object-fit: cover; display: block;
  transition: transform 0.4s ease;
}
.cmm-lead:hover .cmm-lead-img { transform: scale(1.02); }
.cmm-lead-overlay {
  position: absolute; inset: 0;
  background: linear-gradient(to right,rgba(0,0,0,0.82) 0%,rgba(0,0,0,0.45) 55%,rgba(0,0,0,0.08) 100%);
}
.cmm-lead-body {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; justify-content: flex-end;
  padding: clamp(1rem, 4vw, 3rem);
}
.cmm-lead-no-img .cmm-lead-body { position: static; padding: 0; }
.cmm-lead-eyebrow { display: flex; align-items: center; gap: 0.5em; margin-bottom: 0.5em; }
.cmm-lead-tag {
  font-size: 0.7em; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase;
  padding: 0.25em 0.6em; border-radius: 2px;
  background: var(--cmm-accent-faint); color: var(--cmm-accent); border: 1px solid var(--cmm-accent);
}
.cmm-lead-has-img .cmm-lead-tag { background: rgba(255,255,255,0.15); color:#fff; border-color:rgba(255,255,255,0.3); }
.cmm-lead-date { font-size: 0.75em; opacity: 0.55; }
.cmm-lead-has-img .cmm-lead-date { color:#fff; opacity:0.6; }
.cmm-lead-headline {
  font-size: clamp(1.4rem, 3.5vw, 2.6rem); font-weight: 700; line-height: 1.1;
  margin-bottom: 0.4em; max-width: 22ch;
}
.cmm-lead-has-img .cmm-lead-headline { color:#fff; }
.cmm-lead-standfirst {
  font-size: clamp(0.85rem, 1.5vw, 1rem); opacity: 0.75; max-width: 52ch;
  line-height: 1.6; margin-bottom: 0.8em;
}
.cmm-lead-has-img .cmm-lead-standfirst { color:#fff; opacity:0.8; }
.cmm-lead-cta {
  display: inline-flex; align-items: center; gap: 0.4em;
  font-size: 0.75em; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--cmm-accent); opacity: 0.9; transition: opacity 0.2s;
}
.cmm-lead-has-img .cmm-lead-cta { color:#fff; }
.cmm-lead:hover .cmm-lead-cta { opacity:1; }

.cmm-cards { display: grid; gap: 3px; margin-top: 3px; }
.cmm-cards-1 { grid-template-columns: 1fr; }
.cmm-cards-2 { grid-template-columns: 1fr 1fr; }
.cmm-cards-3 { grid-template-columns: 1fr 1fr 1fr; }
.cmm-cards-4 { grid-template-columns: 1fr 1fr; }
.cmm-card { background: var(--cmm-surface); border-radius: var(--cmm-radius); overflow: hidden; cursor: pointer; transition: opacity 0.2s; }
.cmm-card:hover { opacity: 0.85; }
.cmm-card-img { width: 100%; aspect-ratio: 3/2; object-fit: cover; display: block; }
.cmm-card-body { padding: 0.85em 1em 1em; }
.cmm-card-meta { display: flex; align-items: center; gap: 0.5em; margin-bottom: 0.35em; }
.cmm-card-tag { font-size: 0.65em; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: var(--cmm-accent); }
.cmm-card-date { font-size: 0.7em; opacity: 0.5; }
.cmm-card-title { font-size: 0.95em; font-weight: 600; line-height: 1.3; margin-bottom: 0.3em; }
.cmm-card-summary { font-size: 0.8em; opacity: 0.65; line-height: 1.55; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; }
.cmm-compact .cmm-lead { display: none; }
@media (max-width: 640px) {
  .cmm-cards-2,.cmm-cards-3,.cmm-cards-4 { grid-template-columns: 1fr; }
  .cmm-lead-has-img { aspect-ratio: 4/3; }
}

/* ═══════════════════════════════════════════════════════
   STORY PANEL
═══════════════════════════════════════════════════════ */
#cmm-panel-bg {
  position:fixed; inset:0; background:rgba(0,0,0,0.72); z-index:9000;
  display:none; align-items:flex-start; justify-content:flex-end;
}
#cmm-panel-bg.cmm-open { display:flex; }
#cmm-panel {
  width:min(680px,100vw); height:100dvh; overflow-y:auto;
  background:#fff; color:#1a1a1a; border-left:1px solid rgba(0,0,0,0.12);
  display:flex; flex-direction:column; animation:cmmPanelIn 0.28s ease;
}
@keyframes cmmPanelIn { from{transform:translateX(100%)} to{transform:none} }
#cmm-panel-head {
  padding:1.5em 1.75em 1.25em; border-bottom:1px solid rgba(0,0,0,0.08);
  position:sticky; top:0; background:#fff; z-index:1;
  display:flex; align-items:flex-start; gap:1em;
}
#cmm-panel-titles { flex:1; min-width:0; }
#cmm-panel-tag { display:inline-block; font-size:0.65em; font-weight:700; letter-spacing:0.2em; text-transform:uppercase; padding:0.25em 0.6em; border-radius:2px; margin-bottom:0.5em; background:rgba(0,0,0,0.06); color:rgba(0,0,0,0.5); }
#cmm-panel-headline { font-size:clamp(1.2rem,2.5vw,1.8rem); font-weight:700; line-height:1.15; margin-bottom:0.4em; }
#cmm-panel-standfirst { font-size:0.95em; opacity:0.65; line-height:1.65; }
#cmm-panel-close { background:none; border:1px solid rgba(0,0,0,0.15); color:rgba(0,0,0,0.45); width:2em; height:2em; border-radius:50%; cursor:pointer; font-size:1em; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:all 0.18s; margin-top:0.25em; }
#cmm-panel-close:hover { border-color:rgba(0,0,0,0.35); color:#1a1a1a; }
#cmm-panel-img { width:100%; max-height:320px; object-fit:cover; display:block; }
#cmm-panel-body { padding:1.5em 1.75em 2em; flex:1; }
#cmm-panel-copy { font-size:0.95em; line-height:1.85; opacity:0.85; }
#cmm-panel-copy p { margin-bottom:1em; }
#cmm-panel-copy ul,#cmm-panel-copy ol { padding-left:1.25em; margin-bottom:1em; }
#cmm-panel-copy li { margin-bottom:0.35em; }
#cmm-panel-meta { font-size:0.78em; opacity:0.4; padding-top:1.25em; border-top:1px solid rgba(0,0,0,0.08); margin-top:1em; }
#cmm-panel-ext { display:inline-flex; align-items:center; gap:0.4em; margin-top:1.25em; font-size:0.8em; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; text-decoration:none; color:inherit; border-bottom:2px solid currentColor; padding-bottom:2px; transition:opacity 0.18s; }
#cmm-panel-ext:hover { opacity:0.65; }

/* ═══════════════════════════════════════════════════════
   GALLERY WIDGET
═══════════════════════════════════════════════════════ */
.cmm-gallery-grid { display:grid; gap:4px; }
.cmm-gal-item { position:relative; overflow:hidden; border-radius:var(--cmm-radius); background:var(--cmm-surface); aspect-ratio:3/2; cursor:pointer; }
.cmm-gal-item.cmm-gal-wide { grid-column:span 2; aspect-ratio:16/7; }
.cmm-gal-item img { width:100%; height:100%; object-fit:cover; display:block; transition:transform 0.35s ease; }
.cmm-gal-item:hover img { transform:scale(1.04); }
.cmm-gal-overlay { position:absolute; inset:0; background:linear-gradient(to top,rgba(0,0,0,0.7) 0%,transparent 55%); opacity:0; transition:opacity 0.25s; display:flex; flex-direction:column; justify-content:flex-end; padding:0.75em; }
.cmm-gal-item:hover .cmm-gal-overlay { opacity:1; }
.cmm-gal-cap { font-size:0.78em; color:#fff; line-height:1.4; margin-bottom:0.2em; }
.cmm-gal-credit { font-size:0.68em; color:rgba(255,255,255,0.55); }
#cmm-lb { display:none; position:fixed; inset:0; z-index:9500; background:rgba(0,0,0,0.95); align-items:center; justify-content:center; flex-direction:column; }
#cmm-lb.cmm-open { display:flex; }
#cmm-lb-img { max-width:92vw; max-height:82vh; object-fit:contain; border-radius:2px; }
#cmm-lb-meta { padding:0.75em 0 0; text-align:center; color:rgba(255,255,255,0.6); font-size:0.82em; max-width:52ch; }
#cmm-lb-close { position:fixed; top:1rem; right:1.25rem; background:none; border:none; color:rgba(255,255,255,0.5); font-size:1.75rem; cursor:pointer; line-height:1; transition:color 0.18s; }
#cmm-lb-close:hover { color:#fff; }
@media (max-width:640px) { .cmm-gal-item.cmm-gal-wide { grid-column:span 1; aspect-ratio:3/2; } }

/* ═══════════════════════════════════════════════════════
   EVENTS WIDGET
═══════════════════════════════════════════════════════ */
.cmm-event-list { display:flex; flex-direction:column; gap:2px; }
.cmm-event-item { display:flex; align-items:stretch; gap:1em; background:var(--cmm-surface); border-radius:var(--cmm-radius); overflow:hidden; padding:1em 1.1em; }
.cmm-event-date-block { flex-shrink:0; display:flex; flex-direction:column; align-items:center; justify-content:center; min-width:3em; text-align:center; }
.cmm-event-day { font-size:1.75em; font-weight:700; line-height:1; }
.cmm-event-mon { font-size:0.7em; font-weight:600; letter-spacing:0.1em; text-transform:uppercase; opacity:0.5; margin-top:0.2em; }
.cmm-event-divider { width:1px; background:var(--cmm-border); flex-shrink:0; align-self:stretch; }
.cmm-event-body { flex:1; min-width:0; }
.cmm-event-name { font-size:0.95em; font-weight:600; margin-bottom:0.2em; }
.cmm-event-meta { font-size:0.78em; opacity:0.5; display:flex; gap:0.75em; flex-wrap:wrap; }
.cmm-event-badge { font-size:0.65em; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; padding:0.2em 0.6em; border-radius:20px; background:var(--cmm-accent-faint); color:var(--cmm-accent); align-self:center; flex-shrink:0; }

/* ═══════════════════════════════════════════════════════
   NOTICES WIDGET
═══════════════════════════════════════════════════════ */
.cmm-notice-list { display:flex; flex-direction:column; gap:2px; }
.cmm-notice-item { display:flex; align-items:flex-start; gap:0.75em; padding:0.75em 1em; background:var(--cmm-surface); border-radius:var(--cmm-radius); border-left:3px solid var(--cmm-border); }
.cmm-notice-role { font-size:0.65em; font-weight:700; letter-spacing:0.14em; text-transform:uppercase; padding:0.25em 0.6em; border-radius:2px; white-space:nowrap; flex-shrink:0; margin-top:0.1em; }
.cmm-notice-text { flex:1; font-size:0.88em; line-height:1.5; opacity:0.85; }
.cmm-notice-date { font-size:0.7em; opacity:0.4; white-space:nowrap; flex-shrink:0; }
@media (max-width:480px) { .cmm-notice-date { display:none; } }

/* ═══════════════════════════════════════════════════════
   VIDEO WIDGET
═══════════════════════════════════════════════════════ */
.cmm-video-grid { display:grid; gap:4px; }
.cmm-video-item { cursor:pointer; border-radius:var(--cmm-radius); overflow:hidden; background:var(--cmm-surface); transition:opacity 0.2s; }
.cmm-video-item:hover { opacity:0.85; }
.cmm-video-thumb { position:relative; aspect-ratio:16/9; background:rgba(0,0,0,0.08); overflow:hidden; }
.cmm-video-thumb img { width:100%; height:100%; object-fit:cover; display:block; transition:transform 0.35s ease; }
.cmm-video-item:hover .cmm-video-thumb img { transform:scale(1.04); }
.cmm-video-play { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.35); opacity:0; transition:opacity 0.22s; }
.cmm-video-item:hover .cmm-video-play { opacity:1; }
.cmm-video-play svg { width:2.5em; height:2.5em; fill:#fff; }
.cmm-video-type { position:absolute; top:0.5em; right:0.6em; font-size:0.65em; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; background:rgba(0,0,0,0.55); color:#fff; padding:0.2em 0.55em; border-radius:2px; }
.cmm-video-body { padding:0.75em 0.9em 0.9em; }
.cmm-video-title { font-size:0.9em; font-weight:600; line-height:1.3; margin-bottom:0.25em; }
.cmm-video-title-compact { padding:0.5em 0.6em; font-size:0.8em; }
.cmm-video-desc { font-size:0.78em; opacity:0.6; line-height:1.5; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; margin-bottom:0.25em; }
.cmm-video-date { font-size:0.7em; opacity:0.4; }
#cmm-vlb { display:none; position:fixed; inset:0; z-index:9500; background:rgba(0,0,0,0.95); align-items:center; justify-content:center; flex-direction:column; }
#cmm-vlb.cmm-open { display:flex; }
#cmm-vlb-inner { width:min(900px,94vw); }
#cmm-vlb-embed iframe,#cmm-vlb-embed video { width:100%; aspect-ratio:16/9; border:none; display:block; border-radius:2px; }
#cmm-vlb-meta { padding:0.75em 0 0; color:rgba(255,255,255,0.65); font-size:0.85em; }
#cmm-vlb-title { font-weight:600; margin-bottom:0.2em; color:rgba(255,255,255,0.85); }
#cmm-vlb-desc { opacity:0.55; }
#cmm-vlb-close { position:fixed; top:1rem; right:1.25rem; background:none; border:none; color:rgba(255,255,255,0.5); font-size:1.75rem; cursor:pointer; line-height:1; transition:color 0.18s; }
#cmm-vlb-close:hover { color:#fff; }
@media (max-width:640px) { .cmm-video-grid { grid-template-columns:1fr !important; } }

/* ═══════════════════════════════════════════════════════
   TEXT WIDGET
═══════════════════════════════════════════════════════ */
.cmm-text-block { display:block; }
.cmm-text-block p { margin-bottom:0.9em; }
.cmm-text-block p:last-child { margin-bottom:0; }
.cmm-text-block ul,.cmm-text-block ol { padding-left:1.25em; margin-bottom:0.9em; }
.cmm-text-block li { margin-bottom:0.3em; }
.cmm-text-block h1,.cmm-text-block h2,.cmm-text-block h3,.cmm-text-block h4 { margin-bottom:0.5em; line-height:1.2; }
.cmm-text-block a { color:inherit; text-decoration:underline; }
.cmm-text-block blockquote { border-left:3px solid var(--cmm-border); padding-left:1em; margin:0 0 0.9em; opacity:0.75; }
.cmm-text-fallback { opacity:0.4; font-style:italic; }

/* ═══════════════════════════════════════════════════════
   Q&A WIDGET
═══════════════════════════════════════════════════════ */
.cmm-qa-tabs { display:flex; gap:2px; flex-wrap:wrap; margin-bottom:0.75em; }
.cmm-qa-tab { padding:0.45em 1em; font-size:0.8em; font-weight:600; letter-spacing:0.04em; background:var(--cmm-surface); border-radius:var(--cmm-radius); cursor:pointer; border:1px solid transparent; transition:all 0.18s; }
.cmm-qa-tab:hover { border-color:var(--cmm-border); }
.cmm-qa-tab.cmm-qa-tab-active { background:var(--cmm-accent); color:#fff; border-color:var(--cmm-accent); }
.cmm-qa-panel { display:none; }
.cmm-qa-panel.cmm-qa-panel-active { display:block; }
.cmm-qa-item { border-bottom:1px solid var(--cmm-border); }
.cmm-qa-item:first-child { border-top:1px solid var(--cmm-border); }
.cmm-qa-question { display:flex; align-items:center; justify-content:space-between; gap:1em; padding:0.9em 0.25em; cursor:pointer; font-size:0.95em; font-weight:600; line-height:1.35; }
.cmm-qa-question:hover { color:var(--cmm-accent); }
.cmm-qa-arrow { flex-shrink:0; font-size:0.75em; opacity:0.4; transition:transform 0.2s; }
.cmm-qa-item.cmm-qa-open .cmm-qa-arrow { transform:rotate(180deg); opacity:0.7; }
.cmm-qa-answer { display:none; padding:0 0.25em 1.1em; font-size:0.9em; line-height:1.75; opacity:0.8; }
.cmm-qa-answer p { margin-bottom:0.75em; }
.cmm-qa-answer p:last-child { margin-bottom:0; }
.cmm-qa-item.cmm-qa-open .cmm-qa-answer { display:block; }

/* ═══════════════════════════════════════════════════════
   CAPTURE WIDGET
═══════════════════════════════════════════════════════ */
.cmm-capture-wrap { padding:1.5em; background:var(--cmm-surface); border-radius:var(--cmm-radius); }
.cmm-capture-title { font-size:1.05em; font-weight:700; margin-bottom:1em; line-height:1.3; }
.cmm-capture-fields { display:flex; flex-direction:column; gap:0.5em; margin-bottom:0.75em; }
.cmm-capture-input { width:100%; padding:0.6em 0.85em; font-size:0.9em; font-family:inherit; border:1px solid var(--cmm-border); border-radius:var(--cmm-radius); background:#fff; color:inherit; box-sizing:border-box; transition:border-color 0.18s; }
.cmm-capture-input:focus { outline:none; border-color:var(--cmm-accent); }
.cmm-capture-btn { padding:0.65em 1.5em; font-size:0.88em; font-weight:700; letter-spacing:0.06em; font-family:inherit; background:var(--cmm-accent); color:#fff; border:none; border-radius:var(--cmm-radius); cursor:pointer; transition:opacity 0.18s; }
.cmm-capture-btn:hover { opacity:0.85; }
.cmm-capture-btn:disabled { opacity:0.5; cursor:default; }
.cmm-capture-confirm { font-size:0.9em; padding:0.75em 0; color:var(--cmm-accent); font-weight:600; }
.cmm-capture-error { font-size:0.82em; color:#c0392b; padding:0.4em 0; }

`;
    document.head.appendChild(style);
  }

  /* ── Story panel — built once, shared ─────────────── */
  let _panelBuilt = false;
  let _newsStore  = {};

  function buildPanel() {
    if (_panelBuilt) return;
    _panelBuilt = true;
    const bg = document.createElement('div');
    bg.id = 'cmm-panel-bg';
    bg.innerHTML = `
      <div id="cmm-panel">
        <div id="cmm-panel-head">
          <div id="cmm-panel-titles">
            <div id="cmm-panel-tag"></div>
            <div id="cmm-panel-headline"></div>
            <div id="cmm-panel-standfirst"></div>
          </div>
          <button id="cmm-panel-close" onclick="cmmClosePanel()">✕</button>
        </div>
        <img id="cmm-panel-img" src="" alt="" style="display:none">
        <div id="cmm-panel-body">
          <div id="cmm-panel-copy"></div>
          <div id="cmm-panel-meta"></div>
          <a id="cmm-panel-ext" href="#" target="_blank" rel="noopener" style="display:none">Read full article →</a>
        </div>
      </div>`;
    document.body.appendChild(bg);
    bg.addEventListener('click', e => { if (e.target === bg) cmmClosePanel(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') cmmClosePanel(); });
  }

  window.cmmOpenPanel = function(id) {
    const n = _newsStore[id];
    if (!n) return;
    document.getElementById('cmm-panel-tag').textContent        = n.category || 'News';
    document.getElementById('cmm-panel-headline').textContent   = n.headline || '';
    document.getElementById('cmm-panel-standfirst').textContent = n.standfirst || n.summary || '';
    const img = document.getElementById('cmm-panel-img');
    if (n.image) { img.src = n.image; img.alt = n.headline || ''; img.style.display = 'block'; }
    else img.style.display = 'none';
    const copy = document.getElementById('cmm-panel-copy');
    copy.innerHTML = n.body_copy ? n.body_copy : (n.summary ? '<p>' + esc(n.summary) + '</p>' : '');
    document.getElementById('cmm-panel-meta').textContent = [
      n.date_display || fmtDate(n.created_at) || '',
      n.event_name ? '· ' + n.event_name : '',
      n.category || ''
    ].filter(Boolean).join(' ');
    const ext = document.getElementById('cmm-panel-ext');
    if (!n.body_copy && n.link) {
      ext.href = n.link;
      ext.textContent = (n.link_label || 'Read full article') + ' →';
      ext.style.display = 'inline-flex';
    } else { ext.style.display = 'none'; }
    document.getElementById('cmm-panel-bg').classList.add('cmm-open');
    document.body.style.overflow = 'hidden';
  };

  window.cmmClosePanel = function() {
    const bg = document.getElementById('cmm-panel-bg');
    if (bg) bg.classList.remove('cmm-open');
    document.body.style.overflow = '';
  };

  /* ── Lightbox — built once, shared ────────────────── */
  let _lbBuilt = false;
  function buildLightbox() {
    if (_lbBuilt) return;
    _lbBuilt = true;
    const lb = document.createElement('div');
    lb.id = 'cmm-lb';
    lb.innerHTML = `
      <button id="cmm-lb-close" onclick="cmmCloseLb()">✕</button>
      <img id="cmm-lb-img" src="" alt="">
      <div id="cmm-lb-meta"></div>`;
    document.body.appendChild(lb);
    lb.addEventListener('click', e => { if (e.target === lb) cmmCloseLb(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') cmmCloseLb(); });
  }

  window.cmmOpenLb = function(url, caption, credit) {
    const img = document.getElementById('cmm-lb-img');
    img.src = url; img.alt = caption || '';
    document.getElementById('cmm-lb-meta').textContent = [caption, credit ? '© '+credit : ''].filter(Boolean).join(' — ');
    document.getElementById('cmm-lb').classList.add('cmm-open');
    document.body.style.overflow = 'hidden';
  };

  window.cmmCloseLb = function() {
    document.getElementById('cmm-lb').classList.remove('cmm-open');
    document.body.style.overflow = '';
  };

  /* ── Video lightbox ───────────────────────────────── */
  let _vlbBuilt = false;
  function buildVideoLightbox() {
    if (_vlbBuilt) return;
    _vlbBuilt = true;
    const vlb = document.createElement('div');
    vlb.id = 'cmm-vlb';
    vlb.innerHTML = `
      <button id="cmm-vlb-close" onclick="cmmCloseVlb()">✕</button>
      <div id="cmm-vlb-inner">
        <div id="cmm-vlb-embed"></div>
        <div id="cmm-vlb-meta">
          <div id="cmm-vlb-title"></div>
          <div id="cmm-vlb-desc"></div>
        </div>
      </div>`;
    document.body.appendChild(vlb);
    vlb.addEventListener('click', e => { if (e.target === vlb) cmmCloseVlb(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') cmmCloseVlb(); });
  }

  window.cmmOpenVideo = function(src, title, desc, type) {
    const embed = document.getElementById('cmm-vlb-embed');
    embed.innerHTML = type === 'embed'
      ? `<iframe src="${src}" allowfullscreen allow="autoplay; encrypted-media"></iframe>`
      : `<video src="${src}" controls autoplay></video>`;
    document.getElementById('cmm-vlb-title').textContent = title || '';
    document.getElementById('cmm-vlb-desc').textContent  = desc  || '';
    document.getElementById('cmm-vlb').classList.add('cmm-open');
    document.body.style.overflow = 'hidden';
  };

  window.cmmCloseVlb = function() {
    const vlb = document.getElementById('cmm-vlb');
    if (vlb) { vlb.classList.remove('cmm-open'); document.getElementById('cmm-vlb-embed').innerHTML = ''; }
    document.body.style.overflow = '';
  };

  /* ══════════════════════════════════════════════════════
     <cmm-news>
  ══════════════════════════════════════════════════════ */
  class CmmNews extends HTMLElement {
    async connectedCallback() {
      injectBaseStyles();
      buildPanel();
      const region  = this.dataset.region;
      const limit   = parseInt(this.getAttribute('limit') || '5', 10);
      const compact = this.hasAttribute('compact');
      this.innerHTML = '<div class="cmm-loading">Loading…</div>';
      const news = await supa(
        `${TABLES.news}?published=eq.true${regionFilter(region)}&order=sort_order.asc,created_at.desc&limit=${limit}`
      );
      news.forEach(n => { _newsStore[n.id] = n; });
      if (!news.length) { this.innerHTML = '<div class="cmm-empty">No news yet.</div>'; return; }
      if (compact) this.classList.add('cmm-compact');
      const lead  = news[0];
      const cards = news.slice(1);
      const hasImg = !!lead.image;
      let html = `
        <div class="cmm-lead ${hasImg ? 'cmm-lead-has-img' : 'cmm-lead-no-img'}"
             role="button" tabindex="0"
             onclick="cmmOpenPanel('${lead.id}')"
             onkeydown="if(event.key==='Enter')cmmOpenPanel('${lead.id}')">
          ${hasImg ? `<img class="cmm-lead-img" src="${esc(lead.image)}" alt="${esc(lead.headline)}" loading="lazy">` : ''}
          ${hasImg ? '<div class="cmm-lead-overlay"></div>' : ''}
          <div class="cmm-lead-body">
            <div class="cmm-lead-eyebrow">
              <span class="cmm-lead-tag">${esc(lead.category || 'News')}</span>
              <span class="cmm-lead-date">${esc(lead.date_display || fmtDate(lead.created_at))}</span>
            </div>
            <div class="cmm-lead-headline">${esc(lead.headline)}</div>
            ${lead.standfirst || lead.summary ? `<div class="cmm-lead-standfirst">${esc(lead.standfirst || lead.summary)}</div>` : ''}
            <span class="cmm-lead-cta">Read story →</span>
          </div>
        </div>`;
      if (cards.length) {
        const colClass = ['','cmm-cards-1','cmm-cards-2','cmm-cards-3','cmm-cards-4'][Math.min(cards.length, 4)];
        html += `<div class="cmm-cards ${colClass}">` +
          cards.map(n => {
            const thumb = n.image
              ? (n.image.includes('cloudinary') ? n.image.replace('/upload/','/upload/c_fill,w_600,h_400,q_auto,f_auto/') : n.image)
              : null;
            return `
              <div class="cmm-card" onclick="cmmOpenPanel('${n.id}')" role="button" tabindex="0">
                ${thumb ? `<img class="cmm-card-img" src="${esc(thumb)}" alt="${esc(n.headline)}" loading="lazy">` : ''}
                <div class="cmm-card-body">
                  <div class="cmm-card-meta">
                    <span class="cmm-card-tag">${esc(n.category || 'News')}</span>
                    <span class="cmm-card-date">${esc(n.date_display || fmtDate(n.created_at))}</span>
                  </div>
                  <div class="cmm-card-title">${esc(n.headline)}</div>
                  ${n.summary ? `<div class="cmm-card-summary">${esc(n.summary)}</div>` : ''}
                </div>
              </div>`;
          }).join('') + '</div>';
      }
      this.innerHTML = html;
    }
  }

  /* ══════════════════════════════════════════════════════
     <cmm-gallery>
  ══════════════════════════════════════════════════════ */
  class CmmGallery extends HTMLElement {
    async connectedCallback() {
      injectBaseStyles();
      buildLightbox();
      const region  = this.dataset.region;
      const limit   = parseInt(this.getAttribute('limit') || '12', 10);
      const columns = parseInt(this.getAttribute('columns') || '3', 10);
      this.innerHTML = '<div class="cmm-loading">Loading…</div>';
      const gallery = await supa(
        `${TABLES.gallery}?published=eq.true${regionFilter(region)}&order=sort_order.asc,created_at.desc&limit=${limit}&select=id,caption,credit,image_display,image_original,event_name,event_day`
      );
      if (!gallery.length) { this.innerHTML = '<div class="cmm-empty">No photos yet.</div>'; return; }
      const items = gallery.map((g, i) => {
        const img   = g.image_display || g.image_original || '';
        const thumb = img.includes('cloudinary') ? img.replace('/upload/','/upload/c_fill,w_600,h_400,q_auto,f_auto/') : img;
        const wide  = i === 0 && columns > 1;
        return `
          <div class="cmm-gal-item${wide ? ' cmm-gal-wide' : ''}"
               onclick="cmmOpenLb('${escAttr(img)}','${escAttr(g.caption||'')}','${escAttr(g.credit||'')}')">
            <img src="${esc(thumb)}" alt="${esc(g.caption||'')}" loading="lazy">
            <div class="cmm-gal-overlay">
              ${g.caption ? `<div class="cmm-gal-cap">${esc(g.caption)}</div>` : ''}
              ${g.credit  ? `<div class="cmm-gal-credit">© ${esc(g.credit)}</div>` : ''}
            </div>
          </div>`;
      }).join('');
      this.innerHTML = `<div class="cmm-gallery-grid" style="grid-template-columns:repeat(${columns},1fr)">${items}</div>`;
    }
  }

  /* ══════════════════════════════════════════════════════
     <cmm-events>
  ══════════════════════════════════════════════════════ */
  class CmmEvents extends HTMLElement {
    async connectedCallback() {
      injectBaseStyles();
      const region   = this.dataset.region;
      const limit    = parseInt(this.getAttribute('limit') || '8', 10);
      const upcoming = this.getAttribute('upcoming') !== 'false';
      this.innerHTML = '<div class="cmm-loading">Loading…</div>';

      // Build query — year filter and region both optional
      const year = new Date().getFullYear();
      const yearPart  = EVT_YEAR_FILTER ? `&year=eq.${year}` : '';
      const query = `${TABLES.events}?status=neq.cancelled${regionFilter(region)}${yearPart}&order=start_date.asc&limit=${limit}&select=id,name,venue,start_date,end_date,series,status,type,badge`;

      const events = await supa(query);
      const now = new Date();
      const filtered = upcoming ? events.filter(e => !e.end_date || new Date(e.end_date) >= now) : events;

      if (!filtered.length) { this.innerHTML = '<div class="cmm-empty">No events scheduled.</div>'; return; }

      const html = filtered.map(e => {
        const s   = e.start_date ? new Date(e.start_date) : null;
        const day = s ? s.getDate() : '—';
        const mon = s ? MONTHS[s.getMonth()].toUpperCase() : '';

        // Badge logic: config-driven if EVT_BADGES array provided, legacy Cape31 logic otherwise
        let badge = '';
        if (EVT_BADGES) {
          // Generic: find first matching badge rule from config
          const match = EVT_BADGES.find(b => e[b.field] === b.value);
          if (match) badge = `<span class="cmm-event-badge">${esc(match.label)}</span>`;
        } else {
          // Legacy Cape31 badge logic — preserved exactly
          if (e.status === 'active') {
            badge = `<span class="cmm-event-badge">Racing Now</span>`;
          } else if (e.series && e.series.toLowerCase().includes('national')) {
            badge = `<span class="cmm-event-badge">Championship</span>`;
          }
        }

        return `
          <div class="cmm-event-item">
            <div class="cmm-event-date-block">
              <div class="cmm-event-day">${day}</div>
              <div class="cmm-event-mon">${mon}</div>
            </div>
            <div class="cmm-event-divider"></div>
            <div class="cmm-event-body">
              <div class="cmm-event-name">${esc(e.name)}</div>
              <div class="cmm-event-meta">
                ${e.venue ? `<span>${esc(e.venue.split(',')[0])}</span>` : ''}
                <span>${fmtDateRange(e.start_date, e.end_date)}</span>
                ${e.series ? `<span>${esc(e.series)}</span>` : ''}
              </div>
            </div>
            ${badge}
          </div>`;
      }).join('');

      this.innerHTML = `<div class="cmm-event-list">${html}</div>`;
    }
  }

  /* ══════════════════════════════════════════════════════
     <cmm-notices>
  ══════════════════════════════════════════════════════ */
  class CmmNotices extends HTMLElement {
    async connectedCallback() {
      injectBaseStyles();
      const region = this.dataset.region;
      const limit  = parseInt(this.getAttribute('limit') || '6', 10);
      this.innerHTML = '<div class="cmm-loading">Loading…</div>';
      const notices = await supa(
        `${TABLES.notices}?published=eq.true${regionFilter(region)}&order=issued_at.desc&limit=${limit}`
      );
      const now    = new Date();
      const active = notices.filter(n => !n.expires_at || new Date(n.expires_at) > now);
      if (!active.length) { this.innerHTML = ''; return; }
      const html = active.map(n => {
        const colour = ROLE_COLOURS[n.from_role] || '#7a8fa3';
        const label  = ROLE_LABELS[n.from_role]  || n.from_role || '';
        const issued = n.issued_at
          ? new Date(n.issued_at).toLocaleDateString('en-GB', { day:'numeric', month:'short' })
          : '';
        return `
          <div class="cmm-notice-item" style="border-left-color:${colour}">
            <span class="cmm-notice-role" style="background:${colour}18;color:${colour};border:1px solid ${colour}33">${esc(label)}</span>
            <span class="cmm-notice-text">${esc(n.notice_text)}</span>
            ${issued ? `<span class="cmm-notice-date">${issued}</span>` : ''}
          </div>`;
      }).join('');
      this.innerHTML = `<div class="cmm-notice-list">${html}</div>`;
    }
  }

  /* ══════════════════════════════════════════════════════
     <cmm-video>
  ══════════════════════════════════════════════════════ */
  class CmmVideo extends HTMLElement {
    async connectedCallback() {
      injectBaseStyles();
      buildVideoLightbox();
      const region  = this.dataset.region;
      const limit   = parseInt(this.getAttribute('limit') || '6', 10);
      const columns = parseInt(this.getAttribute('columns') || '3', 10);
      const compact = this.hasAttribute('compact');
      this.innerHTML = '<div class="cmm-loading">Loading…</div>';
      const videos = await supa(
        `${TABLES.videos}?published=eq.true${regionFilter(region)}&order=sort_order.asc,date_iso.desc&limit=${limit}`
      );
      if (!videos.length) { this.innerHTML = '<div class="cmm-empty">No videos yet.</div>'; return; }
      const html = `<div class="cmm-video-grid" style="grid-template-columns:repeat(${columns},1fr)">` +
        videos.map(v => {
          const thumb = v.type === 'youtube' || v.type === 'vimeo'
            ? (v.thumbnail || (v.youtube_id ? `https://img.youtube.com/vi/${v.youtube_id}/mqdefault.jpg` : ''))
            : (v.cloudinary_url ? v.cloudinary_url.replace('/upload/','/upload/c_fill,w_600,h_400,q_auto,f_auto/') : '');
          const typeLabel = v.type === 'youtube' ? 'YouTube' : v.type === 'vimeo' ? 'Vimeo' : 'Video';
          const embedSrc = v.type === 'youtube' && v.youtube_id ? `https://www.youtube.com/embed/${v.youtube_id}?autoplay=1`
            : v.type === 'vimeo' && v.youtube_id ? `https://player.vimeo.com/video/${v.youtube_id}?autoplay=1` : null;
          const clickHandler = embedSrc
            ? `cmmOpenVideo('${escAttr(embedSrc)}','${escAttr(v.title||'')}','${escAttr(v.description||'')}','embed')`
            : v.cloudinary_url
            ? `cmmOpenVideo('${escAttr(v.cloudinary_url)}','${escAttr(v.title||'')}','${escAttr(v.description||'')}','cloudinary')`
            : '';
          return `
            <div class="cmm-video-item" ${clickHandler ? `onclick="${clickHandler}" role="button" tabindex="0"` : ''}>
              <div class="cmm-video-thumb">
                ${thumb ? `<img src="${esc(thumb)}" alt="${esc(v.title||'')}" loading="lazy">` : '<div class="cmm-video-no-thumb"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></div>'}
                <div class="cmm-video-play"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></div>
                <span class="cmm-video-type">${typeLabel}</span>
              </div>
              ${!compact
                ? `<div class="cmm-video-body">
                    <div class="cmm-video-title">${esc(v.title||'')}</div>
                    ${v.description ? `<div class="cmm-video-desc">${esc(v.description)}</div>` : ''}
                    ${v.date_display ? `<div class="cmm-video-date">${esc(v.date_display)}</div>` : ''}
                  </div>`
                : `<div class="cmm-video-title cmm-video-title-compact">${esc(v.title||'')}</div>`}
            </div>`;
        }).join('') + '</div>';
      this.innerHTML = html;
    }
  }

  /* ══════════════════════════════════════════════════════
     <cmm-text>
  ══════════════════════════════════════════════════════ */
  class CmmText extends HTMLElement {
    async connectedCallback() {
      injectBaseStyles();
      const slotId   = this.getAttribute('slot') || this.getAttribute('data-slot') || '';
      const fallback = this.getAttribute('fallback') || '';
      const region   = this.dataset.region;
      if (!slotId) { console.warn('[CMM] <cmm-text> missing slot attribute'); return; }
      this.innerHTML = '';
      const rows = await supa(
        `${TABLES.page_text}?slot_id=eq.${encodeURIComponent(slotId)}${regionFilter(region)}&published=eq.true&limit=1`
      );
      const row = rows && rows[0];
      if (!row || !row.content) {
        if (fallback) this.innerHTML = `<span class="cmm-text-fallback">${esc(fallback)}</span>`;
        return;
      }
      this.innerHTML = `<div class="cmm-text-block">${sanitiseHtml(row.content)}</div>`;
    }
  }

  /* ══════════════════════════════════════════════════════
     <cmm-qa>
  ══════════════════════════════════════════════════════ */
  class CmmQa extends HTMLElement {
    async connectedCallback() {
      injectBaseStyles();
      const region     = this.dataset.region;
      const limit      = parseInt(this.getAttribute('limit') || '999', 10);
      const injectSchema = this.getAttribute('schema') !== 'false';
      const catAttr    = this.getAttribute('categories') || '';
      const categories = catAttr ? catAttr.split(',').map(c => c.trim()).filter(Boolean) : [];

      this.innerHTML = '<div class="cmm-loading">Loading…</div>';

      const rows = await supa(
        `${TABLES.qa}?published=eq.true${regionFilter(region)}&order=category.asc,sort_order.asc,created_at.asc&limit=${limit}`
      );

      if (!rows.length) { this.innerHTML = '<div class="cmm-empty">No Q&amp;A entries yet.</div>'; return; }

      // Group by category, respecting categories attribute order if provided
      const grouped = {};
      rows.forEach(r => {
        if (!grouped[r.category]) grouped[r.category] = [];
        grouped[r.category].push(r);
      });

      // Determine tab order: use categories attr if provided, else alphabetical from data
      const tabOrder = categories.length
        ? categories.filter(c => grouped[c])
        : Object.keys(grouped).sort();

      if (!tabOrder.length) { this.innerHTML = '<div class="cmm-empty">No Q&amp;A entries yet.</div>'; return; }

      // Build tabs
      const tabs = tabOrder.map((cat, i) =>
        `<div class="cmm-qa-tab${i === 0 ? ' cmm-qa-tab-active' : ''}" data-cat="${escAttr(cat)}">${esc(cat)}</div>`
      ).join('');

      // Build panels
      const panels = tabOrder.map((cat, i) => {
        const items = (grouped[cat] || []).map(q => `
          <div class="cmm-qa-item">
            <div class="cmm-qa-question">
              <span>${esc(q.question)}</span>
              <span class="cmm-qa-arrow">▼</span>
            </div>
            <div class="cmm-qa-answer">${sanitiseHtml(q.answer || '')}</div>
          </div>`).join('');
        return `<div class="cmm-qa-panel${i === 0 ? ' cmm-qa-panel-active' : ''}" data-cat="${escAttr(cat)}">${items}</div>`;
      }).join('');

      this.innerHTML = `<div class="cmm-qa-tabs">${tabs}</div>${panels}`;

      // Tab switching
      this.querySelectorAll('.cmm-qa-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          const cat = tab.dataset.cat;
          this.querySelectorAll('.cmm-qa-tab').forEach(t => t.classList.remove('cmm-qa-tab-active'));
          this.querySelectorAll('.cmm-qa-panel').forEach(p => p.classList.remove('cmm-qa-panel-active'));
          tab.classList.add('cmm-qa-tab-active');
          this.querySelector(`.cmm-qa-panel[data-cat="${CSS.escape(cat)}"]`).classList.add('cmm-qa-panel-active');
        });
      });

      // Accordion
      this.querySelectorAll('.cmm-qa-question').forEach(q => {
        q.addEventListener('click', () => {
          const item = q.closest('.cmm-qa-item');
          const panel = item.closest('.cmm-qa-panel');
          panel.querySelectorAll('.cmm-qa-item.cmm-qa-open').forEach(open => {
            if (open !== item) open.classList.remove('cmm-qa-open');
          });
          item.classList.toggle('cmm-qa-open');
        });
      });

      // FAQ schema injection
      if (injectSchema) {
        const entities = rows.map(q => ({
          '@type': 'Question',
          name: q.question,
          acceptedAnswer: { '@type': 'Answer', text: (q.answer || '').replace(/<[^>]+>/g, '') }
        }));
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: entities });
        document.head.appendChild(script);
      }
    }
  }

  /* ══════════════════════════════════════════════════════
     <cmm-capture>
  ══════════════════════════════════════════════════════ */
  class CmmCapture extends HTMLElement {
    async connectedCallback() {
      injectBaseStyles();
      const offer    = this.getAttribute('offer') || '';
      const title    = this.getAttribute('title') || '';
      const cta      = this.getAttribute('cta') || 'Send me the pack';
      const download = this.getAttribute('download') || '';
      const region   = this.dataset.region;
      const fieldsAttr = this.getAttribute('fields') || 'name,email';
      const fields   = fieldsAttr.split(',').map(f => f.trim()).filter(Boolean);
      // email always included
      if (!fields.includes('email')) fields.push('email');

      const fieldMap = {
        name:         { label: 'Your name',         type: 'text',  placeholder: 'Jane Smith' },
        organisation: { label: 'Organisation',       type: 'text',  placeholder: 'Company or practice name' },
        email:        { label: 'Email address',      type: 'email', placeholder: 'jane@example.com' },
        phone:        { label: 'Phone number',       type: 'tel',   placeholder: '+44 ...' }
      };

      const fieldHtml = fields.map(f => {
        const fm = fieldMap[f] || { label: f, type: 'text', placeholder: '' };
        return `<input class="cmm-capture-input" type="${fm.type}" name="${esc(f)}" placeholder="${esc(fm.placeholder)}" aria-label="${esc(fm.label)}" ${f === 'email' ? 'required' : ''}>`;
      }).join('');

      this.innerHTML = `
        <div class="cmm-capture-wrap">
          ${title ? `<div class="cmm-capture-title">${esc(title)}</div>` : ''}
          <div class="cmm-capture-fields">${fieldHtml}</div>
          <button class="cmm-capture-btn">${esc(cta)}</button>
          <div class="cmm-capture-confirm" style="display:none">Thank you — we'll be in touch shortly.</div>
          <div class="cmm-capture-error" style="display:none"></div>
        </div>`;

      const btn     = this.querySelector('.cmm-capture-btn');
      const confirm = this.querySelector('.cmm-capture-confirm');
      const errDiv  = this.querySelector('.cmm-capture-error');

      btn.addEventListener('click', async () => {
        errDiv.style.display = 'none';
        // Collect field values
        const data = { offer, captured_at: new Date().toISOString() };
        if (REGION !== false) data.region = REGION;
        let valid = true;
        fields.forEach(f => {
          const input = this.querySelector(`input[name="${f}"]`);
          data[f] = input ? input.value.trim() : '';
          if (f === 'email' && !data[f]) valid = false;
        });
        if (!valid) {
          errDiv.textContent = 'Please enter your email address.';
          errDiv.style.display = 'block';
          return;
        }
        btn.disabled = true;
        btn.textContent = 'Sending…';
        try {
          await fetch(SUPA_URL + '/rest/v1/' + TABLES.capture, {
            method: 'POST',
            headers: {
              apikey: SUPA_KEY,
              Authorization: 'Bearer ' + SUPA_KEY,
              'Content-Type': 'application/json',
              Prefer: 'return=minimal'
            },
            body: JSON.stringify(data)
          });
        } catch(e) {
          console.error('[CMM capture] Save failed:', e);
        }
        // Show confirmation regardless of save result
        btn.style.display   = 'none';
        confirm.style.display = 'block';
        this.querySelectorAll('.cmm-capture-input').forEach(i => i.style.display = 'none');
        // Trigger download if configured
        if (download) {
          const a = document.createElement('a');
          a.href = download; a.download = ''; a.target = '_blank';
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
        }
      });
    }
  }

  /* ── HTML sanitiser ───────────────────────────────── */
  function sanitiseHtml(html) {
    const allowed = {
      p:[], strong:[], em:[], u:[], s:[], br:[],
      h1:[], h2:[], h3:[], h4:[],
      ul:[], ol:[], li:[],
      a:['href','target','rel'],
      img:['src','alt','loading'],
      blockquote:[], code:[], pre:[],
      span:['style'], div:['style'],
      table:[], thead:[], tbody:[], tr:[], th:[], td:[]
    };
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    function clean(node) {
      if (node.nodeType === 3) return;
      if (node.nodeType !== 1) { node.parentNode && node.parentNode.removeChild(node); return; }
      const tag = node.tagName.toLowerCase();
      if (!allowed[tag]) { node.parentNode && node.parentNode.removeChild(node); return; }
      const keepAttrs = allowed[tag];
      Array.from(node.attributes).forEach(attr => {
        if (!keepAttrs.includes(attr.name)) node.removeAttribute(attr.name);
      });
      if (tag === 'a') { node.setAttribute('target','_blank'); node.setAttribute('rel','noopener noreferrer'); }
      Array.from(node.childNodes).forEach(clean);
    }
    Array.from(tmp.childNodes).forEach(clean);
    return tmp.innerHTML;
  }

  /* ── Register custom elements ─────────────────────── */
  if (!customElements.get('cmm-news'))    customElements.define('cmm-news',    CmmNews);
  if (!customElements.get('cmm-gallery')) customElements.define('cmm-gallery', CmmGallery);
  if (!customElements.get('cmm-events'))  customElements.define('cmm-events',  CmmEvents);
  if (!customElements.get('cmm-notices')) customElements.define('cmm-notices', CmmNotices);
  if (!customElements.get('cmm-video'))   customElements.define('cmm-video',   CmmVideo);
  if (!customElements.get('cmm-text'))    customElements.define('cmm-text',    CmmText);
  if (!customElements.get('cmm-qa'))      customElements.define('cmm-qa',      CmmQa);
  if (!customElements.get('cmm-capture')) customElements.define('cmm-capture', CmmCapture);

})();
