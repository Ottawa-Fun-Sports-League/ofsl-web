import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Card, CardContent } from '../../../../components/ui/card';
import { RichTextEditor } from '../../../../components/ui/rich-text-editor';
import { useToast } from '../../../../components/ui/toast';
import { Save, Edit, Plus, FileText, Users } from 'lucide-react';
import { Pagination } from '../UsersTab/components/Pagination';
import { PaginationState } from '../UsersTab/types';

interface Waiver {
  id: number;
  title: string;
  content: string;
  version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

interface WaiverAcceptance {
  id: number;
  user_id: string;
  waiver_id: number;
  accepted_at: string;
  ip_address: string;
  user_agent: string;
  user_name?: string;
  user_email?: string;
}

export function WaiversTab() {
  const [waivers, setWaivers] = useState<Waiver[]>([]);
  const [selectedWaiver, setSelectedWaiver] = useState<Waiver | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [acceptances, setAcceptances] = useState<WaiverAcceptance[]>([]);
  const [paginatedAcceptances, setPaginatedAcceptances] = useState<WaiverAcceptance[]>([]);
  const [showAcceptances, setShowAcceptances] = useState(false);
  const [acceptancesPagination, setAcceptancesPagination] = useState<PaginationState>({
    currentPage: 1,
    pageSize: 25,
    totalItems: 0,
    totalPages: 0
  });
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    version: 1,
    is_active: true,
  });

  useEffect(() => {
    loadWaivers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadWaivers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('waivers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setWaivers(data || []);
      
      // Select the first active waiver by default
      const activeWaiver = data?.find(w => w.is_active) || data?.[0];
      if (activeWaiver) {
        setSelectedWaiver(activeWaiver);
      }
    } catch (error) {
      console.error('Error loading waivers:', error);
      showToast('Failed to load waivers', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadAcceptances = async (waiverId: number) => {
    try {
      const { data, error } = await supabase
        .from('waiver_acceptances')
        .select(`
          *,
          user:users(name, email)
        `)
        .eq('waiver_id', waiverId)
        .order('accepted_at', { ascending: false });

      if (error) throw error;
      
      const acceptancesWithUserInfo = data?.map(acc => ({
        ...acc,
        user_name: acc.user?.name || 'Unknown',
        user_email: acc.user?.email || 'Unknown'
      })) || [];
      
      setAcceptances(acceptancesWithUserInfo);
      
      // Update pagination
      const totalItems = acceptancesWithUserInfo.length;
      const totalPages = Math.ceil(totalItems / acceptancesPagination.pageSize);
      const updatedPagination = {
        ...acceptancesPagination,
        currentPage: 1,
        totalItems,
        totalPages
      };
      setAcceptancesPagination(updatedPagination);
      
      // Set initial paginated data
      const startIndex = 0;
      const endIndex = acceptancesPagination.pageSize;
      setPaginatedAcceptances(acceptancesWithUserInfo.slice(startIndex, endIndex));
    } catch (error) {
      console.error('Error loading acceptances:', error);
      showToast('Failed to load waiver acceptances', 'error');
    }
  };

  const handleCreateNew = () => {
    setIsCreating(true);
    setIsEditing(true);
    setFormData({
      title: '',
      content: '',
      version: 1,
      is_active: true,
    });
  };

  const handleEdit = (waiver: Waiver) => {
    setSelectedWaiver(waiver);
    setIsEditing(true);
    setIsCreating(false);
    setFormData({
      title: waiver.title,
      content: waiver.content,
      version: waiver.version,
      is_active: waiver.is_active,
    });
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      showToast('Please enter a waiver title', 'error');
      return;
    }

    if (!formData.content.trim()) {
      showToast('Please enter waiver content', 'error');
      return;
    }

    try {
      setSaving(true);

      if (isCreating) {
        // Create new waiver
        const { data, error } = await supabase
          .from('waivers')
          .insert([{
            title: formData.title,
            content: formData.content,
            version: formData.version,
            is_active: formData.is_active,
          }])
          .select()
          .single();

        if (error) throw error;
        
        setSelectedWaiver(data);
        showToast('Waiver created successfully', 'success');
      } else {
        // Update existing waiver
        const { data, error } = await supabase
          .from('waivers')
          .update({
            title: formData.title,
            content: formData.content,
            version: formData.version,
            is_active: formData.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedWaiver?.id)
          .select()
          .single();

        if (error) throw error;
        
        setSelectedWaiver(data);
        showToast('Waiver updated successfully', 'success');
      }

      setIsEditing(false);
      setIsCreating(false);
      await loadWaivers();
    } catch (error) {
      console.error('Error saving waiver:', error);
      showToast('Failed to save waiver', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setIsCreating(false);
    if (selectedWaiver) {
      setFormData({
        title: selectedWaiver.title,
        content: selectedWaiver.content,
        version: selectedWaiver.version,
        is_active: selectedWaiver.is_active,
      });
    }
  };

  const handleActivateWaiver = async (waiver: Waiver) => {
    try {
      // First, deactivate all waivers
      await supabase
        .from('waivers')
        .update({ is_active: false })
        .neq('id', 0); // Update all

      // Then activate the selected waiver
      const { error } = await supabase
        .from('waivers')
        .update({ is_active: true })
        .eq('id', waiver.id);

      if (error) throw error;
      
      showToast('Waiver activated successfully', 'success');
      await loadWaivers();
    } catch (error) {
      console.error('Error activating waiver:', error);
      showToast('Failed to activate waiver', 'error');
    }
  };

  const handleShowAcceptances = async (waiver: Waiver) => {
    setSelectedWaiver(waiver);
    setShowAcceptances(true);
    await loadAcceptances(waiver.id);
  };

  const handleAcceptancesPageChange = (page: number) => {
    const updatedPagination = {
      ...acceptancesPagination,
      currentPage: page
    };
    setAcceptancesPagination(updatedPagination);
    
    // Update paginated data
    const startIndex = (page - 1) * acceptancesPagination.pageSize;
    const endIndex = startIndex + acceptancesPagination.pageSize;
    setPaginatedAcceptances(acceptances.slice(startIndex, endIndex));
  };

  const handleAcceptancesPageSizeChange = (pageSize: number) => {
    const updatedPagination = {
      ...acceptancesPagination,
      currentPage: 1,
      pageSize,
      totalPages: Math.ceil(acceptances.length / pageSize)
    };
    setAcceptancesPagination(updatedPagination);
    
    // Update paginated data
    setPaginatedAcceptances(acceptances.slice(0, pageSize));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B20000]"></div>
        <span className="ml-2 text-[#6F6F6F]">Loading waivers...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#6F6F6F]">Manage Waivers</h2>
          <p className="text-[#6F6F6F] mt-1">
            Manage terms & conditions and liability waivers for your league
          </p>
        </div>
        <Button
          onClick={handleCreateNew}
          className="bg-[#B20000] hover:bg-[#8A0000] text-white flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create New Waiver
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Waivers List */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-[#6F6F6F] mb-4">All Waivers</h3>
              <div className="space-y-2">
                {waivers.map((waiver) => (
                  <div
                    key={waiver.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedWaiver?.id === waiver.id
                        ? 'border-[#B20000] bg-red-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedWaiver(waiver)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-[#6F6F6F]" />
                        <div>
                          <p className="font-medium text-sm">{waiver.title}</p>
                          <p className="text-xs text-gray-500">
                            v{waiver.version} • {waiver.is_active ? 'Active' : 'Inactive'}
                          </p>
                        </div>
                      </div>
                      {waiver.is_active && (
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      )}
                    </div>
                    <div className="mt-2 flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(waiver);
                        }}
                        className="text-xs h-6 px-2"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShowAcceptances(waiver);
                        }}
                        className="text-xs h-6 px-2"
                      >
                        <Users className="h-3 w-3" />
                      </Button>
                      {!waiver.is_active && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleActivateWaiver(waiver);
                          }}
                          className="text-xs h-6 px-2 bg-green-600 hover:bg-green-700 text-white"
                        >
                          Activate
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Waiver Content */}
        <div className="lg:col-span-2">
          {showAcceptances ? (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-[#6F6F6F]">
                    Waiver Acceptances: {selectedWaiver?.title}
                  </h3>
                  <Button
                    onClick={() => setShowAcceptances(false)}
                    variant="outline"
                  >
                    Back to Waiver
                  </Button>
                </div>
                <div className="space-y-3 mb-4">
                  {acceptances.length > 0 ? (
                    paginatedAcceptances.map((acceptance) => (
                      <div key={acceptance.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{acceptance.user_name}</p>
                            <p className="text-sm text-gray-500">{acceptance.user_email}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              {new Date(acceptance.accepted_at).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(acceptance.accepted_at).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-8">
                      No acceptances yet for this waiver
                    </p>
                  )}
                </div>
                
                {acceptances.length > 0 && (
                  <Pagination
                    pagination={acceptancesPagination}
                    onPageChange={handleAcceptancesPageChange}
                    onPageSizeChange={handleAcceptancesPageSizeChange}
                    loading={false}
                    itemName="acceptances"
                  />
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6">
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-[#6F6F6F]">
                        {isCreating ? 'Create New Waiver' : 'Edit Waiver'}
                      </h3>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleSave}
                          disabled={saving}
                          className="bg-[#B20000] hover:bg-[#8A0000] text-white"
                        >
                          {saving ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              Save
                            </>
                          )}
                        </Button>
                        <Button onClick={handleCancel} variant="outline">
                          Cancel
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-[#6F6F6F] mb-2">
                          Title
                        </label>
                        <Input
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          placeholder="Enter waiver title"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-[#6F6F6F] mb-2">
                            Version
                          </label>
                          <Input
                            type="number"
                            value={formData.version}
                            onChange={(e) => setFormData({ ...formData, version: parseInt(e.target.value) || 1 })}
                            min="1"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[#6F6F6F] mb-2">
                            Status
                          </label>
                          <select
                            value={formData.is_active ? 'active' : 'inactive'}
                            onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'active' })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#B20000]"
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[#6F6F6F] mb-2">
                          Content
                        </label>
                        <RichTextEditor
                          value={formData.content}
                          onChange={(value) => setFormData({ ...formData, content: value })}
                          placeholder="Enter waiver content..."
                        />
                      </div>
                    </div>
                  </div>
                ) : selectedWaiver ? (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-[#6F6F6F]">
                          {selectedWaiver.title}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Version {selectedWaiver.version} • {selectedWaiver.is_active ? 'Active' : 'Inactive'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleEdit(selectedWaiver)}
                          className="bg-[#B20000] hover:bg-[#8A0000] text-white"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          onClick={() => handleShowAcceptances(selectedWaiver)}
                          variant="outline"
                        >
                          <Users className="h-4 w-4 mr-2" />
                          View Acceptances
                        </Button>
                      </div>
                    </div>
                    <div 
                      className="prose max-w-none"
                      dangerouslySetInnerHTML={{ __html: selectedWaiver.content }}
                    />
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Select a waiver to view or edit</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}