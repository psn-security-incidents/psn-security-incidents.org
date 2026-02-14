/**
 * status.js — Token-based entry management on status.html.
 *
 * Reads ?token= from the URL, fetches entries, and provides UI to
 * add new entries, delete individual entries, and delete all data.
 */

import { apiGet, apiPost, apiDelete, ApiError } from './api.js';

const MAX_CONTENT = 10_000;

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(isoStr) {
  try {
    const d = new Date(isoStr + 'Z');
    return d.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return isoStr;
  }
}

function getToken() {
  const params = new URLSearchParams(window.location.search);
  return params.get('token');
}

export function initStatus() {
  const content = document.getElementById('status-content');
  if (!content) return;

  const token = getToken();

  if (!token) {
    content.innerHTML = `
      <div class="text-center py-12">
        <p class="text-gray-400 mb-4">No report token found.</p>
        <p class="text-gray-600 text-xs font-mono mb-4">
          search: ${escapeHtml(window.location.search)}<br>
          href: ${escapeHtml(window.location.href)}
        </p>
        <a href="/report.html" class="text-psn-blue hover:text-blue-400 font-mono text-sm transition-colors">
          Request a report link
        </a>
      </div>`;
    return;
  }

  loadEntries(content, token);
}

async function loadEntries(container, token) {
  container.innerHTML = `
    <div class="text-center py-12">
      <p class="text-gray-400 font-mono text-sm">Loading your report...</p>
    </div>`;

  try {
    const data = await apiGet(`/report/entries?token=${encodeURIComponent(token)}`);
    renderReport(container, token, data.entries);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      container.innerHTML = `
        <div class="text-center py-12">
          <p class="text-gray-400 mb-2">This link has expired or is invalid.</p>
          <a href="/report.html" class="text-psn-blue hover:text-blue-400 font-mono text-sm transition-colors">
            Request a new link
          </a>
        </div>`;
    } else {
      container.innerHTML = `
        <div class="text-center py-12">
          <p class="text-red-400 mb-2">Failed to load your report.</p>
          <button onclick="location.reload()" class="text-psn-blue hover:text-blue-400 font-mono text-sm transition-colors">
            Try again
          </button>
        </div>`;
    }
  }
}

function renderReport(container, token, entries) {
  const hasEntries = entries.length > 0;

  let html = '';

  // Jump link for returning users
  if (hasEntries) {
    html += `
      <div class="mb-6">
        <a href="#add-entry" class="text-psn-blue hover:text-blue-400 font-mono text-sm transition-colors">
          Jump to add new entry
        </a>
      </div>`;
  }

  // Welcome / instruction text
  if (!hasEntries) {
    html += `
      <div class="mb-8">
        <p class="text-gray-400 text-sm leading-relaxed">
          Your report is empty. Use the form below to describe your incident.
          You can add multiple entries over time — for example, initial details now
          and updates later as your case progresses.
        </p>
      </div>`;
  }

  // Existing entries
  if (hasEntries) {
    html += `<div class="space-y-4 mb-8">`;
    for (const entry of entries) {
      html += renderEntryCard(entry, token);
    }
    html += `</div>`;
  }

  // Add entry form
  html += `
    <div id="add-entry" class="bg-psn-surface border border-psn-border rounded-lg p-6">
      <h2 class="font-mono font-bold text-white text-sm mb-4">
        ${hasEntries ? 'Add Another Entry' : 'Add Your First Entry'}
      </h2>
      <div class="relative">
        <textarea id="entry-content"
                  rows="8"
                  maxlength="${MAX_CONTENT}"
                  placeholder="Describe what happened — when your account was compromised, what 2FA was enabled, what Sony support said, etc."
                  class="w-full bg-psn-dark border border-psn-border rounded px-4 py-3
                         text-sm text-gray-200 font-mono placeholder-gray-600
                         focus:outline-none focus:border-psn-blue focus:ring-1 focus:ring-psn-blue/50
                         transition-colors resize-y min-h-[120px]"></textarea>
        <div class="text-right mt-1">
          <span id="char-count" class="text-gray-600 text-xs font-mono">0 / ${MAX_CONTENT.toLocaleString()}</span>
        </div>
      </div>
      <div class="flex items-center gap-3 mt-4">
        <button id="submit-entry"
                class="px-5 py-2.5 bg-psn-blue text-white text-sm font-mono font-medium rounded
                       hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-psn-blue/50
                       transition-colors">
          Submit Entry
        </button>
        <span id="entry-status" class="text-xs font-mono hidden"></span>
      </div>
    </div>`;

  // Delete all data
  html += `
    <div class="mt-12 pt-8 border-t border-psn-border">
      <button id="delete-all"
              class="text-red-400 hover:text-red-300 text-xs font-mono transition-colors">
        Delete All My Data
      </button>
    </div>`;

  container.innerHTML = html;

  // Wire up event listeners
  wireEntryForm(container, token);
  wireDeleteButtons(container, token);
  wireDeleteAll(container, token);
}

