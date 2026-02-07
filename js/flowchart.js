/**
 * flowchart.js — Renders an interactive flowchart from a JSON data file.
 * Vanilla JS, no dependencies. Driven by a tree of nodes with types,
 * labels, expandable detail text, and sequential/choice child modes.
 */

// ── Inline SVG Icons ────────────────────────────────────────────────

const ICONS = {
  decision: `<svg viewBox="0 0 20 20" fill="currentColor" class="text-amber-500">
    <path d="M10 2L2 10l8 8 8-8-8-8zm0 2.83L15.17 10 10 15.17 4.83 10 10 4.83z"/>
  </svg>`,
  action: `<svg viewBox="0 0 20 20" fill="currentColor" class="text-blue-500">
    <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
  </svg>`,
  warning: `<svg viewBox="0 0 20 20" fill="currentColor" class="text-red-500">
    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
  </svg>`,
  info: `<svg viewBox="0 0 20 20" fill="currentColor" class="text-gray-500">
    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
  </svg>`,
  section: `<svg viewBox="0 0 20 20" fill="currentColor" class="text-violet-500">
    <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/>
  </svg>`,
};

// ── Rendering ───────────────────────────────────────────────────────

/**
 * Main entry point. Fetches JSON and renders the flowchart into the container.
 * @param {string} containerId - DOM id of the container element
 * @param {string} dataUrl - URL to the JSON data file
 */
export async function initFlowchart(containerId, dataUrl) {
  const container = document.getElementById(containerId);
  if (!container) return;

  try {
    const resp = await fetch(dataUrl);
    if (!resp.ok) throw new Error(`Failed to load flowchart data: ${resp.status}`);
    const data = await resp.json();

    // Clear loading indicator
    container.innerHTML = '';

    // Render the root node
    const rootEl = renderNode(data.root, 0, 0, '');
    container.appendChild(rootEl);

    // Set up expand/collapse all
    setupExpandAll(container);

  } catch (err) {
    container.innerHTML = `
      <div class="text-center text-red-400 py-12 font-mono text-sm">
        <p>Failed to load flowchart.</p>
        <p class="text-gray-600 mt-1">${escapeHtml(err.message)}</p>
      </div>`;
    console.error('Flowchart init error:', err);
  }
}

/**
 * Recursively renders a node and its children.
 * @param {object} node - The node data object
 * @param {number} depth - Current nesting depth
 * @param {number} index - Index among siblings (for step numbering)
 * @param {string} treeNumber - Hierarchical tree number (e.g. "01.02.03")
 * @returns {HTMLElement}
 */
function renderNode(node, depth, index, treeNumber) {
  const el = document.createElement('div');
  el.className = `flow-node flow-node--${node.type}`;
  el.dataset.nodeId = node.id;
  el.dataset.depth = depth;
  el.dataset.expanded = 'false';

  // Build the card
  const card = createCard(node, depth, index, treeNumber);
  el.appendChild(card);

  // If node has children, add connector stub + children container
  if (node.children && node.children.length > 0) {
    const mode = node.childMode || 'sequential';

    // Connector stub
    const stub = document.createElement('div');
    stub.className = 'flow-connector-stub';
    el.appendChild(stub);

    // Children container
    const childrenEl = document.createElement('div');
    childrenEl.className = `flow-children flow-children--${mode}`;

    node.children.forEach((child, i) => {
      const childNumber = treeNumber
        ? `${treeNumber}.${String(i + 1).padStart(2, '0')}`
        : String(i + 1).padStart(2, '0');
      // Insert OR divider between choice children
      if (mode === 'choice' && i > 0) {
        childrenEl.appendChild(createChoiceDivider());
      }
      childrenEl.appendChild(renderNode(child, depth + 1, i, childNumber));
    });

    el.appendChild(childrenEl);

    // Sections deeper than depth 1 start collapsed
    if (node.type === 'section' && depth >= 1) {
      childrenEl.classList.add('flow-children--collapsed');
      stub.style.display = 'none';
    }
  }

  return el;
}

