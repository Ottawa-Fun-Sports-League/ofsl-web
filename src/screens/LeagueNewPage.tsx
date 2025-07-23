              <div>
                <label className="block text-sm font-medium text-[#6F6F6F] mb-2">Skill Level</label>
                <div className="relative">
                  <select
                    value={newLeague.skill_id || ''}
                    onChange={(e) => setNewLeague({ ...newLeague, skill_id: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#B20000] focus:ring-[#B20000]"
                    required
                    multiple={false}
                  >
                    <option value="">Select skill level...</option>
                    {skills.map(skill => (
                      <option key={skill.id} value={skill.id}>{skill.name}</option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Note: Multiple skill levels will be supported in an upcoming update.
                </p>
              </div>