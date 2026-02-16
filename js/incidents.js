/**
 * incidents.js — Fetches and renders public incident cards from a JSON data file.
 */

const PLATFORM_LABELS = {
  reddit: 'Reddit',
  x: 'X',
  twitter: 'X',
  youtube: 'YouTube',
  forum: 'Forum',
  news: 'News',
  other: 'Link',
};

const STATUS_STYLES = {
  unknown:    { label: 'Unknown',    cls: 'text-gray-400  border-gray-500/30  bg-gray-500/10' },
  resolved:   { label: 'Resolved',   cls: 'text-green-400 border-green-500/30 bg-green-500/10' },
  unresolved: { label: 'Unresolved', cls: 'text-red-400   border-red-500/30   bg-red-500/10' },
  banned:     { label: 'Banned',     cls: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function escapeHtml(str) {
  const el = document.createElement('span');
  el.textContent = str;
  return el.innerHTML;
}

function renderIncident(incident) {
  const status = STATUS_STYLES[incident.outcome?.status] || STATUS_STYLES.unknown;

  const sourcesHtml = incident.sources.map(s => {
    const label = PLATFORM_LABELS[s.platform] || 'Link';
    return `<a href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer"
               class="inline-flex items-center gap-1.5 text-sm font-mono px-3 py-1.5 rounded
                      border border-psn-blue/40 bg-psn-blue/10 text-psn-blue hover:bg-psn-blue/20 hover:border-psn-blue/60
                      transition-colors">
              <span>${escapeHtml(label)}</span>
              <svg class="w-3.5 h-3.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
              </svg>
            </a>`;
  }).join('');

  const tagsHtml = incident.tags.map(t =>
    `<span class="text-xs font-mono text-gray-600">#${escapeHtml(t)}</span>`
  ).join(' ');

  const card = document.createElement('article');
  card.className = 'bg-psn-surface border border-psn-border rounded-lg overflow-hidden';
  card.innerHTML = `
    <div class="px-5 py-4 border-b border-psn-border/50 flex flex-wrap items-center justify-between gap-2">
      <time class="text-xs font-mono text-gray-500">${escapeHtml(formatDate(incident.date))}</time>
      <span class="text-xs font-mono font-bold px-2 py-0.5 rounded border ${status.cls}">
        ${escapeHtml(status.label)}
      </span>
    </div>
    <div class="px-5 py-4">
      <h3 class="font-mono font-bold text-white text-sm md:text-base leading-snug mb-2">
        ${escapeHtml(incident.headline)}
      </h3>
      ${incident.handle ? `<p class="text-xs font-mono text-psn-blue mb-2">Account: ${escapeHtml(incident.handle)}</p>` : ''}
      <div class="flex flex-wrap items-center gap-2 mb-4">
        ${sourcesHtml}
      </div>
      <p class="text-gray-400 text-sm leading-relaxed mb-4">
        ${escapeHtml(incident.detail)}
      </p>
      ${incident.outcome?.summary ? `<p class="text-gray-500 text-sm leading-relaxed mb-4"><strong class="text-gray-300">Outcome:</strong> ${escapeHtml(incident.outcome.summary)}</p>` : ''}
      <div class="flex flex-wrap gap-2">
        ${tagsHtml}
      </div>
    </div>`;

  return card;
}

/**
 * Initialise the incidents feed.
 * @param {string} containerId - DOM id of the container element
 * @param {string} dataUrl - URL to the incidents JSON file
 */
export async function initIncidents(containerId, dataUrl) {
  const container = document.getElementById(containerId);
  if (!container) return;

  try {
    const resp = await fetch(dataUrl);
    if (!resp.ok) throw new Error(`Failed to load incidents: ${resp.status}`);
    const data = await resp.json();

    container.innerHTML = '';

    if (!data.incidents || data.incidents.length === 0) {
      container.innerHTML = `<p class="text-center text-gray-500 font-mono py-8">No incidents documented yet.</p>`;
      return;
    }

    // Sort newest first
    const sorted = data.incidents.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    sorted.forEach(incident => {
      container.appendChild(renderIncident(incident));
    });

  } catch (err) {
    container.innerHTML = `
      <div class="text-center text-red-400 py-8 font-mono text-sm">
        <p>Failed to load incidents.</p>
        <p class="text-gray-600 mt-1">${escapeHtml(err.message)}</p>
      </div>`;
    console.error('Incidents init error:', err);
  }
}
