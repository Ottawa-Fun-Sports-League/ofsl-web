import { FormEvent, useEffect, useMemo, useState } from "react";
import { Input } from "../../../../../components/ui/input";
import { Button } from "../../../../../components/ui/button";
import { useToast } from "../../../../../components/ui/toast";
import { fetchPageContent, savePageContent } from "../../../../../lib/pageContent";
import {
  DEFAULT_VOLLEYBALL_CONTENT,
  VolleyballPageContent,
} from "../../../../../screens/VolleyballPage/VolleyballPage";

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

export function VolleyballContentForm() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState<VolleyballPageContent>(DEFAULT_VOLLEYBALL_CONTENT);
  const [baseline, setBaseline] = useState<VolleyballPageContent>(DEFAULT_VOLLEYBALL_CONTENT);

  useEffect(() => {
    const controller = new AbortController();

    fetchPageContent<VolleyballPageContent>(
      "volleyball",
      DEFAULT_VOLLEYBALL_CONTENT,
      controller.signal,
    )
      .then((data) => {
        setContent(data);
        setBaseline(data);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  const isDirty = useMemo(
    () => JSON.stringify(content) !== JSON.stringify(baseline),
    [content, baseline],
  );

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <p className="text-sm text-[#6F6F6F]">Loading volleyball content…</p>
      </div>
    );
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isDirty) return;

    setSaving(true);
    const result = await savePageContent({
      pageSlug: "volleyball",
      content,
    });
    setSaving(false);

    if (!result) {
      showToast("Failed to update the volleyball page content.", "error");
      return;
    }

    setBaseline(content);
    showToast("Volleyball content updated.", "success");
  };

  const resetToBaseline = () => setContent(baseline);
  const resetToDefaults = () => setContent(DEFAULT_VOLLEYBALL_CONTENT);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="px-6 py-5 border-b border-gray-200">
        <h2 className="text-2xl font-semibold text-[#6F6F6F]">Volleyball Landing Page</h2>
        <p className="mt-2 text-sm text-gray-500">
          Manage the hero, featured leagues, skill levels, and supporting sections for the volleyball landing page.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-[#6F6F6F]">Hero Banner</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              value={content.hero.image}
              placeholder="Background image URL"
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  hero: { ...prev.hero, image: event.target.value },
                }))
              }
            />
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
          </div>
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
            id="volleyball-hero-subtitle"
            label="Hero subtitle"
            value={content.hero.subtitle}
            onChange={(value) =>
              setContent((prev) => ({
                ...prev,
                hero: { ...prev.hero, subtitle: value },
              }))
            }
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              value={content.hero.registerButton.text}
              placeholder="Primary button text"
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  hero: {
                    ...prev.hero,
                    registerButton: { ...prev.hero.registerButton, text: event.target.value },
                  },
                }))
              }
            />
            <Input
              value={content.hero.registerButton.link}
              placeholder="Primary button link"
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  hero: {
                    ...prev.hero,
                    registerButton: { ...prev.hero.registerButton, link: event.target.value },
                  },
                }))
              }
            />
          </div>
          <Input
            value={content.hero.scheduleButtonText}
            placeholder="Schedule button text"
            onChange={(event) =>
              setContent((prev) => ({
                ...prev,
                hero: { ...prev.hero, scheduleButtonText: event.target.value },
              }))
            }
          />
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-[#6F6F6F]">Intro Section</h3>
          <Input
            value={content.intro.heading}
            placeholder="Section heading"
            onChange={(event) =>
              setContent((prev) => ({
                ...prev,
                intro: { ...prev.intro, heading: event.target.value },
              }))
            }
          />
          <TextArea
            id="volleyball-intro-description"
            label="Intro description"
            rows={4}
            value={content.intro.description}
            onChange={(value) =>
              setContent((prev) => ({
                ...prev,
                intro: { ...prev.intro, description: value },
              }))
            }
          />
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[#6F6F6F]">Featured Leagues</h3>
            <Button
              type="button"
              variant="outline"
              className="text-sm"
              onClick={() =>
                setContent((prev) => ({
                  ...prev,
                  leagueCards: [
                    ...prev.leagueCards,
                    { title: "New League", image: "/placeholder.jpg", link: "/" },
                  ],
                }))
              }
            >
              Add Card
            </Button>
          </div>

          <div className="space-y-4">
            {content.leagueCards.map((card, index) => (
              <div key={`${card.title}-${index}`} className="border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#6F6F6F]">Card {index + 1}</span>
                  {content.leagueCards.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-xs text-red-600"
                      onClick={() =>
                        setContent((prev) => ({
                          ...prev,
                          leagueCards: prev.leagueCards.filter((_, cardIndex) => cardIndex !== index),
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
                      const cards = [...prev.leagueCards];
                      cards[index] = { ...cards[index], title: event.target.value };
                      return { ...prev, leagueCards: cards };
                    })
                  }
                />
                <Input
                  value={card.image}
                  placeholder="Image URL"
                  onChange={(event) =>
                    setContent((prev) => {
                      const cards = [...prev.leagueCards];
                      cards[index] = { ...cards[index], image: event.target.value };
                      return { ...prev, leagueCards: cards };
                    })
                  }
                />
                <Input
                  value={card.link}
                  placeholder="Link"
                  onChange={(event) =>
                    setContent((prev) => {
                      const cards = [...prev.leagueCards];
                      cards[index] = { ...cards[index], link: event.target.value };
                      return { ...prev, leagueCards: cards };
                    })
                  }
                />
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-[#6F6F6F]">Standards Card</h3>
          <Input
            value={content.standardsCard.title}
            placeholder="Title"
            onChange={(event) =>
              setContent((prev) => ({
                ...prev,
                standardsCard: { ...prev.standardsCard, title: event.target.value },
              }))
            }
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              value={content.standardsCard.buttonText}
              placeholder="Button text"
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  standardsCard: { ...prev.standardsCard, buttonText: event.target.value },
                }))
              }
            />
            <Input
              value={content.standardsCard.buttonLink}
              placeholder="Button link"
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  standardsCard: { ...prev.standardsCard, buttonLink: event.target.value },
                }))
              }
            />
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-[#6F6F6F]">About Section</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              value={content.aboutSection.image}
              placeholder="Image URL"
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  aboutSection: { ...prev.aboutSection, image: event.target.value },
                }))
              }
            />
            <Input
              value={content.aboutSection.imageAlt}
              placeholder="Image alt text"
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  aboutSection: { ...prev.aboutSection, imageAlt: event.target.value },
                }))
              }
            />
          </div>
          <Input
            value={content.aboutSection.title}
            placeholder="Section title"
            onChange={(event) =>
              setContent((prev) => ({
                ...prev,
                aboutSection: { ...prev.aboutSection, title: event.target.value },
              }))
            }
          />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[#6F6F6F]">Bullet Points</span>
              <Button
                type="button"
                variant="outline"
                className="text-sm"
                onClick={() =>
                  setContent((prev) => ({
                    ...prev,
                    aboutSection: {
                      ...prev.aboutSection,
                      bullets: [...prev.aboutSection.bullets, "New bullet"],
                    },
                  }))
                }
              >
                Add Bullet
              </Button>
            </div>
            <div className="space-y-3">
              {content.aboutSection.bullets.map((bullet, index) => (
                <div key={`${bullet}-${index}`} className="flex items-start gap-2">
                  <Input
                    value={bullet}
                    onChange={(event) =>
                      setContent((prev) => {
                        const bullets = [...prev.aboutSection.bullets];
                        bullets[index] = event.target.value;
                        return {
                          ...prev,
                          aboutSection: { ...prev.aboutSection, bullets },
                        };
                      })
                    }
                  />
                  {content.aboutSection.bullets.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-xs text-red-600"
                      onClick={() =>
                        setContent((prev) => ({
                          ...prev,
                          aboutSection: {
                            ...prev.aboutSection,
                            bullets: prev.aboutSection.bullets.filter(
                              (_, bulletIndex) => bulletIndex !== index,
                            ),
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
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              value={content.aboutSection.buttonText}
              placeholder="Button text"
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  aboutSection: { ...prev.aboutSection, buttonText: event.target.value },
                }))
              }
            />
            <Input
              value={content.aboutSection.buttonLink}
              placeholder="Button link"
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  aboutSection: { ...prev.aboutSection, buttonLink: event.target.value },
                }))
              }
            />
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-[#6F6F6F]">Skill Levels</h3>
          <div className="space-y-4">
            {content.skillLevels.map((level, index) => (
              <div key={`${level.title}-${index}`} className="border border-gray-200 rounded-lg p-4 space-y-3">
                <Input
                  value={level.title}
                  placeholder="Skill level title"
                  onChange={(event) =>
                    setContent((prev) => {
                      const skillLevels = [...prev.skillLevels];
                      skillLevels[index] = { ...skillLevels[index], title: event.target.value };
                      return { ...prev, skillLevels };
                    })
                  }
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    max="4"
                    value={level.rating}
                    onChange={(event) =>
                      setContent((prev) => {
                        const skillLevels = [...prev.skillLevels];
                        skillLevels[index] = {
                          ...skillLevels[index],
                          rating: parseFloat(event.target.value) || 0,
                        };
                        return { ...prev, skillLevels };
                      })
                    }
                    placeholder="Star rating (0-4)"
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#6F6F6F]">Bullet Points</span>
                    <Button
                      type="button"
                      variant="outline"
                      className="text-sm"
                      onClick={() =>
                        setContent((prev) => {
                          const skillLevels = [...prev.skillLevels];
                          const bullets = [...skillLevels[index].bullets, "New bullet"];
                          skillLevels[index] = { ...skillLevels[index], bullets };
                          return { ...prev, skillLevels };
                        })
                      }
                    >
                      Add Bullet
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {level.bullets.map((bullet, bulletIndex) => (
                      <div key={`${bullet}-${bulletIndex}`} className="flex items-start gap-2">
                        <Input
                          value={bullet}
                          onChange={(event) =>
                            setContent((prev) => {
                              const skillLevels = [...prev.skillLevels];
                              const bullets = [...skillLevels[index].bullets];
                              bullets[bulletIndex] = event.target.value;
                              skillLevels[index] = { ...skillLevels[index], bullets };
                              return { ...prev, skillLevels };
                            })
                          }
                        />
                        {level.bullets.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            className="text-xs text-red-600"
                            onClick={() =>
                              setContent((prev) => {
                                const skillLevels = [...prev.skillLevels];
                                const bullets = skillLevels[index].bullets.filter(
                                  (_, removeIndex) => removeIndex !== bulletIndex,
                                );
                                skillLevels[index] = { ...skillLevels[index], bullets };
                                return { ...prev, skillLevels };
                              })
                            }
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-[#6F6F6F]">Partner Highlight</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              value={content.partner.logo}
              placeholder="Logo URL"
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  partner: { ...prev.partner, logo: event.target.value },
                }))
              }
            />
            <Input
              value={content.partner.logoAlt}
              placeholder="Logo alt text"
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  partner: { ...prev.partner, logoAlt: event.target.value },
                }))
              }
            />
          </div>
          <TextArea
            id="volleyball-partner-text"
            label="Partner description"
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
              placeholder="Link text"
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  partner: { ...prev.partner, linkText: event.target.value },
                }))
              }
            />
            <Input
              value={content.partner.linkUrl}
              placeholder="Link URL"
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  partner: { ...prev.partner, linkUrl: event.target.value },
                }))
              }
            />
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-[#6F6F6F]">Spares Section</h3>
          <Input
            value={content.spares.heading}
            placeholder="Section heading"
            onChange={(event) =>
              setContent((prev) => ({
                ...prev,
                spares: { ...prev.spares, heading: event.target.value },
              }))
            }
          />
          <TextArea
            id="volleyball-spares-description"
            label="Section description"
            value={content.spares.description}
            onChange={(value) =>
              setContent((prev) => ({
                ...prev,
                spares: { ...prev.spares, description: value },
              }))
            }
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              value={content.spares.ctaTitle}
              placeholder="CTA title"
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  spares: { ...prev.spares, ctaTitle: event.target.value },
                }))
              }
            />
            <TextArea
              id="volleyball-spares-cta-description"
              label="CTA description"
              value={content.spares.ctaDescription}
              onChange={(value) =>
                setContent((prev) => ({
                  ...prev,
                  spares: { ...prev.spares, ctaDescription: value },
                }))
              }
            />
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-[#6F6F6F]">Final Call to Action</h3>
          <Input
            value={content.cta.title}
            placeholder="CTA heading"
            onChange={(event) =>
              setContent((prev) => ({
                ...prev,
                cta: { ...prev.cta, title: event.target.value },
              }))
            }
          />
          <TextArea
            id="volleyball-cta-subtitle"
            label="CTA subtitle"
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
          <Button type="button" variant="ghost" disabled={saving} onClick={resetToDefaults}>
            Reset to defaults
          </Button>
        </div>
      </form>
    </div>
  );
}
