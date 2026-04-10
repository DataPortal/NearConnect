async getLocation() {
  const isLocal =
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1';

  const params = new URLSearchParams(location.search);
  const testGeo = params.get('test_geo') === '1';

  if ((isLocal || testGeo) && params.get('lat') && params.get('lng')) {
    return {
      lat: Number(params.get('lat')),
      lng: Number(params.get('lng')),
    };
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
}
