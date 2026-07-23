/** Shared with client ThemeProvider — keep STORAGE_KEY in sync. */
export const THEME_STORAGE_KEY = "trade-brain.theme";

/**
 * Inline before paint to avoid flash.
 * Default: light (redesign), unless user stored a preference or OS is dark
 * and nothing is stored — still prefer light to match mock; only use stored.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var t=localStorage.getItem(k);if(t!=="light"&&t!=="dark"){t="light"}document.documentElement.setAttribute("data-theme",t);document.documentElement.style.colorScheme=t}catch(e){document.documentElement.setAttribute("data-theme","light")}})();`;
