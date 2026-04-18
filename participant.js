(async function () {
  const messageBox = nc.qs('messageBox');
  const joinForm = nc.qs('joinForm');
  const registerForm = nc.qs('registerForm');
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
  const savedPublicCode = localStorage.getItem('nc_last_public_code') || '';

  if (codeFromQuery) {
    publicCodeInput.value = codeFromQuery.trim().toUpperCase();
    localStorage.setItem('nc_last_public_code', codeFromQuery.trim().toUpperCase());
  } else if (savedPublicCode) {
    publicCodeInput.value = savedPublicCode.trim().toUpperCase();
  }

  function openPhotoModal(src, caption = '') {
    if (!src || !photoModal || !photoModalImg || !photoModalCaption) return;

    photoModalImg.src = src;
    photoModalCaption.textContent = caption;
    photoModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closePhotoModal() {
    if (!photoModal || !photoModalImg || !photoModalCaption) return;

    photoModal.classList.add('hidden');
    photoModalImg.src = '';
    photoModalCaption.textContent = '';
    document.body.style.overflow = '';
  }

  function showClientSections() {
    nc.qs('spaceSection')?.classList.remove('hidden');
    nc.qs('registerSection')?.classList.remove('hidden');
    nc.qs('paymentSection')?.classList.remove('hidden');
    nc.qs('profilesSection')?.classList.remove('hidden');
  }

  function saveClientState(space) {
    if (!space) return;

    nc.state.currentSpace = space;

    if (space.public_code) {
      const code = String(space.public_code).trim().toUpperCase();
      localStorage.setItem('nc_last_public_code', code);

      if (publicCodeInput) {
        publicCodeInput.value = code;
      }
    }
  }

  photoModalClose?.addEventListener('click', closePhotoModal);
  photoModalBackdrop?.addEventListener('click', closePhotoModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && photoModal && !photoModal.classList.contains('hidden')) {
      closePhotoModal();
    }
  });

  async function joinSpace({ silent = false } = {}) {
    if (!silent) {
      nc.hideMessage(messageBox);
    }

    try {
      const publicCode = publicCodeInput.value.trim().toUpperCase();

      if (!publicCode) {
        throw new Error('Le code public de l’espace est requis.');
      }

      const location = await nc.getLocation();

      const resp = await fetch(`${window.NEARCONNECT_FUNCTIONS_BASE}/join-space`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: window.NEARCONNECT_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${window.NEARCONNECT_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          public_code: publicCode,
          lat: location.lat,
          lng: location.lng,
        }),
      });

      const rawText = await resp.text();

      console.log('JOIN-SPACE STATUS:', resp.status);
      console.log('JOIN-SPACE RAW RESPONSE:', rawText);

      let data = {};
      try {
        data = JSON.parse(rawText);
      } catch (_) {}

      if (!resp.ok) {
        throw new Error(
          data?.error ||
          data?.details ||
          data?.message ||
          rawText ||
          `HTTP ${resp.status}`
        );
      }

      saveClientState(data.space);
      showClientSections();

      const spaceInfo = nc.qs('spaceInfo');
      if (spaceInfo) {
        spaceInfo.innerHTML = `
          <strong>${data.space.venue_name}</strong><br>
          ${data.space.event_name}<br>
          Code: ${data.space.public_code}<br>
          Ville: ${data.space.city}<br>
          Période: ${nc.formatDate(data.space.starts_at)} → ${nc.formatDate(data.space.ends_at)}<br>
          Présence sur place: <strong>${data.access.in_radius ? 'Validée' : 'Refusée'}</strong><br>
          Distance: ${data.access.distance_meters} m / ${data.access.allowed_radius_meters} m
        `;
      }

      if (paymentPreview) {
        paymentPreview.innerHTML = `
          Débloquez les contacts WhatsApp avec vos crédits NearConnect.<br>
          Coût standard actuel : <strong>5 crédits par contact</strong>.<br>
          Présence sur place : <strong>${data.access.in_radius ? 'Confirmée' : 'Non confirmée'}</strong>
        `;
      }

      await loadProfiles();

      if (!silent) {
        nc.showMessage(
          messageBox,
          data.message || 'Espace rejoint avec succès.',
          data.access.in_radius ? 'success' : 'info'
        );
      }
    } catch (e) {
      console.error('JOIN SPACE ERROR:', e);

      if (!silent) {
        nc.showMessage(
          messageBox,
          e.message || 'Impossible de rejoindre l’espace.',
          'error'
        );
      }
    }
  }

  async function registerParticipant(e) {
    e.preventDefault();
    nc.hideMessage(messageBox);

    try {
      const consent = nc.qs('consent')?.checked;

      if (!consent) {
        throw new Error('Le consentement est obligatoire.');
      }

      const currentPublicCode =
        nc.state.currentSpace?.public_code ||
        publicCodeInput.value.trim().toUpperCase() ||
        localStorage.getItem('nc_last_public_code') ||
        '';

      if (!currentPublicCode) {
        throw new Error("Aucun espace actif n'est mémorisé.");
      }

      const location = await nc.getLocation();
      const file = nc.qs('photoFile')?.files?.[0] || null;

      if (file && file.size > 5 * 1024 * 1024) {
        throw new Error('La photo est trop lourde. Taille maximale autorisée : 5 MB.');
      }

      const photo_base64 = file ? await nc.fileToBase64(file) : null;

      const payload = {
        public_code: String(currentPublicCode).trim().toUpperCase(),
        display_name: nc.qs('displayName')?.value?.trim() || '',
        gender: nc.qs('gender')?.value || '',
        age: Number(nc.qs('age')?.value),
        whatsapp_number: nc.qs('whatsappNumber')?.value?.trim() || '',
        consent: true,
        photo_base64,
        photo_mime_type: file ? file.type : null,
        lat: location.lat,
        lng: location.lng,
      };

      console.log('REGISTER-PARTICIPANT BODY:', {
        ...payload,
        photo_base64: payload.photo_base64
          ? `[base64 length=${payload.photo_base64.length}]`
          : null,
      });

      const resp = await fetch(`${window.NEARCONNECT_FUNCTIONS_BASE}/register-participant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: window.NEARCONNECT_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${window.NEARCONNECT_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(payload),
      });

      const rawText = await resp.text();

      console.log('REGISTER-PARTICIPANT STATUS:', resp.status);
      console.log('REGISTER-PARTICIPANT RAW RESPONSE:', rawText);

      let data = {};
      try {
        data = JSON.parse(rawText);
      } catch (_) {}

      if (!resp.ok) {
        const detailedMessage = [
          `STATUS: ${resp.status}`,
          data?.error ? `ERROR: ${data.error}` : '',
          data?.details ? `DETAILS: ${data.details}` : '',
          data?.hint ? `HINT: ${data.hint}` : '',
          data?.code ? `CODE: ${data.code}` : '',
          !data?.error && rawText ? `RAW: ${rawText}` : '',
        ]
          .filter(Boolean)
          .join('\n');

        throw new Error(detailedMessage || `HTTP ${resp.status}`);
      }

      localStorage.setItem('nc_participant_token', data.participant_session_token);
      localStorage.setItem('nc_participant_id', data.participant.id);

      nc.state.participantToken = data.participant_session_token;
      nc.state.participantId = data.participant.id;

      nc.showMessage(messageBox, 'Profil publié avec succès.', 'success');

      await loadProfiles();
      registerForm?.reset();
    } catch (e2) {
      console.error('REGISTER PARTICIPANT ERROR:', e2);

      nc.showMessage(
        messageBox,
        e2.message || 'Impossible de publier le profil.',
        'error'
      );
    }
  }

  async function loadProfiles() {
    if (!profilesList) return;

    profilesList.innerHTML = '';

    const token =
      nc.state.participantToken ||
      localStorage.getItem('nc_participant_token') ||
      '';

    if (!token) {
      if (!nc.state.currentSpace?.id) return;

      const { data, error } = await window.sb
        .from('participants_public')
        .select('*')
        .eq('space_id', nc.state.currentSpace.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('LOAD PUBLIC PROFILES ERROR:', error);
        nc.showMessage(
          messageBox,
          error.message || 'Impossible de charger les profils publics.',
          'error'
        );
        return;
      }

      renderProfiles(
        (data || []).map((p) => ({
          ...p,
          contact_locked: true,
          whatsapp_link: null,
        }))
      );

      return;
    }

    const resp = await fetch(`${window.NEARCONNECT_FUNCTIONS_BASE}/get-unlocked-profiles`, {
      method: 'GET',
      headers: {
        apikey: window.NEARCONNECT_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${window.NEARCONNECT_SUPABASE_ANON_KEY}`,
        'x-participant-token': token,
      },
    });

    const rawText = await resp.text();

    console.log('GET-UNLOCKED-PROFILES STATUS:', resp.status);
    console.log('GET-UNLOCKED-PROFILES RAW RESPONSE:', rawText);

    let data = {};
    try {
      data = JSON.parse(rawText);
    } catch (_) {}

    if (!resp.ok) {
      nc.showMessage(
        messageBox,
        data?.error || data?.message || 'Impossible de charger les profils.',
        'error'
      );
      return;
    }

    renderProfiles(data.profiles || []);
  }

  function renderProfiles(profiles) {
    if (!profilesList) return;

    profilesList.innerHTML = '';

    if (!profiles.length) {
      profilesList.innerHTML =
        '<div class="info-box">Aucun profil visible pour le moment.</div>';
      return;
    }

    for (const p of profiles) {
      const card = document.createElement('article');
      card.className = 'profile-mini-card';

      const photoUrl = p.photo_path ? nc.storagePublicUrl(p.photo_path) : '';
      const hasPhoto = Boolean(photoUrl);

      const isLocked = Boolean(p.contact_locked);
      const whatsappLink = p.whatsapp_link || '';

      card.innerHTML = `
        <div class="profile-mini-thumb-wrap">
          ${
            hasPhoto
              ? `<img class="profile-mini-thumb clickable-photo" src="${photoUrl}" alt="${p.display_name}" data-photo="${photoUrl}" data-caption="${p.display_name} • ${p.gender} • ${p.age} ans">`
              : `<div class="profile-mini-thumb placeholder-thumb">Photo</div>`
          }
        </div>

        <div class="profile-mini-body">
          <strong class="profile-name">${p.display_name}</strong>

          <div class="profile-mini-meta">
            <span class="tag purple">${p.gender}</span>
            <span class="tag gold">${p.age} ans</span>
          </div>

          ${
            isLocked
              ? `<button class="btn btn-soft btn-mini unlock-contact-btn" data-target-id="${p.id}" type="button">Débloquer</button>`
              : `<a class="btn btn-success btn-mini" href="${whatsappLink}" target="_blank" rel="noopener">WhatsApp</a>`
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

    if (window.ncWallet) {
      window.ncWallet.bindUnlockButtons(loadProfiles);
    }
  }

  joinForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await joinSpace({ silent: false });
  });

  registerForm?.addEventListener('submit', registerParticipant);

  refreshProfilesBtn?.addEventListener('click', async () => {
    await loadProfiles();
  });

  if (window.ncWallet) {
    window.ncWallet.bindCreditPackButtons();
  }

  const codeToRestore =
    codeFromQuery ||
    savedPublicCode ||
    publicCodeInput.value.trim();

  if (codeToRestore) {
    publicCodeInput.value = String(codeToRestore).trim().toUpperCase();

    try {
      await joinSpace({ silent: true });
    } catch (_) {}
  }
})();
