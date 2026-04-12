(function () {
  const box = nc.qs('organizerMessage');
  const identity = nc.qs('organizerIdentity');
  const result = nc.qs('organizerResult');
  const spacesList = nc.qs('organizerSpacesList');
  const latestQrCanvas = nc.qs('latestQrCanvas');
  const latestQrMeta = nc.qs('latestQrMeta');
  const downloadLatestQrBtn = nc.qs('downloadLatestQrBtn');
  const copyLatestQrLinkBtn = nc.qs('copyLatestQrLinkBtn');
  const organizerCityStats = nc.qs('organizerCityStats');

  let latestQrValue = '';
  let latestQrFileName = 'nearconnect-qr.png';

  function partnerCode() {
    return localStorage.getItem('nc_organizer_code') || '';
  }

  function partnerHeaders() {
    return {
      'Content-Type': 'application/json',
      'x-organizer-code': partnerCode(),
      apikey: window.NEARCONNECT_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${window.NEARCONNECT_SUPABASE_ANON_KEY}`,
    };
  }

  function partnerGetHeaders() {
    return {
      'x-organizer-code': partnerCode(),
      apikey: window.NEARCONNECT_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${window.NEARCONNECT_SUPABASE_ANON_KEY}`,
    };
  }

  async function callPartnerFunction(name, method = 'POST', body = null) {
    const resp = await fetch(`${window.NEARCONNECT_FUNCTIONS_BASE}/${name}`, {
      method,
      headers: method === 'GET' ? partnerGetHeaders() : partnerHeaders(),
      body: method === 'GET' ? undefined : JSON.stringify(body),
    });

    const rawText = await resp.text();
    console.log(`${name.toUpperCase()} STATUS:`, resp.status);
    console.log(`${name.toUpperCase()} RAW RESPONSE:`, rawText);

    let data = {};
    try {
      data = JSON.parse(rawText);
    } catch (_) {}

    if (!resp.ok) {
      throw new Error(
        data?.error ||
        data?.details ||
        data?.message ||
        rawText ||
        `HTTP ${resp.status}`
      );
    }

    return data;
  }

  function showPartnerSections() {
    nc.qs('organizerIdentitySection')?.classList.remove('hidden');
    nc.qs('organizerCreateSection')?.classList.remove('hidden');
    nc.qs('organizerResultSection')?.classList.remove('hidden');
    nc.qs('organizerStatsSection')?.classList.remove('hidden');
    nc.qs('organizerStatusSection')?.classList.remove('hidden');
    nc.qs('organizerCitySection')?.classList.remove('hidden');
    nc.qs('organizerSpacesSection')?.classList.remove('hidden');
  }

  function localToIso(value) {
    return value ? new Date(value).toISOString() : '';
  }

  async function renderQrToCanvas(canvas, value) {
    if (!value || !canvas || typeof QRCode === 'undefined') return;

    await QRCode.toCanvas(canvas, value, {
      width: 280,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#111111',
        light: '#ffffff',
      },
    });
  }

  async function setLatestQr(space) {
    if (!space || !space.qr_url) return;

    latestQrValue = space.qr_url;
    latestQrFileName = `nearconnect-${space.public_code || 'space'}.png`;

    await renderQrToCanvas(latestQrCanvas, latestQrValue);

    if (latestQrMeta) {
      latestQrMeta.innerHTML = `
        <strong>${space.event_name}</strong><br>
        Lieu: ${space.venue_name || '-'}<br>
        Code public: ${space.public_code}<br>
        Ville: ${space.city || '-'}<br>
        Profils: ${space.total_profiles || 0}<br>
        Payés: ${space.total_paid || 0}<br>
        Revenu: ${Number(space.total_revenue || 0).toFixed(2)} ${space.currency_code || ''}<br>
        Début: ${nc.formatDate(space.starts_at)}<br>
        Fin: ${nc.formatDate(space.ends_at)}<br>
        Lien client: <a href="${space.qr_url}" target="_blank" rel="noopener">${space.qr_url}</a>
      `;
    }
  }

  function downloadCanvas(canvas, filename) {
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  function renderCityStats(byCity = []) {
    if (!organizerCityStats) return;

    organizerCityStats.innerHTML = '';

    if (!byCity.length) {
      organizerCityStats.innerHTML = '<div class="info-box">Aucune statistique par ville disponible.</div>';
      return;
    }

    byCity.forEach((city) => {
      const card = document.createElement('div');
      card.className = 'info-box';
      card.innerHTML = `
        <strong>${city.city || '-'}</strong><br>
        Espaces: ${city.total_spaces || 0}<br>
        Profils: ${city.total_profiles || 0}<br>
        Payés: ${city.total_paid || 0}<br>
        Revenu: ${Number(city.total_revenue || 0).toFixed(2)}
      `;
      organizerCityStats.appendChild(card);
    });
  }

  async function refreshPartnerData() {
    const data = await callPartnerFunction('get-organizer-stats', 'GET');
    const partner = data.organizer || data.partner || {};

    if (identity) {
      identity.innerHTML = `
        <strong>${partner.full_name || '-'}</strong><br>
        ${partner.organization_name || '-'}<br>
        ${partner.city || '-'} — ${partner.country_code || '-'}<br>
        WhatsApp: ${partner.whatsapp_number || '-'}
      `;
    }

    nc.qs('orgTotalSpaces').textContent = String(data.summary?.total_spaces || 0);
    nc.qs('orgTotalProfiles').textContent = String(data.summary?.total_profiles || 0);
    nc.qs('orgTotalPaid').textContent = String(data.summary?.total_paid || 0);
    nc.qs('orgTotalRevenue').textContent = Number(data.summary?.total_revenue || 0).toFixed(2);

    nc.qs('orgActiveSpaces').textContent = String(data.summary?.active_spaces || 0);
    nc.qs('orgDraftSpaces').textContent = String(data.summary?.draft_spaces || 0);
    nc.qs('orgClosedSpaces').textContent = String(data.summary?.closed_spaces || 0);
    nc.qs('orgExpiredSpaces').textContent = String(data.summary?.expired_spaces || 0);
    nc.qs('orgPurgedSpaces').textContent = String(data.summary?.purged_spaces || 0);

    renderCityStats(data.by_city || []);
    renderSpaces(data.spaces || []);
  }

  function buildSpaceCard(space) {
    return `
      <div class="card-body">
        <strong>${space.event_name}</strong>
        <div class="meta">
          <span class="tag purple">${space.country_code || '-'}</span>
          <span class="tag gold">${space.city || '-'}</span>
          <span class="tag green">${space.status || '-'}</span>
        </div>
        <div class="muted">
          Lieu: ${space.venue_name || '-'}<br>
          Code public: ${space.public_code || '-'}<br>
          Devise: ${space.currency_code || '-'}<br>
          Fuseau: ${space.time_zone || '-'}<br>
          Profils: ${space.total_profiles || 0}<br>
          Payés: ${space.total_paid || 0}<br>
          Revenu: ${Number(space.total_revenue || 0).toFixed(2)} ${space.currency_code || ''}<br>
          Début: ${nc.formatDate(space.starts_at)}<br>
          Fin: ${nc.formatDate(space.ends_at)}<br>
          ${space.qr_url ? `Lien client: <a href="${space.qr_url}" target="_blank" rel="noopener">${space.qr_url}</a>` : ''}
        </div>
        <div class="actions">
          <button class="btn btn-soft" data-show-qr="${space.id}">Afficher QR</button>
          <button class="btn btn-soft" data-copy-link="${space.id}">Copier lien</button>
          <button class="btn btn-danger" data-close-space="${space.id}">Désactiver</button>
        </div>
        <div class="info-box" id="qr-box-${space.id}" style="display:none; margin-top:12px;">
          <canvas id="qr-canvas-${space.id}" width="240" height="240" style="background:white; border-radius:12px; padding:10px;"></canvas>
          <div class="actions" style="margin-top:12px;">
            <button class="btn btn-success" data-download-qr="${space.id}">Télécharger le QR</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderSpaces(spaces) {
    if (!spacesList) return;

    spacesList.innerHTML = '';

    if (!spaces.length) {
      spacesList.innerHTML = '<div class="info-box">Aucun espace créé pour le moment.</div>';
      return;
    }

    spaces.forEach((space) => {
      const card = document.createElement('article');
      card.className = 'card';
      card.dataset.spaceId = space.id;
      card.dataset.qrUrl = space.qr_url || '';
      card.dataset.publicCode = space.public_code || '';
      card.innerHTML = buildSpaceCard(space);
      spacesList.appendChild(card);
    });

    document.querySelectorAll('[data-show-qr]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const spaceId = btn.getAttribute('data-show-qr');
        const card = btn.closest('.card');
        const qrUrl = card.dataset.qrUrl;
        const qrBox = document.getElementById(`qr-box-${spaceId}`);
        const qrCanvas = document.getElementById(`qr-canvas-${spaceId}`);

        if (qrBox) qrBox.style.display = 'block';
        await renderQrToCanvas(qrCanvas, qrUrl);
      });
    });

    document.querySelectorAll('[data-download-qr]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const spaceId = btn.getAttribute('data-download-qr');
        const card = btn.closest('.card');
        const publicCode = card.dataset.publicCode || 'space';
        const qrCanvas = document.getElementById(`qr-canvas-${spaceId}`);
        downloadCanvas(qrCanvas, `nearconnect-${publicCode}.png`);
      });
    });

    document.querySelectorAll('[data-copy-link]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          const card = btn.closest('.card');
          const qrUrl = card.dataset.qrUrl;
          await navigator.clipboard.writeText(qrUrl);
          nc.showMessage(box, 'Lien client copié.', 'success');
        } catch (err) {
          console.error('COPY LINK ERROR:', err);
          nc.showMessage(box, 'Impossible de copier le lien.', 'error');
        }
      });
    });

    document.querySelectorAll('[data-close-space]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          const spaceId = btn.getAttribute('data-close-space');
          const data = await callPartnerFunction('close-organizer-space', 'POST', {
            space_id: spaceId,
          });

          nc.showMessage(box, data.message || 'Espace désactivé.', 'success');
          await refreshPartnerData();
        } catch (err) {
          console.error('CLOSE PARTNER SPACE ERROR:', err);
          nc.showMessage(box, err.message || 'Erreur de désactivation.', 'error');
        }
      });
    });
  }

  downloadLatestQrBtn?.addEventListener('click', () => {
    if (!latestQrValue) {
      nc.showMessage(box, 'Aucun QR disponible à télécharger.', 'error');
      return;
    }
    downloadCanvas(latestQrCanvas, latestQrFileName);
  });

  copyLatestQrLinkBtn?.addEventListener('click', async () => {
    try {
      if (!latestQrValue) throw new Error('Aucun lien client disponible.');
      await navigator.clipboard.writeText(latestQrValue);
      nc.showMessage(box, 'Lien client copié.', 'success');
    } catch (err) {
      console.error('COPY LATEST LINK ERROR:', err);
      nc.showMessage(box, err.message || 'Impossible de copier le lien.', 'error');
    }
  });

  nc.qs('organizerLoginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    nc.hideMessage(box);

    try {
      const accessCode = nc.qs('organizerAccessCode').value.trim().toUpperCase();
      if (!accessCode) {
        throw new Error('Le code d’accès partenaire est requis.');
      }

      const resp = await fetch(`${window.NEARCONNECT_FUNCTIONS_BASE}/organizer-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: window.NEARCONNECT_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${window.NEARCONNECT_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ access_code: accessCode }),
      });

      const rawText = await resp.text();
      console.log('ORGANIZER-LOGIN STATUS:', resp.status);
      console.log('ORGANIZER-LOGIN RAW RESPONSE:', rawText);

      let data = {};
      try {
        data = JSON.parse(rawText);
      } catch (_) {}

      if (!resp.ok) {
        throw new Error(
          data?.error ||
          data?.details ||
          data?.message ||
          rawText ||
          `HTTP ${resp.status}`
        );
      }

      localStorage.setItem('nc_organizer_code', accessCode);

      showPartnerSections();
      await refreshPartnerData();

      nc.showMessage(box, data.message || 'Connexion partenaire réussie.', 'success');
    } catch (err) {
      console.error('PARTNER LOGIN ERROR:', err);
      nc.showMessage(box, err.message || 'Erreur de connexion.', 'error');
    }
  });

  nc.qs('organizerCreateForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    nc.hideMessage(box);

    try {
      const location = await nc.getLocation();

      const data = await callPartnerFunction('create-organizer-space', 'POST', {
        country_code: nc.qs('countryCode').value.trim().toUpperCase(),
        city: nc.qs('city').value.trim(),
        venue_name: nc.qs('venueName').value.trim(),
        event_name: nc.qs('eventName').value.trim(),
        starts_at: localToIso(nc.qs('startsAt').value),
        ends_at: localToIso(nc.qs('endsAt').value),
        latitude: location.lat,
        longitude: location.lng,
      });

      if (result) {
        result.innerHTML = `
          <strong>Espace créé</strong><br>
          Événement: ${data.space.event_name}<br>
          Code public: <strong>${data.space.public_code}</strong><br>
          Space ID: ${data.space.id}<br>
          Lien client: <a href="${data.qr_url}" target="_blank" rel="noopener">${data.qr_url}</a>
        `;
      }

      const enrichedSpace = {
        ...data.space,
        venue_name: data.venue?.name || '-',
        total_profiles: 0,
        total_paid: 0,
        total_revenue: 0,
      };

      await setLatestQr(enrichedSpace);

      nc.showMessage(box, data.message || 'Espace créé avec succès.', 'success');
      await refreshPartnerData();
    } catch (err) {
      console.error('CREATE PARTNER SPACE ERROR:', err);
      nc.showMessage(box, err.message || 'Erreur de création.', 'error');
    }
  });

  if (partnerCode()) {
    showPartnerSections();
    refreshPartnerData().catch((err) => {
      console.error('AUTO REFRESH PARTNER ERROR:', err);
    });
  }
})();
