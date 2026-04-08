(function () {
  const box = nc.qs('adminMessageBox');
  const result = nc.qs('adminResult');

  function adminHeaders() {
    return {
      'Content-Type': 'application/json',
      'x-admin-key': window.NEARCONNECT_ADMIN_MASTER_KEY,
      'apikey': window.NEARCONNECT_SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${window.NEARCONNECT_SUPABASE_ANON_KEY}`,
    };
  }

  async function callAdminFunction(name, body) {
    const resp = await fetch(`${window.NEARCONNECT_FUNCTIONS_BASE}/${name}`, {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify(body),
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

  nc.qs('createOrganizerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    nc.hideMessage(box);

    try {
      const data = await callAdminFunction('create-organizer', {
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

      nc.showMessage(box, 'Organisateur créé avec succès.', 'success');
    } catch (err) {
      console.error('CREATE ORGANIZER ERROR:', err);
      nc.showMessage(box, err.message || 'Erreur de création organisateur.', 'error');
    }
  });

  nc.qs('confirmPaymentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    nc.hideMessage(box);

    try {
      const data = await callAdminFunction('confirm-payment-manual', {
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
      const data = await callAdminFunction('close-space', {
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
      const data = await callAdminFunction('purge-expired-space', {
        space_id: nc.qs('purgeSpaceId').value.trim(),
      });

      result.innerHTML = `<strong>Purge exécutée:</strong> ${data.purged}`;
      nc.showMessage(box, 'Purge exécutée.', 'success');
    } catch (err) {
      console.error('PURGE ERROR:', err);
      nc.showMessage(box, err.message || 'Erreur de purge.', 'error');
    }
  });
})();
