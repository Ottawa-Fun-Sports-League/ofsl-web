import React, { useState } from "react";
import { HeroBanner } from "../../components/HeroBanner";

export const StandardsOfPlayPage = (): React.ReactElement => {
  const [activeTab, setActiveTab] = useState<
    | "coed"
    | "womenElite"
    | "men"
    | "sundayMixed"
    | "wednesday4x4"
    | "rules4x4"
  >("coed");
  return (
    <div className="bg-white w-full">
      {/* Hero Banner */}
      <HeroBanner
        image="/571North-CR3_0335-Indoor-VB-Header-Featured.jpg"
        imageAlt="Volleyball court"
        containerClassName="h-[250px]"
      >
        <div className="text-center text-white">
          <h1 className="text-5xl mb-4 font-heading">Standards of Play</h1>
          <p className="text-xl max-w-2xl mx-auto">
            Official rules and guidelines for OFSL leagues
          </p>
        </div>
      </HeroBanner>

      {/* Main content */}
      <div className="max-w-[1280px] mx-auto px-4 py-16">
        {/* General Rules (top) */}
        <div className="mb-16">
          <div className="space-y-8">
            <section>
              <h3 className="text-2xl font-bold text-[#6F6F6F] mb-4">Waivers</h3>
              <p className="text-lg text-[#6F6F6F]">
                All captains and players must be registered in the OFSL database before playing their first game of the season. Captains will be linked to their team enabling invitations for their players (up to 8).
              </p>
            </section>
            <section>
              <h3 className="text-2xl font-bold text-[#6F6F6F] mb-4">Cancellations</h3>
              <p className="text-lg text-[#6F6F6F]">
                Only when facilities are closed or unavailable will you receive a message indicating when and where the scheduled games will be rescheduled. OFSL does not cancel any indoor activities due to inclement weather unless deemed too unsafe for all participants.
              </p>
            </section>
            <section>
              <h3 className="text-2xl font-bold text-[#6F6F6F] mb-4">Two strike rule</h3>
              <p className="text-lg text-[#6F6F6F]">
                OFSL will not tolerate abusive or aggressive behavior. The league's mission is to offer a safe environment that promotes sportsmanship, healthy competition and social interactions with all participants. If the OFSL committee receives a complaint about an individual and/or team displaying unsportsmanlike conduct such as verbal or physical abuse towards another player, an initial warning will be given. If a second offense is reported, that player/team will be banned from the league permanently. Note that no refund will be provided. OFSL recognizes that situations may get intense at times. If this occurs, captains will be asked to call a <strong>timeout immediately &amp; request a re-serve.</strong>
              </p>
            </section>
            <section>
              <h3 className="text-2xl font-bold text-[#6F6F6F] mb-4">Noise level</h3>
              <p className="text-lg text-[#6F6F6F]">
                In spirit of OFSL standards, we ask that all players be respectful of other players in the facility by keeping the noise level and music to a moderate volume. Ex. yelling, screeching, loud music, etc.
              </p>
            </section>
            <section>
              <h3 className="text-2xl font-bold text-[#6F6F6F] mb-4">Injuries</h3>
              <p className="text-lg text-[#6F6F6F]">
                Captains are responsible for bringing their own first aid kits.
              </p>
            </section>
          </div>
        </div>

        {/* Standards by format (tabs) */}
        <div className="mb-16">
          <div className="flex flex-nowrap overflow-x-auto scrollbar-thin border-b border-gray-200 mb-8">
            <div className="flex flex-grow">
              <div
                onClick={() => setActiveTab("coed")}
                className={`px-6 py-3 text-center cursor-pointer relative transition-all ${
                  activeTab === "coed" ? "text-[#B20000] font-medium" : "text-[#6F6F6F] hover:text-[#B20000]"
                }`}
              >
                <span>Co-ed Volleyball</span>
                {activeTab === "coed" && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#B20000]"></div>
                )}
              </div>
              <div
                onClick={() => setActiveTab("womenElite")}
                className={`px-6 py-3 text-center cursor-pointer relative transition-all ${
                  activeTab === "womenElite" ? "text-[#B20000] font-medium" : "text-[#6F6F6F] hover:text-[#B20000]"
                }`}
              >
                <span>Women&apos;s Elite Volleyball</span>
                {activeTab === "womenElite" && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#B20000]"></div>
                )}
              </div>
              <div
                onClick={() => setActiveTab("men")}
                className={`px-6 py-3 text-center cursor-pointer relative transition-all ${
                  activeTab === "men" ? "text-[#B20000] font-medium" : "text-[#6F6F6F] hover:text-[#B20000]"
                }`}
              >
                <span>Men's Volleyball</span>
                {activeTab === "men" && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#B20000]"></div>
                )}
              </div>
              <div
                onClick={() => setActiveTab("wednesday4x4")}
                className={`px-6 py-3 text-center cursor-pointer relative transition-all ${
                  activeTab === "wednesday4x4" ? "text-[#B20000] font-medium" : "text-[#6F6F6F] hover:text-[#B20000]"
                }`}
              >
                <span>Wednesday 4x4 Volleyball</span>
                {activeTab === "wednesday4x4" && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#B20000]"></div>
                )}
              </div>
              <div
                onClick={() => setActiveTab("sundayMixed")}
                className={`px-6 py-3 text-center cursor-pointer relative transition-all ${
                  activeTab === "sundayMixed" ? "text-[#B20000] font-medium" : "text-[#6F6F6F] hover:text-[#B20000]"
                }`}
              >
                <span>Sunday Mixed Volleyball</span>
                {activeTab === "sundayMixed" && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#B20000]"></div>
                )}
              </div>
              <div
                onClick={() => setActiveTab("rules4x4")}
                className={`px-6 py-3 text-center cursor-pointer relative transition-all ${
                  activeTab === "rules4x4" ? "text-[#B20000] font-medium" : "text-[#6F6F6F] hover:text-[#B20000]"
                }`}
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
                  <h3 className="text-2xl font-bold text-[#6F6F6F] mb-2">Womenâ€™s Elite Volleyball League</h3>
                  <p className="text-lg text-[#6F6F6F]">
                    The OFSL Womenâ€™s Elite Volleyball League is committed to advancing the performance and personal growth of volleyball athletes, where top athletes compete at the highest level. These teams showcase advanced technique, tactical awareness, and exceptional physical endurance in every match.
                  </p>
                </section>

                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-3">League Information</h4>
                  <h5 className="text-lg font-medium text-[#6F6F6F] mb-2">Format</h5>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-2">
                    <li>The league will operate on a ladder system, cycling every 2 weeks.</li>
                    <li>Each tier will consist of four teams, except for tiers with 3 teams.</li>
                    <li>All matches are best-of-five sets.</li>
                    <li>Sets 1â€"4 are played to 25 points (hard cap at 25) for tiers in Public Schools. For facilities that are not in Public Schools, the game will play to 25 (with a hard cap of 27).</li>
                    <li>The 5th set is played to 15 points (hard cap) or time cap, whichever comes first.</li>
                    <li>Playoffs: Sets 1â€"4 to 25 points (27-point hard cap); 5th set to 15 points (17-point hard cap).</li>
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
                    <li>When playing with 5 players: must always have 3 players in the front row; must identify starting positions, including a ghost player position; when the ghost playerâ€™s rotation reaches service, the team loses that point; a libero cannot be used if a ghost player is in play.</li>
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
                    <li>Sub players should wear jerseys that are similar in color to the teamâ€™s.</li>
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
                    <li>Tier 1: 8:00 â€" 10:00 PM</li>
                    <li>Tier 2: 6:00 â€" 8:00 PM</li>
                    <li>Tier 3: 4:00 â€" 6:00 PM</li>
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
                  <p className="text-lg text-[#6F6F6F]">If the match result is tied (e.g., 24â€"25 / 25â€"24), teams play one additional point to determine which team advances.</p>
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

          {activeTab === "wednesday4x4" && (
            <div className="border border-gray-200 rounded-md p-6">
              <div className="space-y-8">
                <section>
                  <h3 className="text-2xl font-bold text-[#6F6F6F] mb-2">Wednesday 4x4 Rules / Standards of Play</h3>
                </section>


                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">Format</h4>
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
              </div>
            </div>
          )}

          {activeTab === "rules4x4" && (
            <div className="border border-gray-200 rounded-md p-6">
              <div className="space-y-8">
                <section>
                  <h4 className="text-2xl font-bold text-[#6F6F6F] mb-2">4x4 Rules/Standards of play sub-section</h4>
                </section>

                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">Gender rules</h4>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-1">
                    <li>Minimum 2 females at all times</li>
                    <li>Males can not hit beyond the 3m line (attack line)</li>
                    <li>Males can not block women</li>
                    <li>Net is mixed height</li>
                    <li>Minimum of 2 female players on court. Additional females allowed, but extras must play under the "guys' rules/position"</li>
                  </ul>
                </section>

                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">Gameplay rules</h4>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-1">
                    <li>Block does not count as a touch</li>
                    <li>Open hand tips are allowed</li>
                    <li>For the first contact (except serve reception), you can double-hit unless it's a lift; volleys are okay.</li>
                  </ul>
                </section>

                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">Substitutes</h4>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-1">
                    <li>Teams may play with only 3 players if no substitute is available.</li>
                    <li>Extra girls on the court still must follow the "guy rules/position" guideline </li>
                  </ul>
                </section>

                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">6x6 Rules to be added</h4>
                </section>

                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">General (Officiated)</h4>
                  <p className="text-lg text-[#6F6F6F]">Officials must announce the possibility of a time cap at least 5 minutes before it. No time-outs allowed after announcement. When the cap is reached, finish the current point. Leading team wins; if tied, play one more point.</p>
                </section>

                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">Women's Elite &amp; Women's Premiere</h4>
                  <p className="text-lg text-[#6F6F6F]">Minimum of 5 players allowed on court only in special situations during regular season (injury, late arrival, cancellation). Otherwise, the default applies.</p>
                  <p className="text-lg text-[#6F6F6F]">With 5 players: must maintain 3 front-row players; once you start the set with 5, must finish with 5; injured regular players can be replaced by a libero for the remainder of the set.</p>
                </section>

                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">AI VERSION</h4>
                  <h5 className="text-lg font-medium text-[#6F6F6F] mb-1"> Minimum Players on Court</h5>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-1">
                    <li> A team may compete with a minimum of five (5) players only under special circumstances during the regular season (e.g., injury, late arrival, or player cancellation).</li>
                    <li>When playing with five (5) players:</li>
                    <li>Teams must maintain three (3) players in the front row.</li>
                    <li>If a set begins with five (5) players, it must be completed with five (5) players.</li>
                    <li>An injured regular player may be replaced by a libero for the remainder of the set.</li>
                  </ul>
                </section>

                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">Mens 6x6</h4>
                  <h5 className="text-lg font-medium text-[#6F6F6F] mb-1">Wording to be changed</h5>
                  <h6 className="text-base font-medium text-[#6F6F6F] mb-1">OLD</h6>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-1">
                    <li>Minimum 2 females on the court</li>
                    <li>If a team only has 1 female, it is encouraged to borrow a player sitting off. If this is not an option and a team still has only 1 female, only 3 males are allowed on the court which makes it a maximum of 4 players during play. All agreement should be done prior to game starting.</li>
                  </ul>
                  <h6 className="text-base font-medium text-[#6F6F6F] mb-1">New</h6>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-1">
                    <li>Minimum 2 females on the court</li>
                    <li>If a team only has 1 female, it is encouraged to borrow a player sitting off. If all captains agree, and a team only has 1 female, only 3 males are allowed, making it 4. </li>
                  </ul>
                  <h6 className="text-base font-medium text-[#6F6F6F] mb-1"> FINAL</h6>
                  <p className="text-lg text-[#6F6F6F]">If a team has only one female player, it is encouraged that they borrow a female player who is sitting off to help balance the lineup.</p>
                  <p className="text-lg text-[#6F6F6F]">However, if all captains agree, and a team still has only one female, then that team may field no more than three male players, making a total of four on the field</p>
                </section>

                <section>
                  <h5 className="text-lg font-medium text-[#6F6F6F] mb-1">OLD</h5>
                  <p className="text-lg text-[#6F6F6F]">If a team show up 10 minutes after scheduled first game, every minute will be deducted a point, accumulating up to when the team arrives.This rule does not apply if sitting team agrees to play games first in place of late team.</p>
                  <h5 className="text-lg font-medium text-[#6F6F6F] mb-1">NEW</h5>
                  <p className="text-lg text-[#6F6F6F]">If a team arrives 20 minutes after the first scheduled game, they will forfeit the first set. If a team shows up 10 minutes after the scheduled first game, they will be deducted one point every minute, accumulating until the opposing team arrives. This rule does not apply if the sitting team agrees to play games first in place of the late team.</p>
                  <p className="text-lg text-[#6F6F6F] mt-2">Note: Rules may differ depending on certain circumstances, for example, a last minute gym cancellation. The league will then decide how to move forward.</p>
                </section>

                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">SEE AI VERSION BELOW</h4>
                </section>

                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">AI VERSION</h4>
                  <h5 className="text-lg font-medium text-[#6F6F6F] mb-1">Late Arrival Policy</h5>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-1">
                    <li>If a team arrives 20 minutes after the first scheduled game, they will forfeit the first set.</li>
                    <li>If a team arrives 10 minutes after the scheduled first game, they will be deducted one point per minute, accumulating until the opposing team arrives or the 20-minute threshold is met..</li>
                    <li>This rule does not apply if the sitting team agrees to play their games first in place of the late team.</li>
                  </ul>
                  <h5 className="text-lg font-medium text-[#6F6F6F] mb-1">Important Note:</h5>
                  <p className="text-lg text-[#6F6F6F]"> Rules may differ in special circumstances (e.g., a last-minute gym cancellation). In such cases, the league will determine the next steps to take.</p>
                </section>

                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">SUNDAY FORMAT</h4>
                  <h5 className="text-lg font-medium text-[#6F6F6F] mb-1">Game Format &amp; Rules</h5>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-1">
                    <li>Timeslot: 2 hours</li>
                    <li> Courts: 3 per timeslot</li>
                    <li> Match Format: Head-to-head, best of 2 sets (to 25 points)</li>
                  </ul>
                  <h5 className="text-lg font-medium text-[#6F6F6F] mb-1">Tiers &amp; Times</h5>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-1">
                    <li>Tier 1: 8:00 &ndash; 10:00 PM</li>
                    <li>Tier 2: 6:00 &ndash; 8:00 PM</li>
                    <li>Tier 3: 4:00 &ndash; 6:00 PM</li>
                  </ul>
                  <h5 className="text-lg font-medium text-[#6F6F6F] mb-1">Court Assignments</h5>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-1">
                    <li>Court 1 = Tier #A (highest court in tier)</li>
                    <li>Court 2 = Tier #B (middle court in tier)</li>
                    <li>Court 3 = Tier #C (lowest court in tier)</li>
                  </ul>
                  <h5 className="text-lg font-medium text-[#6F6F6F] mb-1">Movement Rules</h5>
                  <div className="space-y-3">
                    <div>
                      <h6 className="text-base font-medium text-[#6F6F6F]">Court 1 (Top Court):</h6>
                      <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-1">
                        <li>The winning team stays on Court 1.</li>
                        <li>They must win again to be promoted to the next tier.</li>
                        <li>The losing team moves down to Court 2.</li>
                      </ul>
                    </div>
                    <div>
                      <h6 className="text-base font-medium text-[#6F6F6F]">Court 2 (Middle Court):</h6>
                      <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-1">
                        <li>The winning team moves up to Court 1.</li>
                        <li>The losing team moves down to Court 3.</li>
                      </ul>
                    </div>
                    <div>
                      <h6 className="text-base font-medium text-[#6F6F6F]">Court 3 (Bottom Court):</h6>
                      <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-1">
                        <li>The winning team moves up to Court 2.</li>
                        <li>The losing team remains on Court 3.</li>
                        <li>A team that loses twice in the same night on Court 3 is relegated to a lower tier for the following week.</li>
                      </ul>
                    </div>
                  </div>
                  <h5 className="text-lg font-medium text-[#6F6F6F] mb-1">Next Week's Placement</h5>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-1">
                    <li>A team starting on Court 3 that wins their matchup and then wins on Court 2 will start the following week on Court 1 of their tier.</li>
                    <li>A team starting on Court 1 that loses their matchup and then loses on Court 2 will start the following week on Court 3 of their tier.</li>
                    <li>A team starting on Court 1 or Court 2 that wins their last match on Court 1 will start the following week in a higher tier.</li>
                    <li>A team starting on Court 2 or Court 3 that loses all their matches will start the following week in a lower tier.</li>
                  </ul>
                  <h5 className="text-lg font-medium text-[#6F6F6F] mb-1">Tiebreaker Rule</h5>
                  <p className="text-lg text-[#6F6F6F]">If the match result is tied (e.g., 24&ndash;25 / 25&ndash;24), teams play one additional point to determine which team advances.</p>
                </section>
              </div>
            </div>
          )}

          {activeTab === "men" && (
            <div className="border border-gray-200 rounded-md p-6">
              <div className="space-y-8">
                <section>
                  <h3 className="text-2xl font-bold text-[#6F6F6F] mb-2">Monday Men's Volleyball League</h3>
                  <p className="text-lg text-[#6F6F6F]">
                    The OFSL Monday Men's League provides competitive play for athletes at multiple skill levels. The format emphasizes fast-paced matches, team accountability, and structured tiers to ensure balanced competition.
                  </p>
                </section>

                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-3">League Information</h4>
                  <h5 className="text-lg font-medium text-[#6F6F6F] mb-2">Format</h5>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-2">
                    <li>The league uses a tiered format.</li>
                    <li>All matches are played as best-of-five sets.</li>
                  </ul>
                  <h5 className="text-lg font-medium text-[#6F6F6F] mt-4 mb-2">Set scoring</h5>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-2">
                    <li>All sets are played to 21 points (hard cap at 21).</li>
                    <li>The 5th set is played to 15 points (hard cap).</li>
                  </ul>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-2 mt-4">
                    <li>Match length: Each match is scheduled within its allotted timeslot. 90 minutes including warmup.</li>
                    <li>Warm-up: Teams should warm up within their timeslot, using available court time efficiently. The official will whistle once the warm-up starts.</li>
                  </ul>
                </section>

                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-3">Court Set-Up &amp; Equipment</h4>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-2">
                    <li>Players are responsible for setting up and taking down nets for their assigned court.</li>
                    <li>Officials are responsible for checking net height and equipment where applicable.</li>
                    <li>Preferred game ball: Mikasa V200W (yellow &amp; blue). Teams are expected to provide balls.</li>
                  </ul>
                </section>

                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-3">Officials</h4>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-2">
                    <li>Matches are officiated in some tiers (tiers assigned by the league).</li>
                    <li>Tiers without officials will require teams to self-officiate in good faith.</li>
                    <li>Any disputes should be brought to the league facilitator and reported to <a href="mailto:info@ofsl.ca" className="text-[#B20000] hover:underline">info@ofsl.ca</a>.</li>
                  </ul>
                </section>

                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-3">Player Requirements</h4>
                  <h5 className="text-lg font-medium text-[#6F6F6F] mb-2">Libero-specific rules</h5>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-2">
                    <li>If a libero is being used, the official must be advised before the match begins.</li>
                    <li>A libero cannot be used if a ghost player is in play.</li>
                    <li>If a player is injured during a set, the libero may replace them for the remainder of that set.</li>
                    <li>If a set begins with 5 players, it must finish with those 5 players (except for injury replacements by the libero).</li>
                  </ul>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-2 mt-4">
                    <li>Teams must start matches with a minimum of 5 players.</li>
                    <li>If fewer than 4 players are available at start time, the team will lose a point a minute until a 4th player arrives.</li>
                  </ul>
                </section>

                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-3">Team Registration</h4>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-2">
                    <li>Teams must register a minimum of 6 players on their roster. Teams will not be placed on the schedule until this criteria is met.</li>
                    <li>All players must be registered and have signed a waiver through the league website.</li>
                  </ul>
                </section>

                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-3">Jerseys &amp; Equipment</h4>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-2">
                    <li>Teams are encouraged to wear matching jerseys with numbers. Otherwise, not required.</li>
                  </ul>
                </section>

                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-3">Playoffs</h4>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-2">
                    <li>Playoffs will be held at the end of the season.</li>
                    <li>Seeding will be determined by overall standings within each tier.</li>
                  </ul>
                </section>
              </div>
            </div>
          )}

          <p className="text-lg text-[#6F6F6F] mt-8">
            If you still have any questions or concerns please contact <a href="mailto:info@ofsl.ca" className="text-[#B20000] hover:underline">info@ofsl.ca</a>
          </p>
        </div>

      </div>
    </div>
  );
};



