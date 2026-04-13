// ─────────────────────────────────────────────────────────────
//  ui/browser.js — Repository file browser
//  Handles directory navigation, tree rendering, file selection,
//  and dispatching loads to Loader.
//  Depends on: config.js, github/api.js, github/loader.js,
//              map/layers.js, ui/toast.js, ui/tabs.js
// ─────────────────────────────────────────────────────────────

const BrowserModule = (() => {

  // ── State ──────────────────────────────────────────────────
  let _currentPath  = '';
  const _selected   = new Map();   // sha → item object

  // ── Helpers ────────────────────────────────────────────────

  function _extOf(name) {
    const m = name.match(/\.[^.]+$/);
    return m ? m[0].toLowerCase() : '';
  }

  function _isLoadable(name) {
    return Object.keys(CONFIG.fileTypes).includes(_extOf(name)) &&
           !['.dbf','.prj','.shx'].includes(_extOf(name));  // ancillary only
  }

  function _badgeType(name) {
    const t = CONFIG.fileTypes[_extOf(name)];
    if (!t) return null;
    return t;
  }

  function _fileIcon(ext) {
    if (['.geojson','.json'].includes(ext)) return '🗺';
    if (['.tif','.tiff'].includes(ext))     return '🛰';
    if (ext === '.csv')                      return '📊';
    if (['.shp','.zip'].includes(ext))       return '📐';
    return '📄';
  }

  function _formatSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024)    return `${bytes}B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)}KB`;
    return `${(bytes / 1048576).toFixed(1)}MB`;
  }

  // ── Connect ────────────────────────────────────────────────

  async function connect() {
    const pat    = document.getElementById('patInput').value.trim();
    const branch = document.getElementById('branchInput').value.trim() || 'main';

    const btn = document.getElementById('connectBtn');
    btn.disabled    = true;
    btn.textContent = 'Connecting…';
    _showConnMsg('Verifying access…', 'info');

    try {
      GitHubAPI.setCredentials(pat, branch);
      const repo = await GitHubAPI.verifyRepo();

      _showConnMsg(`✓ Connected to ${repo.full_name}`, 'ok');
      document.getElementById('connDot').className = 'conn-dot connected';
      document.getElementById('statusDot').className = 'status-dot on';
      document.getElementById('statusText').textContent =
        `Connected · ${CONFIG.github.repo} (${branch})`;

      document.getElementById('browserToolbar').style.display = 'flex';
      await navTo('');

    } catch (err) {
      _showConnMsg(`✗ ${err.message}`, 'err');
      document.getElementById('connDot').className = 'conn-dot error';
    } finally {
      btn.disabled    = false;
      btn.textContent = 'Connect & Browse';
    }
  }

  // ── Navigation ─────────────────────────────────────────────

  async function navTo(path) {
    _currentPath = path;
    _selected.clear();
    _updateLoadBtn();
    _renderBreadcrumb(path);
    _renderSkeleton();

    try {
      const items = await GitHubAPI.listContents(path);
      _renderTree(items);
    } catch (err) {
      document.getElementById('fileTree').innerHTML =
        `<div class="tree-empty" style="color:var(--accent3);">
           Error: ${err.message}
         </div>`;
    }
  }

  function refresh() { navTo(_currentPath); }

  // ── Tree rendering ─────────────────────────────────────────

  function _renderBreadcrumb(path) {
    const bc = document.getElementById('breadcrumb');
    if (!path) { bc.innerHTML = '<span onclick="BrowserModule.navTo(\'\')">root</span>'; return; }

    const parts = path.split('/');
    let html    = '<span onclick="BrowserModule.navTo(\'\')">root</span>';
    parts.forEach((part, i) => {
      const full = parts.slice(0, i + 1).join('/');
      html += ` / <span onclick="BrowserModule.navTo('${full}')">${part}</span>`;
    });
    bc.innerHTML = html;
  }

  function _renderSkeleton() {
    document.getElementById('fileTree').innerHTML = Array(6).fill(0).map((_, i) => `
      <div class="tree-skeleton">
        <div class="skel" style="width:16px;height:14px;border-radius:3px;"></div>
        <div class="skel" style="width:${80 + i * 15}px;height:11px;"></div>
        <div class="skel" style="width:30px;height:9px;margin-left:auto;"></div>
      </div>`).join('');
  }

  function _renderTree(items) {
    const loaded = LayersModule.loadedPaths();

    // Dirs first, then alphabetical
    items.sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'dir' ? -1 : 1;
    });

    const t = document.getElementById('fileTree');

    if (!items.length) {
      t.innerHTML = '<div class="tree-empty">This folder is empty.</div>';
      return;
    }

    t.innerHTML = items.map(item => {
      // ── Directory ──
      if (item.type === 'dir') {
        return `
          <div class="tree-item dir" onclick="BrowserModule.navTo('${item.path}')">
            <span class="tree-icon">📁</span>
            <span class="tree-name">${item.name}</span>
            <span class="tree-badge badge-dir">DIR</span>
          </div>`;
      }

      // ── File ──
      const ext       = _extOf(item.name);
      const loadable  = _isLoadable(item.name);
      const bType     = _badgeType(item.name);
      const isLoaded  = loaded.has(item.path);
      const isSelected = _selected.has(item.sha);
      const size      = _formatSize(item.size);

      let badge = '';
      if (bType === 'geo')    badge = '<span class="tree-badge badge-geo">GEO</span>';
      else if (bType === 'raster') badge = '<span class="tree-badge badge-raster">TIF</span>';
      else if (bType === 'csv')    badge = '<span class="tree-badge badge-csv">CSV</span>';
      else if (bType === 'shp')    badge = '<span class="tree-badge badge-shp">SHP</span>';

      if (!loadable) {
        return `
          <div class="tree-item file" style="opacity:0.4;cursor:default;">
            <span class="tree-icon">${_fileIcon(ext)}</span>
            <span class="tree-name">${item.name}</span>
            <span class="tree-size">${size}</span>
          </div>`;
      }

      const checkmark = isLoaded ? '✓' : isSelected ? '☑' : '☐';
      const cls       = isLoaded ? 'loaded' : isSelected ? 'selected' : '';
      // Serialize item safely for inline onclick
      const itemJson  = encodeURIComponent(JSON.stringify(item));

      return `
        <div class="tree-item file ${cls}" id="ti-${item.sha}"
             onclick="BrowserModule.toggleSelect('${itemJson}')">
          <span class="tree-check">${checkmark}</span>
          <span class="tree-icon">${_fileIcon(ext)}</span>
          <span class="tree-name">${item.name}</span>
          <span class="tree-size">${size}</span>
          ${badge}
        </div>`;
    }).join('');
  }

  // ── Selection ──────────────────────────────────────────────

  function toggleSelect(encodedItem) {
    const item = JSON.parse(decodeURIComponent(encodedItem));

    // Already loaded → zoom to it
    if (LayersModule.loadedPaths().has(item.path)) {
      const entry = LayersModule.findByPath(item.path);
      if (entry) LayersModule.zoomTo(entry.id);
      ToastModule.show(`"${item.name}" already loaded — zoomed to it.`, 'warn');
      return;
    }

    const el    = document.getElementById(`ti-${item.sha}`);
    const check = el?.querySelector('.tree-check');

    if (_selected.has(item.sha)) {
      _selected.delete(item.sha);
      el?.classList.remove('selected');
      if (check) check.textContent = '☐';
    } else {
      _selected.set(item.sha, item);
      el?.classList.add('selected');
      if (check) check.textContent = '☑';
    }

    _updateLoadBtn();
  }

  function _updateLoadBtn() {
    const btn = document.getElementById('loadSelectedBtn');
    if (!btn) return;
    btn.disabled    = _selected.size === 0;
    btn.textContent = _selected.size > 0 ? `↓ Load (${_selected.size})` : '↓ Load';
  }

  // ── Load selected ──────────────────────────────────────────

  async function loadSelected() {
    const files = [..._selected.values()];
    if (!files.length) return;
    _selected.clear();
    _updateLoadBtn();

    for (const file of files) {
      ToastModule.showLoading(`Loading ${file.name}…`);
      try {
        await Loader.load(file);
        LayersModule.loadedPaths().add(file.path);   // mark immediately
      } catch (err) {
        ToastModule.show(`Error: ${file.name} — ${err.message}`, 'error');
        console.error(err);
      } finally {
        ToastModule.hideLoading();
      }
    }

    // Refresh tree to update checkmarks, then switch to Layers tab
    await navTo(_currentPath);
    TabsModule.switchTab('layers', document.querySelectorAll('.tab')[1]);
  }

  // ── Connection message ─────────────────────────────────────

  function _showConnMsg(msg, type) {
    const el = document.getElementById('connMsg');
    el.style.display = 'block';
    el.className     = `conn-msg ${type}`;
    el.textContent   = msg;
  }

  return { connect, navTo, refresh, toggleSelect, loadSelected };
})();
