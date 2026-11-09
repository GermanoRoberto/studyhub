// Polyfills para compatibilidade de canvas/PDF em ambiente Vercel Serverless / AWS Lambda
if (typeof global.DOMMatrix === 'undefined') {
  global.DOMMatrix = class DOMMatrix { constructor() { this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0; } };
}
if (typeof global.ImageData === 'undefined') {
  global.ImageData = class ImageData { constructor(w, h) { this.width = w; this.height = h; this.data = new Uint8ClampedArray(w * h * 4); } };
}
if (typeof global.Path2D === 'undefined') {
  global.Path2D = class Path2D {};
}

import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { concursosCatalog } from './_lib/concursosData.js';

const require = createRequire(import.meta.url);

// Credenciais protegidas por Scrypt (NÃO existe senha em texto puro)
const AUTH_USER = process.env.AUTH_USER || 'germanorcarmo';
const AUTH_SALT = process.env.AUTH_SALT || '54e60278a790ae488456927d7efbde64';
const AUTH_HASH = process.env.AUTH_PASS_HASH || 'd949aec8502349b372eed47c20f5ef0193f1485eb8954db8b10f51660e34956aefeb56a789dc09a66b65ad2291132352a6b2429caa7a52854adb09ab75cdcd58';
const JWT_SECRET = process.env.JWT_SECRET || 'studyhub_secure_session_secret_2026_concursos';

// Rate limiting em memória contra ataques de força bruta (máx 5 tentativas por 5 min por IP)
const loginAttempts = new Map();

function verifyCredentials(username, password) {
  if (username !== AUTH_USER || !password) return false;
  const hash = crypto.scryptSync(password, AUTH_SALT, 64);
  const storedBuf = Buffer.from(AUTH_HASH, 'hex');
  if (hash.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(hash, storedBuf);
}

function generateSessionToken(username) {
  const expires = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 dias
  const payload = Buffer.from(JSON.stringify({ u: username, exp: expires })).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('base64url');
  if (expectedSig !== signature) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (data.exp && Date.now() > data.exp) return false;
    return data.u === AUTH_USER;
  } catch {
    return false;
  }
}

async function parseBody(req) {
  if (req.body) {
    if (typeof req.body === 'string') {
      try { return JSON.parse(req.body); } catch { return {}; }
    }
    return req.body;
  }
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

function setCorsHeaders(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-provider, x-api-key');
}

let cachedExpressApp = null;
function getExpressApp() {
  if (!cachedExpressApp) {
    cachedExpressApp = require('./_lib/server.cjs');
  }
  return cachedExpressApp;
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  // Rota de Health Check
  if (pathname === '/api/health' || pathname === '/health') {
    return res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  }

  // Rota de Login Segura
  if (pathname === '/api/auth/login' || pathname === '/auth/login') {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Método não permitido' });
    }

    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    const attempts = loginAttempts.get(ip) || { count: 0, resetAt: now + 5 * 60 * 1000 };
    if (now > attempts.resetAt) {
      attempts.count = 0;
      attempts.resetAt = now + 5 * 60 * 1000;
    }
    if (attempts.count >= 5) {
      return res.status(429).json({ error: 'Muitas tentativas. Bloqueio temporário por 5 minutos.' });
    }

    const body = await parseBody(req);
    const { username, password } = body;

    if (!username || !password || !verifyCredentials(username.trim(), password)) {
      attempts.count += 1;
      loginAttempts.set(ip, attempts);
      return res.status(401).json({ error: 'Credenciais inválidas. Verifique usuário e senha.' });
    }

    loginAttempts.delete(ip);
    const token = generateSessionToken(username.trim());
    return res.status(200).json({
      success: true,
      user: username.trim(),
      token,
      message: 'Acesso autenticado com sucesso.'
    });
  }

  // Rota de Verificação de Token
  if (pathname === '/api/auth/verify' || pathname === '/auth/verify') {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (token && verifySessionToken(token)) {
      return res.status(200).json({ valid: true, user: AUTH_USER });
    }
    return res.status(401).json({ valid: false, error: 'Sessão inválida ou expirada' });
  }

  // Rota de Radar de Editais 2026/2027
  if (pathname === '/api/concursos/radar' || pathname === '/concursos/radar') {
    const area = url.searchParams.get('area');
    const escolaridade = url.searchParams.get('escolaridade');
    const status = url.searchParams.get('status');

    let filtered = concursosCatalog;
    if (area && area !== 'todas') {
      filtered = filtered.filter(c => c.area.toLowerCase() === area.toLowerCase());
    }
    if (escolaridade && escolaridade !== 'todos') {
      filtered = filtered.filter(c => c.escolaridade.toLowerCase().includes(escolaridade.toLowerCase()));
    }
    if (status && status !== 'todos') {
      filtered = filtered.filter(c => c.status.toLowerCase().includes(status.toLowerCase()));
    }

    return res.status(200).json({
      total: filtered.length,
      timestamp: new Date().toISOString(),
      concursos: filtered
    });
  }

  // Para outras rotas complexas (Upload, Gemini AI, OCR), delegar com segurança ao Express
  try {
    const expressApp = getExpressApp();
    return expressApp(req, res);
  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({ error: 'Erro no servidor: ' + (err.message || 'desconhecido') });
  }
}
