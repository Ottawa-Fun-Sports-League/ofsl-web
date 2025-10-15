import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '../../../../components/ui/card';
import { useAuth } from '../../../../contexts/AuthContext';
import { ImprovedMobileFilterDrawer } from './components/ImprovedMobileFilterDrawer';
import { UsersHeader } from './components/UsersHeader';
import { ImprovedFilters } from './components/ImprovedFilters';
import { UsersTable } from './components/UsersTable';
import { EditUserModal } from './components/EditUserModal';
import { ExportColumnsModal } from './components/ExportColumnsModal';
import { BulkEmailModal } from './components/BulkEmailModal';
import { ManualQueueModal } from './components/ManualQueueModal';
import { useUsersData } from './useUsersData';
import { useUserOperations } from './useUserOperations';
import { exportUsersToCSV, generateExportFilename } from './utils/exportCsv';
import { useToast } from '../../../../components/ui/toast';
import { supabase } from '../../../../lib/supabase';
import { DEFAULT_BULK_EMAIL_BODY, DEFAULT_BULK_EMAIL_SUBJECT } from './constants';
import { BulkEmailRecipient, User } from './types';
import { mapUsersToEmailRecipients, sendBulkEmail, BulkEmailResultSummary } from './utils/sendBulkEmail';

export function UsersTab() {
  const { userProfile } = useAuth();
  const { showToast } = useToast();
  const [showMobileFilterDrawer, setShowMobileFilterDrawer] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showBulkEmailModal, setShowBulkEmailModal] = useState(false);
  const [bulkEmailSubject, setBulkEmailSubject] = useState(DEFAULT_BULK_EMAIL_SUBJECT);
  const [bulkEmailBody, setBulkEmailBody] = useState(DEFAULT_BULK_EMAIL_BODY);
  const [sendCopyToInfo, setSendCopyToInfo] = useState(true);
  const [sendCopyToFacilitator, setSendCopyToFacilitator] = useState(true);
  const [bulkEmailRecipients, setBulkEmailRecipients] = useState<BulkEmailRecipient[]>([]);
  const [manualBulkEmailRecipients, setManualBulkEmailRecipients] = useState<BulkEmailRecipient[]>([]);
  const [bulkEmailMissingEmails, setBulkEmailMissingEmails] = useState(0);
  const [loadingBulkEmailRecipients, setLoadingBulkEmailRecipients] = useState(false);
  const [sendingBulkEmail, setSendingBulkEmail] = useState(false);
  const [bulkEmailResult, setBulkEmailResult] = useState<BulkEmailResultSummary | null>(null);
  const [includeFilteredRecipients, setIncludeFilteredRecipients] = useState(true);
  const [showManualQueueModal, setShowManualQueueModal] = useState(false);

  const {
    filteredUsers,
    fetchAllFilteredUsers,
    searchTerm,
    loading,
    sortField,
    sortDirection,
    filters,
    pagination,
    setSearchTerm,
    loadUsers,
    handleSort,
    handleFilterChange,
    toggleSportInLeague,
    toggleSportWithSkill,
    toggleLeagueFilter,
    toggleTeamFilter,
    toggleLeagueTierFilter,
    clearFilters,
    isAnyFilterActive,
    handlePageChange,
    handlePageSizeChange
  } = useUsersData();

  const loadBulkEmailRecipients = useCallback(async () => {
    setLoadingBulkEmailRecipients(true);
    try {
      const users = await fetchAllFilteredUsers();
      const { recipients, invalidCount } = mapUsersToEmailRecipients(
        users.map((u) => ({ id: u.id, email: u.email, name: u.name }))
      );
      setBulkEmailRecipients(recipients);
      setBulkEmailMissingEmails(invalidCount);
      return { recipients, invalidCount };
    } catch (error) {
      console.error('Failed to load bulk email recipients', error);
      setBulkEmailRecipients([]);
      setBulkEmailMissingEmails(0);
      showToast('Failed to load email recipients. Please try again.', 'error');
      throw error;
    } finally {
      setLoadingBulkEmailRecipients(false);
    }
  }, [fetchAllFilteredUsers, showToast]);

  const {
    editingUser,
    editForm,
    userRegistrations,
    deleting,
    resettingPassword,
    captchaSolved,
    setEditForm,
    handleEditUser,
    handleSaveUser,
    handleDeleteUser,
    handleResetPassword,
    handleCaptchaVerify,
    handleCaptchaError,
    handleCaptchaExpire,
    handleCancelEdit
  } = useUserOperations(loadUsers);

  const manualRecipientEmails = useMemo(
    () => new Set(manualBulkEmailRecipients.map((recipient) => recipient.email.toLowerCase())),
    [manualBulkEmailRecipients]
  );

  const filteredEmailSet = useMemo(() => {
    const set = new Set<string>();
    bulkEmailRecipients.forEach((recipient) => {
      if (!recipient?.email) return;
      set.add(recipient.email.trim().toLowerCase());
    });
    return set;
  }, [bulkEmailRecipients]);

  const manualOverlapCount = useMemo(() => {
    let overlap = 0;
    manualRecipientEmails.forEach((email) => {
      if (filteredEmailSet.has(email)) {
        overlap += 1;
      }
    });
    return overlap;
  }, [filteredEmailSet, manualRecipientEmails]);

  const manualRecipientCount = manualRecipientEmails.size;

  const handleAddManualRecipient = useCallback((user: User) => {
    const email = user.email?.trim();
    if (!email) {
      showToast('Selected user does not have an email address.', 'warning');
      return;
    }

    const lower = email.toLowerCase();
    let added = false;
    setManualBulkEmailRecipients((prev) => {
      if (prev.some((recipient) => recipient.email.toLowerCase() === lower)) {
        showToast('User already added to bulk email list.', 'info');
        return prev;
      }

      added = true;
      return [
        ...prev,
        {
          email,
          name: user.name ?? null,
          userId: user.id,
        },
      ];
    });

    if (added) {
      setIncludeFilteredRecipients(false);
      showToast('User added to bulk email list.', 'success');
    }
  }, [setIncludeFilteredRecipients, showToast]);

  const handleRemoveManualRecipient = useCallback((email: string) => {
    const lower = email.trim().toLowerCase();
    setManualBulkEmailRecipients((prev) => {
      const next = prev.filter((recipient) => recipient.email.toLowerCase() !== lower);
      if (next.length === 0) {
        setIncludeFilteredRecipients(true);
      }
      return next;
    });
    showToast('Recipient removed from bulk email queue.', 'info');
  }, [showToast]);

  const handleClearManualRecipients = useCallback(() => {
    setManualBulkEmailRecipients([]);
    setIncludeFilteredRecipients(true);
    showToast('Bulk email queue cleared.', 'info');
  }, [showToast]);

  const handleAddFilteredUsersToManual = useCallback(async () => {
    try {
      const users = await fetchAllFilteredUsers();
      if (!users.length) {
        showToast('No users found for the current filters.', 'info');
        return;
      }

      const { recipients, invalidCount } = mapUsersToEmailRecipients(
        users.map((u) => ({ id: u.id, email: u.email, name: u.name }))
      );

      let addedCount = 0;
      setManualBulkEmailRecipients((prev) => {
        const map = new Map(prev.map((recipient) => [recipient.email.toLowerCase(), recipient]));
        recipients.forEach((recipient) => {
          const trimmed = recipient.email.trim();
          const key = trimmed.toLowerCase();
          if (!map.has(key)) {
            map.set(key, { ...recipient, email: trimmed });
            addedCount += 1;
          }
        });
        return Array.from(map.values());
      });

      if (addedCount > 0) {
        setIncludeFilteredRecipients(false);
        showToast(`Added ${addedCount} user${addedCount === 1 ? '' : 's'} to the bulk email queue.`, 'success');
        if (invalidCount > 0) {
          showToast(`${invalidCount} user${invalidCount === 1 ? '' : 's'} without email were skipped.`, 'warning');
        }
      } else {
        showToast('All filtered users are already in the bulk email queue.', 'info');
        if (invalidCount > 0) {
          showToast(`${invalidCount} user${invalidCount === 1 ? '' : 's'} without email were skipped.`, 'warning');
        }
      }
    } catch (error) {
      console.error('Failed to add filtered users to bulk email queue', error);
      showToast('Unable to add users to the bulk email queue. Please try again.', 'error');
    }
  }, [fetchAllFilteredUsers, setIncludeFilteredRecipients, showToast]);

  const handleOpenBulkEmailModal = useCallback(async () => {
    setBulkEmailSubject(DEFAULT_BULK_EMAIL_SUBJECT);
    setBulkEmailBody(DEFAULT_BULK_EMAIL_BODY);
    setSendCopyToInfo(true);
    setSendCopyToFacilitator(true);
    setBulkEmailResult(null);
    setShowBulkEmailModal(true);
    try {
      await loadBulkEmailRecipients();
    } catch {
      // errors handled inside loader
    }
  }, [loadBulkEmailRecipients]);

  const handleCloseBulkEmailModal = useCallback(() => {
    if (sendingBulkEmail) return;
    setShowBulkEmailModal(false);
  }, [sendingBulkEmail]);

  const handleSendBulkEmail = useCallback(async () => {
    const combinedMap = new Map<string, BulkEmailRecipient>();

    if (includeFilteredRecipients) {
      for (const recipient of bulkEmailRecipients) {
        if (!recipient?.email) continue;
        const trimmed = recipient.email.trim();
        if (!trimmed) continue;
        combinedMap.set(trimmed.toLowerCase(), { ...recipient, email: trimmed });
      }
    }

    for (const recipient of manualBulkEmailRecipients) {
      if (!recipient?.email) continue;
      const trimmed = recipient.email.trim();
      if (!trimmed) continue;
      combinedMap.set(trimmed.toLowerCase(), { ...recipient, email: trimmed });
    }

    if (combinedMap.size === 0) {
      showToast('No recipients available for this email.', 'error');
      return;
    }

    const combinedRecipients = Array.from(combinedMap.values());

    setSendingBulkEmail(true);
    try {
      const result = await sendBulkEmail({
        subject: bulkEmailSubject.trim(),
        htmlBody: bulkEmailBody,
        sendCopyToInfo,
        sendCopyToFacilitator,
        recipients: combinedRecipients.map((recipient) => ({
          email: recipient.email,
          name: recipient.name ?? null,
          userId: recipient.userId,
        })),
      });

      setBulkEmailResult(result);

      if (result.sent > 0 && result.failed === 0) {
        showToast(`Email sent to ${result.sent} user${result.sent === 1 ? '' : 's'}.`, 'success');
      } else if (result.sent > 0 && result.failed > 0) {
        showToast(`Emails sent to ${result.sent} users. ${result.failed} failed.`, 'warning');
      } else {
        showToast('No emails were sent.', 'warning');
      }
    } catch (error) {
      console.error('Failed to send bulk email', error);
      const message = error instanceof Error ? error.message : 'Failed to send emails. Please try again.';
      showToast(message, 'error');
    } finally {
      setSendingBulkEmail(false);
    }
  }, [bulkEmailRecipients, manualBulkEmailRecipients, bulkEmailSubject, bulkEmailBody, showToast, sendCopyToInfo, sendCopyToFacilitator, includeFilteredRecipients]);

  const handleRefreshBulkEmailRecipients = useCallback(async () => {
    try {
      await loadBulkEmailRecipients();
      showToast('Recipient list refreshed.', 'success');
    } catch {
      // errors handled in loader
    }
  }, [loadBulkEmailRecipients, showToast]);

  const handleExportCSV = async (selectedColumns: string[]) => {
    try {
      showToast('Preparing export...', 'info');
      const usersToExport = await fetchAllFilteredUsers();
      if (!usersToExport.length) {
        showToast('No users found for the current filters.', 'info');
        return;
      }

      const filename = generateExportFilename();
      const registrationCounts = Object.fromEntries(
        usersToExport.map((user) => [user.id, user.current_registrations?.length || 0])
      );
      exportUsersToCSV(usersToExport, selectedColumns, filename, { registrationCounts });
      showToast(`Exported ${usersToExport.length} users to ${filename}`, 'success');
    } catch (error) {
      console.error('Failed to export users CSV', error);
      showToast('Failed to export CSV. Please try again.', 'error');
    }
  };

  // Registration counts loaded via Edge Function for accuracy
  const [, setLoadingCounts] = useState(false);
  const [regCounts, setRegCounts] = useState<Record<string, number>>({});
  const [registrationLoadingIds, setRegistrationLoadingIds] = useState<Record<string, boolean>>({});

  const visibleUserIds = useMemo(
    () => filteredUsers.map((u) => u.id).filter(Boolean),
    [filteredUsers]
  );

  useEffect(() => {
    // Fetch counts for users that we haven't fetched yet
    const missing = visibleUserIds.filter((id) => regCounts[id] === undefined);
    if (!missing.length) return;

    let cancelled = false;
    const loadCounts = async () => {
      try {
        setLoadingCounts(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

        const entries: Array<[string, number]> = [];
        const batchSize = 10;
        // Mark these IDs as loading
        setRegistrationLoadingIds((prev) => ({
          ...prev,
          ...Object.fromEntries(missing.map((id) => [id, true]))
        }));
        for (let i = 0; i < missing.length; i += batchSize) {
          const batch = missing.slice(i, i + batchSize);
          const results = await Promise.allSettled(
            batch.map(async (userId) => {
              const res = await fetch(`${supabaseUrl}/functions/v1/admin-user-registrations`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`,
                  'apikey': supabaseAnonKey,
                },
                body: JSON.stringify({ userId }),
              });
              if (!res.ok) return [userId, 0] as [string, number];
              const json = await res.json();
              const teamCount = Array.isArray(json?.team_registrations) ? json.team_registrations.length : 0;
              const indivCount = Array.isArray(json?.individual_registrations) ? json.individual_registrations.length : 0;
              return [userId, teamCount + indivCount] as [string, number];
            })
          );
          for (const r of results) {
            if (r.status === 'fulfilled') entries.push(r.value);
          }
        }
        if (!cancelled && entries.length) {
          setRegCounts((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
          // Clear loading flags for completed IDs
          setRegistrationLoadingIds((prev) => {
            const updated = { ...prev };
            for (const [id] of entries) updated[id] = false;
            return updated;
          });
        }
      } catch {
        // ignore errors per user; counts will stay 0/fallback
      } finally {
        if (!cancelled) setLoadingCounts(false);
      }
    };

    loadCounts();
    return () => {
      cancelled = true;
    };
  }, [visibleUserIds, regCounts]);

  if (!userProfile?.is_admin) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-[#6F6F6F] text-lg">Access denied. Admin privileges required.</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B20000]"></div>
      </div>
    );
  }

  const hasActiveFilters = isAnyFilterActive();

  return (
    <div className="w-full">
      {/* Container with negative margins to extend beyond normal page bounds */}
      <div className="2xl:-mx-32 xl:-mx-24 lg:-mx-16 md:-mx-8 space-y-6">
        <div className="px-4 md:px-6 lg:px-8">
          <UsersHeader
            userCount={pagination.totalItems}
            onOpenMobileFilter={() => setShowMobileFilterDrawer(true)}
            onRefresh={loadUsers}
            onExportCSV={() => setShowExportModal(true)}
            onSendBulkEmail={handleOpenBulkEmailModal}
            onAddFilteredToBulkQueue={handleAddFilteredUsersToManual}
            onClearBulkEmailQueue={handleClearManualRecipients}
            onViewBulkEmailQueue={() => setShowManualQueueModal(true)}
            manualQueueCount={manualRecipientCount}
            activeFilterCount={[
              filters.administrator,
              filters.facilitator,
              filters.activePlayer,
              filters.pendingUsers,
              filters.playersNotInLeague,
            ].filter(Boolean).length +
              (filters.sportsInLeague?.length || 0) +
              (filters.sportsWithSkill?.length || 0) +
              (filters.leagueIds?.length || 0) +
              (filters.teamIds?.length || 0) +
              (filters.leagueTierFilters?.length || 0)}
          />

          <ImprovedFilters
            searchTerm={searchTerm}
            filters={filters}
            isAnyFilterActive={hasActiveFilters}
            onSearchChange={setSearchTerm}
            onFilterChange={handleFilterChange}
            onToggleSportInLeague={toggleSportInLeague}
            onToggleSportWithSkill={toggleSportWithSkill}
            onToggleLeague={toggleLeagueFilter}
            onToggleTeam={toggleTeamFilter}
            onToggleLeagueTier={toggleLeagueTierFilter}
            onClearFilters={clearFilters}
          />
        </div>

        <ImprovedMobileFilterDrawer
          isOpen={showMobileFilterDrawer}
          onClose={() => setShowMobileFilterDrawer(false)}
          filters={filters}
          handleFilterChange={handleFilterChange}
          onToggleSportInLeague={toggleSportInLeague}
          onToggleSportWithSkill={toggleSportWithSkill}
          onToggleLeague={toggleLeagueFilter}
          onToggleTeam={toggleTeamFilter}
          onToggleLeagueTier={toggleLeagueTierFilter}
          clearFilters={clearFilters}
          isAnyFilterActive={isAnyFilterActive}
        />

        {/* Table section with minimal padding for maximum width */}
        <div className="px-2 sm:px-4">
          <UsersTable
            users={filteredUsers}
            sortField={sortField}
            sortDirection={sortDirection}
            deleting={deleting}
            onSort={handleSort}
            onEditUser={handleEditUser}
            onDeleteUser={handleDeleteUser}
            searchTerm={searchTerm}
            pagination={pagination}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            loading={loading}
          registrationCounts={regCounts}
          registrationLoadingIds={registrationLoadingIds}
          manualRecipientEmails={manualRecipientEmails}
          onAddManualRecipient={handleAddManualRecipient}
          onRemoveManualRecipient={handleRemoveManualRecipient}
        />
        </div>

        <EditUserModal
          isOpen={!!editingUser}
          editForm={editForm}
          userRegistrations={userRegistrations}
          resettingPassword={resettingPassword}
          isAdmin={!!userProfile?.is_admin}
          userId={editingUser}
          onFormChange={setEditForm}
          onSave={handleSaveUser}
          onCancel={handleCancelEdit}
          onResetPassword={handleResetPassword}
          onCaptchaVerify={handleCaptchaVerify}
          onCaptchaError={handleCaptchaError}
          onCaptchaExpire={handleCaptchaExpire}
          captchaSolved={captchaSolved}
        />

        <ExportColumnsModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          onExport={handleExportCSV}
          userCount={pagination.totalItems}
        />

        <BulkEmailModal
          isOpen={showBulkEmailModal}
          onClose={handleCloseBulkEmailModal}
          loadingRecipients={loadingBulkEmailRecipients}
          missingEmailCount={bulkEmailMissingEmails}
          onRefreshRecipients={handleRefreshBulkEmailRecipients}
          subject={bulkEmailSubject}
          onSubjectChange={setBulkEmailSubject}
          body={bulkEmailBody}
          onBodyChange={setBulkEmailBody}
          onSend={handleSendBulkEmail}
          sending={sendingBulkEmail}
          sendCopyToInfo={sendCopyToInfo}
          onToggleSendCopyToInfo={setSendCopyToInfo}
          sendCopyToFacilitator={sendCopyToFacilitator}
          onToggleSendCopyToFacilitator={setSendCopyToFacilitator}
          filteredRecipientCount={bulkEmailRecipients.length}
          manualRecipientCount={manualRecipientCount}
          manualOverlapCount={manualOverlapCount}
          includeFilteredRecipients={includeFilteredRecipients}
          onToggleIncludeFilteredRecipients={setIncludeFilteredRecipients}
          resultSummary={bulkEmailResult}
        />

        <ManualQueueModal
          isOpen={showManualQueueModal}
          onClose={() => setShowManualQueueModal(false)}
          recipients={manualBulkEmailRecipients}
          onRemoveRecipient={handleRemoveManualRecipient}
          onClearRecipients={handleClearManualRecipients}
        />
      </div>
    </div>
  );
}
