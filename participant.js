async function registerParticipant(e) {
  e.preventDefault();
  nc.hideMessage(messageBox);

  try {
    const consent = nc.qs('consent').checked;
    if (!consent) throw new Error('Le consentement est obligatoire.');

    const location = await nc.getLocation();
    const file = nc.qs('photoFile').files[0];

    if (file && file.size > 2 * 1024 * 1024) {
      throw new Error('La photo est trop lourde. Choisis une image de moins de 2 MB.');
    }

    const photo_base64 = file ? await nc.fileToBase64(file) : null;

    const payload = {
      public_code: publicCodeInput.value.trim().toUpperCase(),
      display_name: nc.qs('displayName').value.trim(),
      gender: nc.qs('gender').value,
      age: Number(nc.qs('age').value),
      whatsapp_number: nc.qs('whatsappNumber').value.trim(),
      consent: true,
      photo_base64,
      photo_mime_type: file ? file.type : null,
      lat: location.lat,
      lng: location.lng,
    };

    const resp = await fetch(`${window.NEARCONNECT_FUNCTIONS_BASE}/register-participant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': window.NEARCONNECT_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${window.NEARCONNECT_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const rawText = await resp.text();

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
    registerForm.reset();
  } catch (e2) {
    console.error('REGISTER PARTICIPANT ERROR:', e2);
    nc.showMessage(messageBox, e2.message || 'Impossible de publier le profil.', 'error');
  }
}
