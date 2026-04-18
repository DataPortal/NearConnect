(function () {
  function participantToken() {
    return localStorage.getItem('nc_participant_token') || '';
  }

  async function callWalletFunction(name, method = 'POST', body = null) {
    const token = participantToken();

    if (!token) {
      throw new Error("Inscris-toi d’abord avant d’utiliser les crédits.");
    }

    const resp = await fetch(`${window.NEARCONNECT_FUNCTIONS_BASE}/${name}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        apikey: window.NEARCONNECT_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${window.NEARCONNECT_SUPABASE_ANON_KEY}`,
        'x-participant-token': token,
      },
      body: method === 'GET' ? undefined : JSON.stringify(body),
    });

    const rawText = await resp.text();

    console.log(`${name.toUpperCase()} STATUS:`, resp.status);
    console.log(`${name.toUpperCase()} RAW RESPONSE:`, rawText);

    let data = {};
    try {
      data = JSON.parse(rawText);
    } catch (_) {}

    if (!resp.ok) {
      throw new Error(
        data?.error ||
        data?.details ||
        data?.message ||
        rawText ||
        `HTTP ${resp.status}`
      );
    }

    return data;
  }

  async function purchaseCredits(packCode) {
    try {
      const data = await callWalletFunction('purchase-credits', 'POST', {
        pack_code: packCode,
        payment_reference: crypto.randomUUID(),
      });

      nc.showMessage(
        nc.qs('messageBox'),
        `Crédits ajoutés avec succès. Nouveau solde : ${data.wallet.credits_balance} crédits.`,
        'success'
      );

      return data.wallet;
    } catch (err) {
      console.error('PURCHASE CREDITS ERROR:', err);
      nc.showMessage(
        nc.qs('messageBox'),
        err.message || 'Impossible d’acheter des crédits.',
        'error'
      );
      throw err;
    }
  }

  async function unlockProfileContact(targetParticipantId) {
    try {
      const data = await callWalletFunction('unlock-profile-contact', 'POST', {
        target_participant_id: targetParticipantId,
      });

      nc.showMessage(
        nc.qs('messageBox'),
        `Contact débloqué pour ${data.unlock_price_credits} crédits. Solde restant : ${data.wallet.credits_balance} crédits.`,
        'success'
      );

      if (data.whatsapp_link) {
        window.open(data.whatsapp_link, '_blank', 'noopener');
      }

      return data;
    } catch (err) {
      console.error('UNLOCK PROFILE CONTACT ERROR:', err);
      nc.showMessage(
        nc.qs('messageBox'),
        err.message || 'Impossible de débloquer ce contact.',
        'error'
      );
      throw err;
    }
  }

  function bindCreditPackButtons() {
    document.querySelectorAll('[data-pack-code]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const packCode = btn.getAttribute('data-pack-code');
        await purchaseCredits(packCode);
      });
    });
  }

  function bindUnlockButtons(loadProfilesCallback) {
    document.querySelectorAll('.unlock-contact-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const targetId = btn.getAttribute('data-target-id');
        await unlockProfileContact(targetId);

        if (typeof loadProfilesCallback === 'function') {
          await loadProfilesCallback();
        }
      });
    });
  }

  window.ncWallet = {
    purchaseCredits,
    unlockProfileContact,
    bindCreditPackButtons,
    bindUnlockButtons,
  };
})();
