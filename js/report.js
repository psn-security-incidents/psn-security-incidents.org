/**
 * report.js — Wires up the email form on report.html.
 */

import { apiPost, ApiError } from './api.js';

const INTRO_INCIDENT =
  'Submit an anonymous report of your PSN account theft. Especially if the account was protected by two-factor either SMS or passkey. You do not need to reveal your PSN Id, email, or anything else private. Stories are reviewed and if the details add up, they will be published in the Incidents page, suitably anonymized.';

const INTRO_TIP =
  'Anonymously report intelligence on the identity, accounts or related information on PSN hackers. Your email is used only to send you a secure link and is never published or shared.';

function initToggle() {
  const btnIncident = document.getElementById('toggle-incident');
  const btnTip = document.getElementById('toggle-tip');
  const intro = document.getElementById('report-intro');
  if (!btnIncident || !btnTip || !intro) return;

  const activeClasses = ['bg-psn-blue', 'text-white'];
  const inactiveClasses = ['text-gray-400', 'hover:text-gray-200'];

  function activate(active, inactive, text) {
    active.classList.add(...activeClasses);
    active.classList.remove(...inactiveClasses);
    inactive.classList.remove(...activeClasses);
    inactive.classList.add(...inactiveClasses);
    intro.textContent = text;
  }

  btnIncident.addEventListener('click', () => activate(btnIncident, btnTip, INTRO_INCIDENT));
  btnTip.addEventListener('click', () => activate(btnTip, btnIncident, INTRO_TIP));
}

function initRevealEmail() {
  const btn = document.getElementById('reveal-email-btn');
  const txt = document.getElementById('reveal-email-text');
  if (!btn || !txt) return;

  // Obfuscated as char-code pairs — never stored as a readable string in source
  const p = [107,55,81,109,51,120,82,57,112,87,50,110];
  const d = [112,114,111,116,111,110,46,109,101];

  btn.addEventListener('click', () => {
    const addr = String.fromCharCode(...p) + String.fromCharCode(64) + String.fromCharCode(...d);
    txt.textContent = addr;
    btn.classList.add('ring-1', 'ring-terminal-green/50');
    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'inline-flex items-center gap-1.5 ml-3 px-3 py-2 bg-psn-dark border border-psn-border ' +
      'rounded text-xs font-mono text-gray-400 hover:text-terminal-green hover:border-terminal-green/40 ' +
      'focus:outline-none transition-colors';
    copyBtn.innerHTML = '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
      '<rect x="9" y="9" width="13" height="13" rx="2" stroke-width="2"/>' +
      '<path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke-width="2"/></svg>' +
      '<span>Copy</span>';
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(addr).then(() => {
        copyBtn.querySelector('span').textContent = 'Copied!';
        copyBtn.classList.add('text-terminal-green');
        setTimeout(() => {
          copyBtn.querySelector('span').textContent = 'Copy';
          copyBtn.classList.remove('text-terminal-green');
        }, 2000);
      });
    });
    btn.parentNode.insertBefore(copyBtn, btn.nextSibling);
  }, { once: true });
}

export function initReport() {
  initToggle();
  initRevealEmail();

  const form = document.getElementById('report-email-form');
  const status = document.getElementById('report-email-status');
  if (!form || !status) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const emailInput = form.querySelector('#report-email');
    const submitBtn = form.querySelector('button[type="submit"]');
    const email = emailInput.value.trim();

    if (!email) return;

    // Disable while sending
    submitBtn.disabled = true;
    submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
    status.classList.add('hidden');

    const contactable = form.querySelector('#report-contactable')?.checked || false;

    try {
      await apiPost('/report/request-link', { email, contactable });

      status.textContent = 'Check your email for a link to your report. It may take a minute to arrive.';
      status.className = 'mt-3 text-xs font-mono text-terminal-green';
      emailInput.value = '';
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        status.textContent = 'Too many requests. Please try again later.';
      } else {
        status.textContent = 'Something went wrong. Please try again.';
      }
      status.className = 'mt-3 text-xs font-mono text-red-400';
    } finally {
      submitBtn.disabled = false;
      submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
  });
}
