const pState = {
  currentSpace: null,
  myProfileId: localStorage.getItem("nc_profile_id") || null,
  joinedSpaceCode: localStorage.getItem("nc_space_code") || null,
};

const pEl = {
  joinForm: document.getElementById("joinForm"),
  profileForm: document.getElementById("profileForm"),
  refreshBtn: document.getElementById("refreshBtn"),

  spaceCode: document.getElementById("spaceCode"),
  displayName: document.getElementById("displayName"),
  whatsappNumber: document.getElementById("whatsappNumber"),
  availability: document.getElementById("availability"),
  shortNote: document.getElementById("shortNote"),
  consent: document.getElementById("consent"),
  hideProfileBtn: document.getElementById("hideProfileBtn"),

  spacePanel: document.getElementById("spacePanel"),
  profilePanel: document.getElementById("profilePanel"),
  profilesPanel: document.getElementById("profilesPanel"),
  messagePanel: document.getElementById("messagePanel"),

  spaceInfo: document.getElementById("spaceInfo"),
  profilesMeta: document.getElementById("profilesMeta"),
  profilesList: document.getElementById("profilesList"),
  messageBox: document.getElementById("messageBox"),
};

async function getPublicSpaceByCode(spaceCode) {
  const nowIso = new Date().toISOString();

  const { data, error } = await sb
    .from("spaces_public")
    .select("*")
    .eq("space_code", spaceCode)
    .eq("is_active", true)
    .gt("expires_at", nowIso)
    .single();

  if (error) throw error;
  return data;
}

