const EMAIL_USER_CODES = [114, 104, 104, 101, 110, 100, 121];
const EMAIL_DOMAIN_CODES = [103, 109, 97, 105, 108, 46, 99, 111, 109];
const PHONE_COUNTRY_CODES = [50, 48];
const PHONE_LOCAL_CODES = [49, 48, 48, 54, 49, 56, 51, 55, 54, 57];

function fromCodes(codes: number[]): string {
  return String.fromCharCode(...codes);
}

export function decodeDirectEmail(): string {
  return `${fromCodes(EMAIL_USER_CODES)}@${fromCodes(EMAIL_DOMAIN_CODES)}`;
}

export function decodeDirectEmailHref(): string {
  return `mailto:${decodeDirectEmail()}`;
}

export function decodeDirectWhatsAppDisplay(): string {
  const cc = fromCodes(PHONE_COUNTRY_CODES);
  const local = fromCodes(PHONE_LOCAL_CODES);
  return `+${cc} ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
}

export function decodeDirectWhatsAppHref(): string {
  return `https://wa.me/${fromCodes(PHONE_COUNTRY_CODES)}${fromCodes(PHONE_LOCAL_CODES)}`;
}

export function maskEmailToken(email: string): string {
  const trimmed = email.trim();
  const atIndex = trimmed.indexOf('@');
  if (atIndex <= 1) return 'Reveal email';
  const domain = trimmed.slice(atIndex + 1);
  return `${trimmed[0]}***@${domain}`;
}

export function maskPhoneToken(phone: string): string {
  const digits = phone.replace(/[^\d]/g, '');
  if (digits.length < 4) return 'Reveal phone';
  return `•••• ${digits.slice(-4)}`;
}

export function getMaskedDirectEmail(): string {
  return maskEmailToken(decodeDirectEmail());
}

export function getMaskedDirectPhone(): string {
  return maskPhoneToken(decodeDirectWhatsAppDisplay());
}
