import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

const { Pool } = pg;

let pool = null;
let poolInitPromise = null;
let supabaseClient = null;

function getPool() {
  const connectionString = 
    process.env.POSTGRES_URL || 
    process.env.DATABASE_URL || 
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING;

  if (!connectionString) return null;

  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 2,
      idleTimeoutMillis: 5000,
      connectionTimeoutMillis: 4000
    });
  }
  return pool;
}

async function ensureTable(p) {
  if (!poolInitPromise) {
    poolInitPromise = (async () => {
      try {
        await p.query(`
          CREATE TABLE IF NOT EXISTS studyhub_userdata (
            user_id VARCHAR(64) NOT NULL,
            category VARCHAR(64) NOT NULL,
            data JSONB NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            PRIMARY KEY (user_id, category)
          );
        `);
      } catch (err) {
        console.warn('Supabase DB table init notice:', err.message);
      }
    })();
  }
  return poolInitPromise;
}

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = 
    process.env.SUPABASE_SERVICE_ROLE_KEY || 
    process.env.SUPABASE_ANON_KEY || 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url && key) {
    if (!supabaseClient) {
      supabaseClient = createClient(url, key, {
        auth: { persistSession: false }
      });
    }
    return supabaseClient;
  }
  return null;
}

export async function saveUserData(userId, category, data) {
  const p = getPool();
  if (p) {
    try {
      await ensureTable(p);
      await p.query(
        `INSERT INTO studyhub_userdata (user_id, category, data, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (user_id, category)
         DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();`,
        [userId, category, JSON.stringify(data)]
      );
      return { success: true, via: 'postgres' };
    } catch (err) {
      console.warn('Postgres save fallback:', err.message);
    }
  }

  // Fallback para Supabase REST
  const sb = getSupabase();
  if (sb) {
    try {
      const { error } = await sb
        .from('studyhub_userdata')
        .upsert(
          { user_id: userId, category, data, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,category' }
        );
      if (!error) return { success: true, via: 'supabase_rest' };
      console.warn('Supabase REST save error:', error.message);
    } catch (err) {
      console.warn('Supabase REST exception:', err.message);
    }
  }

  return { success: false, reason: 'database_not_reachable' };
}

export async function getUserData(userId) {
  const p = getPool();
  if (p) {
    try {
      await ensureTable(p);
      const res = await p.query(
        `SELECT category, data, updated_at FROM studyhub_userdata WHERE user_id = $1`,
        [userId]
      );
      const output = {};
      for (const row of res.rows) {
        output[row.category] = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
      }
      return { success: true, data: output, via: 'postgres' };
    } catch (err) {
      console.warn('Postgres get fallback:', err.message);
    }
  }

  // Fallback para Supabase REST
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb
        .from('studyhub_userdata')
        .select('category, data')
        .eq('user_id', userId);
      if (!error && data) {
        const output = {};
        for (const row of data) {
          output[row.category] = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
        }
        return { success: true, data: output, via: 'supabase_rest' };
      }
    } catch (err) {
      console.warn('Supabase REST exception:', err.message);
    }
  }

  return { success: false, data: {}, reason: 'database_not_reachable' };
}
