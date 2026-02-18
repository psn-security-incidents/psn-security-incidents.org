/**
 * intelligence.js — Fetches and renders intelligence items from a JSON data file.
 * Each item is either a screenshot (image + description) or a note (markdown text).
 * Items are displayed in reverse chronological order (newest first).
 * Screenshots get a stable short hex label derived from their filename.
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

/**
 * Generate a stable short hex label from a string (FNV-1a 32-bit, truncated to 6 hex chars).
 */
function hashLabel(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0').slice(0, 6);
}

/**
 * Render basic markdown to HTML.
 * Supports: headings (##), bold (**), italic (*), inline code (`),
 * links [text](url), screenshot refs [#label], paragraphs, unordered lists (- item).
 */
function renderMarkdown(md, labelMap) {
  const lines = md.split('\n');
  const blocks = [];
  let currentList = [];

  function flushList() {
    if (currentList.length > 0) {
      blocks.push('<ul class="list-disc list-inside space-y-1 text-gray-300 text-sm">' +
        currentList.map(li => `<li>${inlineFormat(li)}</li>`).join('') + '</ul>');
      currentList = [];
    }
  }

  function inlineFormat(text) {
    // Inline code
    text = text.replace(/`([^`]+)`/g, '<code class="bg-psn-dark px-1.5 py-0.5 rounded text-terminal-green text-xs font-mono">$1</code>');
    // Bold
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-bold">$1</strong>');
    // Italic
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Links [text](url)
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-psn-blue hover:text-blue-400 underline" target="_blank" rel="noopener">$1</a>');
    // Screenshot refs [#label]
    text = text.replace(/\[#([a-f0-9]{6})\]/g, (match, label) => {
      const desc = labelMap && labelMap[label] ? ` title="${escapeHtml(labelMap[label])}"` : '';
      return `<a href="#ev-${label}" class="inline-block bg-psn-dark border border-psn-border rounded px-1.5 py-0.5 text-xs font-mono text-cyan-400 hover:text-cyan-300 no-underline"${desc}>#${label}</a>`;
    });
    return text;
  }

  for (const line of lines) {
    const trimmed = line.trim();

    // Blank line
    if (trimmed === '') {
      flushList();
      continue;
    }

    // Heading
    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      const sizes = { 1: 'text-lg', 2: 'text-base', 3: 'text-sm' };
      blocks.push(`<h${level + 1} class="${sizes[level] || 'text-sm'} font-mono font-bold text-white mt-2 mb-1">${inlineFormat(headingMatch[2])}</h${level + 1}>`);
      continue;
    }

    // List item
    if (trimmed.startsWith('- ')) {
      currentList.push(trimmed.slice(2));
      continue;
    }

    // Paragraph
    flushList();
    blocks.push(`<p class="text-gray-300 text-sm leading-relaxed">${inlineFormat(trimmed)}</p>`);
  }

  flushList();
  return blocks.join('\n');
}

function renderScreenshot(item, imageBase, label) {
  const article = document.createElement('article');
  article.className = 'bg-psn-surface border border-psn-border rounded-lg overflow-hidden max-w-2xl mx-auto';
  article.id = `ev-${label}`;

  const dateHtml = item.date
    ? `<time class="text-xs font-mono text-gray-500">${escapeHtml(formatDate(item.date))}</time>`
    : '';

  const descHtml = item.description
    ? `<p class="text-gray-200 text-sm font-mono leading-relaxed whitespace-pre-line mt-2">${escapeHtml(item.description)}</p>`
    : '';

  let imageHtml = '';
  if (item.image) {
    const src = `${imageBase}/${encodeURIComponent(item.image)}`;
    const w = item.width || '';
    const h = item.height || '';
    const dims = w && h ? `width="${w}" height="${h}"` : '';
    imageHtml = `
      <div class="relative">
        <a href="${escapeHtml(src)}" target="_blank" rel="noopener noreferrer" class="block">
          <img
            src="${escapeHtml(src)}"
            alt="Intelligence evidence"
            ${dims}
            loading="lazy"
            class="w-full h-auto cursor-zoom-in hover:opacity-90 transition-opacity"
          >
        </a>
        <a href="#ev-${label}" class="absolute top-2 right-2 bg-psn-dark/80 backdrop-blur-sm border border-psn-border rounded px-1.5 py-0.5 text-xs font-mono text-cyan-400 hover:text-cyan-300 no-underline">#${label}</a>
      </div>`;
  }

  article.innerHTML = `
    <div class="px-5 py-4 border-b border-psn-border/50">
      <div class="flex items-center">${dateHtml}</div>
      ${descHtml}
    </div>
    ${imageHtml}`;

  return article;
}

function renderNote(item, labelMap) {
  const article = document.createElement('article');
  article.className = 'bg-psn-surface border border-cyan-900/50 border-l-2 border-l-cyan-500 rounded-lg overflow-hidden max-w-2xl mx-auto';

  const dateHtml = item.date
    ? `<time class="text-xs font-mono text-gray-500">${escapeHtml(formatDate(item.date))}</time>`
    : '';

  const bodyHtml = item.markdown ? renderMarkdown(item.markdown, labelMap) : '';

  article.innerHTML = `
    <div class="px-5 py-4">
      <div class="flex items-center gap-2 mb-3">
        ${dateHtml}
        <span class="text-xs font-mono text-cyan-500 uppercase tracking-wider">Analysis</span>
      </div>
      <div class="space-y-2">${bodyHtml}</div>
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

    // Build label map: hex label -> description, for all screenshot items
    const labelMap = {};
    data.intelligence.forEach(item => {
      if (item.image) {
        const label = hashLabel(item.image);
        labelMap[label] = item.description || item.image;
      }
    });

    // Sort newest first by date; notes sort before screenshots on the same date
    const sorted = data.intelligence.sort((a, b) => {
      const dateCmp = (b.date || '').localeCompare(a.date || '');
      if (dateCmp !== 0) return dateCmp;
      const aNote = a.type === 'note' ? 0 : 1;
      const bNote = b.type === 'note' ? 0 : 1;
      return aNote - bNote;
    });

    sorted.forEach(item => {
      if (item.type === 'note') {
        container.appendChild(renderNote(item, labelMap));
      } else {
        const label = hashLabel(item.image);
        container.appendChild(renderScreenshot(item, imageBase, label));
      }
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
