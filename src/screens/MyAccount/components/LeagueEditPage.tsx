import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  getStripeProductByLeagueId,
  updateStripeProductLeagueId,
} from "../../../lib/stripe";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../components/ui/toast";
import { supabase } from "../../../lib/supabase";
import {
  fetchSports,
  fetchSkills,
  fetchLeagueById,
  League,
  LeagueWithTeamCount,
} from "../../../lib/leagues";
import { ArrowLeft, Save, Copy, Eye } from "lucide-react";
import { RichTextEditor } from "../../../components/ui/rich-text-editor";
import { StripeProductSelector } from "./LeaguesTab/components/StripeProductSelector";
import { CopyLeagueDialog } from "./LeaguesTab/components/CopyLeagueDialog";
import { useLeagueActions } from "./LeaguesTab/hooks/useLeagueActions";
import { GymMultiSelect } from "./LeaguesTab/components/GymMultiSelect";
import { DraftPublishControls } from "../../../components/leagues/DraftPublishControls";
import { cn } from "../../../lib/utils";
import {
  PAYMENT_WINDOW_OPTIONS,
  formatPaymentWindowDuration,
  formatPaymentWindowOptionLabel,
  usesRelativePaymentWindow,
} from "../../../lib/paymentWindows";

// Using imported League type from lib/leagues.ts

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

