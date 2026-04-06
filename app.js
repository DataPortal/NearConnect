const state = {
  currentSpace: null,
  myProfileId: localStorage.getItem("nearconnect_profile_id") || null,
  mySpaceCode: localStorage.getItem("nearconnect_space_code") || null,
};

const el = {
  createSpaceForm: document.getElementById("createSpaceForm"),
  joinSpaceForm: document.getElementById("joinSpaceForm"),
  registerProfileForm: document.getElementById("registerProfileForm"),
  closeSpaceForm: document.getElementById("closeSpaceForm"),

  refreshBtn: document.getElementById("refreshBtn"),

  createdSpaceResult: document.getElementById("createdSpaceResult"),
  spaceInfoSection: document.getElementById("spaceInfoSection"),
  registerSection: document.getElementById("registerSection"),
  profilesSection: document.getElementById("profilesSection"),
  adminSection: document.getElementById("adminSection"),
  messageSection: document.getElementById("messageSection"),
  messageBox: document.getElementById("messageBox"),

  spaceInfo: document.getElementById("spaceInfo"),
  profilesMeta: document.getElementById("profilesMeta"),
  profilesList: document.getElementById("profilesList"),

  hideMyProfileBtn: document.getElementById("hideMyProfileBtn"),

  spaceName: document.getElementById("spaceName"),
  spaceDescription: document.getElementById("spaceDescription"),
  adminPin: document.getElementById("adminPin"),
  spaceExpiryHours: document.getElementById("spaceExpiryHours"),

  joinCode: document.getElementById("joinCode"),

  displayName: document.getElementById("displayName"),
  whatsappNumber: document.getElementById("whatsappNumber"),
  availability: document.getElementById("availability"),
  shortNote: document.getElementById("shortNote"),
  consent: document.getElementById("consent"),

  closePin: document.getElementById("closePin"),
};

function showMessage(message, type = "info") {
  el.messageSection.classList.remove("hidden");
  el.messageBox.className = "";
  el.messageBox.classList.add(
    type === "success" ? "message-success" :
    type === "error" ? "message-error" : "message-info"
  );
  el.messageBox.innerHTML = `<p>${message}</p>`;
}

function clearMessage() {
  el.messageSection.classList.add("hidden");
  el.messageBox.innerHTML = "";
  el.messageBox.className = "";
}

