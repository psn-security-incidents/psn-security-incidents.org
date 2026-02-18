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
  // Normalise the current path to just the filename (or 'index.html' for root)
  const path = window.location.pathname;
  const page = path.split('/').pop() || 'index.html';
  const currentPage = (page === '' || page === '/') ? 'index' : page.replace(/\.html$/, '');

  document.querySelectorAll('nav a[href]').forEach(link => {
    const href = link.getAttribute('href');
    // Skip the site name link (home link)
    if (href === '/') return;
    const linkPage = href.split('/').pop().replace(/\.html$/, '');
    if (linkPage === currentPage) {
      link.classList.remove('text-gray-400');
      link.classList.add('text-terminal-green');
    }
  });
}
