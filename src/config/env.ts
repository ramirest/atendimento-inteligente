import dotenv from 'dotenv';
dotenv.config();

export const env = {
  PORT: process.env.PORT || '3000',
  CHATWOOT_URL: process.env.CHATWOOT_URL || '',
  CHATWOOT_API_TOKEN: process.env.CHATWOOT_API_TOKEN || '',
  CHATWOOT_ACCOUNT_ID: process.env.CHATWOOT_ACCOUNT_ID || '1',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-3.1-pro-preview',
};

if (!env.CHATWOOT_URL || !env.CHATWOOT_API_TOKEN) {
  console.warn('⚠️ Missing CHATWOOT_URL or CHATWOOT_API_TOKEN environment variables.');
}
if (!env.GEMINI_API_KEY) {
  console.warn('⚠️ Missing GEMINI_API_KEY environment variable. AI won\'t work properly.');
}
