(function () {
  const box = nc.qs('adminMessageBox');
  const result = nc.qs('adminResult');
  const latestOrganizerCard = nc.qs('latestOrganizerCard');
  const organizersList = nc.qs('organizersList');

  function adminHeaders() {
    return {
      'Content-Type': 'application/json',
      'x-admin-key': window.NEARCONNECT_ADMIN_MASTER_KEY,
      apikey: window.NEARCONNECT_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${window.NEARCONNECT_SUPABASE_ANON_KEY}`,
    };
  }

  async function callAdminFunction(name, method = 'POST', body = null) {
    const resp = await fetch(`${window.NEARCONNECT_FUNCTIONS_BASE}/${name}`, {
      method,
      headers: adminHeaders(),
      body: method === 'GET' ? undefined : JSON.stringify(body),
    });

    const rawText = await resp.text();
    let data = {};
    try { data = JSON.parse(rawText); } catch (_) {}

    if (!resp.ok) {
      throw new Error(data?.error || data?.details || data?.message || rawText || `HTTP ${resp.status}`);
    }

    return data;
  }

  function renderLatestOrganizer(organizer) {
    if (!organizer) return;

    latestOrganizerCard.innerHTML = `
      <strong>${organizer.full_name}</strong><br>
      Organisation: ${organizer.organization_name || '-'}<br>
      Pays: ${organizer.country_code}<br>
      Ville: ${organizer.city}<br>
      WhatsApp: ${organizer.whatsapp_number}<br>
      Code d’accès: <strong>${organizer.access_code}</strong>
    `;
  }

  function renderOrganizers(organizers) {
    organizersList.innerHTML = '';

    if (!organizers?.length) {
      organizersList.innerHTML = '<div class="info-box">Aucun organisateur trouvé.</div>';
      return;
    }

    organizers.forEach((org) => {
      const card = document.createElement('article');
      card.className = 'card';
      card.innerHTML = `
        <div class="card-body">
          <strong>${org.full_name}</strong>
          <div class="meta">
            <span class="tag purple">${org.country_code}</span>
            <span class="tag gold">${org.city}</span>
            <span class="tag ${org.is_active ? 'green' : 'purple'}">${org.is_active ? 'Actif' : 'Inactif'}</span>
          </div>
          <div class="muted">
            Organisation: ${org.organization_name || '-'}<br>
            WhatsApp: ${org.whatsapp_number}<br>
            Code d’accès: <strong>${org.access_code}</strong><br>
            Créé le: ${nc.formatDate(org.created_at)}
          </div>
        </div>
      `;
      organizersList.appendChild(card);
    });
  }

  async function loadOrganizers() {
    try {
      const data = await callAdminFunction('list-organizers', 'GET');
      renderOrganizers(data.organizers || []);
    } catch (err) {
      nc.showMessage(box, err.message || 'Erreur lors du chargement des organisateurs.', 'error');
    }
  }

  nc.qs('createOrganizerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    nc.hideMessage(box);

    try {
      const payload = {
        full_name: nc.qs('organizerFullName').value.trim(),
        organization_name: nc.qs('organizerOrgName').value.trim(),
        country_code: nc.qs('organizerCountryCode').value.trim().toUpperCase(),
        city: nc.qs('organizerCity').value.trim(),
        whatsapp_number: nc.qs('organizerWhatsApp').value.trim(),
      };

      const data = await callAdminFunction('create-organizer', 'POST', payload);

      result.innerHTML = `
        <strong>Organisateur créé</strong><br>
        Nom: ${data.organizer.full_name}<br>
        Organisation: ${data.organizer.organization_name || '-'}<br>
        Ville: ${data.organizer.city}<br>
        Code d’accès: <strong>${data.organizer.access_code}</strong>
      `;

      renderLatestOrganizer(data.organizer);
      await loadOrganizers();

      nc.showMessage(box, 'Organisateur créé avec succès.', 'success');
      nc.qs('createOrganizerForm').reset();
    } catch (err) {
      nc.showMessage(box, err.message || 'Erreur de création organisateur.', 'error');
    }
  });

  nc.qs('refreshOrganizersBtn')?.addEventListener('click', async () => {
    nc.hideMessage(box);
    await loadOrganizers();
  });

  loadOrganizers().catch(() => {});
})();
