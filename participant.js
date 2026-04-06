(async function () {
  const messageBox = nc.qs('messageBox');
  const joinForm = nc.qs('joinForm');
  const registerForm = nc.qs('registerForm');
  const startPaymentBtn = nc.qs('startPaymentBtn');
  const refreshProfilesBtn = nc.qs('refreshProfilesBtn');
  const profilesList = nc.qs('profilesList');
  const publicCodeInput = nc.qs('publicCode');
  const paymentPreview = nc.qs('paymentPreview');

  const codeFromQuery = nc.getQueryCode();
  if (codeFromQuery) publicCodeInput.value = codeFromQuery;

  async function joinSpace() {
    nc.hideMessage(messageBox);
    try {
      const location = await nc.getLocation();
      const { data, error } = await nc.invoke('join-space', {
        body: { public_code: publicCodeInput.value.trim().toUpperCase(), ...location },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);

      nc.state.currentSpace = data.space;
      nc.qs('spaceSection').classList.remove('hidden');
      nc.qs('registerSection').classList.remove('hidden');
      nc.qs('paymentSection').classList.remove('hidden');
      nc.qs('profilesSection').classList.remove('hidden');

      nc.qs('spaceInfo').innerHTML = `
        <strong>${data.space.venue_name}</strong><br>
        ${data.space.event_name}<br>
        Code: ${data.space.public_code}<br>
        Rayon: ${data.space.radius_meters} m
      `;
      paymentPreview.innerHTML = `
        Débloquez tous les contacts pour <strong>${data.payment_preview.local_amount} ${data.payment_preview.currency_code}</strong>.<br>
        Taux utilisé: ${data.payment_preview.fx_rate_used}<br>
        Dans le rayon: <strong>${data.access.in_radius ? 'Oui' : 'Non'}</strong>
      `;
      await loadProfiles();
      nc.showMessage(messageBox, 'Espace rejoint avec succès.', 'success');
    } catch (e) {
      nc.showMessage(messageBox, e.message || 'Impossible de rejoindre l’espace.', 'error');
    }
  }

  async function fileToBase64(file) {
    if (!file) return null;
    const buffer = await file.arrayBuffer();
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  async function registerParticipant(e) {
    e.preventDefault();
    nc.hideMessage(messageBox);
    try {
      const location = await nc.getLocation();
      const file = nc.qs('photoFile').files[0];
      const photo_base64 = file ? await fileToBase64(file) : null;

      const { data, error } = await nc.invoke('register-participant', {
        body: {
          public_code: publicCodeInput.value.trim().toUpperCase(),
          display_name: nc.qs('displayName').value.trim(),
          gender: nc.qs('gender').value,
          age: Number(nc.qs('age').value),
          availability: nc.qs('availability').value,
          whatsapp_number: nc.qs('whatsappNumber').value.trim(),
          photo_base64,
          photo_mime_type: file ? file.type : null,
          ...location,
        },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);

      localStorage.setItem('nc_participant_token', data.participant_session_token);
      localStorage.setItem('nc_participant_id', data.participant.id);
      nc.state.participantToken = data.participant_session_token;
      nc.state.participantId = data.participant.id;
      nc.showMessage(messageBox, 'Profil publié avec succès.', 'success');
      await loadProfiles();
    } catch (e2) {
      nc.showMessage(messageBox, e2.message || 'Impossible de publier le profil.', 'error');
    }
  }

  async function startPayment() {
    nc.hideMessage(messageBox);
    try {
      const token = nc.state.participantToken || localStorage.getItem('nc_participant_token');
      if (!token) throw new Error('Inscris-toi d’abord.');
      const location = await nc.getLocation();
      const { data, error } = await nc.invoke('start-payment', {
        headers: { Authorization: `Bearer ${token}` },
        body: location,
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);

      if (data.already_paid) {
        nc.showMessage(messageBox, 'Paiement déjà actif pour cet espace.', 'success');
        await loadProfiles();
        return;
      }

      localStorage.setItem('nc_payment_reference', data.payment.payment_reference);
      nc.state.paymentReference = data.payment.payment_reference;
      paymentPreview.innerHTML = `
        <strong>${data.instructions.amount} ${data.instructions.currency_code}</strong><br>
        Destinataire: <strong>${data.instructions.recipient_msisdn}</strong><br>
        Référence: <strong>${data.instructions.payment_reference}</strong><br>
        ${data.instructions.message}
      `;
      nc.showMessage(messageBox, 'Instructions de paiement générées. Demande à l’admin de confirmer après paiement.', 'info');
    } catch (e) {
      nc.showMessage(messageBox, e.message || 'Impossible de lancer le paiement.', 'error');
    }
  }

  async function loadProfiles() {
    const token = nc.state.participantToken || localStorage.getItem('nc_participant_token');
    if (!token) {
      const { data, error } = await sb.from('participants_public').select('*').eq('space_id', nc.state.currentSpace?.id || '').order('created_at', { ascending: false });
      if (!error && data) renderProfiles(data.map((p) => ({ ...p, contact_locked: true, whatsapp_link: null })));
      return;
    }

    const { data, error } = await fetch(`${window.NEARCONNECT_FUNCTIONS_BASE}/get-unlocked-profiles`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json().then((body) => ({ data: body, error: !r.ok })));

    if (error || data.error) {
      nc.showMessage(messageBox, data?.error || 'Impossible de charger les profils.', 'error');
      return;
    }
    renderProfiles(data.profiles);
  }

  function renderProfiles(profiles) {
    profilesList.innerHTML = '';
    if (!profiles.length) {
      profilesList.innerHTML = '<div class="info-box">Aucun profil visible pour le moment.</div>';
      return;
    }

    for (const p of profiles) {
      const card = document.createElement('article');
      card.className = 'card';
      const photoUrl = p.photo_path ? nc.storagePublicUrl(p.photo_path) : '';
      card.innerHTML = `
        <div class="card-photo">${photoUrl ? `<img src="${photoUrl}" alt="${p.display_name}">` : '<span class="muted">Photo optionnelle</span>'}</div>
        <div class="card-body">
          <strong>${p.display_name}</strong>
          <div class="meta">
            <span class="tag purple">${p.gender}</span>
            <span class="tag gold">${p.age} ans</span>
            <span class="tag green">${p.availability}</span>
          </div>
          ${p.contact_locked ? '<button class="btn btn-soft" disabled>Contact verrouillé</button>' : `<a class="btn btn-success" href="${p.whatsapp_link}" target="_blank" rel="noopener">WhatsApp</a>`}
        </div>
      `;
      profilesList.appendChild(card);
    }
  }

  joinForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await joinSpace();
  });
  registerForm.addEventListener('submit', registerParticipant);
  startPaymentBtn.addEventListener('click', startPayment);
  refreshProfilesBtn.addEventListener('click', loadProfiles);

  if (codeFromQuery) {
    try { await joinSpace(); } catch (_) {}
  }
})();
