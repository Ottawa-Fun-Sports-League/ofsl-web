import { supabase } from "./supabase";

const SITE_CONTENT_BUCKET = "site-content";

function slugifyFilename(input: string): string {
  const base = input.split(".").slice(0, -1).join(".") || input;
  return base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function uploadSiteContentAsset(file: File, prefix: string): Promise<string> {
  const extension = file.name.split(".").pop() ?? "jpg";
  const filename = `${Date.now()}-${slugifyFilename(file.name) || "asset"}.${extension}`;
  const path = `${prefix.replace(/\/+$/, "")}/${filename}`;

  const { error: uploadError } = await supabase.storage
    .from(SITE_CONTENT_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: true });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from(SITE_CONTENT_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) {
    throw new Error("Unable to resolve public URL for uploaded asset.");
  }

  return data.publicUrl;
}

