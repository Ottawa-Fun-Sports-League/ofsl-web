import { FormEvent, useEffect, useMemo, useState } from "react";
import { Input } from "../../../../../components/ui/input";
import { Button } from "../../../../../components/ui/button";
import { useToast } from "../../../../../components/ui/toast";
import { fetchPageContent, savePageContent } from "../../../../../lib/pageContent";
import { useAuth } from "../../../../../contexts/AuthContext";

interface SportPageContent {
  hero: {
    image: string;
    imageAlt: string;
    containerClassName: string;
    title: string;
    subtitle: string;
    buttons: Array<{ text: string; link: string }>;
  };
  intro: {
    heading: string;
    description: string;
  };
  leagueCardImage: string;
  emptyState: {
    title: string;
    description: string;
  };
}

interface SportPageContentFormProps {
  pageSlug: string;
  label: string;
  description: string;
  defaultContent: SportPageContent;
}

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

export function SportPageContentForm({
  pageSlug,
  label,
  description,
  defaultContent,
}: SportPageContentFormProps) {
  const { showToast } = useToast();
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState<SportPageContent>(defaultContent);
  const [baseline, setBaseline] = useState<SportPageContent>(defaultContent);

  useEffect(() => {
    const controller = new AbortController();

    fetchPageContent<SportPageContent>(pageSlug, defaultContent, controller.signal)
      .then((data) => {
        setContent(data);
        setBaseline(data);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [defaultContent, pageSlug]);

  const isDirty = useMemo(
    () => JSON.stringify(content) !== JSON.stringify(baseline),
    [content, baseline],
  );

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <p className="text-sm text-[#6F6F6F]">Loading {label.toLowerCase()} content…</p>
      </div>
    );
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isDirty || saving) return;

    setSaving(true);
    const result = await savePageContent({
      pageSlug,
      content,
      updatedBy: userProfile?.id ?? null,
    });
    setSaving(false);

    if (!result) {
      showToast(`Failed to update the ${label.toLowerCase()} content.`, "error");
      return;
    }

    setBaseline(content);
    showToast(`${label} content updated.`, "success");
  };

  const handleReset = () => setContent(baseline);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="px-6 py-5 border-b border-gray-200">
        <h2 className="text-2xl font-semibold text-[#6F6F6F]">{label}</h2>
        <p className="mt-2 text-sm text-gray-500">{description}</p>
      </div>

      <form
        id={`site-settings-form-${pageSlug}`}
        onSubmit={handleSubmit}
        onReset={handleReset}
        className="px-6 py-6 space-y-6"
      >
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
            id={`${pageSlug}-hero-subtitle`}
            label="Hero subtitle"
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
                        return { ...prev, hero: { ...prev.hero, buttons } };
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
                        return { ...prev, hero: { ...prev.hero, buttons } };
                      })
                    }
                  />
                </div>
              ))}
            </div>
          </div>
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
            id={`${pageSlug}-intro-text`}
            label="Intro text"
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
          <h3 className="text-lg font-semibold text-[#6F6F6F]">League Cards</h3>
          <Input
            value={content.leagueCardImage}
            placeholder="Default card image URL"
            onChange={(event) =>
              setContent((prev) => ({
                ...prev,
                leagueCardImage: event.target.value,
              }))
            }
          />
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-[#6F6F6F]">Empty State</h3>
          <Input
            value={content.emptyState.title}
            placeholder="Empty state title"
            onChange={(event) =>
              setContent((prev) => ({
                ...prev,
                emptyState: { ...prev.emptyState, title: event.target.value },
              }))
            }
          />
          <TextArea
            id={`${pageSlug}-empty-description`}
            label="Empty state description"
            value={content.emptyState.description}
            onChange={(value) =>
              setContent((prev) => ({
                ...prev,
                emptyState: { ...prev.emptyState, description: value },
              }))
            }
          />
        </section>
      </form>
    </div>
  );
}
