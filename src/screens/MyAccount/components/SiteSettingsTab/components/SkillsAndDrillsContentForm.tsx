import { FormEvent, useEffect, useMemo, useState } from "react";
import { Input } from "../../../../../components/ui/input";
import { Button } from "../../../../../components/ui/button";
import { useToast } from "../../../../../components/ui/toast";
import { useAuth } from "../../../../../contexts/AuthContext";
import { fetchPageContent, savePageContent } from "../../../../../lib/pageContent";
import { uploadSiteContentAsset } from "../../../../../lib/siteContentStorage";
import {
  DEFAULT_SKILLS_CONTENT,
  SkillsAndDrillsPageContent,
} from "../../../../../screens/SkillsAndDrillsPage/SkillsAndDrillsPage";

function TextArea({
  id,
  label,
  value,
  onChange,
  rows = 3,
  className = "",
  placeholder,
}: {
  id: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  className?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      {label ? (
        <label className="block text-sm font-medium text-[#6F6F6F]" htmlFor={id}>
          {label}
        </label>
      ) : null}
      <textarea
        id={id}
        className={`w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-[#6F6F6F] focus:border-[#B20000] focus:outline-none focus:ring-1 focus:ring-[#B20000] ${className}`}
        rows={rows}
        value={value}
        placeholder={placeholder}
        aria-label={label ? undefined : placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function SkillsAndDrillsContentForm() {
  const { showToast } = useToast();
  const { userProfile } = useAuth();
  const [content, setContent] = useState<SkillsAndDrillsPageContent>(DEFAULT_SKILLS_CONTENT);
  const [baseline, setBaseline] = useState<SkillsAndDrillsPageContent>(DEFAULT_SKILLS_CONTENT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [heroImageUploading, setHeroImageUploading] = useState(false);
  const [coachImageUploading, setCoachImageUploading] = useState(false);

  const heroImageInputId = "skills-hero-image-file";
  const coachImageInputId = "skills-coach-image-file";

  useEffect(() => {
    let isMounted = true;

    fetchPageContent<SkillsAndDrillsPageContent>(
      "skills-and-drills",
      DEFAULT_SKILLS_CONTENT,
    )
      .then((data) => {
        if (!isMounted) return;
        setContent(data);
        setBaseline(data);
      })
      .catch((error) => {
        if ((error as Error | undefined)?.name === "AbortError") {
          return;
        }
        console.error("Failed to load skills & drills content for settings", error);
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const isDirty = useMemo(
    () => JSON.stringify(content) !== JSON.stringify(baseline),
    [content, baseline],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isDirty || saving) return;

    setSaving(true);
    const result = await savePageContent({
      pageSlug: "skills-and-drills",
      content,
      updatedBy: userProfile?.id ?? null,
    });
    setSaving(false);

    if (!result) {
      showToast("Failed to update the Skills & Drills content.", "error");
      return;
    }

    setBaseline(content);
    showToast("Skills & Drills content updated.", "success");
  };

  const handleReset = () => setContent(baseline);

  const handleHeroImageUpload = async (file: File | null) => {
    if (!file) return;
    setHeroImageUploading(true);
    try {
      const url = await uploadSiteContentAsset(file, "skills-and-drills/hero");
      setContent((prev) => ({
        ...prev,
        hero: { ...prev.hero, image: url },
      }));
      showToast("Hero image updated.", "success");
    } catch (error) {
      console.error("Failed to upload Skills & Drills hero image", error);
      showToast("Failed to upload image. Please try again.", "error");
    } finally {
      setHeroImageUploading(false);
    }
  };

  const handleCoachImageUpload = async (file: File | null) => {
    if (!file) return;
    setCoachImageUploading(true);
    try {
      const url = await uploadSiteContentAsset(file, "skills-and-drills/coach");
      setContent((prev) => ({
        ...prev,
        coach: { ...prev.coach, image: url },
      }));
      showToast("Coach image updated.", "success");
    } catch (error) {
      console.error("Failed to upload coach image", error);
      showToast("Failed to upload image. Please try again.", "error");
    } finally {
      setCoachImageUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <p className="text-sm text-[#6F6F6F]">Loading Skills &amp; Drills content…</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="px-6 py-5 border-b border-gray-200">
        <h2 className="text-2xl font-semibold text-[#6F6F6F]">Skills &amp; Drills Page</h2>
        <p className="mt-2 text-sm text-gray-500">
          Manage the hero imagery and coach spotlight content for the Skills &amp; Drills landing page.
        </p>
      </div>

      <form
        id="site-settings-form-skills"
        onSubmit={handleSubmit}
        onReset={handleReset}
        className="px-6 py-6 space-y-6"
      >
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-[#6F6F6F]">Hero Banner</h3>
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,280px)_1fr] gap-4">
            <div className="space-y-3">
              <input
                id={heroImageInputId}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => handleHeroImageUpload(event.target.files?.[0] ?? null)}
              />
              <label
                htmlFor={heroImageInputId}
                className="group relative block aspect-[3/2] w-full cursor-pointer overflow-hidden rounded-md border border-gray-200 bg-gray-100 shadow-sm transition hover:shadow-md"
              >
                {content.hero.image ? (
                  <>
                    <img
                      src={content.hero.image}
                      alt={content.hero.imageAlt || "Hero preview"}
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
                    <div className="text-sm font-medium">Upload hero image</div>
                    <div className="text-[11px] uppercase tracking-wide">Click to select</div>
                  </div>
                )}
              </label>
              <Input
                value={content.hero.image}
                placeholder="Image URL (optional override)"
                onChange={(event) =>
                  setContent((prev) => ({
                    ...prev,
                    hero: { ...prev.hero, image: event.target.value },
                  }))
                }
              />
              {heroImageUploading ? (
                <p className="text-xs text-[#B20000]">Uploading image…</p>
              ) : null}
              {content.hero.image ? (
                <Button
                  type="button"
                  variant="outline"
                  className="text-xs text-[#B20000] border-[#B20000]"
                  onClick={() =>
                    setContent((prev) => ({
                      ...prev,
                      hero: { ...prev.hero, image: "" },
                    }))
                  }
                >
                  Clear image
                </Button>
              ) : null}
            </div>
            <div className="space-y-3">
              <Input
                value={content.hero.imageAlt}
                placeholder="Image alt text"
                onChange={(event) =>
                  setContent((prev) => ({
                    ...prev,
                    hero: { ...prev.hero, imageAlt: event.target.value },
                  }))
                }
              />
              <Input
                value={content.hero.containerClassName}
                placeholder="Container height class"
                onChange={(event) =>
                  setContent((prev) => ({
                    ...prev,
                    hero: { ...prev.hero, containerClassName: event.target.value },
                  }))
                }
              />
            </div>
          </div>
          <Input
            value={content.hero.title}
            placeholder="Hero title"
            onChange={(event) =>
              setContent((prev) => ({
                ...prev,
                hero: { ...prev.hero, title: event.target.value },
              }))
            }
          />
          <TextArea
            id="skills-hero-subtitle"
            className="min-h-[120px]"
            value={content.hero.subtitle}
            placeholder="Hero subtitle"
            onChange={(value) =>
              setContent((prev) => ({
                ...prev,
                hero: { ...prev.hero, subtitle: value },
              }))
            }
          />
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-[#6F6F6F]">Coach Spotlight</h3>
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,280px)_1fr] gap-4">
            <div className="space-y-3">
              <input
                id={coachImageInputId}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => handleCoachImageUpload(event.target.files?.[0] ?? null)}
              />
              <label
                htmlFor={coachImageInputId}
                className="group relative block aspect-[3/4] w-full cursor-pointer overflow-hidden rounded-md border border-gray-200 bg-gray-100 shadow-sm transition hover:shadow-md"
              >
                {content.coach.image ? (
                  <>
                    <img
                      src={content.coach.image}
                      alt={content.coach.imageAlt || "Coach preview"}
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
                    <div className="text-sm font-medium">Upload coach image</div>
                    <div className="text-[11px] uppercase tracking-wide">Click to select</div>
                  </div>
                )}
              </label>
              <Input
                value={content.coach.image}
                placeholder="Image URL (optional override)"
                onChange={(event) =>
                  setContent((prev) => ({
                    ...prev,
                    coach: { ...prev.coach, image: event.target.value },
                  }))
                }
              />
              {coachImageUploading ? (
                <p className="text-xs text-[#B20000]">Uploading image…</p>
              ) : null}
              {content.coach.image ? (
                <Button
                  type="button"
                  variant="outline"
                  className="text-xs text-[#B20000] border-[#B20000]"
                  onClick={() =>
                    setContent((prev) => ({
                      ...prev,
                      coach: { ...prev.coach, image: "" },
                    }))
                  }
                >
                  Clear image
                </Button>
              ) : null}
            </div>
            <div className="space-y-3">
              <Input
                value={content.coach.imageAlt}
                placeholder="Image alt text"
                onChange={(event) =>
                  setContent((prev) => ({
                    ...prev,
                    coach: { ...prev.coach, imageAlt: event.target.value },
                  }))
                }
              />
              <Input
                value={content.coach.name}
                placeholder="Coach name"
                onChange={(event) =>
                  setContent((prev) => ({
                    ...prev,
                    coach: { ...prev.coach, name: event.target.value },
                  }))
                }
              />
              <Input
                value={content.coach.title}
                placeholder="Coach title (e.g., Head Coach)"
                onChange={(event) =>
                  setContent((prev) => ({
                    ...prev,
                    coach: { ...prev.coach, title: event.target.value },
                  }))
                }
              />
            </div>
          </div>
          <TextArea
            id="skills-coach-description"
            className="min-h-[150px]"
            value={content.coach.description}
            placeholder="Coach description"
            onChange={(value) =>
              setContent((prev) => ({
                ...prev,
                coach: { ...prev.coach, description: value },
              }))
            }
          />
        </section>
      </form>
    </div>
  );
}
