(function () {
  const box = nc.qs('adminMessageBox');
  const result = nc.qs('adminResult');

  function localToIso(value) {
    return value ? new Date(value).toISOString() : '';
  }

  function getFallbackLocation() {
    return {
      lat: -1.9441,
      lng: 30.0619,
    };
  }

  async function callFunction(name, body) {
    const resp = await fetch(`${window.NEARCONNECT_FUNCTIONS_BASE}/${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': window.NEARCONNECT_ADMIN_MASTER_KEY,
        'apikey': window.NEARCONNECT_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${window.NEARCONNECT_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(body),
    });

    const rawText = await resp.text();
    console.log(`${name.toUpperCase()} STATUS:`, resp.status);
    console.log(`${name.toUpperCase()} RAW RESPONSE:`, rawText);

    let data = {};
    try {
      data = JSON.parse(rawText);
    } catch (_) {}

    if (!resp.ok) {
      throw new Error(data?.error || rawText || `HTTP ${resp.status}`);
    }

    return data;
  }

  nc.qs('createSpaceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    nc.hideMessage(box);

    try {
      const location = getFallbackLocation();

      const body = {
        venue_name: nc.qs('venueName').value.trim(),
        city: nc.qs('city').value.trim(),
        country_code: nc.qs('countryCode').value.trim().toUpperCase(),
        latitude: location.lat,
        longitude: location.lng,
        radius_meters: Number(nc.qs('radiusMeters').value),
        event_name: nc.qs('eventName').value.trim(),
        starts_at: localToIso(nc.qs('startsAt').value),
        ends_at: localToIso(nc.qs('endsAt').value),
        admin_pin: nc.qs('adminPin').value,
        created_by: 'github-admin',
      };

      console.log('ADMIN KEY SENT:', window.NEARCONNECT_ADMIN_MASTER_KEY);
      console.log('CREATE SPACE BODY:', body);

      const data = await callFunction('create-space', body);

      result.innerHTML = `
        <strong>Espace créé</strong><br>
        Venue: ${data.venue.name}<br>
        Event: ${data.space.event_name}<br>
        Code: ${data.space.public_code}<br>
        Space ID: ${data.space.id}<br>
        Join URL: ${window.location.origin}${window.location.pathname.replace('admin.html', 'index.html')}?code=${data.space.public_code}
      `;

      nc.showMessage(box, 'Espace créé avec succès.', 'success');
    } catch (err) {
      console.error('CREATE SPACE FINAL ERROR:', err);
      nc.showMessage(box, err.message || 'Erreur de création.', 'error');
    }
  });

  nc.qs('confirmPaymentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    nc.hideMessage(box);

    try {
      const data = await callFunction('confirm-payment-manual', {
        payment_reference: nc.qs('paymentReference').value.trim(),
        provider_reference: nc.qs('providerReference').value.trim() || null,
      });

      result.innerHTML = `<strong>${data.message || 'Paiement confirmé.'}</strong>`;
      nc.showMessage(box, 'Paiement confirmé et déblocage activé.', 'success');
    } catch (err) {
      console.error('CONFIRM PAYMENT ERROR:', err);
      nc.showMessage(box, err.message || 'Erreur de confirmation.', 'error');
    }
  });

  nc.qs('closeSpaceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    nc.hideMessage(box);

    try {
      const data = await callFunction('close-space', {
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
      const data = await callFunction('purge-expired-space', {
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
