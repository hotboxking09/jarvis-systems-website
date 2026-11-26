/* Preserve bookmarked collection and product anchors after moving the clothing. */
(() => {
  if (!document.querySelector("[data-shop-service-overview]")) return;
  const hash = location.hash;
  const oldCollection = /^#(?:collection|shop-info|cs01-(?:hoodie|tshirt)-(?:core-cream|deep-navy|midnight-purple|obsidian-violet|signal-white|void-black))$/;
  if (!oldCollection.test(hash)) return;
  const locale = location.pathname.startsWith("/en/") ? "/en" : "";
  location.replace(`${locale}/merch/${hash}`);
})();
