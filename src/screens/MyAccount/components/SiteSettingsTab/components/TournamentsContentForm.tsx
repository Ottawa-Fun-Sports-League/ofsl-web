import { FormEvent, useEffect, useMemo, useState } from "react";
import { Input } from "../../../../../components/ui/input";
import { Button } from "../../../../../components/ui/button";
import { useToast } from "../../../../../components/ui/toast";
import { useAuth } from "../../../../../contexts/AuthContext";
import { fetchPageContent, savePageContent } from "../../../../../lib/pageContent";
import { uploadSiteContentAsset } from "../../../../../lib/siteContentStorage";
import {
  DEFAULT_TOURNAMENTS_CONTENT,
  TournamentsPageContent,
  FeatureIcon,
} from "../../../../TournamentsPage/TournamentsPage";
import { ChevronDown } from "lucide-react";

const FEATURE_ICONS: FeatureIcon[] = [
  "trophy",
  "calendar",
  "users",
  "clock",
  "star",
  "award",
  "flag",
  "shield",
];

function TextArea({
  id,
  label,
  value,
  onChange,
  rows = 3,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-[#6F6F6F]" htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-[#6F6F6F] focus:border-[#B20000] focus:outline-none focus:ring-1 focus:ring-[#B20000]"
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function TournamentsContentForm() {
  const { showToast } = useToast();
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState<TournamentsPageContent>(DEFAULT_TOURNAMENTS_CONTENT);
  const [baseline, setBaseline] = useState<TournamentsPageContent>(DEFAULT_TOURNAMENTS_CONTENT);
  const [heroImageUploading, setHeroImageUploading] = useState(false);
  const [aboutImageUploading, setAboutImageUploading] = useState(false);
  const heroImageInputId = "tournaments-hero-image-file";
  const aboutImageInputId = "tournaments-about-image-file";

  useEffect(() => {
    let isMounted = true;

    fetchPageContent<TournamentsPageContent>("tournaments", DEFAULT_TOURNAMENTS_CONTENT)
      .then((data) => {
        if (!isMounted) return;
        setContent(data);
        setBaseline(data);
      })
      .catch((error) => {
        console.error("Failed to load tournaments content", error);
        if (!isMounted) return;
        setContent(DEFAULT_TOURNAMENTS_CONTENT);
        setBaseline(DEFAULT_TOURNAMENTS_CONTENT);
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

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <p className="text-sm text-[#6F6F6F]">Loading tournaments content…</p>
      </div>
    );
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isDirty || saving) return;

    setSaving(true);
    const result = await savePageContent({
      pageSlug: "tournaments",
      content,
      updatedBy: userProfile?.id ?? null,
    });
    setSaving(false);

    if (!result) {
      showToast("Failed to update tournaments content.", "error");
      return;
    }

    setBaseline(content);
    showToast("Tournaments content updated.", "success");
  };

  const handleReset = () => setContent(baseline);

  const handleHeroImageUpload = async (file: File | null) => {
    if (!file) return;
    setHeroImageUploading(true);
    try {
      const url = await uploadSiteContentAsset(file, "tournaments/hero");
      setContent((prev) => ({
        ...prev,
        hero: { ...prev.hero, image: url },
      }));
      showToast("Hero image updated.", "success");
    } catch (error) {
      console.error("Failed to upload tournaments hero image", error);
      showToast("Failed to upload image. Please try again.", "error");
    } finally {
      setHeroImageUploading(false);
    }
  };

  const handleAboutImageUpload = async (file: File | null) => {
    if (!file) return;
    setAboutImageUploading(true);
    try {
      const url = await uploadSiteContentAsset(file, "tournaments/about");
      setContent((prev) => ({
        ...prev,
        about: { ...prev.about, image: url },
      }));
      showToast("About image updated.", "success");
    } catch (error) {
      console.error("Failed to upload tournaments about image", error);
      showToast("Failed to upload image. Please try again.", "error");
    } finally {
      setAboutImageUploading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="px-6 py-5 border-b border-gray-200">
        <h2 className="text-2xl font-semibold text-[#6F6F6F]">Tournaments Page</h2>
        <p className="mt-2 text-sm text-gray-500">
          Manage the hero, feature highlights, and about sections for the tournaments landing page.
        </p>
      </div>

      <form
        id="site-settings-form-tournaments"
        onSubmit={handleSubmit}
        onReset={handleReset}
        className="px-6 py-6 space-y-6"
      >
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-[#6F6F6F]">Hero Section</h3>
          <div className="space-y-3">
            <input
              id={heroImageInputId}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => handleHeroImageUpload(event.target.files?.[0] ?? null)}
            />
            <label className="text-sm font-medium text-[#6F6F6F]">Hero Image</label>
            <div
              className="group relative block aspect-[3/2] w-full max-w-[320px] cursor-pointer overflow-hidden rounded-md border border-gray-200 bg-gray-100 shadow-sm transition hover:shadow-md"
              onClick={() => document.getElementById(heroImageInputId)?.click()}
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
            </div>
            <Input
              value={content.hero.image}
              placeholder="Hero image URL (optional override)"
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  hero: { ...prev.hero, image: event.target.value },
                }))
              }
            />
            {heroImageUploading ? <p className="text-xs text-[#B20000]">Uploading image…</p> : null}
          </div>
          <Input
            value={content.hero.imageAlt}
            placeholder="Hero image alt text"
            onChange={(event) =>
              setContent((prev) => ({
                ...prev,
                hero: { ...prev.hero, imageAlt: event.target.value },
              }))
            }
          />
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
            id="tournaments-hero-subtitle"
            label="Hero subtitle"
            value={content.hero.subtitle}
            onChange={(value) =>
              setContent((prev) => ({
                ...prev,
                hero: { ...prev.hero, subtitle: value },
              }))
            }
            rows={4}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              value={content.hero.ctaText}
              placeholder="CTA button text"
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  hero: { ...prev.hero, ctaText: event.target.value },
                }))
              }
            />
            <Input
              value={content.hero.ctaLink}
              placeholder="CTA button link"
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  hero: { ...prev.hero, ctaLink: event.target.value },
                }))
              }
            />
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-[#6F6F6F]">Intro</h3>
          <TextArea
            id="tournaments-intro"
            label="Intro text"
            value={content.intro}
            onChange={(value) =>
              setContent((prev) => ({
                ...prev,
                intro: value,
              }))
            }
            rows={4}
          />
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[#6F6F6F]">Feature Cards</h3>
            <Button
              type="button"
              variant="outline"
              className="text-sm"
              onClick={() =>
                setContent((prev) => ({
                  ...prev,
                  features: [
                    ...prev.features,
                    {
                      icon: "trophy",
                      title: "New Feature",
                      description: "Describe this highlight",
                    },
                  ],
                }))
              }
            >
              Add Feature
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {content.features.map((feature, index) => (
              <div key={`${feature.title}-${index}`} className="border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#6F6F6F]">Feature {index + 1}</span>
                  {content.features.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-xs text-red-600"
                      onClick={() =>
                        setContent((prev) => ({
                          ...prev,
                          features: prev.features.filter((_, i) => i !== index),
                        }))
                      }
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="sr-only" htmlFor={`feature-icon-${index}`}>
                      Icon
                    </label>
                    <div className="relative">
                      <select
                        id={`feature-icon-${index}`}
                        className="appearance-none w-full rounded-md border border-gray-300 bg-white px-3 py-2 h-10 text-sm text-[#6F6F6F] focus:border-[#B20000] focus:outline-none focus:ring-1 focus:ring-[#B20000]"
                        value={feature.icon}
                        onChange={(event) =>
                          setContent((prev) => {
                            const next = [...prev.features];
                            next[index] = {
                              ...next[index],
                              icon: event.target.value as FeatureIcon,
                            };
                            return { ...prev, features: next };
                          })
                        }
                      >
                        {FEATURE_ICONS.map((icon) => (
                          <option key={icon} value={icon}>
                            {icon}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    </div>
                  </div>
                  <Input
                    value={feature.title}
                    placeholder="Title"
                    onChange={(event) =>
                      setContent((prev) => {
                        const next = [...prev.features];
                        next[index] = { ...next[index], title: event.target.value };
                        return { ...prev, features: next };
                      })
                    }
                  />
                  <TextArea
                    id={`feature-description-${index}`}
                    label="Description"
                    value={feature.description}
                    onChange={(value) =>
                      setContent((prev) => {
                        const next = [...prev.features];
                        next[index] = { ...next[index], description: value };
                        return { ...prev, features: next };
                      })
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-[#6F6F6F]">About Section</h3>
          <div className="space-y-3">
            <label className="text-sm font-medium text-[#6F6F6F]">About Image</label>
            <input
              id={aboutImageInputId}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => handleAboutImageUpload(event.target.files?.[0] ?? null)}
            />
            <div
              className="group relative block aspect-[4/3] w-full max-w-[320px] cursor-pointer overflow-hidden rounded-md border border-gray-200 bg-gray-100 shadow-sm transition hover:shadow-md"
              onClick={() => document.getElementById(aboutImageInputId)?.click()}
            >
              {content.about.image ? (
                <>
                  <img
                    src={content.about.image}
                    alt={content.about.imageAlt || "About preview"}
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
                  <div className="text-sm font-medium">Upload about image</div>
                  <div className="text-[11px] uppercase tracking-wide">Click to select</div>
                </div>
              )}
            </div>
            <Input
              value={content.about.image}
              placeholder="About image URL (optional override)"
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  about: { ...prev.about, image: event.target.value },
                }))
              }
            />
            {aboutImageUploading ? <p className="text-xs text-[#B20000]">Uploading image…</p> : null}
          </div>
          <Input
            value={content.about.imageAlt}
            placeholder="About image alt text"
            onChange={(event) =>
              setContent((prev) => ({
                ...prev,
                about: { ...prev.about, imageAlt: event.target.value },
              }))
            }
          />
          <Input
            value={content.about.title}
            placeholder="Section title"
            onChange={(event) =>
              setContent((prev) => ({
                ...prev,
                about: { ...prev.about, title: event.target.value },
              }))
            }
          />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#6F6F6F]">Paragraphs</span>
              <Button
                type="button"
                variant="outline"
                className="text-sm"
                onClick={() =>
                  setContent((prev) => ({
                    ...prev,
                    about: {
                      ...prev.about,
                      paragraphs: [...prev.about.paragraphs, "New paragraph"],
                    },
                  }))
                }
              >
                Add Paragraph
              </Button>
            </div>
            {content.about.paragraphs.map((paragraph, index) => (
              <div key={`paragraph-${index}`} className="space-y-2">
                <TextArea
                  id={`tournaments-about-paragraph-${index}`}
                  label={`Paragraph ${index + 1}`}
                  value={paragraph}
                  onChange={(value) =>
                    setContent((prev) => {
                      const paragraphs = [...prev.about.paragraphs];
                      paragraphs[index] = value;
                      return {
                        ...prev,
                        about: { ...prev.about, paragraphs },
                      };
                    })
                  }
                  rows={3}
                />
                {content.about.paragraphs.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-xs text-red-600"
                    onClick={() =>
                      setContent((prev) => ({
                        ...prev,
                        about: {
                          ...prev.about,
                          paragraphs: prev.about.paragraphs.filter((_, i) => i !== index),
                        },
                      }))
                    }
                  >
                    Remove Paragraph
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#6F6F6F]">Bullet Points</span>
              <Button
                type="button"
                variant="outline"
                className="text-sm"
                onClick={() =>
                  setContent((prev) => ({
                    ...prev,
                    about: {
                      ...prev.about,
                      bullets: [...prev.about.bullets, "New detail"],
                    },
                  }))
                }
              >
                Add Bullet
              </Button>
            </div>
            {content.about.bullets.map((bullet, index) => (
              <div key={`bullet-${index}`} className="flex items-center gap-2">
                <Input
                  value={bullet}
                  onChange={(event) =>
                    setContent((prev) => {
                      const bullets = [...prev.about.bullets];
                      bullets[index] = event.target.value;
                      return {
                        ...prev,
                        about: { ...prev.about, bullets },
                      };
                    })
                  }
                />
                {content.about.bullets.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-xs text-red-600"
                    onClick={() =>
                      setContent((prev) => ({
                        ...prev,
                        about: {
                          ...prev.about,
                          bullets: prev.about.bullets.filter((_, i) => i !== index),
                        },
                      }))
                    }
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              value={content.about.buttonText}
              placeholder="About button text"
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  about: { ...prev.about, buttonText: event.target.value },
                }))
              }
            />
            <Input
              value={content.about.buttonLink}
              placeholder="About button link"
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  about: { ...prev.about, buttonLink: event.target.value },
                }))
              }
            />
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-[#6F6F6F]">Callout Section</h3>
          <Input
            value={content.callout.title}
            placeholder="Callout title"
            onChange={(event) =>
              setContent((prev) => ({
                ...prev,
                callout: { ...prev.callout, title: event.target.value },
              }))
            }
          />
          <TextArea
            id="tournaments-callout-description"
            label="Description"
            value={content.callout.description}
            onChange={(value) =>
              setContent((prev) => ({
                ...prev,
                callout: { ...prev.callout, description: value },
              }))
            }
            rows={3}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              value={content.callout.buttonText}
              placeholder="Callout button text"
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  callout: { ...prev.callout, buttonText: event.target.value },
                }))
              }
            />
            <Input
              value={content.callout.buttonLink}
              placeholder="Callout button link"
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  callout: { ...prev.callout, buttonLink: event.target.value },
                }))
              }
            />
          </div>
        </section>
      </form>
    </div>
  );
}
