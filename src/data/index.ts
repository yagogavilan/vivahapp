import { IS_DEMO } from '../lib/config';
import type { Api } from './api';
import { demoApi } from './demo-api';
import { supabaseApi } from './supabase-api';

export const api: Api = IS_DEMO ? demoApi : supabaseApi;
export type { Api, Catalog, SessionUser } from './api';
