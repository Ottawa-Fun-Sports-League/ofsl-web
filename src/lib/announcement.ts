import { supabase } from './supabase';
import { logger } from './logger';
import type { Database } from '../types/supabase';

export type SiteAnnouncement = Database['public']['Tables']['site_announcements']['Row'];
export type SiteAnnouncementInsert = Database['public']['Tables']['site_announcements']['Insert'];

interface AnnouncementUpdateInput {
  id?: string;
  message: string;
  linkText?: string | null;
  linkUrl?: string | null;
  isActive: boolean;
}

const ANNOUNCEMENT_FIELDS = 'id, message, link_text, link_url, is_active, updated_at, created_at';

export async function fetchActiveAnnouncement(signal?: AbortSignal): Promise<SiteAnnouncement | null> {
  try {
    const query = supabase
      .from('site_announcements')
      .select(ANNOUNCEMENT_FIELDS)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (signal) {
      query.abortSignal(signal);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }

      logger.error('Failed to fetch active site announcement', error);
      return null;
    }

    return data ?? null;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return null;
    }
    logger.error('Unexpected error fetching active site announcement', error as Error);
    return null;
  }
}

export async function fetchLatestAnnouncement(signal?: AbortSignal): Promise<SiteAnnouncement | null> {
  try {
    const query = supabase
      .from('site_announcements')
      .select(ANNOUNCEMENT_FIELDS)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (signal) {
      query.abortSignal(signal);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }

      logger.error('Failed to fetch latest site announcement', error);
      return null;
    }

    return data ?? null;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return null;
    }
    logger.error('Unexpected error fetching latest site announcement', error as Error);
    return null;
  }
}

export async function saveAnnouncement(update: AnnouncementUpdateInput): Promise<SiteAnnouncement | null> {
  try {
    const payload: SiteAnnouncementInsert = {
      message: update.message,
      link_text: update.linkText ?? null,
      link_url: update.linkUrl ?? null,
      is_active: update.isActive,
      updated_at: new Date().toISOString(),
    };

    if (update.id) {
      payload.id = update.id;
    }

    const { data, error } = await supabase
      .from('site_announcements')
      .upsert(payload, { onConflict: 'id' })
      .select(ANNOUNCEMENT_FIELDS)
      .single();

    if (error) {
      logger.error('Failed to save site announcement', error);
      return null;
    }

    return data ?? null;
  } catch (error) {
    logger.error('Unexpected error saving site announcement', error as Error);
    return null;
  }
}
