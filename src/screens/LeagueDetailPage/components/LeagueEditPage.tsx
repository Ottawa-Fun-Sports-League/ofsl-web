import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

export function LeagueEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sports, setSports] = useState<{
    id: number;
    name: string;
    active: boolean;
  }[]>([]);
  const [skills, setSkills] = useState<{
    id: number;
    name: string;
    order_index: number;
  }[]>([]);
  const [editLeague, setEditLeague] = useState<{
    name: string;
    description: string;
    location: string;
    sport_id: number | null;
    skill_id: number | null;
    skill_ids: number[];
    day_of_week: number | null;
    start_date: string;
    end_date: string;
    year: string;
    max_teams: number;
    registration_fee: number;
    registration_deadline: string;
    season_start: string;
    season_end: string;
    game_duration: number;
    playoff_format: string;
    rules: string;
  }>({
    name: '',
    location: '',
    description: '',
    sport_id: null,
    skill_id: null,
    skill_ids: [],
    day_of_week: null,
    start_date: '',
    end_date: '',
    year: '2025',
    max_teams: 8,
    registration_fee: 0,
    registration_deadline: '',
    season_start: '',
    season_end: '',
    game_duration: 60,
    playoff_format: 'single_elimination',
    rules: ''
  });

  const daysOfWeek = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' }
  ];

  const playoffFormats = [
    { value: 'single_elimination', label: 'Single Elimination' },
    { value: 'double_elimination', label: 'Double Elimination' },
    { value: 'round_robin', label: 'Round Robin' },
    { value: 'swiss', label: 'Swiss System' }
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch sports and skills
        const [sportsResponse, skillsResponse] = await Promise.all([
          fetch('/api/sports'),
          fetch('/api/skills')
        ]);
        
        if (!sportsResponse.ok || !skillsResponse.ok) {
          throw new Error('Failed to fetch reference data');
        }
        
        const [sportsData, skillsData] = await Promise.all([
          sportsResponse.json(),
          skillsResponse.json()
        ]);
        
        setSports(sportsData);
        setSkills(skillsData);

        // Fetch league data if editing
        if (id) {
          const leagueResponse = await fetch(`/api/leagues/${id}`);
          if (!leagueResponse.ok) {
            throw new Error('Failed to fetch league');
          }
          
          const leagueData = await leagueResponse.json();
          setEditLeague({
            name: leagueData.name || '',
            description: leagueData.description || '',
            location: leagueData.location || '',
            sport_id: leagueData.sport_id,
            skill_id: leagueData.skill_id,
            skill_ids: leagueData.skill_ids || [],
            day_of_week: leagueData.day_of_week,
            year: leagueData.year || '2025',
            start_date: leagueData.start_date || '',
            end_date: leagueData.end_date || '',
            max_teams: leagueData.max_teams || 8,
            registration_fee: leagueData.registration_fee || 0,
            registration_deadline: leagueData.registration_deadline || '',
            season_start: leagueData.season_start || '',
            season_end: leagueData.season_end || '',
            game_duration: leagueData.game_duration || 60,
            playoff_format: leagueData.playoff_format || 'single_elimination',
            rules: leagueData.rules || ''
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      const dayOfWeek = editLeague.day_of_week;
      
      const response = await fetch(`/api/leagues/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editLeague.name,
          description: editLeague.description,
          location: editLeague.location,
          sport_id: editLeague.sport_id,
          skill_id: editLeague.skill_id,
          skill_ids: editLeague.skill_ids,
          day_of_week: dayOfWeek,
          year: editLeague.year,
          start_date: editLeague.start_date,
          end_date: editLeague.end_date,
          max_teams: editLeague.max_teams,
          registration_fee: editLeague.registration_fee,
          registration_deadline: editLeague.registration_deadline,
          season_start: editLeague.season_start,
          season_end: editLeague.season_end,
          game_duration: editLeague.game_duration,
          playoff_format: editLeague.playoff_format,
          rules: editLeague.rules
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update league');
      }

      navigate(`/leagues/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B20000] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link to="/leagues" className="text-[#B20000] hover:underline">
            Back to Leagues
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link to={`/leagues/${id}`} className="text-[#B20000] hover:underline mb-4 inline-block">
            ← Back to League
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Edit League</h1>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-[#6F6F6F] mb-2">League Name</label>
                <input
                  type="text"
                  value={editLeague.name}
                  onChange={(e) => setEditLeague({ ...editLeague, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#B20000] focus:ring-[#B20000]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#6F6F6F] mb-2">Location</label>
                <input
                  type="text"
                  value={editLeague.location}
                  onChange={(e) => setEditLeague({ ...editLeague, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#B20000] focus:ring-[#B20000]"
                  required
                />
              </div>

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
                <label className="block text-sm font-medium text-[#6F6F6F] mb-2">Skill Level</label>
                <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-3">
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
                      />
                      <span className="text-sm">{skill.name}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Select multiple skill levels that apply to this league.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#6F6F6F] mb-2">Day of Week</label>
                <select
                  value={editLeague.day_of_week ?? ''}
                  onChange={(e) => setEditLeague({ ...editLeague, day_of_week: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#B20000] focus:ring-[#B20000]"
                  required
                >
                  <option value="">Select day...</option>
                  {daysOfWeek.map(day => (
                    <option key={day.value} value={day.value}>{day.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#6F6F6F] mb-2">Year</label>
                <input
                  type="text"
                  value={editLeague.year}
                  onChange={(e) => setEditLeague({ ...editLeague, year: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#B20000] focus:ring-[#B20000]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#6F6F6F] mb-2">Start Date</label>
                <input
                  type="date"
                  value={editLeague.start_date}
                  onChange={(e) => setEditLeague({ ...editLeague, start_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#B20000] focus:ring-[#B20000]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#6F6F6F] mb-2">End Date</label>
                <input
                  type="date"
                  value={editLeague.end_date}
                  onChange={(e) => setEditLeague({ ...editLeague, end_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#B20000] focus:ring-[#B20000]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#6F6F6F] mb-2">Max Teams</label>
                <input
                  type="number"
                  value={editLeague.max_teams}
                  onChange={(e) => setEditLeague({ ...editLeague, max_teams: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#B20000] focus:ring-[#B20000]"
                  min="2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#6F6F6F] mb-2">Registration Fee ($)</label>
                <input
                  type="number"
                  value={editLeague.registration_fee}
                  onChange={(e) => setEditLeague({ ...editLeague, registration_fee: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#B20000] focus:ring-[#B20000]"
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#6F6F6F] mb-2">Registration Deadline</label>
                <input
                  type="date"
                  value={editLeague.registration_deadline}
                  onChange={(e) => setEditLeague({ ...editLeague, registration_deadline: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#B20000] focus:ring-[#B20000]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#6F6F6F] mb-2">Season Start</label>
                <input
                  type="date"
                  value={editLeague.season_start}
                  onChange={(e) => setEditLeague({ ...editLeague, season_start: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#B20000] focus:ring-[#B20000]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#6F6F6F] mb-2">Season End</label>
                <input
                  type="date"
                  value={editLeague.season_end}
                  onChange={(e) => setEditLeague({ ...editLeague, season_end: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#B20000] focus:ring-[#B20000]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#6F6F6F] mb-2">Game Duration (minutes)</label>
                <input
                  type="number"
                  value={editLeague.game_duration}
                  onChange={(e) => setEditLeague({ ...editLeague, game_duration: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#B20000] focus:ring-[#B20000]"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#6F6F6F] mb-2">Playoff Format</label>
                <select
                  value={editLeague.playoff_format}
                  onChange={(e) => setEditLeague({ ...editLeague, playoff_format: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#B20000] focus:ring-[#B20000]"
                >
                  {playoffFormats.map(format => (
                    <option key={format.value} value={format.value}>{format.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#6F6F6F] mb-2">Description</label>
              <textarea
                value={editLeague.description}
                onChange={(e) => setEditLeague({ ...editLeague, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#B20000] focus:ring-[#B20000]"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#6F6F6F] mb-2">Rules</label>
              <textarea
                value={editLeague.rules}
                onChange={(e) => setEditLeague({ ...editLeague, rules: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#B20000] focus:ring-[#B20000]"
                rows={4}
                placeholder="Enter league rules and regulations..."
              />
            </div>

            <div className="flex justify-end space-x-4">
              <Link
                to={`/leagues/${id}`}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-[#B20000] text-white rounded-lg hover:bg-[#8B0000] disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}