function renderEntryCard(entry, token) {
  return `
    <div class="bg-psn-surface border border-psn-border rounded-lg p-5" data-entry-id="${escapeHtml(entry.id)}">
      <div class="flex items-start justify-between gap-4 mb-3">
        <span class="text-gray-500 text-xs font-mono">${formatDate(entry.created_at)}</span>
        <button class="entry-delete text-gray-600 hover:text-red-400 text-xs font-mono transition-colors"
                data-entry-id="${escapeHtml(entry.id)}">
          Delete
        </button>
      </div>
      <p class="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">${escapeHtml(entry.content)}</p>
    </div>`;
}

function wireEntryForm(container, token) {
  const textarea = container.querySelector('#entry-content');
  const charCount = container.querySelector('#char-count');
  const submitBtn = container.querySelector('#submit-entry');
  const statusEl = container.querySelector('#entry-status');

  if (textarea && charCount) {
    textarea.addEventListener('input', () => {
      const len = textarea.value.length;
      charCount.textContent = `${len.toLocaleString()} / ${MAX_CONTENT.toLocaleString()}`;
      charCount.className = len > MAX_CONTENT * 0.9
        ? 'text-amber-400 text-xs font-mono'
        : 'text-gray-600 text-xs font-mono';
    });
  }

  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      const content = textarea.value.trim();
      if (!content) {
        statusEl.textContent = 'Please enter some content.';
        statusEl.className = 'text-xs font-mono text-amber-400';
        return;
      }

      submitBtn.disabled = true;
      submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
      statusEl.classList.add('hidden');

      try {
        await apiPost(`/report/entries?token=${encodeURIComponent(token)}`, { content });
        // Reload the full report to show the new entry
        await loadEntries(container, token);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          statusEl.textContent = 'Your link has expired. Please request a new one.';
        } else {
          statusEl.textContent = err.message || 'Failed to submit. Please try again.';
        }
        statusEl.className = 'text-xs font-mono text-red-400';
        submitBtn.disabled = false;
        submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      }
    });
  }
}

function wireDeleteButtons(container, token) {
  container.querySelectorAll('.entry-delete').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const entryId = btn.dataset.entryId;
      if (!confirm('Delete this entry? This cannot be undone.')) return;

      btn.disabled = true;
      btn.textContent = 'Deleting...';

      try {
        await apiDelete(`/report/entries/${encodeURIComponent(entryId)}?token=${encodeURIComponent(token)}`);
        await loadEntries(container, token);
      } catch {
        btn.textContent = 'Failed';
        btn.disabled = false;
      }
    });
  });
}

function wireDeleteAll(container, token) {
  const btn = container.querySelector('#delete-all');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    if (!confirm('Delete ALL your data? This will remove every entry and your submitter record. This cannot be undone.')) {
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Deleting...';

    try {
      await apiDelete(`/report/submitter?token=${encodeURIComponent(token)}`);
      container.innerHTML = `
        <div class="text-center py-12">
          <p class="text-gray-400 mb-4">All your data has been deleted.</p>
          <a href="/" class="text-psn-blue hover:text-blue-400 font-mono text-sm transition-colors">
            Return home
          </a>
        </div>`;
    } catch {
      btn.textContent = 'Delete All My Data';
      btn.disabled = false;
      alert('Failed to delete data. Please try again.');
    }
  });
}
