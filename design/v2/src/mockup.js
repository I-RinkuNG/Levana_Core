(function () {
  var q = new URLSearchParams(location.search), html = document.documentElement;
  var page = q.get('page') || 'today', state = q.get('state') || 'ready';
  if (q.get('shot')) html.setAttribute('data-shot', '1');
  // pages
  document.querySelectorAll('[data-page]').forEach(function (s) { s.hidden = s.dataset.page !== page; });
  document.querySelectorAll('header[data-for]').forEach(function (h) { h.hidden = h.dataset.for !== page; });
  document.querySelectorAll('[data-nav]').forEach(function (a) { if (a.dataset.nav === page) a.setAttribute('aria-current', 'page'); });
  // states: error = ready view + banner + stale panels
  var view = state === 'error' ? 'ready' : state;
  document.querySelectorAll('[data-view]').forEach(function (v) { v.hidden = v.dataset.view !== view; });
  document.querySelectorAll('[data-only="error"]').forEach(function (e) { e.hidden = state !== 'error'; });
  if (state === 'error') document.querySelectorAll('[data-page="' + page + '"] .page-stack').forEach(function (p) { p.classList.add('stale'); });
  // keep page when switching state from the mockup panel
  document.querySelectorAll('a[data-keep]').forEach(function (a) { a.href = a.getAttribute('href') + '&page=' + page; });
  function syncMeta() { document.querySelector('meta[name=theme-color]').content = getComputedStyle(html).getPropertyValue('--bg').trim(); }
  syncMeta();
  // theme toggle (remembered)
  document.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
    b.setAttribute('aria-pressed', html.dataset.mode === 'dark');
    b.addEventListener('click', function () {
      var m = html.dataset.mode === 'dark' ? 'light' : 'dark';
      html.dataset.mode = m; syncMeta(); try { localStorage.setItem('lvn-mode', m); } catch (e) {}
      b.setAttribute('aria-pressed', m === 'dark');
    });
  });
  // desktop: secondary panels open
  var mq = matchMedia('(min-width: 1024px)');
  function fold() { document.querySelectorAll('[data-open-desktop]').forEach(function (d) { d.open = mq.matches; var s = d.querySelector('summary'); if (mq.matches) s.setAttribute('tabindex', '-1'); else s.removeAttribute('tabindex'); }); }
  fold(); mq.addEventListener('change', fold);
  // chart tooltip (hover + keyboard focus)
  var tip = document.querySelector('.tip');
  function show(el) { var r = el.getBoundingClientRect(); tip.textContent = el.dataset.tip; tip.hidden = false;
    var t = tip.getBoundingClientRect(); tip.style.left = Math.max(8, Math.min(innerWidth - t.width - 8, r.left + r.width / 2 - t.width / 2)) + 'px';
    tip.style.top = (r.top - t.height - 8 < 8 ? r.bottom + 8 : r.top - t.height - 8) + 'px'; }
  document.querySelectorAll('.hbar[data-tip]').forEach(function (el) {
    el.addEventListener('mouseenter', function () { show(el); }); el.addEventListener('focus', function () { show(el); });
    el.addEventListener('mouseleave', function () { tip.hidden = true; }); el.addEventListener('blur', function () { tip.hidden = true; });
  });
})();
