const aState = {
  currentSpace: null,
  adminSession: JSON.parse(localStorage.getItem("nc_admin_session") || "null"),
};

const aEl = {
  createSpaceForm: document.getElementById("createSpaceForm"),
  adminLoginForm: document.getElementById("adminLoginForm"),
  adminRefreshBtn: document.getElementById("adminRefreshBtn"),
  logoutAdminBtn: document.getElementById("logoutAdminBtn"),
  closeSpaceBtn: document.getElementById("closeSpaceBtn"),

  spaceName: document.getElementById("spaceName"),
  spaceDescription: document.getElementById("spaceDescription"),
  adminPin: document.getElementById("adminPin"),
  expiryHours: document.getElementById("expiryHours"),

  loginSpaceCode: document.getElementById("loginSpaceCode"),
  loginPin: document.getElementById("loginPin"),

  createdSpaceBox: document.getElementById("createdSpaceBox"),
  adminSpacePanel: document.getElementById("adminSpacePanel"),
  adminProfilesPanel: document.getElementById("adminProfilesPanel"),
  adminActionsPanel: document.getElementById("adminActionsPanel"),
  adminMessagePanel: document.getElementById("adminMessagePanel"),

  adminSpaceInfo: document.getElementById("adminSpaceInfo"),
  qrCanvasWrap: document.getElementById("qrCanvasWrap"),
  publicJoinUrl: document.getElementById("publicJoinUrl"),
  adminProfilesMeta: document.getElementById("adminProfilesMeta"),
  adminProfilesList: document.getElementById("adminProfilesList"),
  adminMessageBox: document.getElementById("adminMessageBox"),
};

async function createAdminSpace(payload) {
  const { data, error } = await sb
    .from("spaces")
    .insert([payload])
    .select("id, name, description, space_code, is_active, expires_at, created_at")
    .single();

  if (error) throw error;
  return data;
}

async function getAdminSpaceByCode(spaceCode) {
  const { data, error } = await sb
    .from("spaces")
    .select("*")
    .eq("space_code", spaceCode)
    .single();

  if (error) throw error;
  return data;
}

async function verifyAdminLogin(spaceCode, pin) {
  const space = await getAdminSpaceByCode(spaceCode.trim().toUpperCase());
  const pinHash = await sha256(pin);

  if (pinHash !== space.admin_pin_hash) {
    throw new Error("PIN invalide");
  }

  return space;
}

