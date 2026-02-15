/**
 * intelligence.js — Fetches and renders intelligence items from a JSON data file.
 * Each item has an optional image (filename + dimensions) and a text description.
 * Items are displayed in reverse chronological order (newest first).
 */

function escapeHtml(str) {
  const el = document.createElement('span');
  el.textContent = str;
  return el.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function renderItem(item, imageBase) {
  const article = document.createElement('article');
  article.className = 'bg-psn-surface border border-psn-border rounded-lg overflow-hidden';

  const dateHtml = item.date
    ? `<time class="text-xs font-mono text-gray-500">${escapeHtml(formatDate(item.date))}</time>`
    : '';

  let imageHtml = '';
  if (item.image) {
    const src = `${imageBase}/${encodeURIComponent(item.image)}`;
    const w = item.width || '';
    const h = item.height || '';
    const dims = w && h ? `width="${w}" height="${h}"` : '';
    imageHtml = `
      <a href="${escapeHtml(src)}" target="_blank" rel="noopener noreferrer" class="block">
        <img
          src="${escapeHtml(src)}"
          alt="Intelligence evidence"
          ${dims}
          loading="lazy"
          class="w-full h-auto border-b border-psn-border/50 cursor-zoom-in hover:opacity-90 transition-opacity"
        >
      </a>`;
  }

  const descHtml = item.description
    ? `<p class="text-gray-300 text-sm leading-relaxed whitespace-pre-line">${escapeHtml(item.description)}</p>`
    : '';

  article.innerHTML = `
    ${imageHtml}
    <div class="px-5 py-4">
      <div class="mb-3">${dateHtml}</div>
      ${descHtml}
    </div>`;

  return article;
}

/**
 * Initialise the intelligence feed.
 * @param {string} containerId - DOM id of the container element
 * @param {string} dataUrl - URL to the intelligence JSON file
 * @param {string} imageBase - Base path for image URLs
 */
export async function initIntelligence(containerId, dataUrl, imageBase) {
  const container = document.getElementById(containerId);
  if (!container) return;

  try {
    const resp = await fetch(dataUrl);
    if (!resp.ok) throw new Error(`Failed to load intelligence: ${resp.status}`);
    const data = await resp.json();

    container.innerHTML = '';

    if (!data.intelligence || data.intelligence.length === 0) {
      container.innerHTML = `<p class="text-center text-gray-500 font-mono py-8">No intelligence items yet.</p>`;
      return;
    }

    // Sort newest first by date
    const sorted = data.intelligence.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    sorted.forEach(item => {
      container.appendChild(renderItem(item, imageBase));
    });

  } catch (err) {
    container.innerHTML = `
      <div class="text-center text-red-400 py-8 font-mono text-sm">
        <p>Failed to load intelligence.</p>
        <p class="text-gray-600 mt-1">${escapeHtml(err.message)}</p>
      </div>`;
    console.error('Intelligence init error:', err);
  }
}
