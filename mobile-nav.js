/* ═══════════════════════════════════════════════════════
   TALENT FLOW — Shared Mobile Navigation Controller
   mobile-nav.js  ·  Loaded across all app pages
   ═══════════════════════════════════════════════════════ */
(function () {
    'use strict';

    function initMobileNav() {
        /* Helper: find element by checking multiple common ID variants */
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
        var closeBtn  = getById('sb-close-btn') || document.querySelector('.sb-close-btn');

        if (!hamburger || !sidebar) return;

        /* Prevent duplicate event listeners if initialized more than once */
        if (hamburger.dataset.navInitialized === 'true') return;
        hamburger.dataset.navInitialized = 'true';

        /* ── Open Drawer Action ── */
        function openNav() {
            hamburger.classList.add('open');
            hamburger.setAttribute('aria-expanded', 'true');
            hamburger.setAttribute('aria-label', 'Close navigation menu');
            sidebar.classList.add('mobile-open');
            document.body.classList.add('nav-open');

            if (overlay) {
                overlay.style.display = 'block';
                /* Force DOM reflow to ensure CSS transition executes */
                void overlay.offsetHeight;
                overlay.classList.add('nav-overlay-visible');
            }
        }

        /* ── Close Drawer Action ── */
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

        /* ── Hamburger Click Toggle ── */
        hamburger.addEventListener('click', function (e) {
            e.stopPropagation();
            if (sidebar.classList.contains('mobile-open')) {
                closeNav();
            } else {
                openNav();
            }
        });

        /* ── Backdrop Overlay Click ── */
        if (overlay) {
            overlay.addEventListener('click', function (e) {
                e.stopPropagation();
                closeNav();
            });
        }

        /* ── In-Sidebar Close Button Click ── */
        if (closeBtn) {
            closeBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                closeNav();
            });
        }

        /* ── Keyboard Accessibility: Escape key ── */
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && sidebar.classList.contains('mobile-open')) {
                closeNav();
            }
        });

        /* ── Auto-close drawer when any navigation link is tapped ── */
        sidebar.querySelectorAll('.sidebar-link').forEach(function (link) {
            link.addEventListener('click', function () {
                setTimeout(closeNav, 80);
            });
        });

        /* ── Initial ARIA Accessibility Setup ── */
        hamburger.setAttribute('aria-expanded', 'false');
        hamburger.setAttribute('aria-label', 'Open navigation menu');
        hamburger.setAttribute('aria-controls', 'sidebar');
    }

    /* Safely trigger initialization regardless of document load status */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMobileNav);
    } else {
        initMobileNav();
    }
})();
