import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "../../../../../components/ui/button";
import { Input } from "../../../../../components/ui/input";
import { useToast } from "../../../../../components/ui/toast";
import { useAuth } from "../../../../../contexts/AuthContext";
import {
  DEFAULT_HOME_CONTENT,
  HeroSlide,
  HomePageContent,
  normalizeHomePageContent,
} from "../../../../../screens/HomePage/HomePage";
import { fetchPageContent, savePageContent } from "../../../../../lib/pageContent";
import { uploadSiteContentAsset } from "../../../../../lib/siteContentStorage";

function TextArea({
  label,
  value,
  id,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  id: string;
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

const MIN_AUTOROTATE_SECONDS = 3;

const createEmptySlide = (): HeroSlide => ({
  image: "",
  imageAlt: "Hero banner image",
  title: "New Banner",
  subtitle: "",
  buttons: [{ text: "Learn More", link: "/leagues" }],
});

export function HomeHeroCarouselForm() {
  const { showToast } = useToast();
  const { userProfile } = useAuth();

  const [content, setContent] = useState<HomePageContent>(normalizeHomePageContent(DEFAULT_HOME_CONTENT));
  const [baseline, setBaseline] = useState<HomePageContent>(normalizeHomePageContent(DEFAULT_HOME_CONTENT));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingSlideIndex, setUploadingSlideIndex] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    fetchPageContent<HomePageContent>("home", DEFAULT_HOME_CONTENT)
      .then((data) => {
        if (!isMounted) return;
        const normalized = normalizeHomePageContent(data);
        setContent(normalized);
        setBaseline(normalized);
      })
      .catch((error) => {
        if ((error as Error | undefined)?.name === "AbortError") {
          return;
        }
        console.error("Failed to load hero carousel content", error);
        if (!isMounted) return;
        const fallback = normalizeHomePageContent(DEFAULT_HOME_CONTENT);
        setContent(fallback);
        setBaseline(fallback);
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

  const hero = content.hero;

  const isDirty = useMemo(() => JSON.stringify(content) !== JSON.stringify(baseline), [content, baseline]);

  const updateHero = (updater: (heroContent: HomePageContent["hero"]) => HomePageContent["hero"]) => {
    setContent((prev) => ({
      ...prev,
      hero: updater(prev.hero),
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isDirty || saving) return;

    const invalidSlides = hero.slides
      .map((slide, index) => ({
        index,
        image: slide.image?.trim() ?? "",
        title: slide.title?.trim() ?? "",
        subtitle: slide.subtitle?.trim() ?? "",
      }))
      .filter((slide) => slide.image.length === 0 || slide.title.length === 0 || slide.subtitle.length === 0);

    if (invalidSlides.length > 0) {
      const firstInvalid = invalidSlides[0];
      showToast(
        `Slide ${firstInvalid.index + 1} is missing ${[
          firstInvalid.image.length === 0 ? "an image" : null,
          firstInvalid.title.length === 0 ? "a headline" : null,
          firstInvalid.subtitle.length === 0 ? "a subtitle" : null,
        ]
          .filter(Boolean)
          .join(", ")}.`,
        "warning",
      );
      return;
    }

    setSaving(true);

    const result = await savePageContent({
      pageSlug: "home",
      content,
      updatedBy: userProfile?.id ?? null,
    });

    setSaving(false);

    if (!result) {
      showToast("Failed to update the hero carousel.", "error");
      return;
    }

    setBaseline(content);
    showToast("Hero carousel updated.", "success");
  };

  const handleReset = () => setContent(baseline);

  const handleImageUpload = async (index: number, file: File | null) => {
    if (!file) return;

    setUploadingSlideIndex(index);
    try {
      const publicUrl = await uploadSiteContentAsset(file, "home-hero");
      updateHero((heroContent) => {
        const slides = heroContent.slides.map((slide, slideIndex) =>
          slideIndex === index ? { ...slide, image: publicUrl } : slide,
        );
        return { ...heroContent, slides };
      });
      showToast("Image uploaded and linked to the slide.", "success");
    } catch (error) {
      console.error("Hero image upload failed", error);
      showToast("Failed to upload image. Please try again.", "error");
    } finally {
      setUploadingSlideIndex(null);
    }
  };

  const handleSlideFieldChange = (index: number, field: keyof HeroSlide, value: string) => {
    updateHero((heroContent) => {
      const slides = heroContent.slides.map((slide, slideIndex) =>
        slideIndex === index ? { ...slide, [field]: value } : slide,
      );
      return { ...heroContent, slides };
    });
  };

  const handleButtonChange = (
    slideIndex: number,
    buttonIndex: number,
    partial: Partial<HeroSlide["buttons"][number]>,
  ) => {
    updateHero((heroContent) => {
      const slides = heroContent.slides.map((slide, index) => {
        if (index !== slideIndex) return slide;
        const buttons = slide.buttons.map((button, idx) =>
          idx === buttonIndex ? { ...button, ...partial } : button,
        );
        return { ...slide, buttons };
      });
      return { ...heroContent, slides };
    });
  };

  const handleAddSlide = () => {
    updateHero((heroContent) => ({
      ...heroContent,
      slides: [...heroContent.slides, createEmptySlide()],
    }));
  };

  const handleRemoveSlide = (index: number) => {
    if (hero.slides.length <= 1) {
      showToast("At least one slide is required.", "warning");
      return;
    }

    updateHero((heroContent) => ({
      ...heroContent,
      slides: heroContent.slides.filter((_, slideIndex) => slideIndex !== index),
    }));
  };

  const handleAddButton = (index: number) => {
    updateHero((heroContent) => {
      const slides = heroContent.slides.map((slide, slideIndex) =>
        slideIndex === index
          ? { ...slide, buttons: [...slide.buttons, { text: "New Button", link: "/" }] }
          : slide,
      );
      return { ...heroContent, slides };
    });
  };

  const handleRemoveButton = (slideIndex: number, buttonIndex: number) => {
    updateHero((heroContent) => {
      const slides = heroContent.slides.map((slide, index) => {
        if (index !== slideIndex) return slide;
        return {
          ...slide,
          buttons: slide.buttons.filter((_, idx) => idx !== buttonIndex),
        };
      });
      return { ...heroContent, slides };
    });
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <p className="text-sm text-[#6F6F6F]">Loading hero carousel…</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="px-6 py-5 border-b border-gray-200">
        <h2 className="text-2xl font-semibold text-[#6F6F6F]">Home Hero Carousel</h2>
        <p className="mt-2 text-sm text-gray-500">
          Add, remove, or edit the slides featured at the top of the home page. Upload images directly
          or link to existing assets, customize the messaging, and control rotation behaviour.
        </p>
      </div>

      <form
        id="site-settings-form-home-hero"
        className="px-6 py-6 space-y-6"
        onSubmit={handleSubmit}
        onReset={handleReset}
      >
        <section className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#6F6F6F]" htmlFor="hero-container-class">
                Carousel Height Class
              </label>
              <Input
                id="hero-container-class"
                value={hero.containerClassName}
                onChange={(event) =>
                  updateHero((heroContent) => ({
                    ...heroContent,
                    containerClassName: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#6F6F6F]" htmlFor="hero-autorotate">
                Auto-rotate Interval (seconds)
              </label>
              <Input
                id="hero-autorotate"
                type="number"
                min={MIN_AUTOROTATE_SECONDS}
                value={hero.autoRotateSeconds?.toString() ?? ""}
                onChange={(event) => {
                  const value = event.target.value.trim();
                  const parsed = Number.parseFloat(value);
                  updateHero((heroContent) => ({
                    ...heroContent,
                    autoRotateSeconds:
                      value === "" || Number.isNaN(parsed)
                        ? null
                        : Math.max(parsed, MIN_AUTOROTATE_SECONDS),
                  }));
                }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[#6F6F6F]">Slides</h3>
            <Button type="button" variant="outline" className="text-sm" onClick={handleAddSlide}>
              Add Slide
            </Button>
          </div>

          <div className="space-y-6">
            {hero.slides.map((slide, index) => {
              const fileInputId = `hero-slide-file-${index}`;
              return (
                <div
                  key={`home-hero-slide-${index}`}
                  className="space-y-4 rounded-lg border border-gray-200 bg-white/80 p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-[#6F6F6F]">Slide {index + 1}</h4>
                      <p className="text-xs text-gray-500">
                        Appears in rotation order. Make sure each slide has engaging copy and CTA.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {uploadingSlideIndex === index ? (
                        <span className="text-xs font-medium text-[#B20000]">Uploading…</span>
                      ) : null}
                      {hero.slides.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          className="text-xs text-red-600"
                          onClick={() => handleRemoveSlide(index)}
                        >
                          Remove Slide
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,280px)_1fr]">
                    <div className="space-y-3">
                      <input
                        id={fileInputId}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                          handleImageUpload(index, event.target.files?.[0] ?? null)
                        }
                      />
                      <label
                        htmlFor={fileInputId}
                        className="group relative block aspect-[3/2] w-full cursor-pointer overflow-hidden rounded-md border border-gray-200 bg-gray-100 shadow-sm transition hover:shadow-md"
                      >
                        {slide.image ? (
                          <>
                            <img
                              src={slide.image}
                              alt={slide.imageAlt || `Slide ${index + 1}`}
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
                        value={slide.image}
                        placeholder="Image URL"
                        onChange={(event) => handleSlideFieldChange(index, "image", event.target.value)}
                      />
                      {slide.image ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full text-xs text-[#B20000] border-[#B20000]"
                          onClick={() => handleSlideFieldChange(index, "image", "")}
                        >
                          Clear Image URL
                        </Button>
                      ) : null}
                    </div>

                    <div className="space-y-4">
                      <Input
                        value={slide.imageAlt}
                        placeholder="Image alt text"
                        onChange={(event) => handleSlideFieldChange(index, "imageAlt", event.target.value)}
                      />
                      <Input
                        value={slide.title}
                        placeholder="Headline"
                        onChange={(event) => handleSlideFieldChange(index, "title", event.target.value)}
                      />
                      <TextArea
                        label="Subtitle"
                        id={`hero-slide-subtitle-${index}`}
                        value={slide.subtitle}
                        onChange={(value) => handleSlideFieldChange(index, "subtitle", value)}
                      />

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-[#6F6F6F]">Buttons</span>
                          <Button
                            type="button"
                            variant="outline"
                            className="text-sm"
                            onClick={() => handleAddButton(index)}
                          >
                            Add Button
                          </Button>
                        </div>

                        {slide.buttons.length > 0 ? (
                          <div className="space-y-3">
                            {slide.buttons.map((button, buttonIndex) => (
                              <div
                                key={`hero-slide-${index}-button-${buttonIndex}`}
                                className="space-y-3 rounded-md border border-gray-200 p-4"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium text-[#6F6F6F]">
                                    Button {buttonIndex + 1}
                                  </span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    className="text-xs text-red-600"
                                    onClick={() => handleRemoveButton(index, buttonIndex)}
                                  >
                                    Remove
                                  </Button>
                                </div>
                                <Input
                                  value={button.text}
                                  placeholder="Label"
                                  onChange={(event) =>
                                    handleButtonChange(index, buttonIndex, { text: event.target.value })
                                  }
                                />
                                <Input
                                  value={button.link}
                                  placeholder="Link (e.g. /leagues)"
                                  onChange={(event) =>
                                    handleButtonChange(index, buttonIndex, { link: event.target.value })
                                  }
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500">
                            Add call-to-action buttons to highlight where this slide should take visitors.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </form>
    </div>
  );
}
