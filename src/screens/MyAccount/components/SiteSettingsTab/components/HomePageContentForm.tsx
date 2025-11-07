import { FormEvent, useEffect, useMemo, useState } from "react";
import { Input } from "../../../../../components/ui/input";
import { Button } from "../../../../../components/ui/button";
import { useToast } from "../../../../../components/ui/toast";
import { fetchPageContent, savePageContent } from "../../../../../lib/pageContent";
import {
  DEFAULT_HOME_CONTENT,
  HomePageContent,
  normalizeHomePageContent,
} from "../../../../../screens/HomePage/HomePage";
import { useAuth } from "../../../../../contexts/AuthContext";
import { SiteSettingsImageUploadField } from "./SiteSettingsImageUploadField";

function TextArea({
  label,
  value,
  onChange,
  rows = 3,
  id,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  id: string;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-[#6F6F6F]" htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-[#6F6F6F] focus:border-[#B20000] focus:outline-none focus:ring-1 focus:ring-[#B20000]"
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function HomePageContentForm() {
  const { showToast } = useToast();
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState<HomePageContent>(normalizeHomePageContent(DEFAULT_HOME_CONTENT));
  const [baseline, setBaseline] = useState<HomePageContent>(normalizeHomePageContent(DEFAULT_HOME_CONTENT));

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
        console.error("Failed to load home page content for settings", error);
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

  const isDirty = useMemo(() => {
    return JSON.stringify(content) !== JSON.stringify(baseline);
  }, [content, baseline]);

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <p className="text-sm text-[#6F6F6F]">Loading home page content…</p>
      </div>
    );
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isDirty || saving) return;
    setSaving(true);

    const result = await savePageContent({
      pageSlug: "home",
      content,
      updatedBy: userProfile?.id ?? null,
    });

    setSaving(false);

    if (!result) {
      showToast("Failed to update the home page content.", "error");
      return;
    }

    setBaseline(content);
    showToast("Home page content updated.", "success");
  };

  const handleReset = () => setContent(baseline);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="px-6 py-5 border-b border-gray-200">
        <h2 className="text-2xl font-semibold text-[#6F6F6F]">Home Page Content</h2>
        <p className="mt-2 text-sm text-gray-500">
          Update the featured leagues and supporting sections shown on the public home page.
        </p>
      </div>

      <form
        id="site-settings-form-home"
        onSubmit={handleSubmit}
        onReset={handleReset}
        className="px-6 py-6 space-y-6"
      >
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-[#6F6F6F]">Partner Highlight</h3>
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,320px)_1fr] gap-4">
            <SiteSettingsImageUploadField
              id="home-partner-logo-upload"
              value={content.partner.logo}
              uploadPath="home/partner"
              placeholder="Logo URL"
              emptyStateLabel="Upload partner logo"
              previewAspectClass="aspect-square"
              onChange={(value) =>
                setContent((prev) => ({
                  ...prev,
                  partner: { ...prev.partner, logo: value },
                }))
              }
            />
            <div className="space-y-3">
              <Input
                value={content.partner.logoAlt}
                onChange={(event) =>
                  setContent((prev) => ({
                    ...prev,
                    partner: { ...prev.partner, logoAlt: event.target.value },
                  }))
                }
                placeholder="Logo alt text"
              />
            </div>
          </div>
          <TextArea
            id="home-partner-text"
            label="Partner Copy"
            value={content.partner.text}
            onChange={(value) =>
              setContent((prev) => ({
                ...prev,
                partner: { ...prev.partner, text: value },
              }))
            }
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              value={content.partner.linkText}
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  partner: { ...prev.partner, linkText: event.target.value },
                }))
              }
              placeholder="Link text"
            />
            <Input
              value={content.partner.linkUrl}
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  partner: { ...prev.partner, linkUrl: event.target.value },
                }))
              }
              placeholder="Link URL"
            />
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-[#6F6F6F]">Sponsor Banner</h3>
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,320px)_1fr] gap-4">
            <SiteSettingsImageUploadField
              id="home-sponsor-logo-upload"
              value={content.sponsorBanner.logo}
              uploadPath="home/sponsor-banner"
              placeholder="Logo URL"
              emptyStateLabel="Upload sponsor logo"
              previewAspectClass="aspect-square"
              onChange={(value) =>
                setContent((prev) => ({
                  ...prev,
                  sponsorBanner: { ...prev.sponsorBanner, logo: value },
                }))
              }
            />
            <div className="space-y-3">
              <Input
                id="home-sponsor-logo-alt"
                value={content.sponsorBanner.logoAlt}
                onChange={(event) =>
                  setContent((prev) => ({
                    ...prev,
                    sponsorBanner: { ...prev.sponsorBanner, logoAlt: event.target.value },
                  }))
                }
                placeholder="Logo alt text"
              />
            </div>
          </div>
          <TextArea
            id="home-sponsor-description"
            label="Primary message"
            rows={3}
            value={content.sponsorBanner.description}
            onChange={(value) =>
              setContent((prev) => ({
                ...prev,
                sponsorBanner: { ...prev.sponsorBanner, description: value },
              }))
            }
          />
          <TextArea
            id="home-sponsor-secondary-text"
            label="Secondary message"
            rows={2}
            value={content.sponsorBanner.secondaryText}
            onChange={(value) =>
              setContent((prev) => ({
                ...prev,
                sponsorBanner: { ...prev.sponsorBanner, secondaryText: value },
              }))
            }
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              id="home-sponsor-primary-link-text"
              value={content.sponsorBanner.primaryLinkText}
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  sponsorBanner: { ...prev.sponsorBanner, primaryLinkText: event.target.value },
                }))
              }
              placeholder="Primary link text"
            />
            <Input
              id="home-sponsor-primary-link-url"
              value={content.sponsorBanner.primaryLinkUrl}
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  sponsorBanner: { ...prev.sponsorBanner, primaryLinkUrl: event.target.value },
                }))
              }
              placeholder="Primary link URL"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              id="home-sponsor-secondary-link-text"
              value={content.sponsorBanner.secondaryLinkText}
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  sponsorBanner: { ...prev.sponsorBanner, secondaryLinkText: event.target.value },
                }))
              }
              placeholder="Secondary link text"
            />
            <Input
              id="home-sponsor-secondary-link-url"
              value={content.sponsorBanner.secondaryLinkUrl}
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  sponsorBanner: { ...prev.sponsorBanner, secondaryLinkUrl: event.target.value },
                }))
              }
              placeholder="Secondary link URL"
            />
          </div>
        </section>

        <TextArea
          id="home-league-description"
          label="League Description"
          rows={4}
          value={content.leagueDescription}
          onChange={(value) =>
            setContent((prev) => ({
              ...prev,
              leagueDescription: value,
            }))
          }
        />

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[#6F6F6F]">Popular League Cards</h3>
            <Button
              type="button"
              variant="outline"
              className="text-sm"
              onClick={() =>
                setContent((prev) => ({
                  ...prev,
                  popularLeagues: [
                    ...prev.popularLeagues,
                    { title: "New League", image: "/placeholder.jpg", alt: "League image", link: "/" },
                  ],
                }))
              }
            >
              Add Card
            </Button>
          </div>

          <div className="space-y-4">
            {content.popularLeagues.map((card, index) => (
              <div key={`${card.title}-${index}`} className="border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#6F6F6F]">Card {index + 1}</span>
                  {content.popularLeagues.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-xs text-red-600"
                      onClick={() =>
                        setContent((prev) => ({
                          ...prev,
                          popularLeagues: prev.popularLeagues.filter((_, cardIndex) => cardIndex !== index),
                        }))
                      }
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <Input
                  value={card.title}
                  placeholder="Title"
                  onChange={(event) =>
                    setContent((prev) => {
                      const cards = [...prev.popularLeagues];
                      cards[index] = { ...cards[index], title: event.target.value };
                      return { ...prev, popularLeagues: cards };
                    })
                  }
                />
                <SiteSettingsImageUploadField
                  id={`home-popular-league-image-${index}`}
                  value={card.image}
                  uploadPath={`home/popular-leagues/${index}`}
                  placeholder="Image URL"
                  emptyStateLabel="Upload card image"
                  previewAspectClass="aspect-[4/3]"
                  onChange={(value) =>
                    setContent((prev) => {
                      const cards = [...prev.popularLeagues];
                      cards[index] = { ...cards[index], image: value };
                      return { ...prev, popularLeagues: cards };
                    })
                  }
                />
                <Input
                  value={card.alt}
                  placeholder="Image alt text"
                  onChange={(event) =>
                    setContent((prev) => {
                      const cards = [...prev.popularLeagues];
                      cards[index] = { ...cards[index], alt: event.target.value };
                      return { ...prev, popularLeagues: cards };
                    })
                  }
                />
                <Input
                  value={card.link}
                  placeholder="Link"
                  onChange={(event) =>
                    setContent((prev) => {
                      const cards = [...prev.popularLeagues];
                      cards[index] = { ...cards[index], link: event.target.value };
                      return { ...prev, popularLeagues: cards };
                    })
                  }
                />
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-[#6F6F6F]">Highlights Card</h3>
          <SiteSettingsImageUploadField
            id="home-highlight-icon-upload"
            value={content.highlightCard.icon}
            uploadPath="home/highlight-card"
            placeholder="Icon URL"
            emptyStateLabel="Upload icon"
            previewAspectClass="aspect-square"
            onChange={(value) =>
              setContent((prev) => ({
                ...prev,
                highlightCard: { ...prev.highlightCard, icon: value },
              }))
            }
          />
          <Input
            value={content.highlightCard.title}
            placeholder="Title"
            onChange={(event) =>
              setContent((prev) => ({
                ...prev,
                highlightCard: { ...prev.highlightCard, title: event.target.value },
              }))
            }
          />
          <TextArea
            id="home-highlight-description"
            label="Description"
            value={content.highlightCard.description}
            onChange={(value) =>
              setContent((prev) => ({
                ...prev,
                highlightCard: { ...prev.highlightCard, description: value },
              }))
            }
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              value={content.highlightCard.buttonText}
              placeholder="Button text"
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  highlightCard: { ...prev.highlightCard, buttonText: event.target.value },
                }))
              }
            />
            <Input
              value={content.highlightCard.buttonLink}
              placeholder="Button link"
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  highlightCard: { ...prev.highlightCard, buttonLink: event.target.value },
                }))
              }
            />
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-[#6F6F6F]">Feature Sections</h3>
          <div className="space-y-4">
            {content.featureSections.map((section, index) => (
              <div key={`${section.title}-${index}`} className="border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="font-medium text-sm text-[#6F6F6F]">Section {index + 1}</div>
                <SiteSettingsImageUploadField
                  id={`home-feature-section-image-${index}`}
                  value={section.image}
                  uploadPath={`home/feature-sections/${index}`}
                  placeholder="Image URL"
                  emptyStateLabel="Upload feature image"
                  previewAspectClass="aspect-[4/3]"
                  onChange={(value) =>
                    setContent((prev) => {
                      const featureSections = [...prev.featureSections];
                      featureSections[index] = { ...featureSections[index], image: value };
                      return { ...prev, featureSections };
                    })
                  }
                />
                <Input
                  value={section.imageAlt}
                  placeholder="Image alt text"
                  onChange={(event) =>
                    setContent((prev) => {
                      const featureSections = [...prev.featureSections];
                      featureSections[index] = { ...featureSections[index], imageAlt: event.target.value };
                      return { ...prev, featureSections };
                    })
                  }
                />
                <Input
                  value={section.title}
                  placeholder="Title"
                  onChange={(event) =>
                    setContent((prev) => {
                      const featureSections = [...prev.featureSections];
                      featureSections[index] = { ...featureSections[index], title: event.target.value };
                      return { ...prev, featureSections };
                    })
                  }
                />
                <TextArea
                  id={`home-feature-description-${index}`}
                  label="Description"
                  value={section.description}
                  onChange={(value) =>
                    setContent((prev) => {
                      const featureSections = [...prev.featureSections];
                      featureSections[index] = { ...featureSections[index], description: value };
                      return { ...prev, featureSections };
                    })
                  }
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    value={section.linkText}
                    placeholder="Link text"
                    onChange={(event) =>
                      setContent((prev) => {
                        const featureSections = [...prev.featureSections];
                        featureSections[index] = { ...featureSections[index], linkText: event.target.value };
                        return { ...prev, featureSections };
                      })
                    }
                  />
                  <Input
                    value={section.linkUrl}
                    placeholder="Link URL"
                    onChange={(event) =>
                      setContent((prev) => {
                        const featureSections = [...prev.featureSections];
                        featureSections[index] = { ...featureSections[index], linkUrl: event.target.value };
                        return { ...prev, featureSections };
                      })
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-[#6F6F6F]">Final Call to Action</h3>
          <Input
            value={content.cta.title}
            placeholder="CTA Heading"
            onChange={(event) =>
              setContent((prev) => ({
                ...prev,
                cta: { ...prev.cta, title: event.target.value },
              }))
            }
          />
          <TextArea
            id="home-cta-subtitle"
            label="CTA Subtitle"
            value={content.cta.subtitle}
            onChange={(value) =>
              setContent((prev) => ({
                ...prev,
                cta: { ...prev.cta, subtitle: value },
              }))
            }
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              value={content.cta.buttonText}
              placeholder="Button text"
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  cta: { ...prev.cta, buttonText: event.target.value },
                }))
              }
            />
            <Input
              value={content.cta.buttonLink}
              placeholder="Button link"
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  cta: { ...prev.cta, buttonLink: event.target.value },
                }))
              }
            />
          </div>
          <Input
            value={content.cta.background}
            placeholder="Background gradient"
            onChange={(event) =>
              setContent((prev) => ({
                ...prev,
                cta: { ...prev.cta, background: event.target.value },
              }))
            }
          />
        </section>

      </form>
    </div>
  );
}
