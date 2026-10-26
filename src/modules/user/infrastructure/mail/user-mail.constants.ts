export const EMAIL_CONFIRM_TTL_KEY = "EMAIL_CONFIRM_TTL";

export const SECONDS_PER_HOUR = 3600;

export const CONFIRMATION_TEMPLATE = "confirmation-email";

export const WELCOME_TEMPLATE = "welcome-email";

export const BLOCKED_ACCOUNT_TEMPLATE = "blocked-account-email";

export const SUBJECTS = {
  confirmation: "Подтверждение регистрации",
  welcome: "Добро пожаловать!",
  blockedAccount: "Ваш аккаунт заблокирован",
} as const;

export const DEFAULT_BLOCK_REASON = "Не указана";

export const RU_DATE_TIME_FORMAT = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
