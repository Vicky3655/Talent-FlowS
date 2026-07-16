/* ═══════════════════════════════════════════════════════
   TALENT FLOW — Shared Mobile Navigation
   mobile-nav.js  ·  loaded at bottom of every page
   ═══════════════════════════════════════════════════════ */
(function () {
    'use strict';

    /* ── Helper: try multiple IDs ── */
    function getById(/* ...ids */) {
        for (var i = 0; i < arguments.length; i++) {
            var el = document.getElementById(arguments[i]);
            if (el) return el;
        }
        return null;
    }

    var hamburger = getById('hamburger-btn', 'hamburgerBtn');
    var sidebar   = getById('sidebar');
    var overlay   = getById('sidebar-overlay', 'sidebarOverlay');
    var closeBtn  = document.querySelector('.sb-close-btn');

    if (!hamburger || !sidebar) return;

    /* ── Open ── */
    function openNav() {
        hamburger.classList.add('open');
        hamburger.setAttribute('aria-expanded', 'true');
        hamburger.setAttribute('aria-label', 'Close navigation menu');
        sidebar.classList.add('mobile-open');
        document.body.classList.add('nav-open');

        if (overlay) {
            overlay.style.display = 'block';
            /* force reflow so the CSS transition fires */
            void overlay.offsetHeight;
            overlay.classList.add('nav-overlay-visible');
        }
    }

    /* ── Close ── */
    function closeNav() {
        hamburger.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        hamburger.setAttribute('aria-label', 'Open navigation menu');
        sidebar.classList.remove('mobile-open');
        document.body.classList.remove('nav-open');

        if (overlay) {
            overlay.classList.remove('nav-overlay-visible');
            setTimeout(function () {
                if (!sidebar.classList.contains('mobile-open')) {
                    overlay.style.display = 'none';
                }
            }, 320);
        }
    }

    /* ── Hamburger click ── */
    hamburger.addEventListener('click', function () {
        if (sidebar.classList.contains('mobile-open')) {
            closeNav();
        } else {
            openNav();
        }
    });

    /* ── Overlay click ── */
    if (overlay) {
        overlay.addEventListener('click', closeNav);
    }

    /* ── In-sidebar close button ── */
    if (closeBtn) {
        closeBtn.addEventListener('click', closeNav);
    }

    /* ── Escape key ── */
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && sidebar.classList.contains('mobile-open')) {
            closeNav();
        }
    });

    /* ── Close when a nav link is tapped ──
       Short delay lets the browser start navigating first */
    sidebar.querySelectorAll('.sidebar-link').forEach(function (link) {
        link.addEventListener('click', function () {
            setTimeout(closeNav, 80);
        });
    });

    /* ── Initial ARIA state ── */
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.setAttribute('aria-label', 'Open navigation menu');
    hamburger.setAttribute('aria-controls', 'sidebar');
})();
