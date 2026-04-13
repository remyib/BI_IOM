// ─────────────────────────────────────────────────────────────
//  github/api.js — GitHub REST API client
//  Depends on: config.js
// ─────────────────────────────────────────────────────────────

const GitHubAPI = (() => {

  let _pat    = '';
  let _branch = CONFIG.github.defaultBranch;

  // ── Credentials ───────────────────────────────────────────

  function setCredentials(pat, branch) {
    _pat    = pat    || '';
    _branch = branch || CONFIG.github.defaultBranch;
  }

  function hasPat() { return _pat.length > 0; }
  function getBranch() { return _branch; }

  // ── Headers ────────────────────────────────────────────────

  function _jsonHeaders() {
    const h = { 'Accept': 'application/vnd.github.v3+json' };
    if (_pat) h['Authorization'] = `token ${_pat}`;
    return h;
  }

  function _rawHeaders() {
    const h = {};
    if (_pat) h['Authorization'] = `token ${_pat}`;
    return h;
  }

  // ── REST helpers ───────────────────────────────────────────

  /**
   * GET a GitHub API endpoint and return parsed JSON.
   * Throws a descriptive Error on non-2xx responses.
   */
  async function get(endpoint) {
    const url = `${CONFIG.github.apiBase}${endpoint}`;
    const res = await fetch(url, { headers: _jsonHeaders() });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(`${res.status}: ${body.message || res.statusText}`);
    }
    return res.json();
  }

  /**
   * Fetch the raw content of a file in the repo.
   * Throws descriptive errors for auth / not-found failures.
   */
  async function fetchRaw(repoPath) {
    const url = `${CONFIG.github.rawBase}/${CONFIG.github.repo}/${_branch}/${repoPath}`;
    const res = await fetch(url, { headers: _rawHeaders() });

    if (res.status === 401) throw new Error('HTTP 401 — token invalid or expired.');
    if (res.status === 404) throw new Error(`HTTP 404 — "${repoPath}" not found or repo is private.`);
    if (!res.ok)            throw new Error(`HTTP ${res.status} fetching ${repoPath}`);

    return res;   // caller decides how to read the body
  }

  // ── Repo-specific queries ──────────────────────────────────

  /** Verify repo access and return the repo metadata object. */
  async function verifyRepo() {
    return get(`/repos/${CONFIG.github.repo}`);
  }

  /**
   * List the contents of a directory (or single file) in the repo.
   * Returns an array of GitHub content objects.
   */
  async function listContents(path) {
    const data = await get(
      `/repos/${CONFIG.github.repo}/contents/${path}?ref=${_branch}`
    );
    return Array.isArray(data) ? data : [data];
  }

  return { setCredentials, hasPat, getBranch, get, fetchRaw, verifyRepo, listContents };
})();
