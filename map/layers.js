// ─────────────────────────────────────────────────────────────
//  map/layers.js — Layer registry, CRUD operations, panel render
//  Depends on: config.js, map/map.js
// ─────────────────────────────────────────────────────────────

const LayersModule = (() => {

  // ── State ──────────────────────────────────────────────────
  const _registry = {};      // id → LayerEntry
  let   _idCounter = 0;
  let   _colorIdx  = 0;

  function _nextColor() {
    return CONFIG.palette[_colorIdx++ % CONFIG.palette.length];
  }

  // ── Public API ─────────────────────────────────────────────

  /**
   * Register a new layer and add it to the map.
   * @param {string}        name         Display name
   * @param {string}        type         'geojson' | 'vector' | 'raster'
   * @param {L.Layer}       leafletLayer Leaflet layer instance
   * @param {string|null}   color        Hex colour (null → auto from palette)
   * @param {string}        repoPath     Source file path in the repo
   * @returns {string}                   Layer id
   */
  function add(name, type, leafletLayer, color, repoPath) {
    const id = `layer_${++_idCounter}`;
    _registry[id] = {
      id,
      name,
      type,
      leafletLayer,
      visible:  true,
      opacity:  1,
      color:    color || _nextColor(),
      repoPath: repoPath || '',
    };
    _render();
    _updateStatus();
    return id;
  }

  /** Remove a layer from the map and registry. */
  function remove(id) {
    if (!_registry[id]) return;
    MapModule.get().removeLayer(_registry[id].leafletLayer);
    delete _registry[id];
    _render();
    _updateStatus();
  }

  /** Toggle layer visibility. */
  function toggleVisibility(id) {
    const entry = _registry[id];
    if (!entry) return;
    entry.visible = !entry.visible;
    entry.visible
      ? entry.leafletLayer.addTo(MapModule.get())
      : MapModule.get().removeLayer(entry.leafletLayer);
    _render();
  }

  /** Set layer opacity (0–1). */
  function setOpacity(id, val) {
    const entry = _registry[id];
    if (!entry) return;
    entry.opacity = parseFloat(val);
    if (entry.leafletLayer.setOpacity) {
      entry.leafletLayer.setOpacity(val);
    } else if (entry.leafletLayer.setStyle) {
      entry.leafletLayer.setStyle({ opacity: val, fillOpacity: val * 0.5 });
    }
    const el = document.getElementById(`opval-${id}`);
    if (el) el.textContent = `${Math.round(val * 100)}%`;
  }

  /** Set layer colour. */
  function setColor(id, color) {
    const entry = _registry[id];
    if (!entry) return;
    entry.color = color;
    if (entry.leafletLayer.setStyle) {
      entry.leafletLayer.setStyle({ color, fillColor: color });
    }
  }

  /** Pan + zoom the map to fit a layer. */
  function zoomTo(id) {
    const entry = _registry[id];
    if (!entry) return;
    try {
      if (entry.leafletLayer.getBounds) {
        MapModule.get().fitBounds(entry.leafletLayer.getBounds(), { padding: [30, 30] });
      }
    } catch (_) {}
  }

  /** Return all repo paths currently loaded. */
  function loadedPaths() {
    return new Set(Object.values(_registry).map(e => e.repoPath).filter(Boolean));
  }

  /** Find a layer entry by its repo path. */
  function findByPath(repoPath) {
    return Object.values(_registry).find(e => e.repoPath === repoPath) || null;
  }

  /** Return total number of layers. */
  function count() { return Object.keys(_registry).length; }

  // ── Private: Render layer list panel ──────────────────────
  function _render() {
    const list = document.getElementById('layerList');
    const keys = Object.keys(_registry);

    // Update badge on Layers tab
    const badge = document.getElementById('layerCountBadge');
    if (badge) badge.textContent = keys.length ? `(${keys.length})` : '';

    if (!keys.length) {
      list.innerHTML = `
        <div class="layer-empty">
          <span class="em">🗂</span>
          No layers loaded yet.<br>Browse the repository and<br>click files to add them.
        </div>`;
      return;
    }

    list.innerHTML = [...keys].reverse().map(id => {
      const e  = _registry[id];
      const tc = e.type === 'raster'  ? 'badge-raster2'
               : e.type === 'geojson' ? 'badge-geojson'
               :                        'badge-vector';

      const colorRow = e.type !== 'raster' ? `
        <div class="color-row">
          <span>Color:</span>
          <input type="color" value="${e.color}"
            oninput="LayersModule.setColor('${id}', this.value)">
          <span class="monospace" style="font-size:0.55rem;">${e.color}</span>
        </div>` : '';

      return `
        <div class="layer-item ${e.visible ? 'visible' : ''}" id="li-${id}">
          <div class="layer-header">
            <span class="layer-type-badge ${tc}">${e.type}</span>
            <span class="layer-name" title="${e.name}">${e.name}</span>
          </div>
          <div class="layer-controls">
            <input type="range" class="layer-opacity"
              min="0" max="1" step="0.01" value="${e.opacity}"
              oninput="LayersModule.setOpacity('${id}', this.value)">
            <span class="opacity-val" id="opval-${id}">${Math.round(e.opacity * 100)}%</span>
            <button class="icon-btn ${e.visible ? 'active' : ''}"
              onclick="LayersModule.toggleVisibility('${id}')" title="Toggle visibility">👁</button>
            <button class="icon-btn"
              onclick="LayersModule.zoomTo('${id}')" title="Zoom to layer">⊕</button>
            <button class="icon-btn danger"
              onclick="LayersModule.remove('${id}')" title="Remove layer">✕</button>
          </div>
          ${colorRow}
        </div>`;
    }).join('');
  }

  function _updateStatus() {
    const n = count();
    const repoLabel = CONFIG.github.repo;
    document.getElementById('statusText').textContent = n
      ? `${n} layer${n !== 1 ? 's' : ''} · ${repoLabel}`
      : `Connected · ${repoLabel}`;
  }

  return { add, remove, toggleVisibility, setOpacity, setColor, zoomTo, loadedPaths, findByPath, count };
})();
