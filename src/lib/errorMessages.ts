const emailRateLimitMessage = 'ログインメールの送信回数が上限に達しました。少し時間を置いて再度お試しください。';
const retryLaterMessage = '直前にログインメールを送信しています。少し時間を置いて再度お試しください。';

export function toJapaneseErrorMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  const normalized = message.toLowerCase();

  if (normalized.includes('email rate limit exceeded')) {
    return emailRateLimitMessage;
  }

  if (normalized.includes('rate limit') && normalized.includes('email')) {
    return emailRateLimitMessage;
  }

  if (normalized.includes('too many') && normalized.includes('email')) {
    return emailRateLimitMessage;
  }

  if (normalized.includes('security purposes') || normalized.includes('after 60 seconds')) {
    return retryLaterMessage;
  }

  if (normalized.includes('invalid email')) {
    return 'メールアドレスの形式を確認してください。';
  }

  if (message && !isLikelyEnglishOnly(message)) {
    return message;
  }

  return fallback;
}

function isLikelyEnglishOnly(message: string): boolean {
  return [...message].every((character) => character.charCodeAt(0) <= 0x7f);
}
