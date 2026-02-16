/**
 * i18n.js — Language detection, JSON loader, and DOM translator.
 *
 * Detection order:
 *   1. "lang" cookie (for testing)
 *   2. localStorage key "lang"
 *   3. navigator.languages (browser preference)
 *   4. Fallback: "en"
 *
 * English text lives directly in the HTML. For non-English languages,
 * the corresponding lang/*.json is fetched and all elements with
 * data-i18n="key.path" have their textContent replaced.
 */

const SUPPORTED = ['en', 'ja', 'es', 'pt-br', 'de', 'fr', 'ar'];
const RTL_LANGS = ['ar'];

let currentLang = 'en';
let translations = {};

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

function detectLanguage() {
  const cookie = getCookie('lang');
  if (cookie && SUPPORTED.includes(cookie)) return cookie;

  const stored = localStorage.getItem('lang');
  if (stored && SUPPORTED.includes(stored)) return stored;

  const browserLangs = navigator.languages || [navigator.language || 'en'];
  for (const lang of browserLangs) {
    const lower = lang.toLowerCase();
    if (SUPPORTED.includes(lower)) return lower;
    const prefix = lower.split('-')[0];
    if (SUPPORTED.includes(prefix)) return prefix;
  }

  return 'en';
}

async function loadTranslations(lang) {
  if (lang === 'en') return {};
  try {
    const resp = await fetch(`/lang/${lang}.json`);
    if (!resp.ok) return {};
    return await resp.json();
  } catch {
    return {};
  }
}

function resolve(obj, path) {
  return path.split('.').reduce((o, k) => (o && o[k] !== undefined) ? o[k] : null, obj);
}

function applyTranslations() {
  if (currentLang === 'en') return;

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const value = resolve(translations, key);
    if (value) el.textContent = value;
  });

  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.getAttribute('data-i18n-html');
    const value = resolve(translations, key);
    if (value) el.innerHTML = value;
  });
}

/**
 * Switch the active language. Persists to localStorage.
 * @param {string} lang - Locale code (e.g. "en", "ja", "es")
 */
export async function setLanguage(lang) {
  if (!SUPPORTED.includes(lang)) return;
  currentLang = lang;
  localStorage.setItem('lang', lang);
  translations = await loadTranslations(lang);
  applyTranslations();
  document.documentElement.lang = lang;
  document.documentElement.dir = RTL_LANGS.includes(lang) ? 'rtl' : 'ltr';
}

/**
 * Initialise i18n on page load.
 */
export async function initI18n() {
  const lang = detectLanguage();
  if (lang !== 'en') {
    await setLanguage(lang);
  }
}
