window.nc = {
  state: {
    currentSpace: null,
    participantToken: localStorage.getItem('nc_participant_token') || '',
    participantId: localStorage.getItem('nc_participant_id') || '',
  },
  qs(id) { return document.getElementById(id); },
  showMessage(box, text, type='info') { box.className = `message ${type}`; box.textContent = text; box.classList.remove('hidden'); },
  hideMessage(box) { box.classList.add('hidden'); box.textContent = ''; },
  getQueryParam(name) { return new URLSearchParams(window.location.search).get(name) || ''; },
  formatDate(value) { return value ? new Date(value).toLocaleString('fr-FR') : '-'; },
  async fileToBase64(file) {
    if (!file) return null;
    const buffer = await file.arrayBuffer();
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const chunk = 0x8000;
    for (let i=0; i<bytes.length; i+=chunk) binary += String.fromCharCode(...bytes.subarray(i, i+chunk));
    return btoa(binary);
  },
  storagePublicUrl(path) {
    if (!path) return '';
    const { data } = sb.storage.from('participant-photos-temp').getPublicUrl(path);
    return data.publicUrl;
  },
  async getLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error('Géolocalisation indisponible'));
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => reject(new Error('Autorise la géolocalisation pour continuer.')),
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
      );
    });
  },
  async adminCall(name, body) {
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
    const text = await resp.text();
    let data = {}; try { data = JSON.parse(text); } catch (_) {}
    if (!resp.ok) throw new Error(data.error || data.message || text || `HTTP ${resp.status}`);
    return data;
  },
  async participantCall(name, method='POST', body=null) {
    const token = localStorage.getItem('nc_participant_token') || '';
    const resp = await fetch(`${window.NEARCONNECT_FUNCTIONS_BASE}/${name}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': window.NEARCONNECT_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${window.NEARCONNECT_SUPABASE_ANON_KEY}`,
        'x-participant-token': token,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await resp.text();
    let data = {}; try { data = JSON.parse(text); } catch (_) {}
    if (!resp.ok) throw new Error(data.error || data.message || text || `HTTP ${resp.status}`);
    return data;
  }
};
