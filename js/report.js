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

export function initReport() {
  initToggle();

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
