import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface SupabasePersistedState {
  samples: any[];
  stations: any[];
  users: any[];
  config: Record<string, any>;
  notificationLogs: any[];
  lastCronDate: string;
  lastCronLog: string;
}

const TABLE_NAME = 'app_state';
const ROW_ID = 'default';

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '').trim();

export const supabaseConfigured = Boolean(supabaseUrl && serviceRoleKey);

const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(supabaseUrl as string, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

function stateToRow(state: SupabasePersistedState) {
  return {
    id: ROW_ID,
    users: Array.isArray(state.users) ? state.users : [],
    stations: Array.isArray(state.stations) ? state.stations : [],
    samples: Array.isArray(state.samples) ? state.samples : [],
    config: state.config && typeof state.config === 'object' ? state.config : {},
    notification_logs: Array.isArray(state.notificationLogs) ? state.notificationLogs : [],
    last_cron_date: state.lastCronDate || '',
    last_cron_log: state.lastCronLog || '',
    updated_at: new Date().toISOString(),
  };
}

function rowToState(row: any, fallback: SupabasePersistedState): SupabasePersistedState {
  return {
    samples: Array.isArray(row?.samples) ? row.samples : fallback.samples,
    stations: Array.isArray(row?.stations) ? row.stations : fallback.stations,
    users: Array.isArray(row?.users) ? row.users : fallback.users,
    config: row?.config && typeof row.config === 'object' ? row.config : fallback.config,
    notificationLogs: Array.isArray(row?.notification_logs) ? row.notification_logs : fallback.notificationLogs,
    lastCronDate: typeof row?.last_cron_date === 'string' ? row.last_cron_date : fallback.lastCronDate,
    lastCronLog: typeof row?.last_cron_log === 'string' ? row.last_cron_log : fallback.lastCronLog,
  };
}

function describeError(error: any): string {
  return error?.message || error?.details || error?.hint || 'Lỗi Supabase không xác định';
}

export async function loadSupabaseState(fallback: SupabasePersistedState): Promise<SupabasePersistedState> {
  if (!supabase) return fallback;

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('id, users, stations, samples, config, notification_logs, last_cron_date, last_cron_log')
    .eq('id', ROW_ID)
    .maybeSingle();

  if (error) {
    throw new Error(`Không thể đọc dữ liệu Supabase: ${describeError(error)}`);
  }

  if (data) return rowToState(data, fallback);

  const { data: inserted, error: insertError } = await supabase
    .from(TABLE_NAME)
    .insert(stateToRow(fallback))
    .select('id, users, stations, samples, config, notification_logs, last_cron_date, last_cron_log')
    .single();

  if (!insertError && inserted) return rowToState(inserted, fallback);

  // Another instance may have initialized the singleton at the same time.
  if (insertError?.code === '23505') {
    const { data: concurrent, error: retryError } = await supabase
      .from(TABLE_NAME)
      .select('id, users, stations, samples, config, notification_logs, last_cron_date, last_cron_log')
      .eq('id', ROW_ID)
      .single();
    if (!retryError && concurrent) return rowToState(concurrent, fallback);
  }

  throw new Error(`Không thể khởi tạo dữ liệu Supabase: ${describeError(insertError)}`);
}

export async function persistSupabaseState(state: SupabasePersistedState): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase
    .from(TABLE_NAME)
    .upsert(stateToRow(state), { onConflict: 'id' });

  if (error) {
    throw new Error(`Không thể ghi dữ liệu Supabase: ${describeError(error)}`);
  }
}

export function subscribeSupabaseState(onState: (state: SupabasePersistedState) => void): (() => void) | null {
  if (!supabase) return null;

  const channel = supabase
    .channel('tasago-app-state-sync')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: TABLE_NAME, filter: `id=eq.${ROW_ID}` },
      (payload) => onState(rowToState(payload.new, {
        samples: [],
        stations: [],
        users: [],
        config: {},
        notificationLogs: [],
        lastCronDate: '',
        lastCronLog: '',
      }))
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export function getSupabaseTableName(): string {
  return TABLE_NAME;
}
