// ─────────────────────────────────────────────────────────────
//  github/loader.js — Format-specific file loaders
//  Each loader fetches a file from the repo, parses it, and
//  registers it with LayersModule.
//  Depends on: config.js, github/api.js, map/layers.js
// ─────────────────────────────────────────────────────────────

const Loader = (() => {

  // ── Helpers ────────────────────────────────────────────────

  function _extOf(filename) {
    const m = filename.match(/\.[^.]+$/);
    return m ? m[0].toLowerCase() : '';
  }

  function _baseName(filename) {
    return filename.replace(/\.[^.]+$/, '');
  }

  /** Build a Leaflet GeoJSON layer with dark-themed popups. */
  function _buildGeoJSONLayer(data, color) {
    return L.geoJSON(data, {
      style: {
        color,
        fillColor: color,
        weight:      1.5,
        opacity:     0.9,
        fillOpacity: 0.35,
      },
      pointToLayer: (_, ll) => L.circleMarker(ll, {
        radius:      7,
        fillColor:   color,
        color:       '#fff',
        weight:      1.5,
        opacity:     1,
        fillOpacity: 0.9,
      }),
      onEachFeature: (feature, layer) => {
        if (feature.properties && Object.keys(feature.properties).length) {
          const rows = Object.entries(feature.properties)
            .slice(0, 12)
            .map(([k, v]) => `<b>${k}</b>: ${v ?? ''}`)
            .join('<br>');
          layer.bindPopup(rows);
        }
      },
    });
  }

  /** Attempt to fit the map to a layer's bounds. */
  function _fitBounds(leafletLayer) {
    try {
      if (leafletLayer.getBounds) {
        MapModule.get().fitBounds(leafletLayer.getBounds(), { padding: [30, 30] });
      }
    } catch (_) {}
  }

  // ── Format loaders ─────────────────────────────────────────

  async function _loadGeoJSON(item) {
    const data  = await GitHubAPI.get(
      `/repos/${CONFIG.github.repo}/contents/${item.path}?ref=${GitHubAPI.getBranch()}`
    );
    const text   = atob(data.content.replace(/\n/g, ''));
    const geojson = JSON.parse(text);
    const color  = null;
    const lyr    = _buildGeoJSONLayer(geojson, color || '#4f8ef7');
    lyr.addTo(MapModule.get());
    const id = LayersModule.add(_baseName(item.name), 'geojson', lyr, color, item.path);
    _fitBounds(lyr);
    UIModule.toast(`✓ ${item.name}`);
    return id;
  }

  async function _loadGeoTIFF(item) {
    // For private repos, raw.githubusercontent.com blocks Authorization headers (CORS).
    // Use the GitHub Contents API instead, which returns the file base64-encoded.
    const data = await GitHubAPI.get(
      `/repos/${CONFIG.github.repo}/contents/${item.path}?ref=${GitHubAPI.getBranch()}`
    );
    // Decode base64 → ArrayBuffer
    const binary = atob(data.content.replace(/\n/g, ''));
    const buf = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);

    const georaster = await parseGeoraster(buf.buffer);
    const lyr = new GeoRasterLayer({ georaster, opacity: 0.8, resolution: 256 });
    lyr.addTo(MapModule.get());
    const id = LayersModule.add(_baseName(item.name), 'raster', lyr, null, item.path);
    _fitBounds(lyr);
    UIModule.toast(`✓ ${item.name} (raster)`);
    return id;
  }

  async function _loadCSV(item) {
    const data = await GitHubAPI.get(
      `/repos/${CONFIG.github.repo}/contents/${item.path}?ref=${GitHubAPI.getBranch()}`
    );
    const text = atob(data.content.replace(/\n/g, ''));

    const lines  = text.trim().split('\n');
    const hRaw   = lines[0].split(',').map(h => h.trim());
    const hLow   = hRaw.map(h => h.toLowerCase());

    const latC = hLow.findIndex(h => ['lat','latitude','y'].includes(h));
    const lngC = hLow.findIndex(h => ['lon','lng','long','longitude','x'].includes(h));

    if (latC < 0 || lngC < 0) {
      throw new Error(`No lat/lng columns found. Headers: ${hRaw.join(', ')}`);
    }

    const features = lines.slice(1)
      .filter(l => l.trim())
      .map(line => {
        const v = line.split(',');
        const props = {};
        hRaw.forEach((h, i) => { props[h] = v[i]?.trim(); });
        return {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [parseFloat(v[lngC]), parseFloat(v[latC])],
          },
          properties: props,
        };
      })
      .filter(f =>
        !isNaN(f.geometry.coordinates[0]) &&
        !isNaN(f.geometry.coordinates[1])
      );

    if (!features.length) throw new Error('No valid coordinates found in CSV');

    const color = null;
    const lyr   = _buildGeoJSONLayer({ type: 'FeatureCollection', features }, '#f7714f');
    lyr.addTo(MapModule.get());
    const id = LayersModule.add(_baseName(item.name), 'geojson', lyr, color, item.path);
    _fitBounds(lyr);
    UIModule.toast(`✓ ${item.name} (${features.length} points)`);
    return id;
  }

  async function _loadShapefile(item) {
    if (typeof shp === 'undefined') {
      throw new Error('shpjs library not loaded — cannot parse shapefiles');
    }

    // Helper: fetch a file via API and return its ArrayBuffer (base64 decoded)
    const fetchBuf = async (path) => {
      const d = await GitHubAPI.get(
        `/repos/${CONFIG.github.repo}/contents/${path}?ref=${GitHubAPI.getBranch()}`
      );
      const binary = atob(d.content.replace(/\n/g, ''));
      const buf = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
      return buf.buffer;
    };

    let buf;

    if (_extOf(item.name) === '.zip') {
      buf = await fetchBuf(item.path);
    } else {
      const dir      = item.path.includes('/') ? item.path.substring(0, item.path.lastIndexOf('/')) : '';
      const base     = _baseName(item.name).toLowerCase();
      const siblings = await GitHubAPI.listContents(dir || '');

      const getSibling = async (ext) => {
        const f = siblings.find(s => s.name.toLowerCase() === base + ext);
        if (!f) return null;
        return fetchBuf(f.path);
      };

      const shpBuf = await getSibling('.shp');
      if (!shpBuf) throw new Error('.shp file not found in directory');
      const dbfBuf = await getSibling('.dbf');
      buf = { shp: shpBuf, dbf: dbfBuf };
    }

    const geojson = await shp(buf);
    const color   = null;
    const lyr     = _buildGeoJSONLayer(geojson, '#4f8ef7');
    lyr.addTo(MapModule.get());
    const id = LayersModule.add(_baseName(item.name), 'vector', lyr, color, item.path);
    _fitBounds(lyr);
    UIModule.toast(`✓ ${item.name} (shapefile)`);
    return id;
  }

  // ── Public dispatch ────────────────────────────────────────

  /**
   * Load a single repo file item as a map layer.
   * Dispatches to the correct format loader based on extension.
   */
  async function load(item) {
    const ext = _extOf(item.name);
    if (['.geojson', '.json'].includes(ext)) return _loadGeoJSON(item);
    if (['.tif', '.tiff'].includes(ext))     return _loadGeoTIFF(item);
    if (ext === '.csv')                       return _loadCSV(item);
    if (['.shp', '.zip'].includes(ext))       return _loadShapefile(item);
    throw new Error(`Unsupported file type: ${ext}`);
  }

  return { load };
})();
