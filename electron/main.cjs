const { app, BrowserWindow, dialog, ipcMain, safeStorage, shell } = require('electron');
const fs = require('node:fs/promises');
const http = require('node:http');
const https = require('node:https');
const path = require('node:path');

const APP_ID = 'th.go.moph.utth.rxready.staff';
const CONFIG_FILE = 'patient-lookup-config.bin';
const REQUEST_TIMEOUT_MS = 7000;

let mainWindow = null;

function configPath() {
  return path.join(app.getPath('userData'), CONFIG_FILE);
}

function normalizeConfig(input) {
  if (!input || typeof input !== 'object') {
    throw new Error('ข้อมูลตั้งค่าไม่ถูกต้อง');
  }

  const apiUrl = String(input.apiUrl || '').trim().replace(/\/+$/, '');
  const patientToken = String(input.patientToken || '').trim();
  const hisToken = String(input.hisToken || '').trim();
  const parsedUrl = new URL(apiUrl);

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('API URL ต้องขึ้นต้นด้วย http:// หรือ https://');
  }
  if (parsedUrl.username || parsedUrl.password) {
    throw new Error('API URL ต้องไม่มี username หรือ password');
  }
  if (!patientToken || !hisToken) {
    throw new Error('กรุณากรอก Token ให้ครบทั้งสองรายการ');
  }

  return { apiUrl, patientToken, hisToken };
}

async function saveConfig(input) {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('เครื่องนี้ไม่รองรับการเข้ารหัสข้อมูลสำคัญ');
  }
  const config = normalizeConfig(input);
  const encrypted = safeStorage.encryptString(JSON.stringify(config));
  await fs.writeFile(configPath(), encrypted, { mode: 0o600 });
}

async function loadConfig() {
  if (!safeStorage.isEncryptionAvailable()) return null;
  try {
    const encrypted = await fs.readFile(configPath());
    const decrypted = safeStorage.decryptString(encrypted);
    return normalizeConfig(JSON.parse(decrypted));
  } catch (error) {
    if (error && error.code === 'ENOENT') return null;
    throw new Error('อ่านการตั้งค่า HOSxP ไม่สำเร็จ กรุณาตั้งค่าใหม่');
  }
}

function requestWithGetBody(url, token, hn) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const body = JSON.stringify({ HN: hn });
    const transport = target.protocol === 'https:' ? https : http;
    const request = transport.request(
      target,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          Accept: 'application/json',
        },
        timeout: REQUEST_TIMEOUT_MS,
      },
      (response) => {
        let buffer = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          buffer += chunk;
        });
        response.on('end', () => {
          const status = response.statusCode || 0;
          if (status === 401) {
            reject(Object.assign(new Error('Token ของ HOSxP API หมดอายุหรือไม่ถูกต้อง'), { code: 'UNAUTHORIZED' }));
            return;
          }
          if (status < 200 || status >= 300) {
            reject(Object.assign(new Error(`HOSxP API ตอบกลับ HTTP ${status}`), { code: 'NETWORK_ERROR' }));
            return;
          }
          try {
            resolve(JSON.parse(buffer));
          } catch {
            reject(Object.assign(new Error('HOSxP API ส่งข้อมูลที่ไม่ใช่ JSON'), { code: 'INVALID_RESPONSE' }));
          }
        });
      },
    );

    request.on('timeout', () => {
      request.destroy(Object.assign(new Error('หมดเวลารอการตอบกลับจาก HOSxP API'), { code: 'NETWORK_ERROR' }));
    });
    request.on('error', (error) => {
      if (!error.code || !['UNAUTHORIZED', 'INVALID_RESPONSE'].includes(error.code)) {
        error.code = 'NETWORK_ERROR';
      }
      reject(error);
    });
    request.write(body);
    request.end();
  });
}

function firstPatient(response) {
  if (!response || typeof response !== 'object' || !Array.isArray(response.data)) {
    throw Object.assign(new Error('รูปแบบข้อมูลจาก HOSxP API ไม่ถูกต้อง'), { code: 'INVALID_RESPONSE' });
  }
  return response.data[0] || null;
}

