function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function sanitizePhone(phone = "") {
  return String(phone).replace(/[^\d]/g, "");
}

function whatsappLink(phone = "") {
  return `https://wa.me/${sanitizePhone(phone)}`;
}

function formatDate(dateValue) {
  if (!dateValue) return "-";
  return new Date(dateValue).toLocaleString("fr-FR");
}

function generateCode(prefix = "NC") {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = prefix + "-";
  for (let i = 0; i < 6; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function computeExpiry(hours = 24) {
  const d = new Date();
  d.setHours(d.getHours() + Number(hours));
  return d.toISOString();
}

async function sha256(text) {
  const enc = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", enc);
  return [...new Uint8Array(hashBuffer)]
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function showBox(panel, box, message, type = "info") {
  panel.classList.remove("hidden");
  box.className = "message-box";
  box.classList.add(
    type === "success" ? "message-success" :
    type === "error" ? "message-error" : "message-info"
  );
  box.innerHTML = `<p>${message}</p>`;
}

function hideBox(panel, box) {
  panel.classList.add("hidden");
  box.className = "message-box";
  box.innerHTML = "";
}
