import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../../../../contexts/AuthContext";
import { useToast } from "../../../../components/ui/toast";
import { supabase } from "../../../../lib/supabase";
import {
  User,
  UserFilters,
  SortField,
  SortDirection,
  PaginationState,
} from "./types";
import { INITIAL_FILTERS, USER_SEARCH_DEBOUNCE_MS } from "./constants";
// import { useSearchParams } from "react-router-dom"; // Temporarily disabled

const DEFAULT_PAGE_SIZE = 50;
const USERS_SEARCH_STORAGE_KEY = "usersTab:search";
const USERS_FILTERS_STORAGE_KEY = "usersTab:filters";

const readLocalStorage = (key: string): string | null => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    console.warn(`Failed to read localStorage key "${key}"`, error);
    return null;
  }
};

const writeLocalStorage = (key: string, value: string) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    console.warn(`Failed to write localStorage key "${key}"`, error);
  }
};

export function useUsersData() {
  const { userProfile } = useAuth();
  const { showToast } = useToast();
  // const [searchParams, setSearchParams] = useSearchParams(); // Temporarily disabled

  // Parse filters from URL on initial load (temporarily disabled - use defaults)
  const getInitialFilters = (): UserFilters => {
    const stored = readLocalStorage(USERS_FILTERS_STORAGE_KEY);
    if (!stored) {
      return { ...INITIAL_FILTERS };
    }

    try {
      const parsed = JSON.parse(stored) as Partial<UserFilters>;
      return {
        ...INITIAL_FILTERS,
        ...parsed,
        // Ensure array fields default correctly
        sportsInLeague: Array.isArray(parsed?.sportsInLeague) ? parsed!.sportsInLeague : [],
        sportsWithSkill: Array.isArray(parsed?.sportsWithSkill) ? parsed!.sportsWithSkill : [],
      };
    } catch (error) {
      console.warn("Failed to parse stored user filters", error);
      return { ...INITIAL_FILTERS };
    }
  };

  const initialSearchTerm = readLocalStorage(USERS_SEARCH_STORAGE_KEY) ?? "";
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(initialSearchTerm);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>("date_created");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [filters, setFilters] = useState<UserFilters>(getInitialFilters());
  
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    totalItems: 0,
    totalPages: 0,
  });

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, USER_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Persist search term
  useEffect(() => {
    writeLocalStorage(USERS_SEARCH_STORAGE_KEY, searchTerm);
  }, [searchTerm]);

  // Persist filters
  useEffect(() => {
    writeLocalStorage(USERS_FILTERS_STORAGE_KEY, JSON.stringify(filters));
  }, [filters]);

  // Load users when dependencies change
  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    debouncedSearchTerm,
    filters,
    sortField,
    sortDirection,
    pagination.currentPage,
    pagination.pageSize,
  ]);

  // TODO: Temporarily disabled URL synchronization to fix pagination issue
  // Will re-enable with proper state management later
  /*
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set("search", searchTerm);
    if (pagination.currentPage > 1) params.set("page", pagination.currentPage.toString());
    if (pagination.pageSize !== DEFAULT_PAGE_SIZE) params.set("pageSize", pagination.pageSize.toString());
    if (sortField !== "date_created") params.set("sortField", sortField);
    if (sortDirection !== "desc") params.set("sortDirection", sortDirection);
    Object.keys(filters).forEach((key) => {
      const filterKey = key as keyof UserFilters;
      if (filters[filterKey] !== INITIAL_FILTERS[filterKey]) {
        params.set(key, filters[filterKey].toString());
      }
    });
    setSearchParams(params, { replace: true });
  }, [searchTerm, filters, sortField, sortDirection, pagination.currentPage, pagination.pageSize]);
  */

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);

      // Check admin permissions first
      const { data: adminCheck, error: adminError } = await supabase
        .from("users")
        .select("is_admin")
        .eq("id", userProfile?.id)
        .single();

      if (adminError || !adminCheck?.is_admin) {
        showToast("You must be an admin to view users", "error");
        setLoading(false);
        return;
      }

      // Calculate offset for pagination
      const offset = (pagination.currentPage - 1) * pagination.pageSize;

      // Call the paginated function
      const { data: paginatedData, error: paginatedError } = await supabase.rpc(
        "get_users_paginated_admin",
        {
          p_limit: pagination.pageSize,
          p_offset: offset,
          p_search: debouncedSearchTerm.trim() || "",
          p_sort_field: sortField,
          p_sort_direction: sortDirection,
          p_administrator: filters.administrator,
          p_facilitator: filters.facilitator,
          p_active_player: filters.activePlayer,
          p_pending_users: filters.pendingUsers,
          p_players_not_in_league: filters.playersNotInLeague,
          p_sports_in_league: filters.sportsInLeague,
          p_sports_has_skill: filters.sportsWithSkill,
        }
      );

      if (paginatedError) {
        console.error("Pagination error:", paginatedError);
        showToast("Failed to load users", "error");
        return;
      }

      if (!paginatedData || paginatedData.length === 0) {
        setUsers([]);
        setPagination((prev) => ({
          ...prev,
          totalItems: 0,
          totalPages: 0,
        }));
        return;
      }

      // Extract total count from first row (all rows have same total_count)
      const totalCount = paginatedData[0]?.total_count || 0;

      // Map the paginated data to User objects
      const processedUsers: User[] = paginatedData
        .map((row: Record<string, unknown>) => {
          const userId = row.profile_id || row.auth_id;
          if (!userId) return null;

          return {
            id: String(userId),
            profile_id: row.profile_id ? String(row.profile_id) : null,
            auth_id: row.auth_id ? String(row.auth_id) : null,
            name: row.name ? String(row.name) : null,
            email: String(row.email),
            phone: row.phone ? String(row.phone) : "",
            preferred_position: null,
            is_admin: Boolean(row.is_admin),
            is_facilitator: Boolean(row.is_facilitator),
            date_created: String(row.date_created),
            date_modified: String(row.date_modified || row.date_created),
            team_ids: row.team_ids as string[] | null,
            league_ids: row.league_ids as (string | number)[] | null,
            user_sports_skills: row.user_sports_skills as Record<string, unknown>[] | null,
            status: row.status as 'active' | 'pending' | 'unconfirmed' | 'confirmed_no_profile' | 'profile_incomplete',
            confirmed_at: row.confirmed_at ? String(row.confirmed_at) : null,
            last_sign_in_at: row.last_sign_in_at ? String(row.last_sign_in_at) : null,
            current_registrations: row.current_registrations as Record<string, unknown>[] | null,
            total_owed: Number(row.total_owed) || 0,
            total_paid: Number(row.total_paid) || 0,
          };
        })
        .filter((user: User | null): user is User => user !== null);

      setUsers(processedUsers);
      setPagination((prev) => ({
        ...prev,
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / prev.pageSize),
      }));
    } catch (error) {
      console.error("Load users error:", error);
      showToast("Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  }, [
    userProfile?.id,
    pagination.currentPage,
    pagination.pageSize,
    debouncedSearchTerm,
    sortField,
    sortDirection,
    filters,
    showToast,
  ]);

  // No longer need filterAndSortUsers since it's done server-side

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDirection(sortDirection === "asc" ? "desc" : "asc");
      } else {
        setSortField(field);
        setSortDirection("asc");
      }
      // Reset to first page when sorting changes
      setPagination((prev) => ({ ...prev, currentPage: 1 }));
    },
    [sortField, sortDirection],
  );

  const handleFilterChange = useCallback((filterKey: keyof UserFilters) => {
    setFilters((prev) => ({
      ...prev,
      [filterKey]: typeof prev[filterKey] === 'boolean' ? !prev[filterKey] : prev[filterKey],
    }));
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  }, []);

  const toggleSportInLeague = useCallback((sportId: number) => {
    setFilters((prev) => {
      const exists = prev.sportsInLeague.includes(sportId);
      return { ...prev, sportsInLeague: exists ? prev.sportsInLeague.filter(id => id !== sportId) : [...prev.sportsInLeague, sportId] };
    });
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  }, []);

  const toggleSportWithSkill = useCallback((sportId: number) => {
    setFilters((prev) => {
      const exists = prev.sportsWithSkill.includes(sportId);
      return { ...prev, sportsWithSkill: exists ? prev.sportsWithSkill.filter(id => id !== sportId) : [...prev.sportsWithSkill, sportId] };
    });
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      ...INITIAL_FILTERS,
      sportsInLeague: [],
      sportsWithSkill: [],
    });
    // Reset to first page when clearing filters
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  }, []);

  const isAnyFilterActive = useCallback(() => {
    return (
      filters.administrator ||
      filters.facilitator ||
      filters.activePlayer ||
      filters.pendingUsers ||
      filters.playersNotInLeague ||
      (filters.sportsInLeague && filters.sportsInLeague.length > 0) ||
      (filters.sportsWithSkill && filters.sportsWithSkill.length > 0)
    );
  }, [filters]);

  // Pagination handlers
  const handlePageChange = useCallback((page: number) => {
    setPagination((prev) => ({ ...prev, currentPage: page }));
  }, []);

  const handlePageSizeChange = useCallback((pageSize: number) => {
    setPagination((prev) => ({
      ...prev,
      pageSize,
      currentPage: 1, // Reset to first page
    }));
  }, []);

  const handleSearchChange = useCallback((term: string) => {
    setSearchTerm(term);
    // Reset to first page when search changes
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  }, []);

  // Memoized filtered users for legacy compatibility (now same as users since filtering is server-side)
  const filteredUsers = useMemo(() => users, [users]);

  return {
    users,
    filteredUsers,
    searchTerm,
    loading,
    sortField,
    sortDirection,
    filters,
    pagination,
    setSearchTerm: handleSearchChange,
    loadUsers,
    handleSort,
    handleFilterChange,
    toggleSportInLeague,
    toggleSportWithSkill,
    clearFilters,
    isAnyFilterActive,
    handlePageChange,
    handlePageSizeChange,
  };
}
