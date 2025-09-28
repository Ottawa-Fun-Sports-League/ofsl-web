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
import { useUsersData } from './useUsersData';
import { useUserOperations } from './useUserOperations';
import { exportUsersToCSV, generateExportFilename } from './utils/exportCsv';
import { useToast } from '../../../../components/ui/toast';
import { supabase } from '../../../../lib/supabase';
import { DEFAULT_BULK_EMAIL_BODY, DEFAULT_BULK_EMAIL_SUBJECT } from './constants';
import { BulkEmailRecipient } from './types';
import { mapUsersToEmailRecipients, sendBulkEmail, BulkEmailResultSummary } from './utils/sendBulkEmail';

export function UsersTab() {
  const { userProfile } = useAuth();
  const { showToast } = useToast();
  const [showMobileFilterDrawer, setShowMobileFilterDrawer] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showBulkEmailModal, setShowBulkEmailModal] = useState(false);
  const [bulkEmailSubject, setBulkEmailSubject] = useState(DEFAULT_BULK_EMAIL_SUBJECT);
  const [bulkEmailBody, setBulkEmailBody] = useState(DEFAULT_BULK_EMAIL_BODY);
  const [bulkEmailRecipients, setBulkEmailRecipients] = useState<BulkEmailRecipient[]>([]);
  const [bulkEmailMissingEmails, setBulkEmailMissingEmails] = useState(0);
  const [loadingBulkEmailRecipients, setLoadingBulkEmailRecipients] = useState(false);
  const [sendingBulkEmail, setSendingBulkEmail] = useState(false);
  const [bulkEmailResult, setBulkEmailResult] = useState<BulkEmailResultSummary | null>(null);

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

  const handleOpenBulkEmailModal = useCallback(async () => {
    setBulkEmailSubject(DEFAULT_BULK_EMAIL_SUBJECT);
    setBulkEmailBody(DEFAULT_BULK_EMAIL_BODY);
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
    if (bulkEmailRecipients.length === 0) {
      showToast('No recipients available for this email.', 'error');
      return;
    }

    setSendingBulkEmail(true);
    try {
      const result = await sendBulkEmail({
        subject: bulkEmailSubject.trim(),
        htmlBody: bulkEmailBody,
        recipients: bulkEmailRecipients.map((recipient) => ({
          email: recipient.email,
          name: recipient.name,
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
  }, [bulkEmailRecipients, bulkEmailSubject, bulkEmailBody, showToast]);

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
            activeFilterCount={[
              filters.administrator,
              filters.facilitator,
              filters.activePlayer,
              filters.pendingUsers,
              filters.playersNotInLeague,
            ].filter(Boolean).length + (filters.sportsInLeague?.length || 0) + (filters.sportsWithSkill?.length || 0)}
          />

          <ImprovedFilters
            searchTerm={searchTerm}
            filters={filters}
            isAnyFilterActive={isAnyFilterActive()}
            onSearchChange={setSearchTerm}
            onFilterChange={handleFilterChange}
            onToggleSportInLeague={toggleSportInLeague}
            onToggleSportWithSkill={toggleSportWithSkill}
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
          recipients={bulkEmailRecipients}
          loadingRecipients={loadingBulkEmailRecipients}
          missingEmailCount={bulkEmailMissingEmails}
          onRefreshRecipients={handleRefreshBulkEmailRecipients}
          subject={bulkEmailSubject}
          onSubjectChange={setBulkEmailSubject}
          body={bulkEmailBody}
          onBodyChange={setBulkEmailBody}
          onSend={handleSendBulkEmail}
          sending={sendingBulkEmail}
          resultSummary={bulkEmailResult}
        />
      </div>
    </div>
  );
}
