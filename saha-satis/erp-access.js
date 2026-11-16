import { o as getMe, r as supabase } from "./assets/feedbackLoader-puddZXLE.js";

const basePath = `/Ototr/saha-satis/`.replace(/saha-satis\/$/, ``);
const redirectToLogin = () => {
  window.location.replace(
    `${basePath}saha-satis/?returnTo=${encodeURIComponent(location.pathname + location.search + location.hash)}`,
  );
};

let checking = false;

async function ensureAccess() {
  if (checking) return;
  checking = true;
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      redirectToLogin();
      return;
    }

    const me = await getMe();
    if (!me.me) {
      redirectToLogin();
      return;
    }

    document.documentElement.classList.remove(`ototr-access-locked`);
    document.getElementById(`ototr-access-status`)?.remove();

    // Keep only the account action. The feedback center is intentionally not
    // mounted on the ERP/review surfaces.
    if (!document.getElementById(`ototr-account-exit`)) {
      const button = document.createElement(`button`);
      button.id = `ototr-account-exit`;
      button.type = `button`;
      button.textContent = `Güvenli çıkış`;
      button.setAttribute(`aria-label`, `ERP hesabından çıkış yap`);
      button.addEventListener(`click`, async () => {
        button.disabled = true;
        try {
          await supabase.auth.signOut();
        } finally {
          redirectToLogin();
        }
      });
      document.body.append(button);
    }
  } catch {
    document.documentElement.classList.add(`ototr-access-locked`);
    redirectToLogin();
  } finally {
    checking = false;
  }
}

supabase.auth.onAuthStateChange((event) => {
  if (event === `SIGNED_OUT`) {
    document.documentElement.classList.add(`ototr-access-locked`);
    redirectToLogin();
  } else if (event === `SIGNED_IN`) {
    setTimeout(() => void ensureAccess(), 0);
  }
});

window.addEventListener(`pageshow`, () => void ensureAccess());
document.addEventListener(`visibilitychange`, () => {
  if (document.visibilityState === `visible`) void ensureAccess();
});
setInterval(() => {
  if (document.visibilityState === `visible`) void ensureAccess();
}, 60_000);
void ensureAccess();
