import "server-only";
import { getSettings } from "./settings";

// Fire-and-forget Telegram ping to the goddess's phone (new DM, new claim,
// PPV unlocked). Optional: silently does nothing until telegramBotToken +
// telegramChatId are set in Settings. This must NEVER block or fail the
// request that triggered it — best-effort only, 4s timeout, all errors eaten.

export function notifyGoddess(text: string): void {
  void (async () => {
    try {
      const s = await getSettings();
      const token = (s.telegramBotToken || "").trim();
      const chatId = (s.telegramChatId || "").trim();
      if (!token || !chatId) return;
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: text.slice(0, 3500),
          disable_web_page_preview: true,
        }),
        signal: AbortSignal.timeout(4000),
      });
    } catch {
      /* never let a ping break the site */
    }
  })();
}
