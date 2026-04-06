import { createClient } from 'npm:@supabase/supabase-js@2';

export function getServiceClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Supabase service role not configured');
  return createClient(url, key, { auth: { persistSession: false } });
}

export function generatePublicCode(prefix = 'NC') {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = `${prefix}-`;
  for (let i = 0; i < 6; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export async function sha256Hex(input: string) {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function normalizePhone(input: string) {
  return String(input).replace(/[^\d]/g, '');
}

export function validateDisplayName(name: string) {
  const value = name.trim();
  const base = /^[A-Za-zÀ-ÿ0-9 _-]{2,20}$/;
  if (!base.test(value)) return false;
  if (/\d{6,}/.test(value)) return false;
  if (/[+@]/.test(value)) return false;
  if (/https?:\/\//i.test(value)) return false;
  return true;
}

export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function computeCurrency(countryCode: string) {
  switch ((countryCode || '').toUpperCase()) {
    case 'RW':
      return 'RWF';
    case 'UG':
      return 'UGX';
    case 'KE':
      return 'KES';
    case 'TZ':
      return 'TZS';
    case 'CD':
      return 'CDF';
    default:
      return 'USD';
  }
}

export function getFxQuote(countryCode: string) {
  const code = (countryCode || '').toUpperCase();
  // Valeurs MVP de démonstration. À remplacer par une source FX côté serveur.
  const quotes: Record<string, { currency: string; rate: number; rounding: string }> = {
    RW: { currency: 'RWF', rate: 1310, rounding: 'ceil_100' },
    UG: { currency: 'UGX', rate: 3800, rounding: 'ceil_100' },
    KE: { currency: 'KES', rate: 130, rounding: 'ceil_10' },
    TZ: { currency: 'TZS', rate: 2550, rounding: 'ceil_100' },
    CD: { currency: 'CDF', rate: 2850, rounding: 'ceil_100' },
  };
  return quotes[code] ?? { currency: 'USD', rate: 1, rounding: 'ceil_1' };
}

export function roundLocalAmount(raw: number, rule: string) {
  if (rule === 'ceil_100') return Math.ceil(raw / 100) * 100;
  if (rule === 'ceil_10') return Math.ceil(raw / 10) * 10;
  return Math.ceil(raw);
}

export function getMomoRecipient(countryCode: string) {
  const code = (countryCode || '').toUpperCase();
  if (code === 'RW') return Deno.env.get('RW_MOMO_RECIPIENT') || '+250795308353';
  return Deno.env.get('DEFAULT_MOMO_RECIPIENT') || '+250795308353';
}

export function requireAdminKey(request: Request) {
  const expected = Deno.env.get('APP_ADMIN_MASTER_KEY');
  const provided = request.headers.get('x-admin-key');
  return Boolean(expected && provided && expected === provided);
}

export function xorEncrypt(text: string, secret: string) {
  if (!secret) throw new Error('APP_ENCRYPTION_KEY missing');
  const textBytes = new TextEncoder().encode(text);
  const keyBytes = new TextEncoder().encode(secret);
  const out = textBytes.map((b, i) => b ^ keyBytes[i % keyBytes.length]);
  return btoa(String.fromCharCode(...out));
}

export function xorDecrypt(encoded: string, secret: string) {
  if (!secret) throw new Error('APP_ENCRYPTION_KEY missing');
  const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
  const keyBytes = new TextEncoder().encode(secret);
  const out = bytes.map((b, i) => b ^ keyBytes[i % keyBytes.length]);
  return new TextDecoder().decode(out);
}

export function bearerToken(request: Request) {
  const auth = request.headers.get('authorization') || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : '';
}

export function oneDayAfter(dateIso: string) {
  const d = new Date(dateIso);
  d.setHours(d.getHours() + 24);
  return d.toISOString();
}
