import { supabase } from "./supabase";
import type { Database, Json } from "../types/supabase";

type PageContentRow = Database["public"]["Tables"]["page_content"]["Row"];

const TABLE_NAME = "page_content";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mergeContent<T>(defaults: T, overrides: unknown): T {
  if (!isPlainObject(defaults)) {
    return (overrides ?? defaults) as T;
  }

  if (!isPlainObject(overrides)) {
    return defaults;
  }

  const mergedEntries = Object.entries(defaults).map(([key, defaultValue]) => {
    const overrideValue = (overrides as Record<string, unknown>)[key];

    if (overrideValue === undefined || overrideValue === null) {
      return [key, defaultValue] as const;
    }

    if (Array.isArray(defaultValue)) {
      return [key, Array.isArray(overrideValue) ? overrideValue : defaultValue] as const;
    }

    if (isPlainObject(defaultValue)) {
      return [key, mergeContent(defaultValue, overrideValue)] as const;
    }

    return [key, overrideValue] as const;
  });

  // Include any keys that exist only in overrides
  Object.keys(overrides).forEach((key) => {
    if (!(key in defaults)) {
      mergedEntries.push([key, (overrides as Record<string, unknown>)[key]] as const);
    }
  });

  return Object.fromEntries(mergedEntries) as T;
}

export async function fetchPageContent<TContent>(
  pageSlug: string,
  defaults: TContent,
  signal?: AbortSignal,
): Promise<TContent> {
  try {
    let query = supabase.from(TABLE_NAME).select("content").eq("page_slug", pageSlug);

    if (signal) {
      query = query.abortSignal(signal);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error("Failed to load page content", { pageSlug, error });
      return defaults;
    }

    if (!data?.content) {
      return defaults;
    }

    return mergeContent(defaults, data.content);
  } catch (err) {
    console.error("Unexpected error loading page content", { pageSlug, err });
    return defaults;
  }
}

interface SavePageContentOptions<TContent> {
  pageSlug: string;
  content: TContent;
}

export async function savePageContent<TContent>({
  pageSlug,
  content,
}: SavePageContentOptions<TContent>): Promise<PageContentRow | null> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("Failed to resolve current user before saving content", userError);
    }

    const payload = {
      page_slug: pageSlug,
      content: content as Json,
      updated_by: user?.id ?? null,
    };

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .upsert(payload, { onConflict: "page_slug" })
      .select()
      .single();

    if (error) {
      console.error("Failed to save page content", { pageSlug, error });
      return null;
    }

    return data;
  } catch (err) {
    console.error("Unexpected error saving page content", { pageSlug, err });
    return null;
  }
}
