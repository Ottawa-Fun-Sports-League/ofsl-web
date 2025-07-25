import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { updateStripeProductLeagueId } from "../../../lib/stripe";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../components/ui/toast";
import { supabase } from "../../../lib/supabase";
import { fetchSports, fetchSkills } from "../../../lib/leagues";
import { ArrowLeft, Save, X } from "lucide-react";
import { RichTextEditor } from "../../../components/ui/rich-text-editor";
import { StripeProductSelector } from "./LeaguesTab/components/StripeProductSelector";

interface Sport {
  id: number;
  name: string;
}

interface Skill {
  id: number;
  name: string;
}

interface Gym {
  id: number;
  created_at: string;
  gym: string;
  address: string;
  instructions: string | null;
  active: boolean;
  available_days: number[];
  available_sports: number[];
  locations: string[];
}

export function LeagueNewPage() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { showToast } = useToast();

  const [sports, setSports] = useState<Sport[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [newLeague, setNewLeague] = useState<{
    name: string;
    description: string;
    league_type: "regular_season" | "tournament" | "skills_drills" | null;
    gender: "Mixed" | "Female" | "Male" | null;
    location: string;
    sport_id: number | null;
    skill_id: number | null;
    skill_ids: number[];
    day_of_week: number | null;
    start_date: string;
    end_date: string;
    year: string;
    cost: number | null;
    max_teams: number;
    gym_ids: number[];
    hide_day?: boolean;
  }>({
    name: "",
    description: "",
    league_type: null,
    gender: null,
    location: "",
    sport_id: null,
    skill_id: null,
    skill_ids: [],
    day_of_week: null,
    start_date: "",
    end_date: "",
    year: "2025",
    cost: null,
    max_teams: 20,
    gym_ids: [],
  });

  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!userProfile?.is_admin) {
      navigate("/my-account/profile");
      return;
    }

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [sportsData, skillsData] = await Promise.all([
        fetchSports(),
        fetchSkills(),
      ]);

      setSports(sportsData);
      setSkills(skillsData);

      // Load gyms - only show active gyms
      const { data: gymsData, error: gymsError } = await supabase
        .from("gyms")
        .select("*")
        .eq("active", true)
        .order("gym");

      if (gymsError) throw gymsError;
      if (gymsData) setGyms(gymsData);
    } catch (error) {
      console.error("Error loading data:", error);
      showToast("Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLeague = async () => {
    try {
      setSaving(true);

      // Convert day_of_week from string to number
      const dayOfWeek =
        newLeague.day_of_week !== null
          ? parseInt(newLeague.day_of_week.toString())
          : null;

      // Create the league
      const { data: leagueData, error } = await supabase
        .from("leagues")
        .insert({
          name: newLeague.name,
          description: newLeague.description,
          league_type: newLeague.league_type,
          gender: newLeague.gender,
          sport_id: newLeague.sport_id,
          skill_id: newLeague.skill_id,
          skill_ids: newLeague.skill_ids,
          day_of_week: dayOfWeek,
          year: newLeague.year,
          start_date: newLeague.start_date,
          end_date: newLeague.end_date,
          hide_day: newLeague.hide_day,
          cost: newLeague.cost,
          max_teams: newLeague.max_teams,
          gym_ids: newLeague.gym_ids,
          active: true,
        })
        .select()
        .single();

      if (error) throw error;

      // Link the Stripe product if one was selected
      if (selectedProductId && leagueData) {
        try {
          await updateStripeProductLeagueId(selectedProductId, leagueData.id);
        } catch (productError) {
          console.error("Error updating product association:", productError);
          // Don't fail the whole operation if just the product linking fails
          showToast("League created but product linking failed", "warning");
        }
      }

      showToast("League created successfully!", "success");
      navigate(`/leagues/${leagueData.id}`);
    } catch (error) {
      console.error("Error creating league:", error);
      showToast("Failed to create league", "error");
    } finally {
      setSaving(false);
    }
  };

  if (!userProfile?.is_admin) {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-white w-full min-h-screen">
        <div className="max-w-[1280px] mx-auto px-4 py-8">
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B20000]"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white w-full min-h-screen">
      <div className="max-w-[1280px] mx-auto px-4 py-8">
        <div className="mb-8">
          <Link
            to="/my-account/leagues"
            className="flex items-center text-[#B20000] hover:underline mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-1" />
            Back to Manage Leagues
          </Link>

          <h2 className="text-2xl font-bold text-[#6F6F6F]">
            Create New League
          </h2>
        </div>

        {/* Create League Form - Using same Card structure as Edit League */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#6F6F6F] mb-2">
                    Sport
                  </label>
                  <select
                    value={newLeague.sport_id || ""}
                    onChange={(e) =>
                      setNewLeague({
                        ...newLeague,
                        sport_id: e.target.value
                          ? parseInt(e.target.value)
                          : null,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#B20000] focus:ring-[#B20000]"
                    required
                  >
                    <option value="">Select sport...</option>
                    {sports.map((sport) => (
                      <option key={sport.id} value={sport.id}>
                        {sport.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#6F6F6F] mb-2">
                    Day of Week
                  </label>
                  <select
                    value={
                      newLeague.day_of_week !== null
                        ? newLeague.day_of_week.toString()
                        : ""
                    }
                    onChange={(e) =>
                      setNewLeague({
                        ...newLeague,
                        day_of_week:
                          e.target.value !== ""
                            ? parseInt(e.target.value)
                            : null,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#B20000] focus:ring-[#B20000]"
                    required
                  >
                    <option value="">Select day...</option>
                    <option value="0">Sunday</option>
                    <option value="1">Monday</option>
                    <option value="2">Tuesday</option>
                    <option value="3">Wednesday</option>
                    <option value="4">Thursday</option>
                    <option value="5">Friday</option>
                    <option value="6">Saturday</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#6F6F6F] mb-2">
                  League Name
                </label>
                <Input
                  value={newLeague.name}
                  onChange={(e) =>
                    setNewLeague({ ...newLeague, name: e.target.value })
                  }
                  placeholder="Enter league name"
                  className="w-full"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#6F6F6F] mb-2">
                    League Type
                  </label>
                  <div className="flex flex-col gap-2 p-3 border border-gray-300 rounded-lg">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="league_type"
                        value="regular_season"
                        checked={newLeague.league_type === "regular_season"}
                        onChange={(e) =>
                          setNewLeague({
                            ...newLeague,
                            league_type: e.target.value as
                              | "regular_season"
                              | "tournament"
                              | "skills_drills",
                          })
                        }
                        className="mr-2"
                      />
                      <span className="text-sm">Regular Season</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="league_type"
                        value="tournament"
                        checked={newLeague.league_type === "tournament"}
                        onChange={(e) =>
                          setNewLeague({
                            ...newLeague,
                            league_type: e.target.value as
                              | "regular_season"
                              | "tournament"
                              | "skills_drills",
                          })
                        }
                        className="mr-2"
                      />
                      <span className="text-sm">Tournament</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="league_type"
                        value="skills_drills"
                        checked={newLeague.league_type === "skills_drills"}
                        onChange={(e) =>
                          setNewLeague({
                            ...newLeague,
                            league_type: e.target.value as
                              | "regular_season"
                              | "tournament"
                              | "skills_drills",
                          })
                        }
                        className="mr-2"
                      />
                      <span className="text-sm">Skills and Drills</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#6F6F6F] mb-2">
                    Gender
                  </label>
                  <div className="flex flex-col gap-2 p-3 border border-gray-300 rounded-lg">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="gender"
                        value="Mixed"
                        checked={newLeague.gender === "Mixed"}
                        onChange={(e) =>
                          setNewLeague({
                            ...newLeague,
                            gender: e.target.value as
                              | "Mixed"
                              | "Female"
                              | "Male",
                          })
                        }
                        className="mr-2"
                      />
                      <span className="text-sm">Mixed</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="gender"
                        value="Female"
                        checked={newLeague.gender === "Female"}
                        onChange={(e) =>
                          setNewLeague({
                            ...newLeague,
                            gender: e.target.value as
                              | "Mixed"
                              | "Female"
                              | "Male",
                          })
                        }
                        className="mr-2"
                      />
                      <span className="text-sm">Female</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="gender"
                        value="Male"
                        checked={newLeague.gender === "Male"}
                        onChange={(e) =>
                          setNewLeague({
                            ...newLeague,
                            gender: e.target.value as
                              | "Mixed"
                              | "Female"
                              | "Male",
                          })
                        }
                        className="mr-2"
                      />
                      <span className="text-sm">Male</span>
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#6F6F6F] mb-2">
                  Skill Level
                </label>
                <div className="flex flex-wrap gap-4 border border-gray-300 rounded-lg p-3">
                  {skills.map((skill) => (
                    <label key={skill.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newLeague.skill_ids.includes(skill.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewLeague({
                              ...newLeague,
                              skill_ids: [...newLeague.skill_ids, skill.id],
                              // Also update the primary skill_id if it's not set yet
                              skill_id: newLeague.skill_id || skill.id,
                            });
                          } else {
                            const updatedSkillIds = newLeague.skill_ids.filter(
                              (id) => id !== skill.id,
                            );
                            setNewLeague({
                              ...newLeague,
                              skill_ids: updatedSkillIds,
                              // If we're removing the primary skill, set it to the first remaining skill or null
                              skill_id:
                                skill.id === newLeague.skill_id
                                  ? updatedSkillIds.length > 0
                                    ? updatedSkillIds[0]
                                    : null
                                  : newLeague.skill_id,
                            });
                          }
                        }}
                        className="mr-2"
                        disabled={skill.name === "Beginner"}
                      />
                      <span
                        className={`text-sm ${skill.name === "Beginner" ? "text-gray-400" : ""}`}
                      >
                        {skill.name}
                        {skill.name === "Beginner" && " (not available)"}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Select multiple skill levels that apply to this league.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#6F6F6F] mb-2">
                    Start Date
                  </label>
                  <Input
                    type="date"
                    value={newLeague.start_date}
                    onChange={(e) =>
                      setNewLeague({ ...newLeague, start_date: e.target.value })
                    }
                    className="w-full"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#6F6F6F] mb-2">
                    End Date
                  </label>
                  <Input
                    type="date"
                    value={newLeague.end_date}
                    onChange={(e) =>
                      setNewLeague({ ...newLeague, end_date: e.target.value })
                    }
                    className="w-full"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="hide_day"
                    checked={newLeague.hide_day || false}
                    onChange={(e) =>
                      setNewLeague({ ...newLeague, hide_day: e.target.checked })
                    }
                    className="mr-2"
                  />
                  <label htmlFor="hide_day" className="text-sm text-[#6F6F6F]">
                    Hide day from end date display
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  When checked, only month and year will be shown for the end
                  date
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#6F6F6F] mb-2">
                    Cost ($)
                  </label>
                  <Input
                    type="number"
                    value={newLeague.cost || ""}
                    onChange={(e) =>
                      setNewLeague({
                        ...newLeague,
                        cost: e.target.value
                          ? parseFloat(e.target.value)
                          : null,
                      })
                    }
                    placeholder="0.00"
                    className="w-full"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#6F6F6F] mb-2">
                    Max Teams
                  </label>
                  <Input
                    type="number"
                    value={newLeague.max_teams}
                    onChange={(e) =>
                      setNewLeague({
                        ...newLeague,
                        max_teams: parseInt(e.target.value) || 20,
                      })
                    }
                    className="w-full"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#6F6F6F] mb-2">
                  Description
                </label>
                <RichTextEditor
                  value={newLeague.description}
                  onChange={(value) =>
                    setNewLeague({ ...newLeague, description: value })
                  }
                  placeholder="Enter league description"
                  rows={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#6F6F6F] mb-2">
                  Gyms
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-3">
                  {gyms.map((gym) => (
                    <label key={gym.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newLeague.gym_ids.includes(gym.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewLeague({
                              ...newLeague,
                              gym_ids: [...newLeague.gym_ids, gym.id],
                            });
                          } else {
                            setNewLeague({
                              ...newLeague,
                              gym_ids: newLeague.gym_ids.filter(
                                (id) => id !== gym.id,
                              ),
                            });
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm">{gym.gym}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <StripeProductSelector
                  leagueId={undefined}
                  selectedProductId={selectedProductId}
                  onChange={setSelectedProductId}
                />
              </div>

              <div className="mt-8 flex gap-4">
                <Button
                  onClick={handleCreateLeague}
                  disabled={
                    saving ||
                    !newLeague.name ||
                    !newLeague.league_type ||
                    !newLeague.gender ||
                    !newLeague.sport_id ||
                    newLeague.skill_ids.length === 0 ||
                    newLeague.day_of_week === null ||
                    !newLeague.start_date ||
                    !newLeague.end_date ||
                    newLeague.cost === null ||
                    !newLeague.max_teams
                  }
                  className="bg-[#B20000] hover:bg-[#8A0000] text-white rounded-[10px] px-6 py-2 flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Creating..." : "Create League"}
                </Button>
                <Link to="/my-account/leagues">
                  <Button className="bg-gray-500 hover:bg-gray-600 text-white rounded-[10px] px-6 py-2">
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
