import { useState, useEffect } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../components/ui/toast';
import { supabase } from '../../../../lib/supabase';
import { User, UserFilters, SortField, SortDirection } from './types';
import { INITIAL_FILTERS } from './constants';

export function useUsersData() {
  const { userProfile } = useAuth();
  const { showToast } = useToast();
  
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>('date_created');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filters, setFilters] = useState<UserFilters>(INITIAL_FILTERS);

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    filterAndSortUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, searchTerm, filters, sortField, sortDirection]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      const { data: adminCheck, error: adminError } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', userProfile?.id)
        .single();

      if (adminError || !adminCheck?.is_admin) {
        console.error('Error checking admin status:', adminError);
        showToast('You must be an admin to view users', 'error');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('date_created', { ascending: false });

      if (error) throw error;
      
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      showToast('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortUsers = () => {
    let filtered = users.filter(user => 
      (user.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.phone?.includes(searchTerm))
    );
    
    // Apply filters
    if (filters.administrator) {
      filtered = filtered.filter(user => user.is_admin === true);
    }
    if (filters.facilitator) {
      filtered = filtered.filter(user => user.is_facilitator === true);
    }
    if (filters.activePlayer) {
      filtered = filtered.filter(user => user.team_ids && user.team_ids.length > 0);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: string | number | Date;
      let bValue: string | number | Date;
      
      switch (sortField) {
        case 'name':
          aValue = a.name?.toLowerCase() || '';
          bValue = b.name?.toLowerCase() || '';
          break;
        case 'email':
          aValue = a.email?.toLowerCase() || '';
          bValue = b.email?.toLowerCase() || '';
          break;
        case 'phone':
          aValue = a.phone || '';
          bValue = b.phone || '';
          break;
        case 'date_created':
          aValue = new Date(a.date_created);
          bValue = new Date(b.date_created);
          break;
        case 'is_admin':
          aValue = a.is_admin ? 1 : 0;
          bValue = b.is_admin ? 1 : 0;
          break;
        case 'is_facilitator':
          aValue = a.is_facilitator ? 1 : 0;
          bValue = b.is_facilitator ? 1 : 0;
          break;
        case 'team_count':
          aValue = a.team_ids?.length || 0;
          bValue = b.team_ids?.length || 0;
          break;
        default:
          aValue = a.date_created;
          bValue = b.date_created;
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    setFilteredUsers(filtered);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleFilterChange = (filterKey: keyof UserFilters) => {
    setFilters(prev => ({
      ...prev,
      [filterKey]: !prev[filterKey]
    }));
  };

  const clearFilters = () => {
    setFilters(INITIAL_FILTERS);
  };

  const isAnyFilterActive = () => {
    return filters.administrator || filters.facilitator || filters.activePlayer;
  };

  return {
    users,
    filteredUsers,
    searchTerm,
    loading,
    sortField,
    sortDirection,
    filters,
    setSearchTerm,
    loadUsers,
    handleSort,
    handleFilterChange,
    clearFilters,
    isAnyFilterActive
  };
}