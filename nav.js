(function () {
  const path = window.location.pathname.toLowerCase();

  const isClient = path.endsWith('/index.html') || path.endsWith('/nearconnect/') || path.endsWith('/nearconnect');
  const isPartners = path.endsWith('/partenaires.html');
  const isAdmin = path.endsWith('/admin.html');
  const isDashboard = path.endsWith('/dashboard.html');

  function activeClass(condition) {
    return condition ? 'nav-pill active' : 'nav-pill';
  }

  function buildNav() {
    return `
      <div class="global-nav-shell">
        <div class="container global-nav-inner">
          <div class="global-nav-brand">
            <div class="global-nav-logo">N</div>
            <div class="global-nav-brand-text">
              <strong>NearConnect</strong>
              <span>Plateforme unifiée</span>
            </div>
          </div>

          <nav class="global-nav-links" aria-label="Navigation principale">
            <a class="${activeClass(isClient)}" href="index.html">
              <span class="nav-dot"></span>
              <span>Client</span>
            </a>

            <a class="${activeClass(isPartners)}" href="partenaires.html">
              <span class="nav-dot"></span>
              <span>Partenaires</span>
            </a>

            <a class="${activeClass(isAdmin)}" href="admin.html">
              <span class="nav-dot"></span>
              <span>Admin</span>
            </a>

            <a class="${activeClass(isDashboard)}" href="dashboard.html">
              <span class="nav-dot"></span>
              <span>Vue globale</span>
            </a>
          </nav>
        </div>
      </div>
    `;
  }

  function injectNav() {
    const target = document.getElementById('globalNavMount');
    if (!target) return;
    target.innerHTML = buildNav();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectNav);
  } else {
    injectNav();
  }
})();
