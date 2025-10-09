import { FormEvent, useEffect, useMemo, useState } from "react";
import { Input } from "../../../../../components/ui/input";
import { Button } from "../../../../../components/ui/button";
import { useToast } from "../../../../../components/ui/toast";
import { fetchPageContent, savePageContent } from "../../../../../lib/pageContent";
import {
  DEFAULT_HOME_CONTENT,
  HomePageContent,
} from "../../../../../screens/HomePage/HomePage";

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState<HomePageContent>(DEFAULT_HOME_CONTENT);
  const [baseline, setBaseline] = useState<HomePageContent>(DEFAULT_HOME_CONTENT);

  useEffect(() => {
    const controller = new AbortController();

    fetchPageContent<HomePageContent>("home", DEFAULT_HOME_CONTENT, controller.signal)
      .then((data) => {
        setContent(data);
        setBaseline(data);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
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
    if (!isDirty) return;
    setSaving(true);

    const result = await savePageContent({
      pageSlug: "home",
      content,
    });

    setSaving(false);

    if (!result) {
      showToast("Failed to update the home page content.", "error");
      return;
    }

    setBaseline(content);
    showToast("Home page content updated.", "success");
  };

  const resetToBaseline = () => setContent(baseline);
  const resetToDefaults = () => setContent(DEFAULT_HOME_CONTENT);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="px-6 py-5 border-b border-gray-200">
        <h2 className="text-2xl font-semibold text-[#6F6F6F]">Home Page Content</h2>
        <p className="mt-2 text-sm text-gray-500">
          Update the hero, featured leagues, and supporting sections shown on the public home page.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-[#6F6F6F]">Hero Banner</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#6F6F6F]" htmlFor="home-hero-image">
                Background Image URL
              </label>
              <Input
                id="home-hero-image"
                value={content.hero.image}
                onChange={(event) =>
                  setContent((prev) => ({
                    ...prev,
                    hero: { ...prev.hero, image: event.target.value },
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#6F6F6F]" htmlFor="home-hero-alt">
                Background Image Alt Text
              </label>
              <Input
                id="home-hero-alt"
                value={content.hero.imageAlt}
                onChange={(event) =>
                  setContent((prev) => ({
                    ...prev,
                    hero: { ...prev.hero, imageAlt: event.target.value },
                  }))
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <label
              className="block text-sm font-medium text-[#6F6F6F]"
              htmlFor="home-hero-container-class"
            >
              Container Height Class
            </label>
            <Input
              id="home-hero-container-class"
              value={content.hero.containerClassName}
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  hero: { ...prev.hero, containerClassName: event.target.value },
                }))
              }
            />
          </div>
          <Input
            id="home-hero-title"
            value={content.hero.title}
            onChange={(event) =>
              setContent((prev) => ({
                ...prev,
                hero: { ...prev.hero, title: event.target.value },
              }))
            }
            placeholder="Hero heading"
          />
          <TextArea
            id="home-hero-subtitle"
            label="Hero Subtitle"
            value={content.hero.subtitle}
            onChange={(value) =>
              setContent((prev) => ({
                ...prev,
                hero: { ...prev.hero, subtitle: value },
              }))
            }
          />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-[#6F6F6F]">Hero Buttons</h4>
              <Button
                type="button"
                variant="outline"
                className="text-sm"
                onClick={() =>
                  setContent((prev) => ({
                    ...prev,
                    hero: {
                      ...prev.hero,
                      buttons: [...prev.hero.buttons, { text: "New Button", link: "/" }],
                    },
                  }))
                }
              >
                Add Button
              </Button>
            </div>
            <div className="space-y-4">
              {content.hero.buttons.map((button, index) => (
                <div key={`${button.text}-${index}`} className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[#6F6F6F]">
                      Button {index + 1}
                    </span>
                    {content.hero.buttons.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        className="text-xs text-red-600"
                        onClick={() =>
                          setContent((prev) => ({
                            ...prev,
                            hero: {
                              ...prev.hero,
                              buttons: prev.hero.buttons.filter((_, btnIndex) => btnIndex !== index),
                            },
                          }))
                        }
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <Input
                    value={button.text}
                    placeholder="Button label"
                    onChange={(event) =>
                      setContent((prev) => {
                        const buttons = [...prev.hero.buttons];
                        buttons[index] = { ...buttons[index], text: event.target.value };
                        return {
                          ...prev,
                          hero: { ...prev.hero, buttons },
                        };
                      })
                    }
                  />
                  <Input
                    value={button.link}
                    placeholder="Button link"
                    onChange={(event) =>
                      setContent((prev) => {
                        const buttons = [...prev.hero.buttons];
                        buttons[index] = { ...buttons[index], link: event.target.value };
                        return {
                          ...prev,
                          hero: { ...prev.hero, buttons },
                        };
                      })
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-[#6F6F6F]">Partner Highlight</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              value={content.partner.logo}
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  partner: { ...prev.partner, logo: event.target.value },
                }))
              }
              placeholder="Logo URL"
            />
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
                <Input
                  value={card.image}
                  placeholder="Image URL"
                  onChange={(event) =>
                    setContent((prev) => {
                      const cards = [...prev.popularLeagues];
                      cards[index] = { ...cards[index], image: event.target.value };
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
          <Input
            value={content.highlightCard.icon}
            placeholder="Icon URL"
            onChange={(event) =>
              setContent((prev) => ({
                ...prev,
                highlightCard: { ...prev.highlightCard, icon: event.target.value },
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
                <Input
                  value={section.image}
                  placeholder="Image URL"
                  onChange={(event) =>
                    setContent((prev) => {
                      const featureSections = [...prev.featureSections];
                      featureSections[index] = { ...featureSections[index], image: event.target.value };
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

        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-gray-200">
          <Button type="submit" disabled={!isDirty || saving} className="bg-[#B20000] hover:bg-[#8A0000]">
            {saving ? "Saving..." : "Save changes"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!isDirty || saving}
            onClick={resetToBaseline}
          >
            Discard changes
          </Button>
          <Button type="button" variant="ghost" onClick={resetToDefaults} disabled={saving}>
            Reset to defaults
          </Button>
        </div>
      </form>
    </div>
  );
}
