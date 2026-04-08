(function () {
  const box = nc.qs('organizerMessage');
  const identity = nc.qs('organizerIdentity');
  const result = nc.qs('organizerResult');
  const spacesList = nc.qs('organizerSpacesList');

  function organizerCode() {
    return localStorage.getItem('nc_organizer_code') || '';
  }

  function organizerHeaders() {
    return {
      'Content-Type': 'application/json',
      'x-organizer-code': organizerCode(),
      'apikey': window.NEARCONNECT_SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${window.NEARCONNECT_SUPABASE_ANON_KEY}`,
    };
  }

  function organizerGetHeaders() {
    return {
      'x-organizer-code': organizerCode(),
      'apikey': window.NEARCONNECT_SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${window.NEARCONNECT_SUPABASE_ANON_KEY}`,
    };
  }

  async function callOrganizerFunction(name, method = 'POST', body = null) {
    const resp = await fetch(`${window.NEARCONNECT_FUNCTIONS_BASE}/${name}`, {
      method,
      headers: method === 'GET' ? organizerGetHeaders() : organizerHeaders(),
      body: method === 'GET' ? undefined : JSON.stringify(body),
    });

    const rawText = await resp.text();
    console.log(`${name.toUpperCase()} STATUS:`, resp.status);
    console.log(`${name.toUpperCase()} RAW RESPONSE:`, rawText);

    let data = {};
    try { data = JSON.parse(rawText); } catch (_) {}

    if (!resp.ok) {
      throw new Error(data?.error || data?.message || rawText || `HTTP ${resp.status}`);
    }

    return data;
  }

  function showOrganizerSections() {
    nc.qs('organizerIdentitySection').classList.remove('hidden');
    nc.qs('organizerCreateSection').classList.remove('hidden');
    nc.qs('organizerResultSection').classList.remove('hidden');
    nc.qs('organizerStatsSection').classList.remove('hidden');
    nc.qs('organizerSpacesSection').classList.remove('hidden');
  }

  function localToIso(value) {
    return value ? new Date(value).toISOString() : '';
  }

  async function refreshOrganizerData() {
    const stats = await callOrganizerFunction('get-organizer-stats', 'GET');
    const spaces = await callOrganizerFunction('list-organizer-spaces', 'GET');

    identity.innerHTML = `
      <strong>${stats.organizer.full_name}</strong><br>
      ${stats.organizer.organization_name || '-'}
    `;

    nc.qs('orgTotalSpaces').textContent = String(stats.summary.total_spaces || 0);
    nc.qs('orgTotalProfiles').textContent = String(stats.summary.total_profiles || 0);
    nc.qs('orgTotalPaid').textContent = String(stats.summary.total_paid || 0);
    nc.qs('orgTotalRevenue').textContent = Number(stats.summary.total_revenue || 0).toFixed(2);

    renderSpaces(spaces.spaces || []);
  }

  function renderSpaces(spaces) {
    spacesList.innerHTML = '';

    if (!spaces.length) {
      spacesList.innerHTML = '<div class="info-box">Aucun espace créé pour le moment.</div>';
      return;
    }

    spaces.forEach(space => {
      const card = document.createElement('article');
      card.className = 'card';

      card.innerHTML = `
        <div class="card-body">
          <strong>${space.event_name}</strong>
          <div class="meta">
            <span class="tag purple">${space.country_code}</span>
            <span class="tag gold">${space.city}</span>
            <span class="tag green">${space.status}</span>
          </div>
          <div class="muted">
            Code public: ${space.public_code}<br>
            Début: ${nc.formatDate(space.starts_at)}<br>
            Fin: ${nc.formatDate(space.ends_at)}<br>
            ${space.qr_url ? `QR / Lien: <a href="${space.qr_url}" target="_blank" rel="noopener">${space.qr_url}</a>` : ''}
          </div>
          <div class="actions">
            <button class="btn btn-danger" data-close-space="${space.id}">Désactiver</button>
          </div>
        </div>
      `;

      spacesList.appendChild(card);
    });

    document.querySelectorAll('[data-close-space]').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          const spaceId = btn.getAttribute('data-close-space');
          const data = await callOrganizerFunction('close-organizer-space', 'POST', { space_id: spaceId });
          nc.showMessage(box, data.message || 'Espace désactivé.', 'success');
          await refreshOrganizerData();
        } catch (err) {
          console.error('CLOSE ORGANIZER SPACE ERROR:', err);
          nc.showMessage(box, err.message || 'Erreur de désactivation.', 'error');
        }
      });
    });
  }

  nc.qs('organizerLoginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    nc.hideMessage(box);

    try {
      const accessCode = nc.qs('organizerAccessCode').value.trim().toUpperCase();

      const resp = await fetch(`${window.NEARCONNECT_FUNCTIONS_BASE}/organizer-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': window.NEARCONNECT_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${window.NEARCONNECT_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ access_code: accessCode }),
      });

      const rawText = await resp.text();
      console.log('ORGANIZER-LOGIN STATUS:', resp.status);
      console.log('ORGANIZER-LOGIN RAW RESPONSE:', rawText);

      let data = {};
      try { data = JSON.parse(rawText); } catch (_) {}

      if (!resp.ok) {
        throw new Error(data?.error || data?.message || rawText || `HTTP ${resp.status}`);
      }

      localStorage.setItem('nc_organizer_code', accessCode);

      showOrganizerSections();
      await refreshOrganizerData();

      nc.showMessage(box, 'Connexion organisateur réussie.', 'success');
    } catch (err) {
      console.error('ORGANIZER LOGIN ERROR:', err);
      nc.showMessage(box, err.message || 'Erreur de connexion.', 'error');
    }
  });

  nc.qs('organizerCreateForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    nc.hideMessage(box);

    try {
      const location = await nc.getLocation();

      const data = await callOrganizerFunction('create-organizer-space', 'POST', {
        country_code: nc.qs('countryCode').value.trim().toUpperCase(),
        city: nc.qs('city').value.trim(),
        venue_name: nc.qs('venueName').value.trim(),
        event_name: nc.qs('eventName').value.trim(),
        starts_at: localToIso(nc.qs('startsAt').value),
        ends_at: localToIso(nc.qs('endsAt').value),
        latitude: location.lat,
        longitude: location.lng,
      });

      result.innerHTML = `
        <strong>Espace créé</strong><br>
        Événement: ${data.space.event_name}<br>
        Code public: <strong>${data.space.public_code}</strong><br>
        Space ID: ${data.space.id}<br>
        QR / Lien: <a href="${data.qr_url}" target="_blank" rel="noopener">${data.qr_url}</a>
      `;

      nc.showMessage(box, 'Espace créé avec succès.', 'success');
      await refreshOrganizerData();
    } catch (err) {
      console.error('CREATE ORGANIZER SPACE ERROR:', err);
      nc.showMessage(box, err.message || 'Erreur de création.', 'error');
    }
  });

  if (organizerCode()) {
    showOrganizerSections();
    refreshOrganizerData().catch(() => {});
  }
})();
