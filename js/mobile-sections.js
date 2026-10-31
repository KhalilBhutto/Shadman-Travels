/* js/mobile-sections.js — Why Us accordion, phones only (<=600px) */
(function () {
  var mq = window.matchMedia('(max-width: 600px)');
  var rows = [].slice.call(document.querySelectorAll('#why-us .wy-row'));
  if (!rows.length) return;

  function setOpen(row, open) {
    row.classList.toggle('wy-open', open);
    row.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  function toggle(row) {
    var willOpen = !row.classList.contains('wy-open');
    rows.forEach(function (r) { setOpen(r, false); });
    if (willOpen) setOpen(row, true);
  }
  function apply() {
    if (mq.matches) {
      rows.forEach(function (r) {
        r.setAttribute('role', 'button');
        r.setAttribute('tabindex', '0');
        r.setAttribute('aria-expanded', r.classList.contains('wy-open') ? 'true' : 'false');
      });
      if (!rows.some(function (r) { return r.classList.contains('wy-open'); })) setOpen(rows[0], true);
    } else {
      rows.forEach(function (r) {
        r.classList.remove('wy-open');
        r.removeAttribute('role');
        r.removeAttribute('tabindex');
        r.removeAttribute('aria-expanded');
      });
    }
  }

  rows.forEach(function (r) {
    r.addEventListener('click', function () { if (mq.matches) toggle(r); });
    r.addEventListener('keydown', function (e) {
      if (!mq.matches) return;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(r); }
    });
  });
  if (mq.addEventListener) mq.addEventListener('change', apply); else mq.addListener(apply);
  apply();
})();