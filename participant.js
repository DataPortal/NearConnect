(async function () {
  const messageBox = nc.qs('messageBox');
  const joinForm = nc.qs('joinForm');
  const registerForm = nc.qs('registerForm');
  const startPaymentBtn = nc.qs('startPaymentBtn');
  const refreshProfilesBtn = nc.qs('refreshProfilesBtn');
  const profilesList = nc.qs('profilesList');
  const publicCodeInput = nc.qs('publicCode');
  const paymentPreview = nc.qs('paymentPreview');

  const photoModal = nc.qs('photoModal');
  const photoModalImg = nc.qs('photoModalImg');
  const photoModalCaption = nc.qs('photoModalCaption');
  const photoModalClose = nc.qs('photoModalClose');
  const photoModalBackdrop = nc.qs('photoModalBackdrop');

  const codeFromQuery = nc.getQueryCode();
  if (codeFromQuery) publicCodeInput.value = codeFromQuery;

  function openPhotoModal(src, caption = '') {
    if (!src) return;
    photoModalImg.src = src;
    photoModalCaption.textContent = caption;
    photoModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closePhotoModal() {
    photoModal.classList.add('hidden');
    photoModalImg.src = '';
    photoModalCaption.textContent = '';
    document.body.style.overflow = '';
  }

  photoModalClose?.addEventListener('click', closePhotoModal);
  photoModalBackdrop?.addEventListener('click', closePhotoModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !photoModal.classList.contains('hidden')) {
      closePhotoModal();
    }
  });

  async function joinSpace() {
    nc.hideMessage(messageBox);

    try {
      const location = await nc.getLocation();

      const { data, error } = await nc.invoke('join-space', {
        body: {
          public_code: publicCodeInput.value.trim().toUpperCase(),
          ...location,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      nc.state.currentSpace = data.space;
      localStorage.setItem('nc_last_public_code', data.space.public_code);

      nc.qs('spaceSection').classList.remove('hidden');
      nc.qs('registerSection').classList.remove('hidden');
      nc.qs('paymentSection').classList.remove('hidden');
      nc.qs('profilesSection').classList.remove('hidden');

      nc.qs('spaceInfo').innerHTML = `
        <strong>${data.space.venue_name}</strong><br>
        ${data.space.event_name}<br>
        Code: ${data.space.public_code}<br>
        Ville: ${data.space.city}<br>
        Période: ${nc.formatDate(data.space.starts_at)} → ${nc.formatDate(data.space.ends_at)}<br>
        Présence sur place: <strong>${data.access.in_radius ? 'Validée' : 'Refusée'}</strong>
      `;

      paymentPreview.innerHTML = `
        Débloquez tous les contacts pour <strong>${data.payment_preview.local_amount} ${data.payment_preview.currency_code}</strong>.<br>
        Présence sur place: <strong>${data.access.in_radius ? 'Confirmée' : 'Non confirmée'}</strong>
      `;

      await loadProfiles();
      nc.showMessage(messageBox, 'Espace rejoint avec succès.', 'success');
    } catch (e) {
      console.error('JOIN SPACE ERROR:', e);
      nc.showMessage(messageBox, e.message || 'Impossible de rejoindre l’espace.', 'error');
    }
  }

  async function registerParticipant(e) {
    e.preventDefault();
    nc.hideMessage(messageBox);

    try {
      const consent = nc.qs('consent').checked;
      if (!consent) throw new Error('Le consentement est obligatoire.');

      const location = await nc.getLocation();
      const file = nc.qs('photoFile').files[0];
      const photo_base64 = file ? await nc.fileToBase64(file) : null;

      const { data, error } = await nc.invoke('register-participant', {
        body: {
          public_code: publicCodeInput.value.trim().toUpperCase(),
          display_name: nc.qs('displayName').value.trim(),
          gender: nc.qs('gender').value,
          age: Number(nc.qs('age').value),
          whatsapp_number: nc.qs('whatsappNumber').value.trim(),
          consent: true,
          photo_base64,
          photo_mime_type: file ? file.type : null,
          ...location,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      localStorage.setItem('nc_participant_token', data.participant_session_token);
      localStorage.setItem('nc_participant_id', data.participant.id);

      nc.state.participantToken = data.participant_session_token;
      nc.state.participantId = data.participant.id;

      nc.showMessage(messageBox, 'Profil publié avec succès.', 'success');
      await loadProfiles();
    } catch (e2) {
      console.error('REGISTER PARTICIPANT ERROR:', e2);
      nc.showMessage(messageBox, e2.message || 'Impossible de publier le profil.', 'error');
    }
  }

  async function startPayment() {
    nc.hideMessage(messageBox);

    try {
      const token = nc.state.participantToken || localStorage.getItem('nc_participant_token');
      if (!token) throw new Error('Inscris-toi d’abord.');

      const location = await nc.getLocation();

      const resp = await fetch(`${window.NEARCONNECT_FUNCTIONS_BASE}/start-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': window.NEARCONNECT_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${window.NEARCONNECT_SUPABASE_ANON_KEY}`,
          'x-participant-token': token,
        },
        body: JSON.stringify(location),
      });

      const rawText = await resp.text();
      console.log('START-PAYMENT STATUS:', resp.status);
      console.log('START-PAYMENT RAW RESPONSE:', rawText);

      let data = {};
      try { data = JSON.parse(rawText); } catch (_) {}

      if (!resp.ok) {
        throw new Error(data?.error || data?.message || rawText || `HTTP ${resp.status}`);
      }

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

      nc.showMessage(messageBox, 'Instructions de paiement générées. Confirme ensuite le paiement côté admin.', 'info');
    } catch (e) {
      console.error('START PAYMENT ERROR:', e);
      nc.showMessage(messageBox, e.message || 'Impossible de lancer le paiement.', 'error');
    }
  }

  async function loadProfiles() {
    profilesList.innerHTML = '';

    const token = nc.state.participantToken || localStorage.getItem('nc_participant_token');

    if (!token) {
      if (!nc.state.currentSpace?.id) return;

      const { data, error } = await sb
        .from('participants_public')
        .select('*')
        .eq('space_id', nc.state.currentSpace.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        renderProfiles(data.map((p) => ({
          ...p,
          contact_locked: true,
          whatsapp_link: null,
        })));
      }
      return;
    }

    const resp = await fetch(`${window.NEARCONNECT_FUNCTIONS_BASE}/get-unlocked-profiles`, {
      method: 'GET',
      headers: {
        'apikey': window.NEARCONNECT_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${window.NEARCONNECT_SUPABASE_ANON_KEY}`,
        'x-participant-token': token,
      },
    });

    const rawText = await resp.text();
    console.log('GET-UNLOCKED-PROFILES STATUS:', resp.status);
    console.log('GET-UNLOCKED-PROFILES RAW RESPONSE:', rawText);

    let data = {};
    try { data = JSON.parse(rawText); } catch (_) {}

    if (!resp.ok) {
      nc.showMessage(messageBox, data?.error || data?.message || 'Impossible de charger les profils.', 'error');
      return;
    }

    renderProfiles(data.profiles || []);
  }

  function renderProfiles(profiles) {
    profilesList.innerHTML = '';

    if (!profiles.length) {
      profilesList.innerHTML = '<div class="info-box">Aucun profil visible pour le moment.</div>';
      return;
    }

    for (const p of profiles) {
      const card = document.createElement('article');
      card.className = 'card profile-card';

      const photoUrl = p.photo_path ? nc.storagePublicUrl(p.photo_path) : '';
      const hasPhoto = Boolean(photoUrl);

      card.innerHTML = `
        <div class="profile-thumb-wrap">
          ${
            hasPhoto
              ? `<img class="profile-thumb clickable-photo" src="${photoUrl}" alt="${p.display_name}" data-photo="${photoUrl}" data-caption="${p.display_name} • ${p.gender} • ${p.age} ans">`
              : `<div class="profile-thumb placeholder-thumb">Photo</div>`
          }
        </div>
        <div class="card-body">
          <strong>${p.display_name}</strong>
          <div class="meta">
            <span class="tag purple">${p.gender}</span>
            <span class="tag gold">${p.age} ans</span>
          </div>
          ${
            p.contact_locked
              ? '<button class="btn btn-soft" disabled>Contact verrouillé</button>'
              : `<a class="btn btn-success" href="${p.whatsapp_link}" target="_blank" rel="noopener">WhatsApp</a>`
          }
        </div>
      `;

      profilesList.appendChild(card);
    }

    document.querySelectorAll('.clickable-photo').forEach((img) => {
      img.addEventListener('click', () => {
        openPhotoModal(
          img.getAttribute('data-photo'),
          img.getAttribute('data-caption') || ''
        );
      });
    });
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