async function getAllProfilesForAdmin(spaceId) {
  const { data, error } = await sb
    .from("profiles")
    .select("*")
    .eq("space_id", spaceId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

async function moderateProfile(profileId, updates) {
  const { error } = await sb
    .from("profiles")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profileId);

  if (error) throw error;
}

async function closeAdminSpace(spaceId) {
  const { error } = await sb
    .from("spaces")
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", spaceId);

  if (error) throw error;
}

function publicJoinUrlForSpace(spaceCode) {
  const url = new URL(window.location.origin + window.location.pathname.replace("admin.html", "index.html"));
  url.searchParams.set("code", spaceCode);
  return url.toString();
}

async function renderQr(spaceCode) {
  aEl.qrCanvasWrap.innerHTML = "";
  const canvas = document.createElement("canvas");
  aEl.qrCanvasWrap.appendChild(canvas);

  await QRCode.toCanvas(canvas, publicJoinUrlForSpace(spaceCode), {
    width: 220,
    margin: 1
  });

  aEl.publicJoinUrl.innerHTML = `
    <strong>Lien public :</strong><br>${escapeHtml(publicJoinUrlForSpace(spaceCode))}
  `;
}

function renderAdminPanels(space) {
  const visible = !!space;
  aEl.adminSpacePanel.classList.toggle("hidden", !visible);
  aEl.adminProfilesPanel.classList.toggle("hidden", !visible);
  aEl.adminActionsPanel.classList.toggle("hidden", !visible);

  if (!visible) {
    aEl.adminSpaceInfo.innerHTML = "";
    aEl.adminProfilesMeta.innerHTML = "";
    aEl.adminProfilesList.innerHTML = "";
    aEl.qrCanvasWrap.innerHTML = "";
    aEl.publicJoinUrl.innerHTML = "";
    return;
  }

  aEl.adminSpaceInfo.innerHTML = `
    <h4>${escapeHtml(space.name)}</h4>
    <p><strong>Code espace :</strong> <span class="code-pill">${escapeHtml(space.space_code)}</span></p>
    <p><strong>Description :</strong> ${escapeHtml(space.description || "Aucune description")}</p>
    <p><strong>Statut :</strong> ${space.is_active ? "Actif" : "Fermé"}</p>
    <p><strong>Expire le :</strong> ${formatDate(space.expires_at)}</p>
    <p><strong>Créé le :</strong> ${formatDate(space.created_at)}</p>
  `;

  renderQr(space.space_code).catch(console.error);
}

function renderAdminProfiles(profiles) {
  aEl.adminProfilesMeta.innerHTML = `<strong>${profiles.length}</strong> profil(s) enregistré(s)`;

  if (!profiles.length) {
    aEl.adminProfilesList.innerHTML = `
      <div class="empty-box">
        <p>Aucun profil dans cet espace.</p>
      </div>
    `;
    return;
  }

  aEl.adminProfilesList.innerHTML = profiles.map(profile => `
    <article class="person-card">
      <h4>${escapeHtml(profile.display_name)}</h4>
      <div class="person-meta">
        <span class="tag tag-green">${escapeHtml(profile.availability)}</span>
        <span class="tag tag-gold">${profile.is_visible ? "Visible" : "Masqué"}</span>
        <span class="tag tag-violet">${formatDate(profile.created_at)}</span>
      </div>
      <div class="person-note">
        <strong>WhatsApp :</strong> ${escapeHtml(profile.whatsapp_number)}<br>
        <strong>Note :</strong> ${escapeHtml(profile.short_note || "Aucune note")}
      </div>
      <div class="person-actions">
        <button class="action-muted" data-action="toggle-visibility" data-id="${profile.id}" data-visible="${profile.is_visible}">
          ${profile.is_visible ? "Masquer" : "Rendre visible"}
        </button>
      </div>
    </article>
  `).join("");
}

async function loadAdminSpace(spaceCode) {
  const space = await getAdminSpaceByCode(spaceCode);
  aState.currentSpace = space;
  renderAdminPanels(space);

  const profiles = await getAllProfilesForAdmin(space.id);
  renderAdminProfiles(profiles);
}

function saveAdminSession(spaceCode) {
  aState.adminSession = {
    spaceCode,
    loggedAt: new Date().toISOString()
  };
  localStorage.setItem("nc_admin_session", JSON.stringify(aState.adminSession));
}

function clearAdminSession() {
  aState.adminSession = null;
  aState.currentSpace = null;
  localStorage.removeItem("nc_admin_session");
  renderAdminPanels(null);
}

aEl.createSpaceForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideBox(aEl.adminMessagePanel, aEl.adminMessageBox);

  try {
    const name = aEl.spaceName.value.trim();
    const description = aEl.spaceDescription.value.trim();
    const pin = aEl.adminPin.value.trim();
    const expiry = Number(aEl.expiryHours.value || 24);

    if (!name || !pin) {
      showBox(aEl.adminMessagePanel, aEl.adminMessageBox, "Le nom et le PIN admin sont obligatoires.", "error");
      return;
    }

    const pinHash = await sha256(pin);

    const created = await createAdminSpace({
      name,
      description,
      space_code: generateCode(),
      admin_pin_hash: pinHash,
      is_active: true,
      expires_at: computeExpiry(expiry),
    });

    aEl.createdSpaceBox.classList.remove("hidden");
    aEl.createdSpaceBox.innerHTML = `
      <h4>Espace créé avec succès</h4>
      <p><strong>Nom :</strong> ${escapeHtml(created.name)}</p>
      <p><strong>Code espace :</strong> <span class="code-pill">${escapeHtml(created.space_code)}</span></p>
      <p><strong>Expiration :</strong> ${formatDate(created.expires_at)}</p>
      <p>Conserve le PIN admin. Il n’est pas récupérable depuis l’interface.</p>
    `;

    saveAdminSession(created.space_code);
    await loadAdminSpace(created.space_code);

    aEl.createSpaceForm.reset();
    aEl.expiryHours.value = 24;

    showBox(aEl.adminMessagePanel, aEl.adminMessageBox, "Espace créé et session admin ouverte.", "success");
  } catch (error) {
    console.error(error);
    showBox(aEl.adminMessagePanel, aEl.adminMessageBox, "Erreur lors de la création de l’espace.", "error");
  }
});