function patientResult(patient) {
  const hn = String(patient.hn || '').trim();
  const prefix = String(patient.pname || '').trim();
  const firstName = String(patient.fname || '').trim();
  const lastName = String(patient.lname || '').trim();
  const fullName = `${prefix}${firstName}${lastName ? ` ${lastName}` : ''}`.trim();

  if (!hn || !fullName) {
    throw Object.assign(new Error('ข้อมูลผู้ป่วยจาก HOSxP API ไม่ครบถ้วน'), { code: 'INVALID_RESPONSE' });
  }

  return {
    hn,
    fullName,
    vn: String(patient.vn || '').trim(),
    oqueue: String(patient.oqueue || '').trim(),
  };
}

async function lookupPatient(hn) {
  const normalizedHn = String(hn || '').replace(/\D/g, '');
  if (!normalizedHn || normalizedHn.length > 9) {
    return { ok: false, code: 'INVALID_HN', message: 'กรุณากรอก HN ให้ถูกต้อง' };
  }

  let config;
  try {
    config = await loadConfig();
  } catch (error) {
    return { ok: false, code: 'NOT_CONFIGURED', message: error.message };
  }
  if (!config) {
    return { ok: false, code: 'NOT_CONFIGURED', message: 'ยังไม่ได้ตั้งค่า HOSxP API' };
  }

  try {
    const primary = await requestWithGetBody(
      `${config.apiUrl}/api/hosxp/patient`,
      config.patientToken,
      normalizedHn,
    );
    let patient = firstPatient(primary);
    if (!patient) {
      const fallback = await requestWithGetBody(
        `${config.apiUrl}/api/hosxp/HIS`,
        config.hisToken,
        normalizedHn,
      );
      patient = firstPatient(fallback);
    }
    if (!patient) {
      return { ok: false, code: 'NOT_FOUND', message: 'ไม่พบข้อมูลผู้ป่วย กรุณากรอกชื่อเอง' };
    }
    return { ok: true, patient: patientResult(patient) };
  } catch (error) {
    return {
      ok: false,
      code: error.code || 'UNKNOWN',
      message: error.message || 'ค้นหาข้อมูลผู้ป่วยไม่สำเร็จ',
    };
  }
}

function parseConfigIni(content) {
  const lines = content.split(/\r?\n/);
  let section = '';
  const values = {};
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;
    const secMatch = line.match(/^\[(.+)\]$/);
    if (secMatch) { section = secMatch[1].toUpperCase(); continue; }
    if (section !== 'API') continue;
    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim().toUpperCase();
    const val = line.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    values[key] = val;
  }
  return {
    apiUrl: values['URL'] || '',
    patientToken: values['TOKEN'] || '',
    hisToken: values['TOKEN_HIS'] || '',
  };
}

async function importConfigIni() {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'เลือกไฟล์ config.ini ของแอป HQ',
    filters: [{ name: 'Config files', extensions: ['ini'] }],
    properties: ['openFile'],
  });
  if (canceled || filePaths.length === 0) return { ok: false, canceled: true };
  try {
    const content = await fs.readFile(filePaths[0], 'utf8');
    const parsed = parseConfigIni(content);
    if (!parsed.apiUrl || !parsed.patientToken || !parsed.hisToken) {
      return { ok: false, message: 'ไม่พบค่า URL, TOKEN หรือ TOKEN_HIS ใน section [API] ของไฟล์นี้' };
    }
    return { ok: true, ...parsed };
  } catch (error) {
    return { ok: false, message: `อ่านไฟล์ไม่สำเร็จ: ${error.message}` };
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 720,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  mainWindow.removeMenu();
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event) => event.preventDefault());
  mainWindow.once('ready-to-show', () => mainWindow.show());
  void mainWindow.loadFile(path.join(__dirname, '..', 'dist-desktop', 'index.html'));
}

app.setAppUserModelId(APP_ID);

app.whenReady().then(() => {
  ipcMain.handle('patient-lookup:is-configured', async () => Boolean(await loadConfig()));
  ipcMain.handle('patient-lookup:configure', async (_event, input) => {
    try {
      await saveConfig(input);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error.message || 'บันทึกการตั้งค่าไม่สำเร็จ' };
    }
  });
  ipcMain.handle('patient-lookup:lookup', (_event, hn) => lookupPatient(hn));
  ipcMain.handle('patient-lookup:import-config-ini', () => importConfigIni());
  ipcMain.handle('app:open-external', async (_event, rawUrl) => {
    const url = new URL(String(rawUrl || ''));
    if (url.protocol !== 'https:') throw new Error('เปิดได้เฉพาะ HTTPS URL');
    await shell.openExternal(url.toString());
  });

  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
