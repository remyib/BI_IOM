// ─────────────────────────────────────────────────────────────
//  map/map.js — Leaflet map initialisation
//  Depends on: config.js
// ─────────────────────────────────────────────────────────────

const MapModule = (() => {

  let _map = null;

  /** Initialise the Leaflet map and OSM basemap. */
  function init() {
    _map = L.map('map', {
      center:  CONFIG.map.center,
      zoom:    CONFIG.map.zoom,
    });

    L.tileLayer(CONFIG.map.tileUrl, {
      attribution: CONFIG.map.tileAttrib,
      maxZoom:     CONFIG.map.maxZoom,
    }).addTo(_map);

    // Live coordinate display
    _map.on('mousemove', e => {
      const { lat, lng } = e.latlng;
      document.getElementById('coordPill').textContent =
        `${Math.abs(lat).toFixed(4)}°${lat < 0 ? 'S' : 'N'} ` +
        `${Math.abs(lng).toFixed(4)}°${lng < 0 ? 'W' : 'E'}`;
    });

    // Live zoom display
    _map.on('zoom', () => {
      document.getElementById('zoomPill').textContent = `Z${_map.getZoom()}`;
    });

    return _map;
  }

  /** Return the Leaflet map instance. */
  function get() { return _map; }

  return { init, get };
})();
