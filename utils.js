window.nc = {
  state: {
    currentSpace: null,
    participantToken: localStorage.getItem('nc_participant_token') || '',
    participantId: localStorage.getItem('nc_participant_id') || '',
    paymentReference: localStorage.getItem('nc_payment_reference') || '',
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
        reject(new Error('Geolocation not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => reject(new Error('Location permission denied or unavailable')),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
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
};
