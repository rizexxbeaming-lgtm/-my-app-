import "dotenv/config";

const BOT_TOKEN = "9094747241:AAHf9irncj26aMCrnhUsFQ_69SGkKF0tPC8";
const CHAT_ID = "6443779180";

export async function tgLog(text: string) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
  } catch (e) {
    console.error("TG log failed:", e);
  }
}
