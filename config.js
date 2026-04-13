// ─────────────────────────────────────────────────────────────
//  config.js — Central configuration for Atlas Multi-Risques Burundi 2026
//  Edit this file to change the repo, branch, or map defaults.
// ─────────────────────────────────────────────────────────────

const CONFIG = Object.freeze({

  // ── GitHub ──────────────────────────────────────────────────
  github: {
    repo:          'remyib/BI.IOM',
    apiBase:       'https://api.github.com',
    rawBase:       'https://raw.githubusercontent.com',
    defaultBranch: 'main',
  },

  // ── Map ─────────────────────────────────────────────────────
  map: {
    center:     [-3.3731, 29.9189],   // Burundi centroid
    zoom:       8,
    tileUrl:    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    tileAttrib: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom:    19,
  },

  // ── Supported file types ─────────────────────────────────────
  fileTypes: {
    '.geojson': 'geo',
    '.json':    'geo',
    '.tif':     'raster',
    '.tiff':    'raster',
    '.csv':     'csv',
    '.shp':     'shp',
    '.zip':     'shp',
  },

  // Ancillary shapefile parts auto-fetched alongside .shp
  shpSiblings: ['.dbf', '.prj', '.shx'],

  // ── Layer colour palette (cycled round-robin) ────────────────
  palette: ['#4f8ef7','#00d4aa','#f7714f','#f7c84f','#c84ff7','#4ff787','#f74fb5'],

  // ── UI ───────────────────────────────────────────────────────
  toastDuration: 4500,  // ms before a toast disappears
});
