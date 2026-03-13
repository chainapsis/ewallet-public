export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch (_error) {
    return false;
  }
}

export function isValidEmail(email?: string): boolean {
  if (!email) {
    return false;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