async function upsertParticipantProfile(payload) {
  if (pState.myProfileId) {
    const { data, error } = await sb
      .from("profiles")
      .update({
        display_name: payload.display_name,
        whatsapp_number: payload.whatsapp_number,
        availability: payload.availability,
        short_note: payload.short_note,
        is_visible: true,
        expires_at: payload.expires_at,
        updated_at: new Date().toISOString(),
      })
      .eq("id", pState.myProfileId)
      .eq("space_id", payload.space_id)
      .select()
      .single();

    if (!error && data) return data;
  }

  const { data, error } = await sb
    .from("profiles")
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getVisibleProfiles(spaceId) {
  const nowIso = new Date().toISOString();

  const { data, error } = await sb
    .from("profiles_public")
    .select("*")
    .eq("space_id", spaceId)
    .eq("is_visible", true)
    .gt("expires_at", nowIso)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

async function hideMyProfileParticipant() {
  if (!pState.myProfileId || !pState.currentSpace) {
    showBox(pEl.messagePanel, pEl.messageBox, "Aucun profil local trouvé pour cet espace.", "error");
    return;
  }

  const { error } = await sb
    .from("profiles")
    .update({
      is_visible: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", pState.myProfileId)
    .eq("space_id", pState.currentSpace.id);

  if (error) throw error;

  localStorage.removeItem("nc_profile_id");
  pState.myProfileId = null;

  showBox(pEl.messagePanel, pEl.messageBox, "Votre profil a été masqué.", "success");
  await refreshParticipantProfiles();
}

function renderParticipantSpace(space) {
  const visible = !!space;
  pEl.spacePanel.classList.toggle("hidden", !visible);
  pEl.profilePanel.classList.toggle("hidden", !visible);
  pEl.profilesPanel.classList.toggle("hidden", !visible);

  if (!visible) {
    pEl.spaceInfo.innerHTML = "";
    pEl.profilesMeta.innerHTML = "";
    pEl.profilesList.innerHTML = "";
    return;
  }

  pEl.spaceInfo.innerHTML = `
    <h4>${escapeHtml(space.name)}</h4>
    <p><strong>Code espace :</strong> <span class="code-pill">${escapeHtml(space.space_code)}</span></p>
    <p><strong>Description :</strong> ${escapeHtml(space.description || "Aucune description")}</p>
    <p><strong>Expire le :</strong> ${formatDate(space.expires_at)}</p>
  `;
}

function renderParticipantProfiles(profiles) {
  pEl.profilesMeta.innerHTML = `<strong>${profiles.length}</strong> profil(s) visible(s)`;

  if (!profiles.length) {
    pEl.profilesList.innerHTML = `
      <div class="empty-box">
        <p>Aucun profil visible pour le moment.</p>
      </div>
    `;
    return;
  }

  pEl.profilesList.innerHTML = profiles.map(profile => {
    const mine = pState.myProfileId && profile.id === pState.myProfileId;
    return `
      <article class="person-card">
        <h4>${escapeHtml(profile.display_name)}</h4>
        <div class="person-meta">
          <span class="tag tag-green">${escapeHtml(profile.availability)}</span>
          <span class="tag tag-gold">${formatDate(profile.created_at)}</span>
        </div>
        <div class="person-note">${escapeHtml(profile.short_note || "Aucun message")}</div>
        <div class="person-actions">
          <a class="action-link" href="${whatsappLink(profile.whatsapp_number)}" target="_blank" rel="noopener noreferrer">WhatsApp</a>
          ${mine ? `<span class="action-muted">Votre profil</span>` : ``}
        </div>
      </article>
    `;
  }).join("");
}

async function refreshParticipantProfiles() {
  if (!pState.currentSpace) return;
  const profiles = await getVisibleProfiles(pState.currentSpace.id);
  renderParticipantProfiles(profiles);
}

async function joinPublicSpace(code) {
  hideBox(pEl.messagePanel, pEl.messageBox);

  try {
    const cleanCode = code.trim().toUpperCase();
    const space = await getPublicSpaceByCode(cleanCode);

    pState.currentSpace = space;
    pState.joinedSpaceCode = space.space_code;
    localStorage.setItem("nc_space_code", space.space_code);

    renderParticipantSpace(space);
    await refreshParticipantProfiles();

    showBox(
      pEl.messagePanel,
      pEl.messageBox,
      `Espace "${escapeHtml(space.name)}" rejoint avec succès.`,
      "success"
    );
  } catch (error) {
    console.error(error);
    showBox(
      pEl.messagePanel,
      pEl.messageBox,
      "Impossible de rejoindre cet espace. Vérifie le code ou son expiration.",
      "error"
    );
  }
}

async function bootstrapParticipant() {
  if (!pState.joinedSpaceCode) return;
  try {
    const space = await getPublicSpaceByCode(pState.joinedSpaceCode);
    pState.currentSpace = space;
    renderParticipantSpace(space);
    await refreshParticipantProfiles();
  } catch (error) {
    localStorage.removeItem("nc_space_code");
    localStorage.removeItem("nc_profile_id");
    pState.joinedSpaceCode = null;
    pState.myProfileId = null;
  }
}

pEl.joinForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  await joinPublicSpace(pEl.spaceCode.value);
});

pEl.profileForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideBox(pEl.messagePanel, pEl.messageBox);

  if (!pState.currentSpace) {
    showBox(pEl.messagePanel, pEl.messageBox, "Rejoins d’abord un espace.", "error");
    return;
  }

  const displayName = pEl.displayName.value.trim();
  const whatsappNumber = pEl.whatsappNumber.value.trim();
  const availability = pEl.availability.value;
  const shortNote = pEl.shortNote.value.trim();
  const consent = pEl.consent.checked;

  if (!displayName || !whatsappNumber || !availability || !consent) {
    showBox(pEl.messagePanel, pEl.messageBox, "Merci de compléter les champs obligatoires.", "error");
    return;
  }

  try {
    const saved = await upsertParticipantProfile({
      space_id: pState.currentSpace.id,
      display_name: displayName,
      whatsapp_number: sanitizePhone(whatsappNumber),
      availability,
      short_note: shortNote,
      is_visible: true,
      expires_at: pState.currentSpace.expires_at,
    });

    pState.myProfileId = saved.id;
    localStorage.setItem("nc_profile_id", saved.id);

    pEl.profileForm.reset();
    showBox(pEl.messagePanel, pEl.messageBox, "Votre profil a été publié.", "success");
    await refreshParticipantProfiles();
  } catch (error) {
    console.error(error);
    showBox(pEl.messagePanel, pEl.messageBox, "Erreur lors de l’enregistrement du profil.", "error");
  }
});

pEl.hideProfileBtn.addEventListener("click", async () => {
  try {
    await hideMyProfileParticipant();
  } catch (error) {
    console.error(error);
    showBox(pEl.messagePanel, pEl.messageBox, "Impossible de masquer le profil.", "error");
  }
});

pEl.refreshBtn.addEventListener("click", async () => {
  try {
    if (!pState.currentSpace) {
      showBox(pEl.messagePanel, pEl.messageBox, "Aucun espace actif à actualiser.", "info");
      return;
    }

    const fresh = await getPublicSpaceByCode(pState.currentSpace.space_code);
    pState.currentSpace = fresh;
    renderParticipantSpace(fresh);
    await refreshParticipantProfiles();

    showBox(pEl.messagePanel, pEl.messageBox, "Données actualisées.", "success");
  } catch (error) {
    console.error(error);
    showBox(pEl.messagePanel, pEl.messageBox, "Actualisation impossible.", "error");
  }
});

bootstrapParticipant();
