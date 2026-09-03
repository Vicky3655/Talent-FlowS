/* ============================================================
   TALENT FLOW  |  notifications-ui.js
   ------------------------------------------------------------
   Shared instructor-side controller for the "Student Activity"
   notification bell and the red unread dots on the Courses /
   Assignments / Students sidebar icons. Include this (after
   auth.js and notifications-store.js) on every instructor page.

   It progressively enhances whatever bell/panel markup a page
   already has (courses.html, instructor-dashboard.html both
   ship a real #notif-btn/#notif-panel) and builds a working one
   from scratch on pages that only ever had a decorative bell
   icon (instructor-assignments.html, students.html,
   performance.html) — so no HTML edits are required beyond
   adding this <script> tag. Pages with no bell at all
   (settings.html) still get working sidebar dots.

   Visiting a section clears that section's dot: landing on
   courses.html marks "course" notifications read, landing on
   instructor-assignments.html marks "assignment" notifications
   read, landing on students.html marks "student" notifications
   read. The bell itself is a separate, full activity log — its
   badge counts every unread notification regardless of category,
   and "Mark all read" clears all of it at once.
   ============================================================ */
(function () {
    'use strict';

    function waitFor(getter, timeoutMs = 8000) {
        if (getter()) return Promise.resolve(getter());
        return new Promise((resolve) => {
            const start = Date.now();
            const timer = setInterval(() => {
                const v = getter();
                if (v) { clearInterval(timer); resolve(v); }
                else if (Date.now() - start > timeoutMs) { clearInterval(timer); resolve(null); }
            }, 50);
        });
    }

    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function timeAgo(iso) {
        const diffMs = Date.now() - new Date(iso).getTime();
        const mins = Math.round(diffMs / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins} min ago`;
        const hrs = Math.round(mins / 60);
        if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
        const days = Math.round(hrs / 24);
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days} days ago`;
        return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    const CATEGORY_ICON = {
        course: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 20.25h12m-7.5-3v3m3-3v3m-10.125-3h17.25c.621 0 1.125-.504 1.125-1.125V4.875c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125Z"/></svg>',
        assignment: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75h6M9 15.75h4.5M8.25 4.5h7.5a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5h-9a1.5 1.5 0 0 1-1.5-1.5V9m4.5-4.5L9 4.5m0 0v3a.75.75 0 0 0 .75.75h3a.75.75 0 0 0 .75-.75v-3m-4.5 0h4.5"/></svg>',
        student: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.26 10.147a60.44 60.44 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347M4.26 10.147A50.7 50.7 0 0 1 12 3.493a59.9 59.9 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814M4.26 10.147A50.7 50.7 0 0 1 12 13.489"/></svg>',
    };

    // href suffix on a .sidebar-link → which unread-category dot it shows
    const SIDEBAR_CATEGORY_MAP = [
        { suffix: 'instructor-assignments.html', category: 'assignment' },
        { suffix: 'students.html', category: 'student' },
        { suffix: 'courses.html', category: 'course' },
    ];

    function currentPageCategory() {
        const path = (window.location.pathname || '').toLowerCase();
        if (path.endsWith('instructor-assignments.html')) return 'assignment';
        if (path.endsWith('students.html')) return 'student';
        if (path.endsWith('courses.html')) return 'course';
        return null;
    }

    function injectStyles() {
        if (document.getElementById('tf-notif-styles')) return;
        const style = document.createElement('style');
        style.id = 'tf-notif-styles';
        style.textContent = `
.sidebar-link { position: relative; }
.tf-notif-dot {
    position: absolute; top: 4px; right: 6px;
    width: 9px; height: 9px; border-radius: 50%;
    background: #EF4444; border: 2px solid rgba(255,255,255,.9);
    box-shadow: 0 0 0 1px rgba(15,23,42,.08);
    display: none; pointer-events: none;
}
.sidebar-link.tf-has-dot .tf-notif-dot { display: block; }
@media (max-width: 768px) { .tf-notif-dot { top: 6px; right: 10px; } }

.tf-notif-badge {
    position: absolute; top: -4px; right: -4px;
    background: #EF4444; color: #fff;
    font-size: 10px; font-weight: 700; line-height: 1;
    min-width: 16px; height: 16px; padding: 0 3px;
    border-radius: 99px; border: 2px solid #fff;
    display: none; align-items: center; justify-content: center;
}

.tf-notif-panel {
    position: fixed; top: 68px; right: 16px;
    width: 340px; max-width: calc(100vw - 24px);
    background: #fff; border: 1px solid #E2E8F0; border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0,0,0,.16);
    z-index: 1200; overflow: hidden;
    display: none; flex-direction: column; max-height: 480px;
    font-family: 'Inter', 'Plus Jakarta Sans', sans-serif;
}
.tf-notif-panel.open { display: flex; }
.tf-notif-panel-header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 16px 18px 12px; border-bottom: 1px solid #F1F5F9;
    font-weight: 700; font-size: 14px; color: #0F172A; flex-shrink: 0;
}
.tf-notif-clear {
    font-size: 12px; color: #2563EB; background: none; border: none;
    cursor: pointer; font-weight: 600; font-family: inherit;
}
.tf-notif-list { overflow-y: auto; flex: 1; }
.tf-notif-item {
    display: flex; gap: 12px; padding: 12px 18px;
    border-bottom: 1px solid #F8FAFC; align-items: flex-start;
    transition: background .15s;
}
.tf-notif-item:last-child { border-bottom: none; }
.tf-notif-item.unread { background: #EFF6FF; }
.tf-notif-item-icon {
    width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    background: #EFF6FF; color: #2563EB; overflow: hidden;
}
.tf-notif-item-icon img { width: 100%; height: 100%; object-fit: cover; }
.tf-notif-item-icon svg { width: 16px; height: 16px; }
.tf-notif-body { flex: 1; min-width: 0; }
.tf-notif-body p { font-size: 12.5px; color: #334155; line-height: 1.45; margin: 0; }
.tf-notif-time { font-size: 11px; color: #94A3B8; margin-top: 4px; display: block; }
.tf-notif-empty { padding: 32px 18px; text-align: center; color: #94A3B8; font-size: 13px; }
.tf-notif-backdrop { display: none; position: fixed; inset: 0; z-index: 1100; }
.tf-notif-backdrop.open { display: block; }
        `;
        document.head.appendChild(style);
    }

    function ensureBellDom() {
        let btn = document.getElementById('notif-btn');
        if (!btn) btn = document.querySelector('.nav-icon-btn[aria-label="Notifications"], .notif-btn');
        if (!btn) return null;
        btn.id = 'notif-btn';
        if (!btn.style.position) btn.style.position = 'relative';

        let badge = document.getElementById('notif-badge');
        if (!badge) badge = btn.querySelector('.notif-badge');
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'tf-notif-badge';
            btn.appendChild(badge);
        }
        badge.id = 'notif-badge';
        return { btn, badge };
    }

    function ensurePanelDom() {
        let panel = document.getElementById('notif-panel');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'notif-panel';
            panel.className = 'tf-notif-panel';
            panel.innerHTML = `
                <div class="tf-notif-panel-header">
                    <span>Student Activity</span>
                    <button type="button" class="tf-notif-clear" id="notif-clear-all">Mark all read</button>
                </div>
                <div class="tf-notif-list" id="notif-list"></div>`;
            document.body.appendChild(panel);
        }

        const list = document.getElementById('notif-list');
        const clearBtn = document.getElementById('notif-clear-all');

        let backdrop = document.getElementById('notif-backdrop');
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.id = 'notif-backdrop';
            backdrop.className = 'tf-notif-backdrop';
            document.body.appendChild(backdrop);
        }

        return { panel, list, clearBtn, backdrop };
    }

    function applySidebarDots(summary) {
        document.querySelectorAll('.sidebar-link[href]').forEach((link) => {
            const href = (link.getAttribute('href') || '').toLowerCase();
            const mapping = SIDEBAR_CATEGORY_MAP.find((m) => href.endsWith(m.suffix));
            if (!mapping) return;

            if (!link.querySelector(':scope > .tf-notif-dot')) {
                const dot = document.createElement('span');
                dot.className = 'tf-notif-dot';
                link.appendChild(dot);
            }
            link.classList.toggle('tf-has-dot', (summary[mapping.category] || 0) > 0);
        });
    }

    function itemIconHtml(n) {
        if (n.studentAvatar) return `<img src="${escapeHtml(n.studentAvatar)}" alt="">`;
        return CATEGORY_ICON[n.categories[0]] || CATEGORY_ICON.course;
    }

    function renderList(list, notifications) {
        if (!list) return;
        if (!notifications.length) {
            list.innerHTML = '<div class="tf-notif-empty">No student activity yet.</div>';
            return;
        }
        list.innerHTML = notifications.map((n) => `
            <div class="tf-notif-item${n.read ? '' : ' unread'}">
                <div class="tf-notif-item-icon">${itemIconHtml(n)}</div>
                <div class="tf-notif-body">
                    <p>${escapeHtml(n.message)}</p>
                    <span class="tf-notif-time">${timeAgo(n.createdAt)}</span>
                </div>
            </div>
        `).join('');
    }

    async function boot() {
        injectStyles();

        const auth = await waitFor(() => window.TalentFlowAuth);
        const store = await waitFor(() => window.TalentFlowNotifications);
        if (!auth || !store) return;

        let user;
        try { user = await auth.requireAuth(); } catch (err) { return; }
        if (!user) return;

        const bell = ensureBellDom();
        const panel = bell ? ensurePanelDom() : null;

        async function refresh() {
            const [summary, recent] = await Promise.all([
                store.getUnreadSummary(user.uid),
                panel ? store.getRecent(user.uid, 30) : Promise.resolve([]),
            ]);
            applySidebarDots(summary);
            if (bell) {
                const show = summary.total > 0;
                bell.badge.textContent = summary.total > 9 ? '9+' : String(summary.total);
                bell.badge.classList.toggle('show', show);
                bell.badge.classList.toggle('hidden', !show);
                bell.badge.style.display = show ? 'flex' : 'none';
            }
            if (panel) renderList(panel.list, recent);
        }

        // Clear this page's own dot BEFORE the first paint, so there's
        // no flash of a dot that's about to disappear.
        const pageCategory = currentPageCategory();
        if (pageCategory) await store.markCategoryRead(user.uid, pageCategory);

        await refresh();

        if (bell && panel) {
            bell.btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = panel.panel.classList.toggle('open');
                panel.backdrop.classList.toggle('open', isOpen);
            });
            panel.backdrop.addEventListener('click', () => {
                panel.panel.classList.remove('open');
                panel.backdrop.classList.remove('open');
            });
            panel.clearBtn?.addEventListener('click', async () => {
                await store.markAllRead(user.uid);
                await refresh();
            });
        }

        store.subscribeToInstructor(user.uid, () => { refresh(); });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
