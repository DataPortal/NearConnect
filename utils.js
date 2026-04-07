window.nc = {
  state: {
    currentSpace: null,
    participantToken: localStorage.getItem('nc_participant_token') || '',
    participantId: localStorage.getItem('nc_participant_id') || '',
    paymentReference: localStorage.getItem('nc_payment_reference') || '',
    lastPublicCode: localStorage.getItem('nc_last_public_code') || '',
  },

  qs(id) {
    return document.getElementById(id);
  },

  showMessage(box, message, type = 'info') {
    box.className = `message ${type}`;
    box.textContent = message;
    box.classList.remove('hidden');
  },

  hideMessage(box) {
    box.classList.add('hidden');
    box.textContent = '';
  },

  getQueryCode() {
    return new URLSearchParams(window.location.search).get('code') || '';
  },

  async getLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('La géolocalisation n’est pas disponible sur cet appareil.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
        () => reject(new Error('Autorise la localisation pour continuer.')),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000,
        }
      );
    });
  },

  async invoke(name, options = {}) {
    const headers = options.headers || {};
    return sb.functions.invoke(name, {
      method: options.method || 'POST',
      body: options.body,
      headers,
    });
  },

  storagePublicUrl(path) {
    if (!path) return '';
    const { data } = sb.storage.from('participant-photos-temp').getPublicUrl(path);
    return data.publicUrl;
  },

  async fileToBase64(file) {
    if (!file) return null;
    const buffer = await file.arrayBuffer();
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const chunk = 0x8000;

    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }

    return btoa(binary);
  },

  formatDate(value) {
    if (!value) return '-';
    return new Date(value).toLocaleString('fr-FR');
  },
};
