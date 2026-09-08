// ✅ The only file you need to touch — put your OpenAI key here.
// https://platform.openai.com/api-keys
//
// Paste the key inside the quotes on the line below. This is the single place
// the key lives; there is no second copy anywhere in the file.

export const OPENAI_API_KEY = 'PASTE_YOUR_OPENAI_API_KEY_HERE';

// Model and limits — kept identical to the admin web AI Copilot.
export const OPENAI_MODEL = 'gpt-4o-mini';
export const OPENAI_TEMPERATURE = 0.25;
export const OPENAI_MAX_TOKENS = 1200;
export const OPENAI_CHAT_COMPLETIONS_URL =
  'https://api.openai.com/v1/chat/completions';

// We check the shape of the key rather than comparing it against a placeholder
// string — a find-and-replace would otherwise break this check itself.
export const isOpenAiConfigured = () => {
  const key = String(OPENAI_API_KEY || '').trim();
  return key.startsWith('sk-') && key.length > 20;
};
