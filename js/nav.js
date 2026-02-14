/**
 * nav.js — Mobile menu toggle and active page highlighting.
 */

export function initNav() {
  const toggle = document.getElementById('nav-toggle');
  const menu = document.getElementById('nav-menu');

  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      const isOpen = !menu.classList.contains('hidden');
      menu.classList.toggle('hidden');
      toggle.setAttribute('aria-expanded', String(!isOpen));
    });
  }

  // Highlight the current page link in the nav
  const path = window.location.pathname;
  document.querySelectorAll('nav a[href]').forEach(link => {
    const href = link.getAttribute('href');
    if (href === '/' && (path === '/' || path === '/index.html')) {
      link.classList.remove('text-gray-400');
      link.classList.add('text-terminal-green');
    } else if (href !== '/' && path.endsWith(href.replace(/^\//, ''))) {
      link.classList.remove('text-gray-400');
      link.classList.add('text-terminal-green');
    }
  });
}
