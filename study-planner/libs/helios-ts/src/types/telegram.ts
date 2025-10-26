/**
 * Telegram bot types
 * These mirror the Haskell TelegramBot module types
 */

export interface BotRequest {
  message: string;
  user_id: string;
  chat_id: string;
  timestamp?: string;
}

export interface BotResponse {
  chat_id: string;
  user_id: string;
  response: string;
  timestamp: string;
  success: boolean;
}