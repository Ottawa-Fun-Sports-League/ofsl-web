import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '../../../../components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';
import { ConfirmationModal } from './ConfirmationModal';
import { TeamDetails } from './TeamDetails';
import { TeamMembers } from './TeamMembers';
import { useTeamEditData } from './useTeamEditData';
import { useTeamOperations } from './useTeamOperations';
import { UnifiedPaymentSection, usePaymentOperations } from '../../../../components/payments';

export function TeamEditPage() {
  const { id } = useParams<{ id: string }>();
  const { userProfile } = useAuth();
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  const {
    team,
    skills,
    teamMembers,
    paymentInfo,
    paymentHistory,
    loading,
    editTeam,
    setEditTeam,
    setPaymentInfo,
    setPaymentHistory,
    loadData
  } = useTeamEditData(id);

  const {
    saving,
    deleting,
    handleUpdateTeam,
    handleDeleteTeam,
    handleRemoveMember
  } = useTeamOperations(id, team, teamMembers, loadData);

  const {
    depositAmount,
    paymentMethod,
    paymentNotes,
    processingPayment,
    editingNoteId,
    editingPayment,
    showDeleteConfirmation: showPaymentDeleteConfirmation,
    paymentToDelete,
    setDepositAmount,
    setPaymentMethod,
    setPaymentNotes,
    setEditingPayment,
    setShowDeleteConfirmation: setShowPaymentDeleteConfirmation,
    handleProcessPayment,
    handleDeletePayment,
    confirmDeletePayment,
    handleEditPayment,
    handleSavePaymentEdit,
    handleCancelEdit
  } = usePaymentOperations(paymentInfo, paymentHistory, setPaymentInfo, setPaymentHistory);

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

  if (!team) {
    return (
      <div className="bg-white w-full min-h-screen">
        <div className="max-w-[1280px] mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-[#6F6F6F] mb-4">Team Not Found</h1>
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

  return (
    <div className="bg-white w-full min-h-screen">
      <div className="max-w-[1280px] mx-auto px-4 py-8">
        <div className="mb-8">
          <Link 
            to={`/leagues/${team.leagues?.id}?tab=teams`} 
            className="flex items-center text-[#B20000] hover:underline mb-4"
          >
            <ChevronLeft className="h-5 w-5 mr-1" />
            Back to League Details
          </Link>
          
          <h2 className="text-2xl font-bold text-[#6F6F6F]">Edit Team Registration</h2>
        </div>

        <TeamDetails
          team={team}
          editTeam={editTeam}
          skills={skills}
          saving={saving}
          deleting={deleting}
          onUpdateTeam={setEditTeam}
          onSaveTeam={() => handleUpdateTeam(editTeam)}
          onDeleteTeam={() => setShowDeleteConfirmation(true)}
        />

        {paymentInfo && (
          <UnifiedPaymentSection
            paymentInfo={paymentInfo}
            paymentHistory={paymentHistory}
            editingNoteId={editingNoteId}
            editingPayment={editingPayment}
            depositAmount={depositAmount}
            paymentMethod={paymentMethod}
            paymentNotes={paymentNotes}
            processingPayment={processingPayment}
            onEditPayment={handleEditPayment}
            onUpdateEditingPayment={setEditingPayment}
            onSavePaymentEdit={handleSavePaymentEdit}
            onCancelEdit={handleCancelEdit}
            onDeletePayment={confirmDeletePayment}
            onDepositAmountChange={setDepositAmount}
            onPaymentMethodChange={setPaymentMethod}
            onPaymentNotesChange={setPaymentNotes}
            onProcessPayment={handleProcessPayment}
          />
        )}

        <TeamMembers
          teamMembers={teamMembers}
          captainId={team.captain_id}
          onRemoveMember={handleRemoveMember}
        />
      </div>
      
      <ConfirmationModal
        isOpen={showDeleteConfirmation}
        title="Confirm Team Unregistration"
        message={`Are you sure you want to unregister the team "${team?.name}"? This action cannot be undone and will remove all team data including registrations and payment records.`}
        confirmText="Yes, Unregister Team"
        cancelText="Cancel"
        onConfirm={() => {
          setShowDeleteConfirmation(false);
          handleDeleteTeam();
        }}
        onCancel={() => setShowDeleteConfirmation(false)}
      />

      {paymentToDelete && (
        <ConfirmationModal
          isOpen={showPaymentDeleteConfirmation}
          title="Delete Payment Entry"
          message={`Are you sure you want to delete this payment entry of $${paymentToDelete.amount.toFixed(2)}? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={() => {
            handleDeletePayment(paymentToDelete);
          }}
          onCancel={() => {
            setShowPaymentDeleteConfirmation(false);
            setPaymentToDelete(null);
          }}
        />
      )}
    </div>
  );
}