import { FormEvent, useEffect, useMemo, useState } from "react";

import { Button } from "../../../../../components/ui/button";
import { Input } from "../../../../../components/ui/input";
import { useToast } from "../../../../../components/ui/toast";
import { useAuth } from "../../../../../contexts/AuthContext";
import { fetchPageContent, savePageContent } from "../../../../../lib/pageContent";
import { SiteSettingsImageUploadField } from "./SiteSettingsImageUploadField";
import {
  AboutUsPageContent,
  DEFAULT_ABOUT_US_CONTENT,
  StatBlock,
} from "../../../../AboutUsPage/AboutUsPage";

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

export function AboutUsContentForm() {
  const { showToast } = useToast();
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState<AboutUsPageContent>(DEFAULT_ABOUT_US_CONTENT);
  const [baseline, setBaseline] = useState<AboutUsPageContent>(DEFAULT_ABOUT_US_CONTENT);

  useEffect(() => {
    let isMounted = true;

    fetchPageContent<AboutUsPageContent>("about-us", DEFAULT_ABOUT_US_CONTENT)
      .then((data) => {
        if (!isMounted) return;
        setContent(data);
        setBaseline(data);
      })
      .catch((error) => {
        console.error("Failed to load about us content", error);
        if (!isMounted) return;
        setContent(DEFAULT_ABOUT_US_CONTENT);
        setBaseline(DEFAULT_ABOUT_US_CONTENT);
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
        <p className="text-sm text-[#6F6F6F]">Loading About Us content…</p>
      </div>
    );
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isDirty || saving) return;

    setSaving(true);
    const result = await savePageContent({
      pageSlug: "about-us",
      content,
      updatedBy: userProfile?.id ?? null,
    });
    setSaving(false);

    if (!result) {
      showToast("Failed to update About Us content.", "error");
      return;
    }

    setBaseline(content);
    showToast("About Us content updated.", "success");
  };

  const handleReset = () => setContent(baseline);

  const handleStatChange = (index: number, updated: Partial<StatBlock>) => {
    setContent((prev) => {
      const stats = [...prev.stats];
      stats[index] = { ...stats[index], ...updated };
      return { ...prev, stats };
    });
  };

  const handleAddStat = () => {
    setContent((prev) => ({
      ...prev,
      stats: [...prev.stats, { label: "New metric", value: 0, prefix: "", suffix: "" }],
    }));
  };

  const handleRemoveStat = (index: number) => {
    setContent((prev) => {
      if (prev.stats.length === 1) {
        return prev;
      }
      return {
        ...prev,
        stats: prev.stats.filter((_, statIndex) => statIndex !== index),
      };
    });
  };

  const handleParagraphChange = (index: number, value: string) => {
    setContent((prev) => {
      const paragraphs = [...prev.story.paragraphs];
      paragraphs[index] = value;
      return {
        ...prev,
        story: {
          ...prev.story,
          paragraphs,
        },
      };
    });
  };

  const handleAddParagraph = () => {
    setContent((prev) => ({
      ...prev,
      story: {
        ...prev.story,
        paragraphs: [...prev.story.paragraphs, ""],
      },
    }));
  };

  const handleRemoveParagraph = (index: number) => {
    setContent((prev) => {
      if (prev.story.paragraphs.length === 1) {
        return prev;
      }

      return {
        ...prev,
        story: {
          ...prev.story,
          paragraphs: prev.story.paragraphs.filter((_, paragraphIndex) => paragraphIndex !== index),
        },
      };
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="px-6 py-5 border-b border-gray-200">
        <h2 className="text-2xl font-semibold text-[#6F6F6F]">About Us Page</h2>
        <p className="mt-2 text-sm text-gray-500">
          Manage the hero, mission, story, and supporting sections that power the About Us page.
        </p>
      </div>

      <form
        id="site-settings-form-about"
        onSubmit={handleSubmit}
        onReset={handleReset}
        className="px-6 py-6 space-y-8"
      >
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-[#6F6F6F]">Hero Section</h3>
          <SiteSettingsImageUploadField
            value={content.hero.image}
            onChange={(value) =>
              setContent((prev) => ({
                ...prev,
                hero: { ...prev.hero, image: value },
              }))
            }
            uploadPath="about-us/hero"
            helperText="Click the preview to upload a new hero image."
            previewAspectClass="aspect-[5/3]"
          />
          <Input
            value={content.hero.imageAlt}
            onChange={(event) =>
              setContent((prev) => ({
                ...prev,
                hero: { ...prev.hero, imageAlt: event.target.value },
              }))
            }
            placeholder="Hero image alt text"
          />
          <Input
            value={content.hero.title}
            onChange={(event) =>
              setContent((prev) => ({
                ...prev,
                hero: { ...prev.hero, title: event.target.value },
              }))
            }
            placeholder="Hero title"
          />
          <TextArea
            id="about-hero-subtitle"
            label="Subtitle"
            value={content.hero.subtitle}
            onChange={(value) =>
              setContent((prev) => ({
                ...prev,
                hero: { ...prev.hero, subtitle: value },
              }))
            }
          />
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[#6F6F6F]">Stat Blocks</h3>
            <Button type="button" variant="outline" size="sm" onClick={handleAddStat}>
              Add stat
            </Button>
          </div>
          <div className="space-y-4">
            {content.stats.map((stat, index) => (
              <div
                key={`stat-${index}`}
                className="grid grid-cols-1 md:grid-cols-5 gap-3 border border-gray-200 rounded-lg p-4"
              >
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-medium text-[#6F6F6F]">Label</label>
                  <Input
                    value={stat.label}
                    onChange={(event) => handleStatChange(index, { label: event.target.value })}
                    placeholder="Weekly players"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#6F6F6F]">Value</label>
                  <Input
                    type="number"
                    value={stat.value}
                    onChange={(event) => handleStatChange(index, { value: Number(event.target.value) })}
                    placeholder="1800"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#6F6F6F]">Prefix</label>
                  <Input
                    value={stat.prefix ?? ""}
                    onChange={(event) => handleStatChange(index, { prefix: event.target.value })}
                    placeholder="$"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-[#6F6F6F]">Suffix</label>
                    {content.stats.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="text-xs text-red-500"
                        onClick={() => handleRemoveStat(index)}
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                  <Input
                    value={stat.suffix ?? ""}
                    onChange={(event) => handleStatChange(index, { suffix: event.target.value })}
                    placeholder="+"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-[#6F6F6F]">Mission Section</h3>
          <SiteSettingsImageUploadField
            value={content.mission.image}
            onChange={(value) =>
              setContent((prev) => ({
                ...prev,
                mission: { ...prev.mission, image: value },
              }))
            }
            uploadPath="about-us/mission"
            helperText="Image displayed next to the mission copy."
          />
          <Input
            value={content.mission.imageAlt}
            onChange={(event) =>
              setContent((prev) => ({
                ...prev,
                mission: { ...prev.mission, imageAlt: event.target.value },
              }))
            }
            placeholder="Mission image alt text"
          />
          <Input
            value={content.mission.title}
            onChange={(event) =>
              setContent((prev) => ({
                ...prev,
                mission: { ...prev.mission, title: event.target.value },
              }))
            }
            placeholder="Mission title"
          />
          <TextArea
            id="about-mission-description"
            label="Description"
            rows={4}
            value={content.mission.description}
            onChange={(value) =>
              setContent((prev) => ({
                ...prev,
                mission: { ...prev.mission, description: value },
              }))
            }
          />
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-[#6F6F6F]">Story Section</h3>
          <SiteSettingsImageUploadField
            value={content.story.image}
            onChange={(value) =>
              setContent((prev) => ({
                ...prev,
                story: { ...prev.story, image: value },
              }))
            }
            uploadPath="about-us/story"
            helperText="Image displayed beside the story copy."
          />
          <Input
            value={content.story.imageAlt}
            onChange={(event) =>
              setContent((prev) => ({
                ...prev,
                story: { ...prev.story, imageAlt: event.target.value },
              }))
            }
            placeholder="Story image alt text"
          />
          <Input
            value={content.story.title}
            onChange={(event) =>
              setContent((prev) => ({
                ...prev,
                story: { ...prev.story, title: event.target.value },
              }))
            }
            placeholder="Story title"
          />
          <div className="space-y-4">
            {content.story.paragraphs.map((paragraph, index) => (
              <div key={`story-paragraph-${index}`} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-[#6F6F6F]">
                    Paragraph {index + 1}
                  </label>
                  {content.story.paragraphs.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-xs text-red-500"
                      onClick={() => handleRemoveParagraph(index)}
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
                <textarea
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-[#6F6F6F] focus:border-[#B20000] focus:outline-none focus:ring-1 focus:ring-[#B20000]"
                  rows={3}
                  value={paragraph}
                  onChange={(event) => handleParagraphChange(index, event.target.value)}
                />
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={handleAddParagraph}>
              Add paragraph
            </Button>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-[#6F6F6F]">Partners Section</h3>
          <Input
            value={content.partners.title}
            onChange={(event) =>
              setContent((prev) => ({
                ...prev,
                partners: { ...prev.partners, title: event.target.value },
              }))
            }
            placeholder="Partners section title"
          />
          <TextArea
            id="about-partners-description"
            label="Description"
            rows={3}
            value={content.partners.description}
            onChange={(value) =>
              setContent((prev) => ({
                ...prev,
                partners: { ...prev.partners, description: value },
              }))
            }
          />
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-[#6F6F6F]">Partner Highlight</h3>
          <SiteSettingsImageUploadField
            value={content.diabetes.image}
            onChange={(value) =>
              setContent((prev) => ({
                ...prev,
                diabetes: { ...prev.diabetes, image: value },
              }))
            }
            uploadPath="about-us/diabetes/image"
            helperText="Main image shown in the partner highlight."
          />
          <Input
            value={content.diabetes.imageAlt}
            onChange={(event) =>
              setContent((prev) => ({
                ...prev,
                diabetes: { ...prev.diabetes, imageAlt: event.target.value },
              }))
            }
            placeholder="Image alt text"
          />
          <SiteSettingsImageUploadField
            value={content.diabetes.logoImage}
            onChange={(value) =>
              setContent((prev) => ({
                ...prev,
                diabetes: { ...prev.diabetes, logoImage: value },
              }))
            }
            uploadPath="about-us/diabetes/logo"
            helperText="Logo displayed above the description."
            previewAspectClass="aspect-[3/1]"
          />
          <Input
            value={content.diabetes.logoAlt}
            onChange={(event) =>
              setContent((prev) => ({
                ...prev,
                diabetes: { ...prev.diabetes, logoAlt: event.target.value },
              }))
            }
            placeholder="Logo alt text"
          />
          <TextArea
            id="about-diabetes-description"
            label="Description"
            rows={4}
            value={content.diabetes.description}
            onChange={(value) =>
              setContent((prev) => ({
                ...prev,
                diabetes: { ...prev.diabetes, description: value },
              }))
            }
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              value={content.diabetes.linkText}
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  diabetes: { ...prev.diabetes, linkText: event.target.value },
                }))
              }
              placeholder="Link text"
            />
            <Input
              value={content.diabetes.linkHref}
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  diabetes: { ...prev.diabetes, linkHref: event.target.value },
                }))
              }
              placeholder="https://example.com"
            />
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-[#6F6F6F]">Contact Section</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              value={content.contact.cardTitle}
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  contact: { ...prev.contact, cardTitle: event.target.value },
                }))
              }
              placeholder="Contact card title"
            />
            <Input
              value={content.contact.formTitle}
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  contact: { ...prev.contact, formTitle: event.target.value },
                }))
              }
              placeholder="Form title"
            />
            <Input
              value={content.contact.generalLabel}
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  contact: { ...prev.contact, generalLabel: event.target.value },
                }))
              }
              placeholder="General inquiries"
            />
            <Input
              value={content.contact.generalEmail}
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  contact: { ...prev.contact, generalEmail: event.target.value },
                }))
              }
              placeholder="info@ofsl.ca"
            />
          </div>
          <Input
            value={content.contact.submitButtonText}
            onChange={(event) =>
              setContent((prev) => ({
                ...prev,
                contact: { ...prev.contact, submitButtonText: event.target.value },
              }))
            }
            placeholder="Submit button text"
          />
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-[#6F6F6F]">Newsletter Section</h3>
          <Input
            value={content.newsletter.title}
            onChange={(event) =>
              setContent((prev) => ({
                ...prev,
                newsletter: { ...prev.newsletter, title: event.target.value },
              }))
            }
            placeholder="Newsletter title"
          />
          <TextArea
            id="about-newsletter-description"
            label="Description"
            rows={3}
            value={content.newsletter.description}
            onChange={(value) =>
              setContent((prev) => ({
                ...prev,
                newsletter: { ...prev.newsletter, description: value },
              }))
            }
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              value={content.newsletter.interestsLabel}
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  newsletter: { ...prev.newsletter, interestsLabel: event.target.value },
                }))
              }
              placeholder="Interest label"
            />
            <Input
              value={content.newsletter.subscribeButtonText}
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  newsletter: { ...prev.newsletter, subscribeButtonText: event.target.value },
                }))
              }
              placeholder="Subscribe button text"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              value={content.newsletter.termsText}
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  newsletter: { ...prev.newsletter, termsText: event.target.value },
                }))
              }
              placeholder="Terms prefix text"
            />
            <Input
              value={content.newsletter.termsLinkText}
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  newsletter: { ...prev.newsletter, termsLinkText: event.target.value },
                }))
              }
              placeholder="Link text"
            />
            <Input
              value={content.newsletter.termsLinkUrl}
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  newsletter: { ...prev.newsletter, termsLinkUrl: event.target.value },
                }))
              }
              placeholder="https://example.com/terms"
            />
          </div>
        </section>

        <div className="pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            {isDirty ? "You have unsaved changes." : "All changes saved."}
            {saving ? " Saving…" : ""}
          </p>
        </div>
      </form>
    </div>
  );
}
