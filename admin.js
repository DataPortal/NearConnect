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

  async function getLocation() {
    return await nc.getLocation();
  }

  nc.qs('approveRequestForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    nc.hideMessage(box);

    try {
      const location = await getLocation();

      const data = await callAdminFunction('approve-space', {
        request_id: nc.qs('approveRequestId').value.trim(),
        latitude: location.lat,
        longitude: location.lng,
        admin_pin: nc.qs('approveAdminPin').value,
      });

      result.innerHTML = `
        <strong>Demande approuvée</strong><br>
        Référence demande: ${data.request.reference}<br>
        Espace: ${data.space.event_name}<br>
        Code public: <strong>${data.space.public_code}</strong><br>
        Space ID: ${data.space.id}<br>
        QR / Lien: <a href="${data.qr_url}" target="_blank" rel="noopener">${data.qr_url}</a>
      `;

      nc.showMessage(box, 'Demande approuvée et espace créé.', 'success');
    } catch (err) {
      console.error('APPROVE REQUEST ERROR:', err);
      nc.showMessage(box, err.message || 'Erreur d’approbation.', 'error');
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
