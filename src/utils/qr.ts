import QRCode from 'qrcode';
import { appBaseUrl } from '../lib/supabase';

export function publicStatusUrl(publicToken: string): string {
  return `${appBaseUrl}/status/${encodeURIComponent(publicToken)}`;
}

export function tokenFromLocation(): string {
  const pathMatch = window.location.pathname.match(/\/status\/([^/?#]+)/);
  if (pathMatch) return decodeURIComponent(pathMatch[1]);
  return new URLSearchParams(window.location.search).get('token') || '';
}

export async function qrDataUrl(value: string): Promise<string> {
  return QRCode.toDataURL(value, {
    errorCorrectionLevel: 'M',
    margin: 2,
    scale: 6,
  });
}
