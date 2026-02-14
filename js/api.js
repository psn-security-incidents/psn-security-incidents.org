/**
 * api.js — Thin fetch wrapper for the PSN Security Incidents API.
 *
 * Auto-detects base URL:
 *   - localhost:8787 for local wrangler dev
 *   - api.psn-security-incidents.org for production
 */

const API_BASE =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8787'
    : 'https://api.psn-security-incidents.org';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request(method, path, body) {
  const opts = {
    method,
    headers: {},
  };

  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }

  const resp = await fetch(`${API_BASE}${path}`, opts);
  const data = await resp.json();

  if (!resp.ok) {
    throw new ApiError(data.error || 'Request failed', resp.status);
  }

  return data;
}

export function apiGet(path) {
  return request('GET', path);
}

export function apiPost(path, body) {
  return request('POST', path, body);
}

export function apiDelete(path) {
  return request('DELETE', path);
}
