(function () {
  const box = nc.qs('adminMessageBox');
  const result = nc.qs('adminResult');

  function adminHeaders() {
    return { 'x-admin-key': window.NEARCONNECT_ADMIN_MASTER_KEY };
  }

  function localToIso(value) {
    return value ? new Date(value).toISOString() : '';
  }

  nc.qs('createSpaceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    nc.hideMessage(box);

    try {
      const location = await nc.getLocation();

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

      const { data, error } = await nc.invoke('create-space', {
        headers: adminHeaders(),
        body,
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

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
      nc.showMessage(box, err.message || 'Erreur de création.', 'error');
    }
  });

  nc.qs('confirmPaymentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    nc.hideMessage(box);

    try {
      const { data, error } = await nc.invoke('confirm-payment-manual', {
        headers: adminHeaders(),
        body: {
          payment_reference: nc.qs('paymentReference').value.trim(),
          provider_reference: nc.qs('providerReference').value.trim() || null,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      result.innerHTML = '<strong>Paiement confirmé.</strong>';
      nc.showMessage(box, 'Paiement confirmé et déblocage activé.', 'success');
    } catch (err) {
      nc.showMessage(box, err.message || 'Erreur de confirmation.', 'error');
    }
  });

  nc.qs('closeSpaceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    nc.hideMessage(box);

    try {
      const { data, error } = await nc.invoke('close-space', {
        headers: adminHeaders(),
        body: {
          public_code: nc.qs('closePublicCode').value.trim().toUpperCase(),
          admin_pin: nc.qs('closeAdminPin').value,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      result.innerHTML = '<strong>Espace fermé.</strong>';
      nc.showMessage(box, 'Espace fermé.', 'success');
    } catch (err) {
      nc.showMessage(box, err.message || 'Erreur de fermeture.', 'error');
    }
  });

  nc.qs('purgeSpaceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    nc.hideMessage(box);

    try {
      const { data, error } = await nc.invoke('purge-expired-space', {
        headers: adminHeaders(),
        body: {
          space_id: nc.qs('purgeSpaceId').value.trim(),
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      result.innerHTML = `<strong>Purge exécutée:</strong> ${data.purged}`;
      nc.showMessage(box, 'Purge exécutée.', 'success');
    } catch (err) {
      nc.showMessage(box, err.message || 'Erreur de purge.', 'error');
    }
  });
})();
