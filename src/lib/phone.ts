// Phone numbers are accepted in international format (+<country code><number>)
// or in the Russian domestic format starting with 8 (8XXXXXXXXXX -> +7XXXXXXXXXX)

const ALLOWED_CHARS = /^[+\d\s()-]+$/
const FORMATTING_CHARS = /[\s()-]/g

// E.164: up to 15 digits, country code never starts with 0
const E164_DIGITS = /^[1-9]\d{7,14}$/
const RUSSIAN_DIGITS = /^7\d{10}$/
const RUSSIAN_DOMESTIC = /^8\d{10}$/

export type PhoneValidationError =
  | 'empty'
  | 'invalidChars'
  | 'invalidFormat'
  | 'invalidLength'

export const phoneErrorMessages: Record<PhoneValidationError, string> = {
  empty: 'Введите номер телефона',
  invalidChars: 'Номер может содержать только цифры, пробелы, скобки, дефисы и +',
  invalidFormat: 'Номер должен начинаться с + и кода страны или с 8',
  invalidLength: 'Неверное количество цифр в номере',
}

function stripFormatting(value: string): string {
  return value.trim().replace(FORMATTING_CHARS, '')
}

/**
 * Converts a valid phone number to digits only, with the country code
 * and without "+": "+7 (999) 123-45-67" and "89991234567" -> "79991234567".
 * Returns null if the number is invalid.
 */
export function normalizePhone(value: string): string | null {
  if (validatePhone(value)) return null

  const compact = stripFormatting(value)
  if (RUSSIAN_DOMESTIC.test(compact)) return '7' + compact.slice(1)
  return compact.slice(1)
}

export function validatePhone(value: string): PhoneValidationError | null {
  const trimmed = value.trim()
  if (!trimmed) return 'empty'
  if (!ALLOWED_CHARS.test(trimmed)) return 'invalidChars'

  const compact = stripFormatting(trimmed)

  if (compact.startsWith('8')) {
    return RUSSIAN_DOMESTIC.test(compact) ? null : 'invalidLength'
  }

  if (!compact.startsWith('+') || compact.lastIndexOf('+') !== 0) {
    return 'invalidFormat'
  }

  const digits = compact.slice(1)
  if (digits.startsWith('7')) {
    return RUSSIAN_DIGITS.test(digits) ? null : 'invalidLength'
  }
  if (!E164_DIGITS.test(digits)) {
    return digits.startsWith('0') ? 'invalidFormat' : 'invalidLength'
  }

  return null
}

/** Green API chat id for a personal chat: "79991234567@c.us" */
export function toChatId(normalizedPhone: string): string {
  return `${normalizedPhone}@c.us`
}

/**
 * Formats digits with the country code for display:
 * "79991234567" -> "+7 999 123-45-67", other countries -> "+<digits>"
 */
export function formatPhone(digits: string): string {
  const match = /^7(\d{3})(\d{3})(\d{2})(\d{2})$/.exec(digits)
  if (match) return `+7 ${match[1]} ${match[2]}-${match[3]}-${match[4]}`
  return `+${digits}`
}

/** Phone digits from a personal chat id ("79991234567@c.us"), or null for groups and lid ids */
export function phoneFromChatId(chatId: string): string | null {
  const match = /^(\d+)@c\.us$/.exec(chatId)
  return match ? match[1] : null
}
