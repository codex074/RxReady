import type {
  ImportConfigIniResponse,
  PatientLookupConfigInput,
  PatientLookupConfigResponse,
  PatientLookupResponse,
} from '../types/desktop';

export function isDesktopApp(): boolean {
  return Boolean(window.rxReadyDesktop);
}

export async function isPatientLookupConfigured(): Promise<boolean> {
  return window.rxReadyDesktop?.isPatientLookupConfigured() ?? false;
}

export async function configurePatientLookup(
  input: PatientLookupConfigInput,
): Promise<PatientLookupConfigResponse> {
  if (!window.rxReadyDesktop) {
    return { ok: false, message: 'การตั้งค่า HOSxP ใช้ได้เฉพาะโปรแกรม RxReady Staff' };
  }
  return window.rxReadyDesktop.configurePatientLookup(input);
}

export async function lookupPatientByHn(hn: string): Promise<PatientLookupResponse> {
  if (!window.rxReadyDesktop) {
    return {
      ok: false,
      code: 'NOT_CONFIGURED',
      message: 'การค้นหาผู้ป่วยใช้ได้เฉพาะโปรแกรม RxReady Staff',
    };
  }
  return window.rxReadyDesktop.lookupPatient(hn);
}

export async function importPatientLookupFromConfigIni(): Promise<ImportConfigIniResponse> {
  if (!window.rxReadyDesktop) {
    return { ok: false, message: 'ใช้ได้เฉพาะโปรแกรม RxReady Staff' };
  }
  return window.rxReadyDesktop.importConfigIni();
}

export async function openExternalUrl(url: string): Promise<boolean> {
  if (!window.rxReadyDesktop) return false;
  await window.rxReadyDesktop.openExternal(url);
  return true;
}
