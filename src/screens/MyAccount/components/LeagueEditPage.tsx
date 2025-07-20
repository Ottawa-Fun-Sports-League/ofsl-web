import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getStripeProductByLeagueId, updateStripeProductLeagueId } from '../../../lib/stripe';
import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/ui/toast';
import { supabase } from '../../../lib/supabase';
import { fetchSports, fetchSkills, fetchLeagueById } from '../../../lib/leagues';
import { ChevronLeft, Save, Copy, Eye } from 'lucide-react';
import { RichTextEditor } from '../../../components/ui/rich-text-editor';
import { StripeProductSelector } from './LeaguesTab/components/StripeProductSelector';
import { CopyLeagueDialog } from './LeaguesTab/components/CopyLeagueDialog';
import { useLeagueActions } from './LeaguesTab/hooks/useLeagueActions';

export function LeagueEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { showToast } = useToast();
  
  const [league, setLeague] = useState<any>(null);
  const [sports, setSports] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [gyms, setGyms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  
  const [editLeague, setEditLeague] = useState<{
    name: string;
    description: string;
    league_type: 'regular_season' | 'tournament' | 'skills_drills' | null;
    gender: 'Mixed' | 'Female' | 'Male' | null;
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
    name: '',
    description: '',
    league_type: null,
    gender: null,
    location: '',
    sport_id: null,
    skill_id: null,
    skill_ids: [],
    day_of_week: null,
    start_date: '',
    end_date: '',
    year: '2025',
    cost: null,
    max_teams: 20,
    gym_ids: []
  });
  
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  
  const { handleCopyLeague, saving: copyingSaving } = useLeagueActions({
    loadData: async () => {}, // We'll navigate away after copy, so no need to reload
    showToast
  });

  useEffect(() => {
    if (!userProfile?.is_admin) {
      navigate('/my-account/profile');
      return;
    }
    
    if (id) {
      loadData();
    }
  }, [id, userProfile]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [sportsData, skillsData] = await Promise.all([
        fetchSports(), 
        fetchSkills() 
      ]);
      
      setSports(sportsData);
      setSkills(skillsData);

      // Load gyms - only show active gyms
      const { data: gymsData, error: gymsError } = await supabase
        .from('gyms')
        .select('*')
        .eq('active', true)
        .order('gym');

      if (gymsError) throw gymsError;
      if (gymsData) setGyms(gymsData);

      // Load specific league
      const leagueData = await fetchLeagueById(parseInt(id!));
      
      if (!leagueData) {
        throw new Error('League not found');
      } else {
        // Get the Stripe product linked to this league
        const linkedProduct = await getStripeProductByLeagueId(parseInt(id!));
        if (linkedProduct) {
          setSelectedProductId(linkedProduct.id);
        }
        
        setLeague(leagueData);
        
        setEditLeague({
          name: leagueData.name,
          description: leagueData.description || '',
          league_type: leagueData.league_type || 'regular_season',
          gender: leagueData.gender || 'Mixed',
          location: leagueData.location || '',
          sport_id: leagueData.sport_id,
          skill_id: leagueData.skill_id,
          skill_ids: leagueData.skill_ids || [],
          day_of_week: leagueData.day_of_week,
          year: leagueData.year || '2025',
          start_date: leagueData.start_date || '',
          end_date: leagueData.end_date || '',
          cost: leagueData.cost,
          max_teams: leagueData.max_teams || 20,
          hide_day: leagueData.hide_day || false,
          gym_ids: leagueData.gym_ids || []
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('Failed to load league data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLeague = async () => {
    if (!id) return;

    // Convert day_of_week from string to number
    const dayOfWeek = editLeague.day_of_week !== null ? 
      parseInt(editLeague.day_of_week.toString()) : null;

    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('leagues')
        .update({
          name: editLeague.name,
          description: editLeague.description,
          league_type: editLeague.league_type,
          gender: editLeague.gender,
          location: editLeague.location,
          sport_id: editLeague.sport_id,
          skill_id: editLeague.skill_id,
          skill_ids: editLeague.skill_ids,
          day_of_week: dayOfWeek,
          year: editLeague.year,
          start_date: editLeague.start_date,
          end_date: editLeague.end_date,
          hide_day: editLeague.hide_day,
          cost: editLeague.cost,
          max_teams: editLeague.max_teams,
          gym_ids: editLeague.gym_ids
        })
        .eq('id', id);

      if (error) throw error;
      
      // Update the Stripe product mapping if changed
      try {
        // If we have a previous product linked to this league, unlink it
        const currentProduct = await getStripeProductByLeagueId(parseInt(id));
        if (currentProduct && currentProduct.id !== selectedProductId) {
          await updateStripeProductLeagueId(currentProduct.id, null);
        }
        
        // Link the new product to this league
        if (selectedProductId) {
          await updateStripeProductLeagueId(selectedProductId, parseInt(id));
        }

      } catch (productError) {
        console.error('Error updating product association:', productError);
        // Don't fail the whole operation if just the product linking fails
        showToast('League updated but product linking failed', 'warning');
      }

      showToast('League updated successfully!', 'success');
      navigate(`/leagues/${id}`);
    } catch (error) {
      console.error('Error updating league:', error);
      showToast('Failed to update league', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async (newName: string) => {
    if (!league) return;
    
    const result = await handleCopyLeague(league, newName);
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
            <h1 className="text-2xl font-bold text-[#6F6F6F] mb-4">League Not Found</h1>
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
          <Link to="/my-account/leagues" className="flex items-center text-[#B20000] hover:underline mb-4">
            <ChevronLeft className="h-5 w-5 mr-1" />
            Back to Manage Leagues
          </Link>
          
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-[#6F6F6F]">Edit League Details</h2>
            <div className="flex items-center gap-3">
              <Link to={`/leagues/${id}`} target="_blank">
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-[10px] px-4 py-2 flex items-center gap-2"
                >
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
            </div>
          </div>
        </div>

        {/* Edit League Form - Using same Card structure as Add New League */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#6F6F6F] mb-2">Sport</label>
                  <select
                    value={editLeague.sport_id || ''}
                    onChange={(e) => setEditLeague({ ...editLeague, sport_id: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#B20000] focus:ring-[#B20000]"
                    required
                  >
                    <option value="">Select sport...</option>
                    {sports.map(sport => (
                      <option key={sport.id} value={sport.id}>{sport.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#6F6F6F] mb-2">Location</label>
                  <select
                    value={editLeague.location || ''}
                    onChange={(e) => setEditLeague({ ...editLeague, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#B20000] focus:ring-[#B20000]"
                    required
                  >
                    <option value="">Select location...</option>
                    <option value="Various (see details)">Various (see details)</option>
                    <option value="Inner city">Inner city</option>
                    <option value="East end">East end</option>
                    <option value="West end">West end</option>
                    <option value="Orleans">Orleans</option>
                    <option value="Kanata">Kanata</option>
                    <option value="Barrhaven">Barrhaven</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#6F6F6F] mb-2">Day of Week</label>
                  <select
                    value={editLeague.day_of_week || ''}
                    onChange={(e) => setEditLeague({ ...editLeague, day_of_week: e.target.value ? parseInt(e.target.value) : null })}
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
                <label className="block text-sm font-medium text-[#6F6F6F] mb-2">League Name</label>
                <Input
                  value={editLeague.name}
                  onChange={(e) => setEditLeague({ ...editLeague, name: e.target.value })}
                  placeholder="Enter league name"
                  className="w-full"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#6F6F6F] mb-2">League Type</label>
                  <div className="flex flex-col gap-2 p-3 border border-gray-300 rounded-lg">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="league_type"
                        value="regular_season"
                        checked={editLeague.league_type === 'regular_season'}
                        onChange={(e) => setEditLeague({ ...editLeague, league_type: e.target.value as 'regular_season' | 'tournament' | 'skills_drills' })}
                        className="mr-2"
                      />
                      <span className="text-sm">Regular Season</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="league_type"
                        value="tournament"
                        checked={editLeague.league_type === 'tournament'}
                        onChange={(e) => setEditLeague({ ...editLeague, league_type: e.target.value as 'regular_season' | 'tournament' | 'skills_drills' })}
                        className="mr-2"
                      />
                      <span className="text-sm">Tournament</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="league_type"
                        value="skills_drills"
                        checked={editLeague.league_type === 'skills_drills'}
                        onChange={(e) => setEditLeague({ ...editLeague, league_type: e.target.value as 'regular_season' | 'tournament' | 'skills_drills' })}
                        className="mr-2"
                      />
                      <span className="text-sm">Skills and Drills</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#6F6F6F] mb-2">Gender</label>
                  <div className="flex flex-col gap-2 p-3 border border-gray-300 rounded-lg">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="gender"
                        value="Mixed"
                        checked={editLeague.gender === 'Mixed'}
                        onChange={(e) => setEditLeague({ ...editLeague, gender: e.target.value as 'Mixed' | 'Female' | 'Male' })}
                        className="mr-2"
                      />
                      <span className="text-sm">Mixed</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="gender"
                        value="Female"
                        checked={editLeague.gender === 'Female'}
                        onChange={(e) => setEditLeague({ ...editLeague, gender: e.target.value as 'Mixed' | 'Female' | 'Male' })}
                        className="mr-2"
                      />
                      <span className="text-sm">Female</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="gender"
                        value="Male"
                        checked={editLeague.gender === 'Male'}
                        onChange={(e) => setEditLeague({ ...editLeague, gender: e.target.value as 'Mixed' | 'Female' | 'Male' })}
                        className="mr-2"
                      />
                      <span className="text-sm">Male</span>
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#6F6F6F] mb-2">Skill Level</label>
                <div className="flex flex-wrap gap-4 border border-gray-300 rounded-lg p-3">
                  {skills.map(skill => (
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
                              skill_id: editLeague.skill_id || skill.id
                            });
                          } else {
                            const updatedSkillIds = editLeague.skill_ids.filter(id => id !== skill.id);
                            setEditLeague({ 
                              ...editLeague, 
                              skill_ids: updatedSkillIds,
                              // If we're removing the primary skill, set it to the first remaining skill or null
                              skill_id: skill.id === editLeague.skill_id 
                                ? (updatedSkillIds.length > 0 ? updatedSkillIds[0] : null)
                                : editLeague.skill_id
                            });
                          }
                        }}
                        className="mr-2"
                      disabled={skill.name === 'Beginner'} />
                      <span className={`text-sm ${skill.name === 'Beginner' ? 'text-gray-400' : ''}`}>
                        {skill.name}
                        {skill.name === 'Beginner' && ' (not available)'}
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
                  <label className="block text-sm font-medium text-[#6F6F6F] mb-2">Start Date</label>
                  <Input
                    type="date"
                    value={editLeague.start_date}
                    onChange={(e) => setEditLeague({ ...editLeague, start_date: e.target.value })}
                    className="w-full"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#6F6F6F] mb-2">End Date</label>
                  <Input
                    type="date"
                    value={editLeague.end_date}
                    onChange={(e) => setEditLeague({ ...editLeague, end_date: e.target.value })}
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
                    onChange={(e) => setEditLeague({ ...editLeague, hide_day: e.target.checked })}
                    className="rounded border-gray-300 text-[#B20000] focus:ring-[#B20000]"
                    id="hide-day"
                  />
                  <label htmlFor="hide-day" className="ml-2 text-sm font-medium text-[#6F6F6F]">
                    Hide day from end date display
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  When checked, only month and year will be shown for the end date
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#6F6F6F] mb-2">Cost ($)</label>
                  <Input
                    type="number"
                    value={editLeague.cost || ''}
                    onChange={(e) => setEditLeague({ ...editLeague, cost: e.target.value ? parseFloat(e.target.value) : null })}
                    placeholder="0.00"
                    className="w-full"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#6F6F6F] mb-2">Max Teams</label>
                  <Input
                    type="number"
                    value={editLeague.max_teams}
                    onChange={(e) => setEditLeague({ ...editLeague, max_teams: parseInt(e.target.value) || 20 })}
                    className="w-full"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#6F6F6F] mb-2">Description</label>
                <RichTextEditor
                  value={editLeague.description}
                  onChange={(value) => setEditLeague({ ...editLeague, description: value })}
                  placeholder="Enter league description"
                  rows={6}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#6F6F6F] mb-2">Gyms/Schools</label>
                <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-3">
                  {gyms.map(gym => (
                    <label key={gym.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={editLeague.gym_ids.includes(gym.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditLeague({ ...editLeague, gym_ids: [...editLeague.gym_ids, gym.id] });
                          } else {
                            setEditLeague({ ...editLeague, gym_ids: editLeague.gym_ids.filter(id => id !== gym.id) });
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
                  selectedProductId={selectedProductId}
                  leagueId={parseInt(id!)}
                  onChange={setSelectedProductId}
                />
              </div>
            </div>

            <div className="mt-8 flex gap-4">
              <Button
                onClick={handleUpdateLeague}
                disabled={saving || !editLeague.name || !editLeague.league_type || !editLeague.gender || !editLeague.sport_id || (editLeague.skill_ids.length === 0 && !editLeague.skill_id) || !editLeague.location || editLeague.day_of_week === null || !editLeague.start_date || !editLeague.end_date || editLeague.cost === null || !editLeague.max_teams}
                className="bg-[#B20000] hover:bg-[#8A0000] text-white rounded-[10px] px-6 py-2 flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Link to="/my-account/leagues">
                <Button
                className="bg-gray-500 hover:bg-gray-600 text-white rounded-[10px] px-6 py-2"
              >
                Back to Manage Leagues
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
        
        <CopyLeagueDialog
          isOpen={showCopyDialog}
          onClose={() => setShowCopyDialog(false)}
          onConfirm={handleCopy}
          league={league}
          saving={copyingSaving}
        />
      </div>
    </div>
  );
}
