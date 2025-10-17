          {activeTab === "sundayMixed" && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#B20000]"></div>
                )}
              </div>
              <div
                onClick={() => setActiveTab("rules4x4")}
                className={
                  "px-6 py-3 text-center cursor-pointer relative transition-all " +
                  (activeTab === "rules4x4" ? "text-[#B20000] font-medium" : "text-[#6F6F6F] hover:text-[#B20000]")
                }
              >
                <span>4x4 Volleyball Rules</span>
                {activeTab === "rules4x4" && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#B20000]"></div>
                )}
              </div>
            </div>
          </div>

          {activeTab === "coed" && (
            <div className="border border-gray-200 rounded-md p-6">
              <div className="space-y-8">
                <section>
                  <h3 className="text-2xl font-bold text-[#6F6F6F] mb-4">Players&apos; responsibilities</h3>
                  <p className="text-lg text-[#6F6F6F] mb-4">
                    Team <strong>A &amp; C</strong> are responsible for <strong>net &amp; pole set up</strong> and Team <strong>B &amp; C</strong> for take down. OFSL facilitators will notify players to begin activities 10 minutes after schedule time and to stop activities at 10 minutes before the schedule time i.e. For games scheduled for 8:00-10:00 pm, start time will be at 8:10 pm &amp; end time at 9:50 pm. Note if a team is late, the order of play can be changed without penalty as long as the teams present agree to play, All 6 sets must be played within the time permitted. The team who is not sitting off, must score keep for the duration of the matches.
                  </p>
                  <p className="text-lg text-[#6F6F6F] mb-4">
                    A game ball will not be provided by the league. If team captains can not agree upon a ball to use, the team sitting off will make the decision.
                  </p>
                  <p className="text-lg text-[#6F6F6F] mb-6">
                    Note that a game ball will be provided by the league if team captains have not already agreed upon a ball to use.
                  </p>

                  <div className="mb-6">
                    <h4 className="text-xl font-semibold text-[#6F6F6F] mb-3">Set up and Take down</h4>
                    <div className="mb-4">
                      <h5 className="text-lg font-medium text-[#6F6F6F] mb-2">For 3 Team Tier:</h5>
                      <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-1 mb-3">
                        <li>Teams <strong>A &amp; C</strong> must set up the net before warm-up</li>
                        <li>Teams <strong>B &amp; C</strong> must take down nets and equipment</li>
                        <li>Facilitator is not responsible for set up/take down</li>
                        <li>Potential league warning for non-compliance</li>
                      </ul>
                    </div>
                    <div className="mb-4">
                      <h5 className="text-lg font-medium text-[#6F6F6F] mb-2">For 2 Team Tier:</h5>
                      <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-1">
                        <li>Teams <strong>A &amp; B</strong> must set up the net before warm-up</li>
                        <li>Teams <strong>A &amp; B</strong> must take down nets and equipment</li>
                      </ul>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h4 className="text-xl font-semibold text-[#6F6F6F] mb-3">Score Keeping</h4>
                    <div className="mb-4">
                      <h5 className="text-lg font-medium text-[#6F6F6F] mb-2">For 3 Team Tier:</h5>
                      <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-1 mb-3">
                        <li>Teams sitting out must score keep during other matches</li>
                        <li>Team <strong>B</strong> must arrive early to score keep for Teams A &amp; C</li>
                      </ul>
                    </div>
                    <div className="mb-4">
                      <h5 className="text-lg font-medium text-[#6F6F6F] mb-2">For 2 Team Tier:</h5>
                      <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-1">
                        <li>Both teams responsible for score keeping</li>
                        <li>Facilitator not required to keep score</li>
                      </ul>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-2xl font-bold text-[#6F6F6F] mb-4">Tiering system</h3>
                  <p className="text-lg text-[#6F6F6F]">
                    Each tier has 3 teams who all play a total of 4 sets (2 each against opposing teams). The team with the most wins moves up a tier, team with second best record stays and team with third best record moves down a tier. Tiebreakers will be determined by head-to-head result, points for/against, then total points between the 2 teams. If still tied, use previous week&apos;s schedule position: higher-ranked on the schedule wins (A &gt; B &gt; C when in the same tier). In case of a three-way tie, we use points for/against, then total points of all 3 teams. If still tied, previous week&apos;s schedule position applies. When a team forfeits in a 3 tier, points will be scored as 0 pts and the other two teams will receive 21 pts per set. The remaining two teams will play their two sets as per the original schedule.
                  </p>
                </section>

                <section>
                  <h3 className="text-2xl font-bold text-[#6F6F6F] mb-4">Games Self-Refereed</h3>
                  <p className="text-lg text-[#6F6F6F]">
                    All teams are responsible to call own faults including touching the net, doubles and ball in or out of bounds. If a dispute occurs, captains need to agree on how to proceed. If both captains disagree, point for that rally will be concluded as a re-serve.
                  </p>
                </section>

                <section>
                  <h3 className="text-2xl font-bold text-[#6F6F6F] mb-4">Games Order</h3>
                  <p className="text-lg text-[#6F6F6F] mb-3">When you have 3 teams in the Tier, games will be played in the following order:</p>
                  <ol className="list-decimal pl-6 text-lg text-[#6F6F6F] space-y-1">
                    <li>A vs C</li>
                    <li>A vs C</li>
                    <li>A vs B</li>
                    <li>A vs B</li>
                    <li>B vs C</li>
                    <li>B vs C</li>
                  </ol>
                  <p className="text-lg text-[#6F6F6F] mt-3">
                    <strong>For Tiers with 2 teams, 4 matches will be played to 21 (hard cap).</strong>
                  </p>
                </section>

                <section>
                  <h3 className="text-2xl font-bold text-[#6F6F6F] mb-4">Minimum 2 females on the court</h3>
                  <p className="text-lg text-[#6F6F6F]">
                    If a team only has 1 female, it is encouraged to borrow a player sitting off. If this is not an option and a team still has only 1 female, only 3 males are allowed on the court which makes it a <strong>maximum of 4 players</strong> during play. All agreement should be done prior to game starting.
                  </p>
                </section>
              </div>
            </div>
          )}

          {activeTab === "womenElite" && (
            <div className="border border-gray-200 rounded-md p-6">
              <div className="space-y-8">
                <section>
                  <h3 className="text-2xl font-bold text-[#6F6F6F] mb-2">Women's Elite Volleyball League</h3>
                  <p className="text-lg text-[#6F6F6F]">
                    The OFSL Women's Elite Volleyball League is committed to advancing the performance and personal growth of volleyball athletes, where top athletes compete at the highest level. These teams showcase advanced technique, tactical awareness, and exceptional physical endurance in every match.
                  </p>
                </section>

                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-3">League Information</h4>
                  <h5 className="text-lg font-medium text-[#6F6F6F] mb-2">Format</h5>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-2">
                    <li>The league will operate on a ladder system, cycling every 2 weeks.</li>
                    <li>Each tier will consist of four teams, except for tiers with 3 teams.</li>
                    <li>All matches are best-of-five sets.</li>
                    <li>Sets 1&ndash;4 are played to 25 points (hard cap at 25) for tiers in Public Schools. For facilities that are not in Public Schools, the game will play to 25 (with a hard cap of 27).</li>
                    <li>The 5th set is played to 15 points (hard cap) or time cap, whichever comes first.</li>
                    <li>Playoffs: Sets 1&ndash;4 to 25 points (27-point hard cap); 5th set to 15 points (17-point hard cap).</li>
                    <li>Each match has a maximum of 15 minutes of warm-up and 90 minutes of play.</li>
                    <li>Total timeslot = 105 minutes.</li>
                    <li>Warm-up: 8 minutes team warm-up + Volleyball Canada format (5 minutes hitting, 1 minute serving).</li>
                    <li>Time Outs: 1 per set to a maximum of 30 seconds.</li>
                    <li>All matches are officiated.</li>
                    <li>Preferred game ball: Mikasa V200W (yellow &amp; blue). Balls provided by teams.</li>
                  </ul>
                </section>

                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-3">Minimum Player Requirement</h4>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-2">
                    <li>Teams must have at least 5 players to begin a match.</li>
                    <li>If a team cannot field 5 players at the scheduled start time: the first set is defaulted; each additional set is defaulted every 10 minutes until 5 players are present.</li>
                    <li>When playing with 5 players: must always have 3 players in the front row; must identify starting positions, including a ghost player position; when the ghost player's rotation reaches service, the team loses that point; a libero cannot be used if a ghost player is in play.</li>
                    <li>If a set begins with 5 players, it must finish with those 5 (except injury replacement by libero).</li>
                    <li>If a player is injured during a set, the libero may replace them for the remainder of that set.</li>
                  </ul>
                </section>

                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-3">Team Registration</h4>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-2">
                    <li>Teams must register a minimum of 6 players.</li>
                    <li>All players must complete registration and the waiver on the league website.</li>
                    <li>All subs must be registered with the official before matches begin.</li>
                    <li>Captains must register subs on the website after each match (same evening).</li>
                  </ul>
                </section>

                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-3">Substitutes &amp; Playoffs Eligibility</h4>
                  <p className="text-lg text-[#6F6F6F] font-medium">Regular season:</p>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-2 mb-2">
                    <li>Players from other teams may sub during the regular season.</li>
                  </ul>
                  <p className="text-lg text-[#6F6F6F] font-medium">Playoffs:</p>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-2">
                    <li>Players from other teams may not sub.</li>
                    <li>Subs must have played at least 5 matches during the regular season.</li>
                    <li>All rostered players must have played a minimum of 5 games to be eligible.</li>
                    <li>Subs will be tracked via scoresheet.</li>
                    <li>Teams may use multiple subs in playoffs, provided they meet the 5-game requirement.</li>
                    <li>Teams may include a 7th player (sub) in playoffs only if they are playing with a libero for the entire match.</li>
                    <li>Injury exception: If no bench subs are available, the libero may replace an injured player for the remainder of the set, but must take their position.</li>
                  </ul>
                </section>

                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-3">Jerseys &amp; Equipment</h4>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-2">
                    <li>All players must wear numbered jerseys.</li>
                    <li>Libero must wear a different colored jersey.</li>
                    <li>Sub players should wear jerseys that are similar in color to the team's.</li>
                    <li>OFSL will provide jerseys for the inaugural season. (Future seasons are not guaranteed.)</li>
                  </ul>
                </section>

                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-3">Officials &amp; Set-Up</h4>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-2">
                    <li>Officials provided for every match.</li>
                    <li>Set-up and take-down is the responsibility of league supervisors and players, as assigned.</li>
                    <li>Referees are responsible for net height and proper set-up.</li>
                  </ul>
                </section>

                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-3">Playoffs</h4>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-2">
                    <li>Playoffs will be held at the end of the season.</li>
                    <li>Seeding is determined by overall standings, using the average of the last 18 weeks of regular-season play.</li>
                  </ul>
                </section>
              </div>
            </div>
          )}

          {activeTab === "sundayMixed" && (
            <div className="border border-gray-200 rounded-md p-6">
              <div className="space-y-8">
                <section>
                  <h3 className="text-2xl font-bold text-[#6F6F6F] mb-2">Sunday Evening Mixed 6x6 Game Format &amp; Rules</h3>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-1">
                    <li>Timeslot: 2 hours</li>
                    <li>Courts: 3 per timeslot</li>
                    <li>Match Format: Head-to-head, best of 2 sets (to 25 points)</li>
                    <li>There are 6 teams per tier/timeslot.</li>
                  </ul>
                </section>

                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">Tiers &amp; Times</h4>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-1">
                    <li>Tier 1: 8:00 &ndash; 10:00 PM</li>
                    <li>Tier 2: 6:00 &ndash; 8:00 PM</li>
                    <li>Tier 3: 4:00 &ndash; 6:00 PM</li>
                  </ul>
                </section>

                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">Court Assignments</h4>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-1">
                    <li>Court 1 = Tier #A (highest court in tier)</li>
                    <li>Court 2 = Tier #B (middle court in tier)</li>
                    <li>Court 3 = Tier #C (lowest court in tier)</li>
                  </ul>
                </section>

                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">Movement Rules</h4>
                  <div className="space-y-3">
                    <div>
                      <h5 className="text-lg font-medium text-[#6F6F6F]">Court 1 (Top Court):</h5>
                      <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-1">
                        <li>The winning team stays on Court 1.</li>
                        <li>They must win again to be promoted to the next tier.</li>
                        <li>The losing team moves down to Court 2.</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="text-lg font-medium text-[#6F6F6F]">Court 2 (Middle Court):</h5>
                      <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-1">
                        <li>The winning team moves up to Court 1.</li>
                        <li>The losing team moves down to Court 3.</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="text-lg font-medium text-[#6F6F6F]">Court 3 (Bottom Court):</h5>
                      <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-1">
                        <li>The winning team moves up to Court 2.</li>
                        <li>The losing team remains on Court 3.</li>
                        <li>A team that loses twice in the same night on Court 3 is relegated to a lower tier for the following week.</li>
                      </ul>
                    </div>
                  </div>
                </section>

                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">Next Week&apos;s Placement</h4>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-1">
                    <li>A team starting on Court 3 that wins their matchup and then wins on Court 2 will start the following week on Court 1 of their tier.</li>
                    <li>A team starting on Court 1 that loses their matchup and then loses on Court 2 will start the following week on Court 3 of their tier.</li>
                    <li>A team starting on Court 1 or Court 2 that wins their last match on Court 1 will start the following week in a higher tier.</li>
                    <li>A team starting on Court 2 or Court 3 that loses all their matches will start the following week in a lower tier.</li>
                  </ul>
                </section>

                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">Tiebreaker Rule</h4>
                  <p className="text-lg text-[#6F6F6F]">If the match result is tied (e.g., 24&ndash;25 / 25&ndash;24), teams play one additional point to determine which team advances.</p>
                </section>

                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">Point system</h4>
                  <p className="text-lg text-[#6F6F6F] mb-2">Teams earn 1 point per win.</p>
                  <p className="text-lg text-[#6F6F6F] mb-2">At the end of the evening, teams also receive bonus points based on the tier they finish in:</p>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-1">
                    <li>Tier 1 = 3 points</li>
                    <li>Tier 2 = 2 points</li>
                    <li>Tier 3 = 1 point</li>
                  </ul>
                  <div className="mt-3">
                    <h5 className="text-lg font-medium text-[#6F6F6F]">Example scoring:</h5>
                    <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-1">
                      <li>Tier 1 (3 points) + 2 wins = 5 points total</li>
                      <li>Tier 2 (2 points) + 1 win = 3 points total</li>
                      <li>Tier 3 (1 point) + 2 wins = 3 points total</li>
                    </ul>
                  </div>
                </section>
              </div>
            </div>
          )}


