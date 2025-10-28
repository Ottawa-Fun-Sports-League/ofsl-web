import { useState, useEffect } from "react";
import { supabase } from "../../../../lib/supabase";
import { useAuth } from "../../../../contexts/AuthContext";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Card, CardContent } from "../../../../components/ui/card";
import {
  Search,
  Edit,
  Users,
  Calendar,
  User,
  LayoutGrid,
  Table,
  ArrowRightLeft,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../../../components/ui/tooltip";
import { useNavigate } from "react-router-dom";
import { ManageTeamsTableView } from "./ManageTeamsTableView";
import { Pagination } from "../UsersTab/components/Pagination";
import { PaginationState } from "../UsersTab/types";
import { TransferTeamModal } from "./TransferTeamModal";
import { TransferIndividualModal } from "./TransferIndividualModal";

const MANAGE_TEAMS_SEARCH_STORAGE_KEY = "manageTeamsTab:search";
const MANAGE_TEAMS_VIEW_MODE_KEY = "manage_teams_view_mode";

const safeRead = (key: string): string | null => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    console.warn(`Failed to read localStorage key "${key}"`, error);
    return null;
  }
};

const safeWrite = (key: string, value: string) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    console.warn(`Failed to write localStorage key "${key}"`, error);
  }
};

interface Team {
  id: number;
  name: string;
  captain_id: string;
  captain_name: string;
  captain_email: string;
  league_id: number;
  league_name: string;
  roster_count: number;
  created_at: string;
  active: boolean;
  skill_level_id?: number | null;
  skill_level_name?: string | null;
}

interface IndividualRegistration {
  id: string; // user_id
  name: string;
  email: string;
  league_id: number;
  league_name: string;
  created_at: string;
  payment_status?: "pending" | "partial" | "paid" | "overdue";
  amount_due?: number;
  amount_paid?: number;
  skill_level_id?: number | null;
  skill_level_name?: string | null;
}

interface IndividualPaymentRow {
  user_id: string;
  league_id: number;
  amount_due: number | null;
  amount_paid: number | null;
  status: string | null;
  created_at: string | null;
  skill_level_id: number | null;
  skills: Array<{ id: number; name: string | null }> | null;
  users: { id: string; name: string | null; email: string | null } | null;
  leagues: { id: number; name: string | null; team_registration: boolean | null } | null;
}