export function LeagueEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { showToast } = useToast();

  const [league, setLeague] = useState<League | null>(null);
  const [sports, setSports] = useState<Sport[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [hasScores, setHasScores] = useState(false);
  const [lastWeekWithScores, setLastWeekWithScores] = useState(0);
  const [hasSchedule, setHasSchedule] = useState(false);

  const [editLeague, setEditLeague] = useState<{
    name: string;
    description: string;
    league_type: "regular_season" | "tournament" | "skills_drills" | "single_session" | null;
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
    early_bird_cost?: number | null;
    early_bird_due_date?: string | null;
    max_teams: number;
    gym_ids: number[];
    hide_day?: boolean;
    payment_due_date: string | null;
    payment_window_hours: number | null;
    deposit_amount: number | null;
    deposit_date: string;
    team_registration: boolean;
    is_draft: boolean;
    publish_date: string | null;
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
    early_bird_cost: null,
    early_bird_due_date: "",
    max_teams: 20,
    gym_ids: [],
    payment_due_date: "2025-08-21",
    payment_window_hours: null,
    deposit_amount: null,
    deposit_date: "",
    team_registration: true,
    is_draft: false,
    publish_date: null,
  });
  const [initialEditState, setInitialEditState] = useState<typeof editLeague | null>(null);

  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null,
  );
  const usesRelativePayment = usesRelativePaymentWindow(editLeague.league_type);

  useEffect(() => {
    if (!editLeague.start_date) return;

    setEditLeague((prev) => {
      if (!prev.start_date) return prev;
      if (!prev.end_date || prev.end_date < prev.start_date) {
        return { ...prev, end_date: prev.start_date };
      }
      return prev;
    });
  }, [editLeague.start_date]);

  const handleLeagueTypeChange = (
    value: "regular_season" | "tournament" | "skills_drills" | "single_session",
  ) => {
    setEditLeague((prev) => {
      const nextIsRelative = usesRelativePaymentWindow(value);
      return {
        ...prev,
        league_type: value,
        payment_window_hours: nextIsRelative
          ? prev.payment_window_hours ?? PAYMENT_WINDOW_OPTIONS[0]
          : null,
        payment_due_date: nextIsRelative ? null : (prev.payment_due_date ?? ""),
        early_bird_cost: nextIsRelative ? null : prev.early_bird_cost,
        early_bird_due_date: nextIsRelative ? null : prev.early_bird_due_date,
        deposit_amount: nextIsRelative ? null : prev.deposit_amount,
        deposit_date: nextIsRelative ? "" : prev.deposit_date,
      };
    });
  };

  const { handleCopyLeague, saving: copyingSaving } = useLeagueActions({
    loadData: async () => {}, // We'll navigate away after copy, so no need to reload
    showToast,
  });

  useEffect(() => {
    if (!userProfile?.is_admin) {
      navigate("/my-account/profile");
      return;
    }

    if (id) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, userProfile]);

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

      // Load specific league
      const leagueData = await fetchLeagueById(parseInt(id!));

      if (!leagueData) {
        throw new Error("League not found");
      } else {
        // Check for existing scores
        const { data: scoresData, error: scoresError } = await supabase
          .from('game_results')
          .select('week_number')
          .eq('league_id', parseInt(id!))
          .order('week_number', { ascending: false })
          .limit(1);

        if (!scoresError && scoresData && scoresData.length > 0) {
          setHasScores(true);
          setLastWeekWithScores(scoresData[0].week_number);
        }
        // Get the Stripe product linked to this league
        const linkedProduct = await getStripeProductByLeagueId(parseInt(id!));
        if (linkedProduct) {
          setSelectedProductId(linkedProduct.id);
        }

        setLeague(leagueData);

        // Check if a schedule has been generated for this league
        try {
          const { data: scheduleRow, error: scheduleErr } = await supabase
            .from('league_schedules')
            .select('id')
            .eq('league_id', parseInt(id!))
            .maybeSingle();
          if (scheduleErr && scheduleErr.code !== 'PGRST116') {
            console.warn('Failed to load schedule status for league', scheduleErr);
          }
          setHasSchedule(!!scheduleRow);
        } catch (e) {
          console.warn('Error checking schedule status', e);
          setHasSchedule(false);
        }

        const normalizedLeagueState = {
          name: leagueData.name,
          description: leagueData.description || "",
          league_type: leagueData.league_type || "regular_season",
          gender: (leagueData.gender || "Mixed") as "Mixed" | "Female" | "Male",
          location: leagueData.location || "",
          sport_id: leagueData.sport_id,
          skill_id: leagueData.skill_id,
          skill_ids: leagueData.skill_ids || [],
          day_of_week: leagueData.day_of_week,
          year: leagueData.year || "2025",
          start_date: leagueData.start_date || "",
          end_date: leagueData.end_date || "",
        cost: leagueData.cost,
          early_bird_cost: (leagueData as any).early_bird_cost ?? null,
          early_bird_due_date: (leagueData as any).early_bird_due_date || "",
        max_teams: leagueData.max_teams || 20,
          hide_day: leagueData.hide_day || false,
          gym_ids: leagueData.gym_ids || [],
          payment_due_date: leagueData.payment_due_date || "2025-08-21",
          payment_window_hours: leagueData.payment_window_hours ?? null,
          deposit_amount: leagueData.deposit_amount,
          deposit_date: leagueData.deposit_date || "",
          team_registration: leagueData.team_registration !== false,
          is_draft: leagueData.is_draft ?? false,
          publish_date: leagueData.publish_date ?? null,
        };

        setEditLeague(normalizedLeagueState);
        setInitialEditState(normalizedLeagueState);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      showToast("Failed to load league data", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLeague = async () => {
    if (!id) return;

    // Validate end date change if there are scores
    if (hasScores && league) {
      const originalStartDate = new Date(league.start_date + 'T00:00:00');
      const newEndDate = new Date(editLeague.end_date + 'T00:00:00');
      
      // Calculate which week the new end date would be
      const diffTime = Math.abs(newEndDate.getTime() - originalStartDate.getTime());
      const newEndWeek = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
      
      // Don't allow end date before the last week with scores
      if (newEndWeek < lastWeekWithScores) {
        showToast(
          `Cannot set end date before week ${lastWeekWithScores} - this week has recorded scores. Please choose an end date after all weeks with existing data.`,
          "error"
        );
        return;
      }
    }

    // Convert day_of_week from string to number
    const dayOfWeek =
      editLeague.day_of_week !== null
        ? parseInt(editLeague.day_of_week.toString())
        : null;

    const paymentDueDateValue = usesRelativePayment
      ? null
      : editLeague.payment_due_date || null;
    const paymentWindowHoursValue = usesRelativePayment
      ? editLeague.payment_window_hours
      : null;
    const earlyBirdCostValue = usesRelativePayment ? null : editLeague.early_bird_cost ?? null;
    const earlyBirdDueDateValue = usesRelativePayment ? null : editLeague.early_bird_due_date || null;
    const depositAmountValue = usesRelativePayment ? null : editLeague.deposit_amount;
    const depositDateValue = usesRelativePayment
      ? null
      : depositAmountValue
        ? editLeague.deposit_date || null
        : null;

    try {

      setSaving(true);

      const { error } = await supabase
        .from("leagues")
        .update({
          name: editLeague.name,
          description: editLeague.description,
          league_type: editLeague.league_type,
          gender: editLeague.gender,
          sport_id: editLeague.sport_id,
          skill_id: editLeague.skill_id,
          skill_ids: editLeague.skill_ids,
          day_of_week: dayOfWeek,
          year: editLeague.year,
          start_date: editLeague.start_date,
          end_date: editLeague.end_date,
          hide_day: editLeague.hide_day,
          cost: editLeague.cost,
          early_bird_cost: earlyBirdCostValue,
          early_bird_due_date: earlyBirdDueDateValue,
          max_teams: editLeague.max_teams,
          gym_ids: editLeague.gym_ids,
          payment_due_date: paymentDueDateValue,
          payment_window_hours: paymentWindowHoursValue,
          deposit_amount: depositAmountValue,
          deposit_date: depositDateValue,
          team_registration: editLeague.team_registration,
          is_draft: editLeague.is_draft,
          publish_date: editLeague.publish_date,
        })
        .eq("id", id);

      if (error) throw error;

      // Update the Stripe product mapping if changed
      try {
        // If we have a previous product linked to this league, unlink it
        const currentProduct = await getStripeProductByLeagueId(parseInt(id!));
        if (currentProduct && currentProduct.id !== selectedProductId) {
          await updateStripeProductLeagueId(currentProduct.id, null);
        }

        // Link the new product to this league
        if (selectedProductId) {
          await updateStripeProductLeagueId(selectedProductId, parseInt(id!));
        }
      } catch (productError) {
        console.error("Error updating product association:", productError);
        // Don't fail the whole operation if just the product linking fails
        showToast("League updated but product linking failed", "warning");
      }

      showToast("League updated successfully!", "success");
      setInitialEditState(editLeague);
      navigate(`/my-account/leagues`);
    } catch (error) {
      console.error("Error updating league:", error);
      console.error("Update payload:", {
        name: editLeague.name,
        description: editLeague.description,
        league_type: editLeague.league_type,
        gender: editLeague.gender,
        location: editLeague.location,
        sport_id: editLeague.sport_id,
        skill_id: editLeague.skill_id,
        skill_ids: editLeague.skill_ids.length > 0 ? editLeague.skill_ids : [editLeague.skill_id],
        day_of_week: dayOfWeek,
        year: editLeague.year,
        start_date: editLeague.start_date,
        end_date: editLeague.end_date,
        hide_day: editLeague.hide_day,
        cost: editLeague.cost,
        max_teams: editLeague.max_teams,
        gym_ids: editLeague.gym_ids,
        payment_due_date: paymentDueDateValue,
        payment_window_hours: paymentWindowHoursValue,
        deposit_amount: depositAmountValue,
        deposit_date: depositDateValue,
        team_registration: editLeague.team_registration,
        is_draft: editLeague.is_draft,
        publish_date: editLeague.publish_date,
      });
      showToast(`Failed to update league: ${error instanceof Error ? error.message : 'Unknown error'}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async (newName: string) => {
    if (!league) return;

    // Convert League to LeagueWithTeamCount for the copy operation
    const leagueWithCount: LeagueWithTeamCount = {
      ...league,
      team_count: 0,
      spots_remaining: league.max_teams || 0,
      skill_names: league.skill_names || null,
    };
    const result = await handleCopyLeague(leagueWithCount, newName);
    if (result) {
      setShowCopyDialog(false);
      navigate(`/my-account/leagues/edit/${result.id}`);
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

  if (!league) {
    return (
      <div className="bg-white w-full min-h-screen">
        <div className="max-w-[1280px] mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-[#6F6F6F] mb-4">
              League Not Found
            </h1>
            <Link to="/my-account/leagues">
              <Button className="bg-[#B20000] hover:bg-[#8A0000] text-white rounded-[10px] px-6 py-3">
                Back to Manage Leagues
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isSaveButtonDisabled =
    saving ||
    !editLeague.name ||
    !editLeague.league_type ||
    !editLeague.gender ||
    !editLeague.sport_id ||
    (editLeague.skill_ids.length === 0 && !editLeague.skill_id) ||
    editLeague.day_of_week === null ||
    !editLeague.start_date ||
    !editLeague.end_date ||
    editLeague.cost === null ||
    (usesRelativePayment
      ? !editLeague.payment_window_hours
      : !editLeague.payment_due_date) ||
    !editLeague.max_teams;

  const hasUnsavedChanges =
    initialEditState !== null &&
    JSON.stringify(initialEditState) !== JSON.stringify(editLeague);

  const stickyHeaderClassName = cn(
    "sticky top-0 z-20 mb-6 border-b border-gray-200 bg-white/95 supports-[backdrop-filter]:backdrop-blur py-4 transition-shadow",
    hasUnsavedChanges ? "shadow-sm" : "shadow-none",
  );

  return (
    <div className="bg-white w-full min-h-screen">
      <div className="max-w-[1280px] mx-auto px-4 py-8">
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-[#B20000] hover:underline"
          >
            <ArrowLeft className="h-5 w-5 mr-1" />
            Back
          </button>
        </div>

        <div className={stickyHeaderClassName}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-[#6F6F6F]">
                Edit League Details
              </h2>
              {hasUnsavedChanges ? (
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-[#B20000]">
                  Unsaved changes
                </p>
              ) : null}
            </div>

            <div className="flex items-center gap-3">
              <Link to={`/leagues/${id}`} target="_blank">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-[10px] px-4 py-2 flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Preview
                </Button>
              </Link>
              <Button
                onClick={() => setShowCopyDialog(true)}
                className="bg-gray-600 hover:bg-gray-700 text-white rounded-[10px] px-4 py-2 flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
                Copy League
              </Button>
              <Button
                onClick={handleUpdateLeague}
                disabled={isSaveButtonDisabled}
                className="bg-[#B20000] hover:bg-[#8A0000] disabled:bg-gray-300 disabled:text-gray-500 text-white rounded-[10px] px-4 py-2 flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>

        {/* Edit League Form - Using same Card structure as Add New League */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-6">
              <DraftPublishControls
                isDraft={editLeague.is_draft}
                onDraftChange={(value) =>
                  setEditLeague((prev) => ({
                    ...prev,
                    is_draft: value,
                  }))
                }
                publishDate={editLeague.publish_date}
                onPublishDateChange={(value) =>
                  setEditLeague((prev) => ({
                    ...prev,
                    publish_date: value,
                  }))
                }
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#6F6F6F] mb-2">
                    Sport
                  </label>
                  <select
                    value={editLeague.sport_id || ""}
                    onChange={(e) =>
                      setEditLeague({
                        ...editLeague,
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
                    value={editLeague.day_of_week !== null ? editLeague.day_of_week.toString() : ""}
                    onChange={(e) =>
                      setEditLeague({
                        ...editLeague,
                        day_of_week: e.target.value
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
                  value={editLeague.name}
                  onChange={(e) =>
                    setEditLeague({ ...editLeague, name: e.target.value })
                  }
                  placeholder="Enter league name"
                  className="w-full"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-6">
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
                        checked={editLeague.league_type === "regular_season"}
                        onChange={() => handleLeagueTypeChange("regular_season")}
                        className="mr-2"
                      />
                      <span className="text-sm">Regular Season</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="league_type"
                        value="tournament"
                        checked={editLeague.league_type === "tournament"}
                        onChange={() => handleLeagueTypeChange("tournament")}
                        className="mr-2"
                      />
                      <span className="text-sm">Tournament</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="league_type"
                        value="skills_drills"
                        checked={editLeague.league_type === "skills_drills"}
                        onChange={() => handleLeagueTypeChange("skills_drills")}
                        className="mr-2"
                      />
                      <span className="text-sm">Skills and Drills</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="league_type"
                        value="single_session"
                        checked={editLeague.league_type === "single_session"}
                        onChange={() => handleLeagueTypeChange("single_session")}
                        className="mr-2"
                      />
                      <span className="text-sm">Single Session</span>
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
                        checked={editLeague.gender === "Mixed"}
                        onChange={(e) =>
                          setEditLeague({
                            ...editLeague,
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
                        checked={editLeague.gender === "Female"}
                        onChange={(e) =>
                          setEditLeague({
                            ...editLeague,
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
                        checked={editLeague.gender === "Male"}
                        onChange={(e) =>
                          setEditLeague({
                            ...editLeague,
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

                <div>
                  <label className="block text-sm font-medium text-[#6F6F6F] mb-2">
                    Registration Type
                  </label>
                  <div className="flex flex-col gap-2 p-3 border border-gray-300 rounded-lg">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="team_registration"
                        value="true"
                        checked={editLeague.team_registration === true}
                        onChange={() =>
                          setEditLeague({
                            ...editLeague,
                            team_registration: true,
                          })
                        }
                        className="mr-2"
                      />
                      <span className="text-sm">Team Registration</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="team_registration"
                        value="false"
                        checked={editLeague.team_registration === false}
                        onChange={() =>
                          setEditLeague({
                            ...editLeague,
                            team_registration: false,
                          })
                        }
                        className="mr-2"
                      />
                      <span className="text-sm">Individual Registration</span>
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
                        checked={editLeague.skill_ids.includes(skill.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditLeague({
                              ...editLeague,
                              skill_ids: [...editLeague.skill_ids, skill.id],
                              // Also update the primary skill_id if it's not set yet
                              skill_id: editLeague.skill_id || skill.id,
                            });
                          } else {
                            const updatedSkillIds = editLeague.skill_ids.filter(
                              (id) => id !== skill.id,
                            );
                            setEditLeague({
                              ...editLeague,
                              skill_ids: updatedSkillIds,
                              // If we're removing the primary skill, set it to the first remaining skill or null
                              skill_id:
                                skill.id === editLeague.skill_id
                                  ? updatedSkillIds.length > 0
                                    ? updatedSkillIds[0]
                                    : null
                                  : editLeague.skill_id,
                            });
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm">{skill.name}</span>
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
                    {(hasSchedule && league && (new Date() >= new Date(league.start_date + 'T00:00:00'))) && (
                      <span className="ml-2 text-xs text-gray-500">
                        (Locked - schedule exists and season has started)
                      </span>
                    )}
                  </label>
                  <Input
                    type="date"
                    value={editLeague.start_date}
                    onChange={(e) =>
                      setEditLeague((prev) => ({
                        ...prev,
                        start_date: e.target.value,
                      }))
                    }
                    className="w-full"
                    required
                    disabled={hasSchedule && league ? (new Date() >= new Date(league.start_date + 'T00:00:00')) : false}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#6F6F6F] mb-2">
                    End Date
                    {hasScores && lastWeekWithScores > 0 && (
                      <span className="ml-2 text-xs text-gray-500">
                        (Cannot end before week {lastWeekWithScores})
                      </span>
                    )}
                  </label>
                  <Input
                    type="date"
                    value={editLeague.end_date}
                    min={editLeague.start_date || undefined}
                    onChange={(e) => {
                      const value = e.target.value;
                      setEditLeague((prev) => ({
                        ...prev,
                        end_date:
                          prev.start_date && value && value < prev.start_date
                            ? prev.start_date
                            : value,
                      }));
                    }}
                    className="w-full"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editLeague.hide_day || false}
                    onChange={(e) =>
                      setEditLeague({
                        ...editLeague,
                        hide_day: e.target.checked,
                      })
                    }
                    className="rounded border-gray-300 text-[#B20000] focus:ring-[#B20000]"
                    id="hide-day"
                  />
                  <label
                    htmlFor="hide-day"
                    className="ml-2 text-sm font-medium text-[#6F6F6F]"
                  >
                    Hide day from end date display
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  When checked, only month and year will be shown for the end
                  date
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#6F6F6F] mb-2">
                    Cost ($)
                  </label>
                  <Input
                    type="number"
                    value={editLeague.cost || ""}
                    onChange={(e) =>
                      setEditLeague({
                        ...editLeague,
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
                  {usesRelativePayment ? (
                    <>
                      <label className="block text-sm font-medium text-[#6F6F6F] mb-2">
                        Payment Window
                      </label>
                      <select
                        value={
                          editLeague.payment_window_hours ??
                          PAYMENT_WINDOW_OPTIONS[0]
                        }
                        onChange={(e) =>
                          setEditLeague((prev) => ({
                            ...prev,
                            payment_window_hours: parseInt(e.target.value, 10),
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#B20000] focus:ring-[#B20000]"
                      >
                        {PAYMENT_WINDOW_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {formatPaymentWindowOptionLabel(option)}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Registrants will have{" "}
                        <span className="font-semibold text-[#B20000]">
                          {formatPaymentWindowDuration(
                            editLeague.payment_window_hours ??
                              PAYMENT_WINDOW_OPTIONS[0],
                          )}
                        </span>{" "}
                        from registration to pay. Traditional due dates, early bird
                        pricing, and deposit timelines are disabled.
                      </p>
                    </>
                  ) : (
                    <>
                      <label className="block text-sm font-medium text-[#6F6F6F] mb-2">
                        Payment Due Date
                      </label>
                  <Input
                    type="date"
                    value={editLeague.payment_due_date ?? ""}
                    onChange={(e) =>
                      setEditLeague({
                        ...editLeague,
                        payment_due_date: e.target.value,
                      })
                        }
                        className="w-full"
                        required={!usesRelativePayment}
                      />
                    </>
                  )}
                </div>
              </div>

              {!usesRelativePayment && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-[#6F6F6F] mb-2">
                        Early Bird Cost ($)
                      </label>
                      <Input
                        type="number"
                        value={editLeague.early_bird_cost ?? ""}
                        onChange={(e) =>
                          setEditLeague({
                            ...editLeague,
                            early_bird_cost:
                              e.target.value !== ""
                                ? parseFloat(e.target.value)
                                : null,
                          })
                        }
                        placeholder="Optional"
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#6F6F6F] mb-2">
                        Early Bird Due Date
                      </label>
                      <Input
                        type="date"
                        value={editLeague.early_bird_due_date || ""}
                        onChange={(e) =>
                          setEditLeague({
                            ...editLeague,
                            early_bird_due_date: e.target.value || null,
                          })
                        }
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-[#6F6F6F] mb-2">
                        Deposit Amount ($)
                      </label>
                      <Input
                        type="number"
                        value={editLeague.deposit_amount || ""}
                        onChange={(e) =>
                          setEditLeague({
                            ...editLeague,
                            deposit_amount: e.target.value
                              ? parseFloat(e.target.value)
                              : null,
                          })
                        }
                        placeholder="0.00 (optional)"
                        className="w-full"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Leave empty if no deposit is required
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#6F6F6F] mb-2">
                        Deposit Due Date
                      </label>
                      <Input
                        type="date"
                        value={editLeague.deposit_date}
                        onChange={(e) =>
                          setEditLeague({
                            ...editLeague,
                            deposit_date: e.target.value,
                          })
                        }
                        className="w-full"
                        disabled={!editLeague.deposit_amount}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Required if deposit amount is set
                      </p>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-[#6F6F6F] mb-2">
                  Max Teams
                </label>
                <Input
                  type="number"
                  value={editLeague.max_teams}
                  onChange={(e) =>
                    setEditLeague({
                      ...editLeague,
                      max_teams: parseInt(e.target.value) || 20,
                    })
                  }
                  className="w-full"
                  required
                />
              </div>


              <div>
                <label className="block text-sm font-medium text-[#6F6F6F] mb-2">
                  Description
                </label>
                <RichTextEditor
                  value={editLeague.description}
                  onChange={(value) =>
                    setEditLeague({ ...editLeague, description: value })
                  }
                  placeholder="Enter league description"
                  rows={6}
                />
              </div>

              <div>
                <GymMultiSelect
                  gyms={gyms}
                  selectedIds={editLeague.gym_ids}
                  onChange={(ids) =>
                    setEditLeague({
                      ...editLeague,
                      gym_ids: ids,
                    })
                  }
                  label="Gyms"
                  helperText="Update the facilities tied to this league."
                />
              </div>

              <div>
                <StripeProductSelector
                  selectedProductId={selectedProductId}
                  leagueId={parseInt(id!)}
                  onChange={setSelectedProductId}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <CopyLeagueDialog
          isOpen={showCopyDialog}
          onClose={() => setShowCopyDialog(false)}
          onConfirm={handleCopy}
          league={
            league
              ? {
                  ...league,
                  team_count: 0,
                  spots_remaining: league.max_teams || 0,
                  skill_names: league.skill_names || null,
                }
              : null
          }
          saving={copyingSaving}
        />
      </div>
    </div>
  );
}
