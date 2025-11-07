import { ChangeEvent, useId, useState } from "react";
import { Button } from "../../../../../components/ui/button";
import { Input } from "../../../../../components/ui/input";
import { useToast } from "../../../../../components/ui/toast";
import { uploadSiteContentAsset } from "../../../../../lib/siteContentStorage";

interface SiteSettingsImageUploadFieldProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  uploadPath: string;
  placeholder?: string;
  emptyStateLabel?: string;
  previewAspectClass?: string;
  className?: string;
  helperText?: string;
  showClearButton?: boolean;
}

export function SiteSettingsImageUploadField({
  id,
  value,
  onChange,
  uploadPath,
  placeholder = "Image URL",
  emptyStateLabel = "Upload image",
  previewAspectClass = "aspect-[3/2]",
  className = "",
  helperText,
  showClearButton = true,
}: SiteSettingsImageUploadFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const { showToast } = useToast();
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File | null) => {
    if (!file) return;

    setUploading(true);
    try {
      const publicUrl = await uploadSiteContentAsset(file, uploadPath);
      onChange(publicUrl);
      showToast("Image uploaded.", "success");
    } catch (error) {
      console.error("Site settings image upload failed", error);
      showToast("Failed to upload image. Please try again.", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    void handleUpload(file);
    event.target.value = "";
  };

  return (
    <div className={`space-y-3 ${className}`.trim()}>
      <input
        id={inputId}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <label
        htmlFor={inputId}
        className={`group relative block w-full cursor-pointer overflow-hidden rounded-md border border-gray-200 bg-gray-100 shadow-sm transition hover:shadow-md ${previewAspectClass}`}
      >
        {value ? (
          <>
            <img
              src={value}
              alt=""
              className="h-full w-full object-cover transition group-hover:scale-[1.02]"
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover:opacity-100">
              <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[#6F6F6F]">
                Click to replace image
              </span>
            </div>
          </>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-gray-400 transition group-hover:text-gray-600">
            <div className="text-sm font-medium">{emptyStateLabel}</div>
            <div className="text-[11px] uppercase tracking-wide">Click to select</div>
          </div>
        )}
      </label>
      <Input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      {uploading ? <p className="text-xs text-[#B20000]">Uploading image…</p> : null}
      {helperText ? <p className="text-xs text-[#6F6F6F]">{helperText}</p> : null}
      {showClearButton && value ? (
        <Button
          type="button"
          variant="outline"
          className="w-full text-xs text-[#B20000] border-[#B20000]"
          onClick={() => onChange("")}
        >
          Clear image
        </Button>
      ) : null}
    </div>
  );
}
