(function () {
  const box = nc.qs('adminMessageBox');
  const result = nc.qs('adminResult');
  const latestOrganizerCard = nc.qs('latestOrganizerCard');
  const organizersList = nc.qs('organizersList');

  function adminHeaders() {
    return {
      'Content-Type': 'application/json',
      'x-admin-key': window.NEARCONNECT_ADMIN_MASTER_KEY,
      'apikey': window.NEARCONNECT_SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${window.NEARCONNECT_SUPABASE_ANON_KEY}`,
    };
  }

  async function callAdminFunction(name, method = 'POST', body = null) {
    const resp = await fetch(`${window.NEARCONNECT_FUNCTIONS_BASE}/${name}`, {
      method,
      headers: adminHeaders(),
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
      throw new Error(data?.error || data?.message || rawText || `HTTP ${resp.status}`);
    }

    return data;
  }

  function renderLatestOrganizer(organizer) {
    latestOrganizerCard.innerHTML = `
      <strong>${organizer.full_name}</strong><br>
      Organisation: ${organizer.organization_name || '-'}<br>
      Pays: ${organizer.country_code}<br>
      Ville: ${organizer.city}<br>
      WhatsApp: ${organizer.whatsapp_number}<br>
      Code d’accès: <strong>${organizer.access_code}</strong>
      <div class="actions" style="margin-top:12px;">
        <button class="btn btn-soft" id="copyLatestAccessCodeBtn" type="button">Copier le code</button>
      </div>
    `;

    const copyBtn = document.getElementById('copyLatestAccessCodeBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(organizer.access_code);
          nc.showMessage(box, 'Code d’accès copié.', 'success');
        } catch (err) {
          console.error('COPY LATEST ACCESS CODE ERROR:', err);
          nc.showMessage(box, 'Impossible de copier le code.', 'error');
        }
      });
    }
  }

  function renderOrganizers(organizers) {
    organizersList.innerHTML = '';

    if (!organizers || !organizers.length) {
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
          <div class="actions">
            <button class="btn btn-soft" data-copy-access="${org.access_code}">Copier le code</button>
            <button class="btn btn-soft" data-fill-access="${org.access_code}">Préparer Organizer</button>
          </div>
        </div>
      `;

      organizersList.appendChild(card);
    });

    document.querySelectorAll('[data-copy-access]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          const accessCode = btn.getAttribute('data-copy-access');
          await navigator.clipboard.writeText(accessCode);
          nc.showMessage(box, 'Code d’accès copié.', 'success');
        } catch (err) {
          console.error('COPY ACCESS CODE ERROR:', err);
          nc.showMessage(box, 'Impossible de copier le code.', 'error');
        }
      });
    });

    document.querySelectorAll('[data-fill-access]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const accessCode = btn.getAttribute('data-fill-access');
        localStorage.setItem('nc_organizer_code', accessCode);
        nc.showMessage(box, 'Code organisateur enregistré localement. Ouvre maintenant organizer.html.', 'success');
      });
    });
  }

  async function loadOrganizers() {
    try {
      const data = await callAdminFunction('list-organizers', 'GET');
      renderOrganizers(data.organizers || []);
    } catch (err) {
      console.error('LOAD ORGANIZERS ERROR:', err);
      nc.showMessage(box, err.message || 'Erreur lors du chargement des organisateurs.', 'error');
    }
  }

  nc.qs('createOrganizerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    nc.hideMessage(box);

    try {
      const data = await callAdminFunction('create-organizer', 'POST', {
        full_name: nc.qs('organizerFullName').value.trim(),
        organization_name: nc.qs('organizerOrgName').value.trim(),
        country_code: nc.qs('organizerCountryCode').value.trim().toUpperCase(),
        city: nc.qs('organizerCity').value.trim(),
        whatsapp_number: nc.qs('organizerWhatsApp').value.trim(),
      });

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
    } catch (err) {
      console.error('CREATE ORGANIZER ERROR:', err);
      nc.showMessage(box, err.message || 'Erreur de création organisateur.', 'error');
    }
  });

  nc.qs('refreshOrganizersBtn').addEventListener('click', async () => {
    nc.hideMessage(box);
    await loadOrganizers();
  });

  nc.qs('confirmPaymentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    nc.hideMessage(box);

    try {
      const data = await callAdminFunction('confirm-payment-manual', 'POST', {
        payment_reference: nc.qs('paymentReference').value.trim(),
        provider_reference: nc.qs('providerReference').value.trim() || null,
      });

      result.innerHTML = `<strong>${data.message || 'Paiement confirmé.'}</strong>`;
      nc.showMessage(box, 'Paiement confirmé.', 'success');
    } catch (err) {
      console.error('CONFIRM PAYMENT ERROR:', err);
      nc.showMessage(box, err.message || 'Erreur de confirmation.', 'error');
    }
  });

  nc.qs('closeSpaceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    nc.hideMessage(box);

    try {
      const data = await callAdminFunction('close-space', 'POST', {
        public_code: nc.qs('closePublicCode').value.trim().toUpperCase(),
        admin_pin: nc.qs('closeAdminPin').value,
      });

      result.innerHTML = `<strong>${data.message || 'Espace fermé.'}</strong>`;
      nc.showMessage(box, 'Espace fermé.', 'success');
    } catch (err) {
      console.error('CLOSE SPACE ERROR:', err);
      nc.showMessage(box, err.message || 'Erreur de fermeture.', 'error');
    }
  });

  nc.qs('purgeSpaceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    nc.hideMessage(box);

    try {
      const data = await callAdminFunction('purge-expired-space', 'POST', {
        space_id: nc.qs('purgeSpaceId').value.trim(),
      });

      result.innerHTML = `<strong>Purge exécutée:</strong> ${data.purged}`;
      nc.showMessage(box, 'Purge exécutée.', 'success');
    } catch (err) {
      console.error('PURGE ERROR:', err);
      nc.showMessage(box, err.message || 'Erreur de purge.', 'error');
    }
  });

  loadOrganizers().catch((err) => {
    console.error('INITIAL LOAD ORGANIZERS ERROR:', err);
  });
})();
