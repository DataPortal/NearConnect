(async function () {
  const messageBox = nc.qs('messageBox');
  const spaceInfo = nc.qs('spaceInfo');
  const registerForm = nc.qs('registerForm');
  const paymentPreview = nc.qs('paymentPreview');
  const profilesList = nc.qs('profilesList');
  const publicCode = nc.getQueryParam('code');

  async function joinSpace() {
    try {
      const loc = await nc.getLocation();
      const { data, error } = await sb.functions.invoke('join-space', { body: { public_code: publicCode, ...loc } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      nc.state.currentSpace = data.space;
      spaceInfo.classList.remove('hidden');
      spaceInfo.innerHTML = `<strong>${data.space.venue_name}</strong><br>${data.space.event_name}<br>Code: ${data.space.public_code}<br>Période: ${nc.formatDate(data.space.starts_at)} → ${nc.formatDate(data.space.ends_at)}<br>Présence: <strong>${data.access.in_radius ? 'Validée' : 'Refusée'}</strong>`;
      paymentPreview.innerHTML = `Débloquez tous les contacts pour <strong>${data.payment_preview.local_amount} ${data.payment_preview.currency_code}</strong>.`;
      nc.qs('registerSection').classList.remove('hidden');
      nc.qs('paymentSection').classList.remove('hidden');
      nc.qs('profilesSection').classList.remove('hidden');
      await loadProfiles();
    } catch (e) {
      nc.showMessage(messageBox, e.message || 'Impossible de rejoindre l’espace.', 'error');
    }
  }

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    nc.hideMessage(messageBox);
    try {
      if (!publicCode) throw new Error('QR code invalide.');
      if (nc.qs('consent').value !== 'yes') throw new Error('Le consentement est requis.');
      const file = nc.qs('photoFile').files[0];
      const loc = await nc.getLocation();
      const { data, error } = await sb.functions.invoke('register-participant', {
        body: {
          public_code: publicCode,
          display_name: nc.qs('displayName').value.trim(),
          gender: nc.qs('gender').value,
          age: Number(nc.qs('age').value),
          availability: 'Disponible',
          whatsapp_number: nc.qs('whatsappNumber').value.trim(),
          photo_base64: file ? await nc.fileToBase64(file) : null,
          photo_mime_type: file ? file.type : null,
          consent: true,
          ...loc,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      localStorage.setItem('nc_participant_token', data.participant_session_token);
      localStorage.setItem('nc_participant_id', data.participant.id);
      nc.showMessage(messageBox, 'Profil publié avec succès.', 'success');
      await loadProfiles();
    } catch (err) {
      nc.showMessage(messageBox, err.message || 'Impossible de publier le profil.', 'error');
    }
  });

  nc.qs('startPaymentBtn').addEventListener('click', async () => {
    nc.hideMessage(messageBox);
    try {
      const token = localStorage.getItem('nc_participant_token');
      if (!token) throw new Error('Inscris-toi d’abord.');
      const loc = await nc.getLocation();
      const data = await nc.participantCall('start-payment', 'POST', loc);
      if (data.already_paid) {
        nc.showMessage(messageBox, 'Paiement déjà actif.', 'success');
        await loadProfiles();
        return;
      }
      paymentPreview.innerHTML = `<strong>${data.instructions.amount} ${data.instructions.currency_code}</strong><br>Destinataire: <strong>${data.instructions.recipient_msisdn}</strong><br>Référence: <strong>${data.instructions.payment_reference}</strong><br>${data.instructions.message}`;
      nc.showMessage(messageBox, 'Instructions de paiement générées.', 'info');
    } catch (err) {
      nc.showMessage(messageBox, err.message || 'Impossible de lancer le paiement.', 'error');
    }
  });

  nc.qs('refreshProfilesBtn').addEventListener('click', loadProfiles);

  async function loadProfiles() {
    profilesList.innerHTML = '';
    try {
      const token = localStorage.getItem('nc_participant_token');
      if (!token) {
        if (!nc.state.currentSpace?.id) return;
        const { data, error } = await sb.from('participants_public').select('*').eq('space_id', nc.state.currentSpace.id).order('created_at', { ascending: false });
        if (error) throw error;
        renderProfiles((data || []).map(p => ({ ...p, contact_locked: true, whatsapp_link: null })));
        return;
      }
      const data = await nc.participantCall('get-unlocked-profiles', 'GET');
      renderProfiles(data.profiles || []);
    } catch (err) {
      nc.showMessage(messageBox, err.message || 'Impossible de charger les profils.', 'error');
    }
  }

  function renderProfiles(profiles) {
    profilesList.innerHTML = '';
    if (!profiles.length) {
      profilesList.innerHTML = '<div class="info-box">Aucun profil visible pour le moment.</div>';
      return;
    }
    for (const p of profiles) {
      const photoUrl = p.photo_path ? nc.storagePublicUrl(p.photo_path) : '';
      const card = document.createElement('article');
      card.className = 'card';
      card.innerHTML = `<div class='card-photo'>${photoUrl ? `<img src='${photoUrl}' alt='${p.display_name}'>` : '<span class="muted">Photo optionnelle</span>'}</div><div class='card-body'><strong>${p.display_name}</strong><div class='meta'><span class='tag purple'>${p.gender}</span><span class='tag gold'>${p.age} ans</span></div>${p.contact_locked ? '<button class="btn btn-soft" disabled>Contact verrouillé</button>' : `<a class='btn btn-success' href='${p.whatsapp_link}' target='_blank' rel='noopener'>WhatsApp</a>`}</div>`;
      profilesList.appendChild(card);
    }
  }

  if (!publicCode) {
    nc.showMessage(messageBox, 'QR code invalide ou absent.', 'error');
  } else {
    await joinSpace();
  }
})();
