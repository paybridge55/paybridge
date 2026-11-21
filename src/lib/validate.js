const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmail(value) {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

export function validateEmail(email) {
  if (!email) return "Email ज़रूरी है।";
  if (email.length > 254) return "Email बहुत लंबा है।";
  if (!EMAIL_REGEX.test(email)) return "सही Email डालें।";
  return null;
}

export function validatePassword(password) {
  if (typeof password !== "string" || !password) return "Password ज़रूरी है।";
  if (password.length < 8) return "Password कम से कम 8 अक्षर का होना चाहिए।";
  if (password.length > 128) return "Password बहुत लंबा है।";
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "Password में अक्षर और अंक दोनों होने चाहिए।";
  }
  return null;
}

export function cleanBusinessName(value) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001f<>]/g, "").trim().replace(/\s+/g, " ");
}

export function validateBusinessName(name) {
  if (!name) return "Business का नाम ज़रूरी है।";
  if (name.length < 2) return "Business का नाम बहुत छोटा है।";
  if (name.length > 80) return "Business का नाम 80 अक्षर से छोटा रखें।";
  return null;
}