/**
 * Creates the card element for a node.
 */
function createCard(node, depth, index, treeNumber) {
  const card = document.createElement('div');
  card.className = 'flow-card';

  // Header
  const header = document.createElement('div');
  header.className = 'flow-card__header';

  // Icon
  const icon = document.createElement('span');
  icon.className = 'flow-card__icon';
  icon.innerHTML = ICONS[node.type] || ICONS.info;
  header.appendChild(icon);

  // Step number (only for non-root nodes)
  if (depth > 0 && treeNumber) {
    const step = document.createElement('span');
    step.className = 'flow-card__step';
    // Show only the last two segments, prefixed with ">"
    const parts = treeNumber.split('.');
    const display = parts.slice(-2).join('.');
    step.textContent = `> ${display}`;
    header.appendChild(step);
  }

  // Label
  const label = document.createElement('span');
  label.className = 'flow-card__label';
  label.textContent = node.label;
  header.appendChild(label);

  card.appendChild(header);

  // Hover badge — floats top-right, appears only on mouse hover
  if (node.detail || (node.type === 'section' && node.children && node.children.length > 0)) {
    const badge = document.createElement('span');
    badge.className = 'flow-card__badge';
    // Set initial text based on state
    if (node.type === 'section' && node.children && node.children.length > 0) {
      badge.dataset.role = 'section';
      badge.textContent = depth >= 1 ? 'show' : 'hide';
    } else {
      badge.dataset.role = 'detail';
      badge.textContent = 'show';
    }
    card.appendChild(badge);
  }

  // Detail (expandable)
  if (node.detail) {
    const detail = document.createElement('div');
    detail.className = 'flow-card__detail';
    detail.setAttribute('aria-hidden', 'true');

    const detailInner = document.createElement('div');
    detailInner.className = 'flow-card__detail-inner';
    detailInner.textContent = node.detail;
    detail.appendChild(detailInner);
    card.appendChild(detail);
  }

  // Click handling — section nodes toggle children, others toggle detail
  const isSection = node.type === 'section' && node.children && node.children.length > 0;
  const hasDetail = !!node.detail;

  header.addEventListener('click', () => {
    const nodeEl = card.closest('.flow-node');
    if (isSection) {
      toggleSection(nodeEl);
    } else if (hasDetail) {
      toggleDetail(nodeEl);
    }
  });

  // Clicking the detail text also collapses it
  if (hasDetail) {
    const detail = card.querySelector('.flow-card__detail');
    detail.addEventListener('click', () => {
      const nodeEl = card.closest('.flow-node');
      if (isSection) {
        toggleSection(nodeEl);
      } else {
        toggleDetail(nodeEl);
      }
    });
  }

  return card;
}

// ── Expand / Collapse ───────────────────────────────────────────────

/**
 * Toggles the detail text of a node card.
 */