aEl.adminLoginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideBox(aEl.adminMessagePanel, aEl.adminMessageBox);

  try {
    const spaceCode = aEl.loginSpaceCode.value.trim().toUpperCase();
    const pin = aEl.loginPin.value.trim();

    const space = await verifyAdminLogin(spaceCode, pin);
    saveAdminSession(space.space_code);
    await loadAdminSpace(space.space_code);

    aEl.adminLoginForm.reset();

    showBox(aEl.adminMessagePanel, aEl.adminMessageBox, "Session admin ouverte avec succès.", "success");
  } catch (error) {
    console.error(error);
    showBox(aEl.adminMessagePanel, aEl.adminMessageBox, "Code espace ou PIN admin invalide.", "error");
  }
});

aEl.logoutAdminBtn.addEventListener("click", () => {
  clearAdminSession();
  showBox(aEl.adminMessagePanel, aEl.adminMessageBox, "Session admin fermée localement.", "info");
});

aEl.adminRefreshBtn.addEventListener("click", async () => {
  try {
    if (!aState.adminSession?.spaceCode) {
      showBox(aEl.adminMessagePanel, aEl.adminMessageBox, "Aucune session admin active.", "info");
      return;
    }

    await loadAdminSpace(aState.adminSession.spaceCode);
    showBox(aEl.adminMessagePanel, aEl.adminMessageBox, "Données actualisées.", "success");
  } catch (error) {
    console.error(error);
    showBox(aEl.adminMessagePanel, aEl.adminMessageBox, "Actualisation impossible.", "error");
  }
});

aEl.closeSpaceBtn.addEventListener("click", async () => {
  try {
    if (!aState.currentSpace) {
      showBox(aEl.adminMessagePanel, aEl.adminMessageBox, "Aucun espace chargé.", "error");
      return;
    }

    await closeAdminSpace(aState.currentSpace.id);
    await loadAdminSpace(aState.currentSpace.space_code);
    showBox(aEl.adminMessagePanel, aEl.adminMessageBox, "Espace fermé.", "success");
  } catch (error) {
    console.error(error);
    showBox(aEl.adminMessagePanel, aEl.adminMessageBox, "Impossible de fermer l’espace.", "error");
  }
});

document.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-action='toggle-visibility']");
  if (!btn) return;

  try {
    const id = btn.dataset.id;
    const currentlyVisible = btn.dataset.visible === "true";

    await moderateProfile(id, { is_visible: !currentlyVisible });

    if (aState.currentSpace) {
      const profiles = await getAllProfilesForAdmin(aState.currentSpace.id);
      renderAdminProfiles(profiles);
    }

    showBox(aEl.adminMessagePanel, aEl.adminMessageBox, "Profil mis à jour.", "success");
  } catch (error) {
    console.error(error);
    showBox(aEl.adminMessagePanel, aEl.adminMessageBox, "Impossible de modifier le profil.", "error");
  }
});

(async function bootstrapAdmin() {
  const qs = new URLSearchParams(window.location.search);
  const codeFromQuery = qs.get("code");

  if (codeFromQuery) {
    aEl.loginSpaceCode.value = codeFromQuery.toUpperCase();
  }

  if (aState.adminSession?.spaceCode) {
    try {
      await loadAdminSpace(aState.adminSession.spaceCode);
    } catch (error) {
      console.error(error);
      clearAdminSession();
    }
  }
})();