function generateCode(prefix = "NC") {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = prefix + "-";
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function sanitizePhone(phone) {
  return phone.replace(/[^\d]/g, "");
}

function toWhatsappLink(phone) {
  const clean = sanitizePhone(phone);
  return `https://wa.me/${clean}`;
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("fr-FR");
}

function computeExpiry(hours) {
  const now = new Date();
  now.setHours(now.getHours() + Number(hours || 24));
  return now.toISOString();
}

function escapeHtml(str = "") {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function createSpace(payload) {
  const { data, error } = await sb
    .from("spaces")
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function findSpaceByCode(code) {
  const nowIso = new Date().toISOString();

  const { data, error } = await sb
    .from("spaces")
    .select("*")
    .eq("space_code", code)
    .eq("is_active", true)
    .gt("expires_at", nowIso)
    .single();

  if (error) throw error;
  return data;
}

async function createOrReplaceProfile(profile) {
  const existingProfileId = state.myProfileId;

  if (existingProfileId) {
    const { data, error } = await sb
      .from("profiles")
      .update({
        display_name: profile.display_name,
        whatsapp_number: profile.whatsapp_number,
        availability: profile.availability,
        short_note: profile.short_note,
        is_visible: true,
        expires_at: profile.expires_at,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingProfileId)
      .eq("space_id", profile.space_id)
      .select()
      .single();

    if (!error && data) return data;
  }

  const { data, error } = await sb
    .from("profiles")
    .insert([profile])
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function loadProfiles(spaceId) {
  const nowIso = new Date().toISOString();

  const { data, error } = await sb
    .from("profiles")
    .select("*")
    .eq("space_id", spaceId)
    .eq("is_visible", true)
    .gt("expires_at", nowIso)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

async function hideMyProfile() {
  if (!state.myProfileId || !state.currentSpace) {
    showMessage("Aucun profil local à masquer pour cet espace.", "error");
    return;
  }

  const { error } = await sb
    .from("profiles")
    .update({ is_visible: false, updated_at: new Date().toISOString() })
    .eq("id", state.myProfileId)
    .eq("space_id", state.currentSpace.id);

  if (error) throw error;

  localStorage.removeItem("nearconnect_profile_id");
  state.myProfileId = null;

  showMessage("Votre profil a été masqué.", "success");
  await refreshProfiles();
}

async function closeCurrentSpace(pin) {
  if (!state.currentSpace) {
    showMessage("Aucun espace actif sélectionné.", "error");
    return;
  }

  if (pin !== state.currentSpace.admin_pin) {
    showMessage("Code admin incorrect.", "error");
    return;
  }

  const { error } = await sb
    .from("spaces")
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", state.currentSpace.id);

  if (error) throw error;

  showMessage("L’espace a été fermé.", "success");
  state.currentSpace = null;
  localStorage.removeItem("nearconnect_space_code");
  renderSpace(null);
}

function renderCreatedSpace(space) {
  el.createdSpaceResult.classList.remove("hidden");
  el.createdSpaceResult.innerHTML = `
    <h4>Espace créé avec succès</h4>
    <p><strong>Nom :</strong> ${escapeHtml(space.name)}</p>
    <p><strong>Code espace :</strong> <span class="code-chip">${escapeHtml(space.space_code)}</span></p>
    <p><strong>Expiration :</strong> ${formatDate(space.expires_at)}</p>
    <p>Partage ce code ou transforme-le en QR code dans une version suivante.</p>
  `;
}

function renderSpace(space) {
  const visible = !!space;

  el.spaceInfoSection.classList.toggle("hidden", !visible);
  el.registerSection.classList.toggle("hidden", !visible);
  el.profilesSection.classList.toggle("hidden", !visible);
  el.adminSection.classList.toggle("hidden", !visible);

  if (!visible) {
    el.spaceInfo.innerHTML = "";
    el.profilesMeta.innerHTML = "";
    el.profilesList.innerHTML = "";
    return;
  }

  el.spaceInfo.innerHTML = `
    <h4>${escapeHtml(space.name)}</h4>
    <p><strong>Code :</strong> <span class="code-chip">${escapeHtml(space.space_code)}</span></p>
    <p><strong>Description :</strong> ${escapeHtml(space.description || "Aucune description")}</p>
    <p><strong>Expire le :</strong> ${formatDate(space.expires_at)}</p>
    <p><strong>Statut :</strong> ${space.is_active ? "Actif" : "Fermé"}</p>
  `;
}

function renderProfiles(profiles) {
  el.profilesMeta.innerHTML = `<strong>${profiles.length}</strong> profil(s) visible(s)`;

  if (!profiles.length) {
    el.profilesList.innerHTML = `
      <div class="result-box">
        <p>Aucun profil visible pour le moment dans cet espace.</p>
      </div>
    `;
    return;
  }

  el.profilesList.innerHTML = profiles.map(profile => {
    const whatsappUrl = toWhatsappLink(profile.whatsapp_number);
    const isMine = state.myProfileId && profile.id === state.myProfileId;

    return `
      <article class="profile-card">
        <h4>${escapeHtml(profile.display_name)}</h4>
        <div class="profile-meta">
          <span class="tag tag-availability">${escapeHtml(profile.availability)}</span>
          <span class="tag tag-time">${formatDate(profile.created_at)}</span>
        </div>
        <div class="profile-note">${escapeHtml(profile.short_note || "Aucun message")}</div>
        <div class="profile-actions">
          <a class="link-btn" href="${whatsappUrl}" target="_blank" rel="noopener noreferrer">WhatsApp</a>
          ${isMine ? `<span class="ghost-btn">Votre profil</span>` : ""}
        </div>
      </article>
    `;
  }).join("");
}

async function refreshProfiles() {
  if (!state.currentSpace) return;
  const profiles = await loadProfiles(state.currentSpace.id);
  renderProfiles(profiles);
}

async function joinSpaceByCode(code) {
  clearMessage();

  try {
    const cleanCode = code.trim().toUpperCase();
    const space = await findSpaceByCode(cleanCode);
    state.currentSpace = space;
    localStorage.setItem("nearconnect_space_code", space.space_code);
    renderSpace(space);
    await refreshProfiles();
    showMessage(`Espace "${escapeHtml(space.name)}" rejoint avec succès.`, "success");
  } catch (error) {
    console.error(error);
    showMessage("Impossible de rejoindre cet espace. Vérifie le code ou l’expiration.", "error");
  }
}

async function bootstrapLastSpace() {
  if (!state.mySpaceCode) return;
  try {
    const space = await findSpaceByCode(state.mySpaceCode);
    state.currentSpace = space;
    renderSpace(space);
    await refreshProfiles();
  } catch (error) {
    localStorage.removeItem("nearconnect_space_code");
    localStorage.removeItem("nearconnect_profile_id");
    state.mySpaceCode = null;
    state.myProfileId = null;
  }
}

el.createSpaceForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearMessage();

  const name = el.spaceName.value.trim();
  const description = el.spaceDescription.value.trim();
  const adminPin = el.adminPin.value.trim();
  const expiryHours = Number(el.spaceExpiryHours.value || 24);

  if (!name || !adminPin) {
    showMessage("Le nom de l’espace et le code admin sont obligatoires.", "error");
    return;
  }

  try {
    const payload = {
      name,
      description,
      admin_pin: adminPin,
      space_code: generateCode(),
      is_active: true,
      expires_at: computeExpiry(expiryHours),
    };

    const createdSpace = await createSpace(payload);

    renderCreatedSpace(createdSpace);
    await joinSpaceByCode(createdSpace.space_code);

    el.createSpaceForm.reset();
    el.spaceExpiryHours.value = 24;
  } catch (error) {
    console.error(error);
    showMessage("Erreur lors de la création de l’espace.", "error");
  }
});

el.joinSpaceForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  await joinSpaceByCode(el.joinCode.value);
});

el.registerProfileForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearMessage();

  if (!state.currentSpace) {
    showMessage("Rejoins d’abord un espace.", "error");
    return;
  }

  const displayName = el.displayName.value.trim();
  const whatsappNumber = el.whatsappNumber.value.trim();
  const availability = el.availability.value;
  const shortNote = el.shortNote.value.trim();
  const consent = el.consent.checked;

  if (!displayName || !whatsappNumber || !availability || !consent) {
    showMessage("Merci de compléter tous les champs obligatoires et d’accepter l’affichage.", "error");
    return;
  }

  try {
    const createdProfile = await createOrReplaceProfile({
      space_id: state.currentSpace.id,
      display_name: displayName,
      whatsapp_number: sanitizePhone(whatsappNumber),
      availability,
      short_note: shortNote,
      is_visible: true,
      expires_at: state.currentSpace.expires_at,
    });

    state.myProfileId = createdProfile.id;
    localStorage.setItem("nearconnect_profile_id", createdProfile.id);

    showMessage("Votre profil a été publié.", "success");
    await refreshProfiles();
    el.registerProfileForm.reset();
  } catch (error) {
    console.error(error);
    showMessage("Erreur lors de l’enregistrement du profil.", "error");
  }
});

el.hideMyProfileBtn.addEventListener("click", async () => {
  try {
    await hideMyProfile();
  } catch (error) {
    console.error(error);
    showMessage("Impossible de masquer le profil.", "error");
  }
});

el.closeSpaceForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearMessage();

  try {
    await closeCurrentSpace(el.closePin.value.trim());
    el.closeSpaceForm.reset();
  } catch (error) {
    console.error(error);
    showMessage("Impossible de fermer l’espace.", "error");
  }
});

el.refreshBtn.addEventListener("click", async () => {
  clearMessage();
  try {
    if (state.currentSpace) {
      const fresh = await findSpaceByCode(state.currentSpace.space_code);
      state.currentSpace = fresh;
      renderSpace(fresh);
      await refreshProfiles();
      showMessage("Données actualisées.", "success");
    } else {
      showMessage("Aucun espace actif à actualiser.", "info");
    }
  } catch (error) {
    console.error(error);
    showMessage("Actualisation impossible.", "error");
  }
});

bootstrapLastSpace();
