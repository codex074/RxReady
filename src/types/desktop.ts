export type PatientLookupConfigInput = {
  apiUrl: string;
  patientToken: string;
  hisToken: string;
};

export type PatientLookupResult = {
  hn: string;
  fullName: string;
  vn: string;
  oqueue: string;
};

export type PatientLookupErrorCode =
  | 'INVALID_HN'
  | 'NOT_CONFIGURED'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'NETWORK_ERROR'
  | 'INVALID_RESPONSE'
  | 'UNKNOWN';

export type PatientLookupResponse =
  | { ok: true; patient: PatientLookupResult }
  | { ok: false; code: PatientLookupErrorCode; message: string };

export type PatientLookupConfigResponse =
  | { ok: true }
  | { ok: false; message: string };

export type ImportConfigIniResponse =
  | { ok: true; apiUrl: string; patientToken: string; hisToken: string }
  | { ok: false; canceled?: true; message?: string };

export type RxReadyDesktopApi = {
  isPatientLookupConfigured: () => Promise<boolean>;
  configurePatientLookup: (
    input: PatientLookupConfigInput,
  ) => Promise<PatientLookupConfigResponse>;
  lookupPatient: (hn: string) => Promise<PatientLookupResponse>;
  importConfigIni: () => Promise<ImportConfigIniResponse>;
  openExternal: (url: string) => Promise<void>;
};

declare global {
  interface Window {
    rxReadyDesktop?: RxReadyDesktopApi;
  }
}

export {};
