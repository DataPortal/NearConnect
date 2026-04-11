window.nc = {
  state: {
    currentSpace: null,
    participantToken: localStorage.getItem('nc_participant_token') || '',
    participantId: localStorage.getItem('nc_participant_id') || '',
    paymentReference: localStorage.getItem('nc_payment_reference') || '',
    organizerCode: localStorage.getItem('nc_organizer_code') || '',
  },

  qs(id) {
    return document.getElementById(id);
  },

  showMessage(box, message, type = 'info') {
    if (!box) return;
    box.className = `message ${type}`;
    box.textContent = message;
    box.classList.remove('hidden');
  },

  hideMessage(box) {
    if (!box) return;
    box.classList.add('hidden');
    box.textContent = '';
  },

  getQueryCode() {
    return new URLSearchParams(window.location.search).get('code') || '';
  },

  async getLocation() {
    const isLocal =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';

    const params = new URLSearchParams(window.location.search);
    const testGeo = params.get('test_geo') === '1';
    const latParam = params.get('lat');
    const lngParam = params.get('lng');

    if ((isLocal || testGeo) && latParam && lngParam) {
      const lat = Number(latParam);
      const lng = Number(lngParam);

      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return { lat, lng };
      }
    }

    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('La géolocalisation n’est pas disponible sur cet appareil.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        (err) => {
          console.error('GEOLOCATION ERROR:', err);
          reject(new Error('Autorise la géolocalisation ou utilise un téléphone sur place.'));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        }
      );
    });
  },

  async invoke(name, options = {}) {
    return window.sb.functions.invoke(name, {
      method: options.method || 'POST',
      body: options.body,
      headers: options.headers || {},
    });
  },

  storagePublicUrl(path) {
    if (!path) return '';
    const { data } = window.sb.storage
      .from('participant-photos-temp')
      .getPublicUrl(path);
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
    try {
      return new Date(value).toLocaleString('fr-FR');
    } catch (_) {
      return value;
    }
  },
};