export function ManageTeamsTab() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [filteredTeams, setFilteredTeams] = useState<Team[]>([]);
  const [paginatedTeams, setPaginatedTeams] = useState<Team[]>([]);
  const [individualRegistrations, setIndividualRegistrations] = useState<IndividualRegistration[]>(
    [],
  );
  const [filteredIndividuals, setFilteredIndividuals] = useState<IndividualRegistration[]>([]);
  const [paginatedIndividuals, setPaginatedIndividuals] = useState<IndividualRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const initialSearchTerm = safeRead(MANAGE_TEAMS_SEARCH_STORAGE_KEY) ?? "";
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [viewMode, setViewMode] = useState<"card" | "table">(() => {
    const saved = safeRead(MANAGE_TEAMS_VIEW_MODE_KEY);
    return (saved as "card" | "table") || "card";
  });
  const [activeTab, setActiveTab] = useState<"teams" | "individuals">("teams");
  const [teamsPagination, setTeamsPagination] = useState<PaginationState>({
    currentPage: 1,
    pageSize: 25,
    totalItems: 0,
    totalPages: 0,
  });
  const [individualsPagination, setIndividualsPagination] = useState<PaginationState>({
    currentPage: 1,
    pageSize: 25,
    totalItems: 0,
    totalPages: 0,
  });
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedTeamForTransfer, setSelectedTeamForTransfer] = useState<Team | null>(null);
  const [transferIndividualModalOpen, setTransferIndividualModalOpen] = useState(false);
  const [selectedIndividualForTransfer, setSelectedIndividualForTransfer] =
    useState<IndividualRegistration | null>(null);

  useEffect(() => {
    if (userProfile?.is_admin) {
      fetchAllData();
    }
  }, [userProfile]);

  useEffect(() => {
    safeWrite(MANAGE_TEAMS_SEARCH_STORAGE_KEY, searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    // Filter teams based on search term
    if (searchTerm.trim() === "") {
      setFilteredTeams(teams);
      setFilteredIndividuals(individualRegistrations);
    } else {
      const search = searchTerm.toLowerCase();
      const filteredTeamsList = teams.filter(
        (team) =>
          team.name.toLowerCase().includes(search) ||
          team.captain_email.toLowerCase().includes(search) ||
          team.captain_name.toLowerCase().includes(search) ||
          team.league_name.toLowerCase().includes(search),
      );
      setFilteredTeams(filteredTeamsList);

      const filteredIndividualsList = individualRegistrations.filter(
        (ind) =>
          ind.name.toLowerCase().includes(search) ||
          ind.email.toLowerCase().includes(search) ||
          ind.league_name.toLowerCase().includes(search),
      );
      setFilteredIndividuals(filteredIndividualsList);
    }
  }, [searchTerm, teams, individualRegistrations]);

  // Update teams pagination when filtered teams change
  useEffect(() => {
    setTeamsPagination((prevPagination) => {
      const totalItems = filteredTeams.length;
      const pageSize = prevPagination.pageSize;
      const currentPage = prevPagination.currentPage;
      const totalPages = Math.ceil(totalItems / pageSize);

      // Reset to page 1 if current page is beyond total pages
      const adjustedCurrentPage = currentPage > totalPages && totalPages > 0 ? 1 : currentPage;

      const updatedPagination = {
        currentPage: adjustedCurrentPage,
        pageSize,
        totalItems,
        totalPages,
      };

      // Calculate paginated data
      const startIndex = (adjustedCurrentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      setPaginatedTeams(filteredTeams.slice(startIndex, endIndex));

      return updatedPagination;
    });
  }, [filteredTeams]);

  // Update pagination when filtered individuals change
  useEffect(() => {
    setIndividualsPagination((prevPagination) => {
      const totalItems = filteredIndividuals.length;
      const pageSize = prevPagination.pageSize;
      const currentPage = prevPagination.currentPage;
      const totalPages = Math.ceil(totalItems / pageSize);

      // Reset to page 1 if current page is beyond total pages
      const adjustedCurrentPage = currentPage > totalPages && totalPages > 0 ? 1 : currentPage;

      const updatedPagination = {
        currentPage: adjustedCurrentPage,
        pageSize,
        totalItems,
        totalPages,
      };

      // Calculate paginated data
      const startIndex = (adjustedCurrentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      setPaginatedIndividuals(filteredIndividuals.slice(startIndex, endIndex));

      return updatedPagination;
    });
  }, [filteredIndividuals]);

  const fetchAllData = async () => {
    try {
      setLoading(true);

      // Fetch all teams with captain and league information
      const { data, error } = await supabase
        .from("teams")
        .select(
          `
          id,
          name,
          captain_id,
          roster,
          active,
          created_at,
          league_id,
          skill_level_id,
          skills!skill_level_id (
            id,
            name
          ),
          users!teams_captain_id_fkey (
            name,
            email
          )
        `,
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching teams:", error);
        return;
      }

      // Fetch leagues separately
      const { data: leagues, error: leaguesError } = await supabase
        .from("leagues")
        .select("id, name");

      if (leaguesError) {
        console.error("Error fetching leagues:", leaguesError);
      }

      // Create a league map for easy lookup
      const leagueMap = new Map<number, string>();
      leagues?.forEach((league) => {
        leagueMap.set(league.id, league.name);
      });

      // Transform the data
      const transformedTeams: Team[] = (data || []).map((team) => ({
        id: team.id,
        name: team.name,
        captain_id: team.captain_id,
        captain_name: Array.isArray(team.users)
          ? team.users[0]?.name || "Unknown"
          : (team.users as { name: string | null; email: string | null } | null)?.name || "Unknown",
        captain_email: Array.isArray(team.users)
          ? team.users[0]?.email || "Unknown"
          : (team.users as { name: string | null; email: string | null } | null)?.email ||
            "Unknown",
        league_id: team.league_id,
        league_name: leagueMap.get(team.league_id) || "Unknown League",
        roster_count: team.roster?.length || 0,
        created_at: team.created_at,
        active: team.active,
        skill_level_id: team.skill_level_id,
        skill_level_name: Array.isArray(team.skills)
          ? team.skills[0]?.name || null
          : (team.skills as { id: number; name: string } | null)?.name || null,
      }));

      setTeams(transformedTeams);
      setFilteredTeams(transformedTeams);

      // Fetch individual registrations from league_payments (source of truth)
      const { data: indivPayments, error: indivError } = await supabase
        .from("league_payments")
        .select(
          `
          user_id,
          league_id,
          amount_due,
          amount_paid,
          status,
          created_at,
          skill_level_id,
          skills!skill_level_id(id, name),
          users:user_id(id, name, email),
          leagues:league_id(id, name, team_registration)
        `,
        )
        .is("team_id", null)
        .returns<IndividualPaymentRow[]>();

      if (indivError) {
        console.error("Error fetching individual registrations:", indivError);
      }

      const individuals: IndividualRegistration[] = (indivPayments || [])
        .filter((payment) => payment.leagues?.team_registration === false)
        .map((payment) => {
          const skill = Array.isArray(payment.skills) ? payment.skills[0] : null;
          return {
            id: payment.user_id,
            name: payment.users?.name || "Unknown",
            email: payment.users?.email || "Unknown",
            league_id: payment.league_id,
            league_name: payment.leagues?.name || "Unknown League",
            created_at: payment.created_at || new Date().toISOString(),
            payment_status: payment.status ?? undefined,
            amount_due: payment.amount_due ?? undefined,
            amount_paid: payment.amount_paid ?? undefined,
            skill_level_id: payment.skill_level_id,
            skill_level_name: skill?.name || null,
          } as IndividualRegistration;
        });

      // Deterministic ordering
      individuals.sort((a, b) => {
        const at = new Date(a.created_at).getTime();
        const bt = new Date(b.created_at).getTime();
        if (at !== bt) return at - bt;
        return a.name.localeCompare(b.name);
      });

      setIndividualRegistrations(individuals);
      setFilteredIndividuals(individuals);
    } catch (error) {
      console.error("Error loading teams:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditTeam = (team: Team) => {
    // Navigate to the team edit page for this specific team
    navigate(`/my-account/teams/edit/${team.id}`);
  };

  const handleTransferTeam = (team: Team) => {
    setSelectedTeamForTransfer(team);
    setTransferModalOpen(true);
  };

  const handleTransferSuccess = () => {
    // Refresh teams data after successful transfer
    fetchAllData();
  };

  const handleTransferIndividual = (individual: IndividualRegistration) => {
    setSelectedIndividualForTransfer(individual);
    setTransferIndividualModalOpen(true);
  };

  const handleIndividualsPageChange = (page: number) => {
    const updatedPagination = {
      ...individualsPagination,
      currentPage: page,
    };
    setIndividualsPagination(updatedPagination);

    // Update paginated data
    const startIndex = (page - 1) * individualsPagination.pageSize;
    const endIndex = startIndex + individualsPagination.pageSize;
    setPaginatedIndividuals(filteredIndividuals.slice(startIndex, endIndex));
  };

  const handleIndividualsPageSizeChange = (pageSize: number) => {
    const updatedPagination = {
      ...individualsPagination,
      currentPage: 1,
      pageSize,
      totalPages: Math.ceil(filteredIndividuals.length / pageSize),
    };
    setIndividualsPagination(updatedPagination);

    // Update paginated data
    setPaginatedIndividuals(filteredIndividuals.slice(0, pageSize));
  };

  const handleTeamsPageChange = (page: number) => {
    const updatedPagination = {
      ...teamsPagination,
      currentPage: page,
    };
    setTeamsPagination(updatedPagination);

    // Update paginated data
    const startIndex = (page - 1) * teamsPagination.pageSize;
    const endIndex = startIndex + teamsPagination.pageSize;
    setPaginatedTeams(filteredTeams.slice(startIndex, endIndex));
  };

  const handleTeamsPageSizeChange = (pageSize: number) => {
    const updatedPagination = {
      ...teamsPagination,
      currentPage: 1,
      pageSize,
      totalPages: Math.ceil(filteredTeams.length / pageSize),
    };
    setTeamsPagination(updatedPagination);

    // Update paginated data
    setPaginatedTeams(filteredTeams.slice(0, pageSize));
  };

  if (!userProfile?.is_admin) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">You don&apos;t have permission to view this page.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B20000]"></div>
        <span className="ml-2 text-gray-600">Loading teams...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-[#6F6F6F]">Manage Registrations</h2>
        <p className="text-[#6F6F6F] mt-1">
          View and manage all teams and individual registrations across leagues
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("teams")}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === "teams"
              ? "text-[#B20000] border-[#B20000]"
              : "text-gray-600 border-transparent hover:text-gray-800"
          }`}
        >
          Teams ({teams.length})
        </button>
        <button
          onClick={() => setActiveTab("individuals")}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === "individuals"
              ? "text-[#B20000] border-[#B20000]"
              : "text-gray-600 border-transparent hover:text-gray-800"
          }`}
        >
          Individual Registrations ({individualRegistrations.length})
        </button>
      </div>

      {/* Search Bar and View Toggle */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              type="text"
              placeholder={
                activeTab === "teams"
                  ? "Search by team name or captain email..."
                  : "Search by name, email, or league..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="text-sm text-gray-600">
            {activeTab === "teams"
              ? `${filteredTeams.length} of ${teams.length} teams`
              : `${filteredIndividuals.length} of ${individualRegistrations.length} registrations`}
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "card" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setViewMode("card");
              safeWrite(MANAGE_TEAMS_VIEW_MODE_KEY, "card");
            }}
            className={viewMode === "card" ? "bg-[#B20000] hover:bg-[#8A0000]" : ""}
          >
            <LayoutGrid className="h-4 w-4 mr-1" />
            Card
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setViewMode("table");
              safeWrite(MANAGE_TEAMS_VIEW_MODE_KEY, "table");
            }}
            className={viewMode === "table" ? "bg-[#B20000] hover:bg-[#8A0000]" : ""}
          >
            <Table className="h-4 w-4 mr-1" />
            Table
          </Button>
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === "teams" ? (
        <>
          {/* Teams List */}
          {filteredTeams.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">
                  {searchTerm ? "No teams found matching your search." : "No teams registered yet."}
                </p>
              </CardContent>
            </Card>
          ) : viewMode === "card" ? (
            <div className="space-y-4">
              {paginatedTeams.map((team) => (
                <Card key={team.id} className={!team.active ? "opacity-60" : ""}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{team.name}</h3>
                          {!team.active && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                              Inactive
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-gray-600">
                              <User className="h-4 w-4" />
                              <span>Captain: {team.captain_name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <span className="ml-6">{team.captain_email}</span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-gray-600">
                              <Calendar className="h-4 w-4" />
                              <span>League: {team.league_name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <Users className="h-4 w-4" />
                              <span>{team.roster_count} players</span>
                            </div>
                            {team.skill_level_name && (
                              <div className="flex items-center gap-2 mt-2">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  Skill: {team.skill_level_name}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mt-2 text-xs text-gray-500">
                          Registered: {new Date(team.created_at).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        <TooltipProvider>
                          <div className="flex items-center gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  aria-label="Transfer"
                                  onClick={() => handleTransferTeam(team)}
                                  size="sm"
                                  variant="outline"
                                >
                                  <ArrowRightLeft className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Transfer</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  aria-label="Edit"
                                  onClick={() => handleEditTeam(team)}
                                  size="sm"
                                  variant="outline"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit</TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <ManageTeamsTableView
              teams={paginatedTeams}
              onEditTeam={handleEditTeam}
              onTransferTeam={handleTransferTeam}
            />
          )}

          {/* Teams Pagination */}
          {filteredTeams.length > 0 && (
            <Pagination
              pagination={teamsPagination}
              onPageChange={handleTeamsPageChange}
              onPageSizeChange={handleTeamsPageSizeChange}
              loading={loading}
              itemName="teams"
            />
          )}
        </>
      ) : // Individual Registrations List
      filteredIndividuals.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">
              {searchTerm
                ? "No individual registrations found matching your search."
                : "No individual registrations yet."}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === "card" ? (
        <div className="space-y-4">
          {filteredIndividuals.map((individual) => (
            <Card key={`${individual.id}_${individual.league_id}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-[#6F6F6F]">{individual.name}</h3>
                        <p className="text-sm text-gray-600">{individual.email}</p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span>League: {individual.league_name}</span>
                      </div>
                      {individual.skill_level_name && (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Skill: {individual.skill_level_name}
                          </span>
                        </div>
                      )}
                      {individual.payment_status && (
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                individual.payment_status === "paid"
                                  ? "bg-green-100 text-green-800"
                                  : individual.payment_status === "partial"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : individual.payment_status === "overdue"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {individual.payment_status.charAt(0).toUpperCase() +
                                individual.payment_status.slice(1)}
                            </span>
                          </div>
                          {individual.amount_due !== undefined &&
                            individual.amount_paid !== undefined && (
                              <div className="text-sm text-gray-600">
                                ${individual.amount_paid} / ${individual.amount_due} paid
                              </div>
                            )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <TooltipProvider>
                      <div className="flex items-center gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              aria-label="Transfer"
                              onClick={() => handleTransferIndividual(individual)}
                              size="sm"
                              variant="outline"
                            >
                              <ArrowRightLeft className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Transfer</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              aria-label="Edit"
                              onClick={() => navigate(`/leagues/${individual.league_id}/teams`)}
                              size="sm"
                              variant="outline"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit</TooltipContent>
                        </Tooltip>
                      </div>
                    </TooltipProvider>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        // Table view for individuals
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                  League
                </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Skill Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedIndividuals.map((individual) => (
                    <tr key={`${individual.id}_${individual.league_id}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {individual.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {individual.email}
                      </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-[12rem] overflow-hidden text-ellipsis">
                    {individual.league_name}
                  </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {individual.skill_level_name ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            {individual.skill_level_name}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {individual.payment_status ? (
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              individual.payment_status === "paid"
                                ? "bg-green-100 text-green-800"
                                : individual.payment_status === "partial"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : individual.payment_status === "overdue"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {individual.payment_status.charAt(0).toUpperCase() +
                              individual.payment_status.slice(1)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {individual.amount_due !== undefined &&
                        individual.amount_paid !== undefined ? (
                          <span>
                            ${individual.amount_paid} / ${individual.amount_due}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <TooltipProvider>
                            <div className="flex items-center gap-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    aria-label="Edit"
                                    onClick={() =>
                                      navigate(`/leagues/${individual.league_id}/teams`)
                                    }
                                    size="sm"
                                    variant="outline"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    aria-label="Transfer"
                                    onClick={() => handleTransferIndividual(individual)}
                                    size="sm"
                                    variant="outline"
                                  >
                                    <ArrowRightLeft className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Transfer</TooltipContent>
                              </Tooltip>
                            </div>
                          </TooltipProvider>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {paginatedIndividuals.length === 0 && !loading && (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-[#6F6F6F] text-lg">
                    {searchTerm
                      ? "No individual registrations found matching your search"
                      : "No individual registrations found"}
                  </p>
                </div>
              )}
            </div>

            <Pagination
              pagination={individualsPagination}
              onPageChange={handleIndividualsPageChange}
              onPageSizeChange={handleIndividualsPageSizeChange}
              loading={loading}
              itemName="registrations"
            />
          </CardContent>
        </Card>
      )}

      {/* Transfer Team Modal */}
      {selectedTeamForTransfer && (
        <TransferTeamModal
          isOpen={transferModalOpen}
          onClose={() => {
            setTransferModalOpen(false);
            setSelectedTeamForTransfer(null);
          }}
          team={selectedTeamForTransfer}
          onSuccess={handleTransferSuccess}
        />
      )}

      {/* Transfer Individual Modal */}
      {selectedIndividualForTransfer && (
        <TransferIndividualModal
          isOpen={transferIndividualModalOpen}
          onClose={() => {
            setTransferIndividualModalOpen(false);
            setSelectedIndividualForTransfer(null);
          }}
          individual={selectedIndividualForTransfer}
          onSuccess={handleTransferSuccess}
        />
      )}
    </div>
  );
}
