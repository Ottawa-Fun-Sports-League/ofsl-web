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
import { INITIAL_FILTERS } from "./constants";
import { useSearchParams } from "react-router-dom";

const DEFAULT_PAGE_SIZE = 50;

export function useUsersData() {
  const { userProfile } = useAuth();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse filters from URL on initial load
  const getInitialFilters = (): UserFilters => {
    const urlFilters = { ...INITIAL_FILTERS };

    // Parse boolean filters from URL
    Object.keys(INITIAL_FILTERS).forEach((key) => {
      const value = searchParams.get(key);
      if (value !== null) {
        urlFilters[key as keyof UserFilters] = value === "true";
      }
    });

    return urlFilters;
  };

  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("search") || "",
  );
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(
    searchParams.get("search") || "",
  );
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>(
    (searchParams.get("sortField") as SortField) || "date_created",
  );
  const [sortDirection, setSortDirection] = useState<SortDirection>(
    (searchParams.get("sortDirection") as SortDirection) || "desc",
  );
  const [filters, setFilters] = useState<UserFilters>(getInitialFilters());
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: parseInt(searchParams.get("page") || "1"),
    pageSize: parseInt(
      searchParams.get("pageSize") || DEFAULT_PAGE_SIZE.toString(),
    ),
    totalItems: 0,
    totalPages: 0,
  });

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

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

  // Update URL params when filters/search/sort/pagination change
  useEffect(() => {
    const params = new URLSearchParams();

    // Add search term
    if (searchTerm) {
      params.set("search", searchTerm);
    }

    // Add pagination params
    if (pagination.currentPage > 1) {
      params.set("page", pagination.currentPage.toString());
    }
    if (pagination.pageSize !== DEFAULT_PAGE_SIZE) {
      params.set("pageSize", pagination.pageSize.toString());
    }

    // Add sort params
    if (sortField !== "date_created") {
      params.set("sortField", sortField);
    }
    if (sortDirection !== "desc") {
      params.set("sortDirection", sortDirection);
    }

    // Add filter params (only non-default values)
    Object.keys(filters).forEach((key) => {
      const filterKey = key as keyof UserFilters;
      if (filters[filterKey] !== INITIAL_FILTERS[filterKey]) {
        params.set(key, filters[filterKey].toString());
      }
    });

    // Update URL without causing navigation
    setSearchParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    searchTerm,
    filters,
    sortField,
    sortDirection,
    pagination.currentPage,
    pagination.pageSize,
  ]);

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
          p_volleyball_players_in_league: filters.volleyballPlayersInLeague,
          p_badminton_players_in_league: filters.badmintonPlayersInLeague,
          p_volleyball_players_all: filters.volleyballPlayersAll,
          p_badminton_players_all: filters.badmintonPlayersAll,
          p_players_not_in_league: filters.playersNotInLeague,
        },
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
      const totalPages = Math.ceil(totalCount / pagination.pageSize);

      // Map the paginated data to User objects
      const processedUsers: User[] = paginatedData
        .map((row: any) => {
          const userId = row.profile_id || row.auth_id;
          if (!userId) return null;

          return {
            id: userId,
            profile_id: row.profile_id,
            auth_id: row.auth_id,
            name: row.name,
            email: row.email,
            phone: row.phone || "",
            preferred_position: null,
            is_admin: row.is_admin || false,
            is_facilitator: row.is_facilitator || false,
            date_created: row.date_created,
            date_modified: row.date_modified || row.date_created,
            team_ids: row.team_ids,
            league_ids: row.league_ids,
            user_sports_skills: row.user_sports_skills,
            status: row.status as any,
            confirmed_at: row.confirmed_at,
            last_sign_in_at: row.last_sign_in_at,
            current_registrations: row.current_registrations || null,
            total_owed: Number(row.total_owed) || 0,
            total_paid: Number(row.total_paid) || 0,
          };
        })
        .filter((user: User | null): user is User => user !== null);

      setUsers(processedUsers);
      setPagination((prev) => ({
        ...prev,
        totalItems: totalCount,
        totalPages: totalPages,
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
      [filterKey]: !prev[filterKey],
    }));
    // Reset to first page when filters change
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS);
    // Reset to first page when clearing filters
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  }, []);

  const isAnyFilterActive = useCallback(() => {
    return (
      filters.administrator ||
      filters.facilitator ||
      filters.activePlayer ||
      filters.pendingUsers ||
      filters.volleyballPlayersInLeague ||
      filters.badmintonPlayersInLeague ||
      filters.playersNotInLeague ||
      filters.volleyballPlayersAll ||
      filters.badmintonPlayersAll
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
    clearFilters,
    isAnyFilterActive,
    handlePageChange,
    handlePageSizeChange,
  };
}