function toggleDetail(nodeEl) {
  const detail = nodeEl.querySelector('.flow-card__detail');
  if (!detail) return;

  const badge = nodeEl.querySelector('.flow-card__badge');
  const isExpanded = nodeEl.dataset.expanded === 'true';

  if (isExpanded) {
    // Collapse
    detail.style.height = detail.scrollHeight + 'px';
    detail.offsetHeight; // force reflow
    detail.style.height = '0';
    nodeEl.dataset.expanded = 'false';
    detail.setAttribute('aria-hidden', 'true');
    if (badge && badge.dataset.role === 'detail') badge.textContent = 'show';
  } else {
    // Expand
    detail.style.height = '0';
    const targetHeight = detail.scrollHeight;
    detail.style.height = targetHeight + 'px';
    detail.addEventListener('transitionend', function handler() {
      detail.style.height = 'auto';
      detail.removeEventListener('transitionend', handler);
    });
    nodeEl.dataset.expanded = 'true';
    detail.setAttribute('aria-hidden', 'false');
    if (badge && badge.dataset.role === 'detail') badge.textContent = 'hide';

    // Scroll into view if card goes below viewport
    requestAnimationFrame(() => {
      const rect = nodeEl.getBoundingClientRect();
      if (rect.bottom > window.innerHeight) {
        nodeEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }
}

/**
 * Toggles the children subtree of a section node.
 */
function toggleSection(nodeEl) {
  const childrenEl = nodeEl.querySelector(':scope > .flow-children');
  const stubEl = nodeEl.querySelector(':scope > .flow-connector-stub');
  const badge = nodeEl.querySelector('.flow-card__badge');
  if (!childrenEl) return;

  const isCollapsed = childrenEl.classList.contains('flow-children--collapsed');

  if (isCollapsed) {
    childrenEl.classList.remove('flow-children--collapsed');
    if (stubEl) stubEl.style.display = '';
    if (badge) badge.textContent = 'hide';
    // Also expand detail if present and not already showing
    if (nodeEl.dataset.expanded === 'false' && nodeEl.querySelector('.flow-card__detail')) {
      toggleDetail(nodeEl);
    }
  } else {
    childrenEl.classList.add('flow-children--collapsed');
    if (stubEl) stubEl.style.display = 'none';
    if (badge) badge.textContent = 'show';
    // Also collapse detail if expanded
    if (nodeEl.dataset.expanded === 'true') {
      toggleDetail(nodeEl);
    }
  }
}

/**
 * Sets up the expand-all / collapse-all button.
 */
function setupExpandAll(container) {
  const btn = document.getElementById('expand-all-btn');
  if (!btn) return;

  let allExpanded = false;

  btn.addEventListener('click', () => {
    const nodes = container.querySelectorAll('.flow-node[data-expanded]');
    const sections = container.querySelectorAll('.flow-children--collapsed');

    if (allExpanded) {
      // Collapse all details
      nodes.forEach((n) => {
        if (n.dataset.expanded === 'true') toggleDetail(n);
      });
      // Collapse sections (depth >= 1)
      container.querySelectorAll('.flow-node--section').forEach((s) => {
        const depth = parseInt(s.dataset.depth, 10);
        if (depth >= 1) {
          const ch = s.querySelector(':scope > .flow-children');
          const st = s.querySelector(':scope > .flow-connector-stub');
          const b = s.querySelector('.flow-card__badge');
          if (ch && !ch.classList.contains('flow-children--collapsed')) {
            ch.classList.add('flow-children--collapsed');
            if (st) st.style.display = 'none';
            if (b) b.textContent = 'show';
          }
        }
      });
      btn.textContent = 'Expand All';
      allExpanded = false;
    } else {
      // Expand all sections first
      container.querySelectorAll('.flow-children--collapsed').forEach((ch) => {
        ch.classList.remove('flow-children--collapsed');
        const stub = ch.previousElementSibling;
        if (stub && stub.classList.contains('flow-connector-stub')) {
          stub.style.display = '';
        }
      });
      container.querySelectorAll('.flow-card__badge[data-role="section"]').forEach((b) => {
        b.textContent = 'hide';
      });
      // Expand all details
      nodes.forEach((n) => {
        if (n.dataset.expanded === 'false' && n.querySelector('.flow-card__detail')) {
          toggleDetail(n);
        }
      });
      btn.textContent = 'Collapse All';
      allExpanded = true;
    }
  });
}

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Creates an "OR" divider element for mobile choice branches.
 */
function createChoiceDivider() {
  const div = document.createElement('div');
  div.className = 'flow-choice-divider';
  div.innerHTML = `
    <div class="flow-choice-divider__line"></div>
    <span class="flow-choice-divider__text">OR</span>
    <div class="flow-choice-divider__line"></div>`;
  return div;
}

function escapeHtml(str) {
  const el = document.createElement('span');
  el.textContent = str;
  return el.innerHTML;
}

