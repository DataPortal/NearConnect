<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NearConnect Organizer</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <header class="header">
    <div class="container header-inner">
      <div class="brand">
        <div class="logo">N</div>
        <div>
          <h1>NearConnect Organizer</h1>
          <p>Portail lieux et organisateurs autorisés</p>
        </div>
      </div>
      <div class="nav">
        <a class="btn btn-soft" href="admin.html">Admin</a>
        <a class="btn btn-soft" href="index.html">Client</a>
        <a class="btn btn-soft" href="dashboard.html">Dashboard</a>
      </div>
    </div>
  </header>

  <main class="container page">
    <section class="panel hero">
      <span class="badge">Organizer Portal</span>
      <h2>Créer, gérer et partager les QR codes de tes espaces</h2>
      <p>
        Connecte-toi avec ton code d’accès, crée un espace, récupère le QR code à partager avec tes clients,
        désactive l’espace et consulte tes statistiques.
      </p>
    </section>

    <section class="panel">
      <div id="organizerMessage" class="message hidden"></div>

      <form id="organizerLoginForm" class="form">
        <label>Code d’accès organisateur
          <input id="organizerAccessCode" type="text" placeholder="Ex: ORG-AB12CD34" required />
        </label>
        <div class="actions">
          <button class="btn btn-primary" type="submit">Se connecter</button>
        </div>
      </form>
    </section>

    <section id="organizerIdentitySection" class="panel hidden">
      <h3>Organisateur connecté</h3>
      <div id="organizerIdentity" class="info-box"></div>
    </section>

    <section id="organizerCreateSection" class="panel hidden">
      <h3>Créer un espace</h3>
      <form id="organizerCreateForm" class="form">
        <div class="grid-2">
          <label>Pays
            <input id="countryCode" required />
          </label>
          <label>Ville
            <input id="city" required />
          </label>
        </div>

        <div class="grid-2">
          <label>Lieu
            <input id="venueName" required />
          </label>
          <label>Nom de la soirée
            <input id="eventName" required />
          </label>
        </div>

        <div class="grid-2">
          <label>Début
            <input id="startsAt" type="datetime-local" required />
          </label>
          <label>Fin
            <input id="endsAt" type="datetime-local" required />
          </label>
        </div>

        <div class="helper-box">
          La position du lieu sera capturée automatiquement au moment de la création.
        </div>

        <div class="actions">
          <button class="btn btn-primary" type="submit">Créer l’espace</button>
        </div>
      </form>
    </section>

    <section id="organizerResultSection" class="panel hidden">
      <h3>Dernier espace créé</h3>
      <div id="organizerResult" class="info-box"></div>

      <div id="latestQrSection" class="panel" style="margin-top:16px; background: rgba(255,255,255,.03);">
        <h4 style="margin-top:0;">QR code du dernier espace</h4>
        <div class="cards" style="grid-template-columns: 320px 1fr; align-items:start;">
          <div class="info-box" style="display:grid; place-items:center;">
            <canvas id="latestQrCanvas" width="280" height="280" style="background:white; border-radius:14px; padding:12px;"></canvas>
          </div>
          <div class="info-box">
            <div id="latestQrMeta">Aucun QR généré.</div>
            <div class="actions" style="margin-top:14px;">
              <button id="downloadLatestQrBtn" class="btn btn-success" type="button">Télécharger le QR</button>
              <button id="copyLatestQrLinkBtn" class="btn btn-soft" type="button">Copier le lien client</button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section id="organizerStatsSection" class="panel hidden">
      <h3>Résumé</h3>
      <div class="kpi">
        <div class="info-box"><strong id="orgTotalSpaces">0</strong><span>Espaces</span></div>
        <div class="info-box"><strong id="orgTotalProfiles">0</strong><span>Profils</span></div>
        <div class="info-box"><strong id="orgTotalPaid">0</strong><span>Payés</span></div>
        <div class="info-box"><strong id="orgTotalRevenue">0</strong><span>Revenu</span></div>
      </div>
    </section>

    <section id="organizerSpacesSection" class="panel hidden">
      <h3>Mes espaces et QR codes</h3>
      <div id="organizerSpacesList" class="cards"></div>
    </section>
  </main>

  <footer class="footer">NearConnect Africa — Organizer</footer>

  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js"></script>
  <script src="env.js"></script>
  <script src="supabase.js"></script>
  <script src="utils.js"></script>
  <script src="organizer.js"></script>
</body>
</html>
