import React, { useState } from "react";
import { HeroBanner } from "../../components/HeroBanner";

export const StandardsOfPlayPage = (): React.ReactElement => {
  const [activeTab, setActiveTab] = useState<
    | "womensElite"
    | "men"
    | "coed"
    | "womenElite"
    | "pickleball"
  >("coed");
  const scrollToId = (id: string): void => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };
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
                OFSL will not tolerate abusive or aggressive behavior. The league&rsquo;s mission is to offer a safe environment that promotes sportsmanship, healthy competition and social interactions with all participants. If the OFSL committee receives a complaint about an individual and/or team displaying unsportsmanlike conduct such as verbal or physical abuse towards another player, an initial warning will be given. If a second offense is reported, that player/team will be banned from the league permanently. Note that no refund will be provided. OFSL recognizes that situations may get intense at times. If this occurs, captains will be asked to call a <strong>timeout immediately &amp; request a re-serve.</strong>
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
                onClick={() => setActiveTab("womensElite")}
                className={`px-6 py-3 text-center cursor-pointer relative transition-all ${
                  activeTab === "womensElite" ? "text-[#B20000] font-medium" : "text-[#6F6F6F] hover:text-[#B20000]"
                }`}
              >
                <span>Women&apos;s Elite</span>
                {activeTab === "womensElite" && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#B20000]"></div>
                )}
              </div>
              <div
                onClick={() => setActiveTab("men")}
                className={`px-6 py-3 text-center cursor-pointer relative transition-all ${
                  activeTab === "men" ? "text-[#B20000] font-medium" : "text-[#6F6F6F] hover:text-[#B20000]"
                }`}
              >
                <span>Men&apos;s Volleyball</span>
                {activeTab === "men" && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#B20000]"></div>
                )}
              </div>
              <div
                onClick={() => setActiveTab("coed")}
                className={`px-6 py-3 text-center cursor-pointer relative transition-all ${
                  activeTab === "coed" ? "text-[#B20000] font-medium" : "text-[#6F6F6F] hover:text-[#B20000]"
                }`}
              >
                <span>Mixed Volleyball</span>
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
                <span>Women&apos;s Volleyball</span>
                {activeTab === "womenElite" && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#B20000]"></div>
                )}
              </div>
              <div
                onClick={() => setActiveTab("pickleball")}
                className={`px-6 py-3 text-center cursor-pointer relative transition-all ${
                  activeTab === "pickleball" ? "text-[#B20000] font-medium" : "text-[#6F6F6F] hover:text-[#B20000]"
                }`}
              >
                <span>Pickleball</span>
                {activeTab === "pickleball" && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#B20000]"></div>
                )}
              </div>
            </div>
          </div>

            {/*
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
          */}

          {activeTab === "womensElite" && (
            <div className="border border-gray-200 rounded-md p-6">
              <div className="space-y-8">
                <section>
                  <h3 className="text-2xl font-bold text-[#6F6F6F] mb-2">Women’s Elite Volleyball League</h3>
                  <p className="text-lg text-[#6F6F6F]">The OFSL Women’s Elite Volleyball League is committed to advancing the performance and personal growth of volleyball athletes, where top athletes compete at the highest level. These teams showcase advanced technique, tactical awareness, and exceptional physical endurance in every match.</p>
                </section>
                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">League Information</h4>
                  <h5 className="text-lg font-medium text-[#6F6F6F] mb-2">Format</h5>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-2">
                    <li>The league will operate on a ladder system, cycling every 2 weeks.</li>
                    <li>Each tier will consist of four teams, except for tiers with 3 teams.</li>
                    <li>All matches are best-of-five sets.</li>
                    <li>Sets 1–4 are played to 25 points (hard cap at 25) for tiers in Public Schools. For facilities that are not in Public Schools, the Game will play to 25 (with a hard cap of 27).</li>
                    <li>The 5th set is played to 15 points (hard cap) or time cap, whichever comes first.</li>
                    <li>Playoffs: Sets 1–4 to 25 points (27-point hard cap); 5th set to 15 points (17-point hard cap).</li>
                    <li>Each match has a maximum of 15 minutes of warm-up and 90 minutes of play.</li>
                    <li>Total timeslot = 105 minutes.</li>
                    <li>Warm-up: 8 minutes team warm-up + Volleyball Canada format (5 minutes hitting, 1 minute serving).</li>
                    <li>Time Outs: 1 per set to a maximum of 30 seconds.</li>
                    <li>All matches are officiated.</li>
                    <li>Preferred game ball: Mikasa V200W (yellow &amp; blue). Balls provided by teams.</li>
                  </ul>
                </section>
                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">Minimum Player Requirement</h4>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-2">
                    <li>Teams must have at least 5 players to begin a match.</li>
                    <li>If a team cannot field 5 players at the scheduled start time:</li>
                    <li>The first set is defaulted.</li>
                    <li>Each additional set is defaulted every 10 minutes until 5 players are present.</li>
                    <li>When playing with 5 players:</li>
                    <li>Must always have 3 players in the front row.</li>
                    <li>Must identify starting positions, including a ghost player position.</li>
                    <li>When the ghost player’s rotation reaches service, the team loses that point.</li>
                    <li>A libero cannot be used if a ghost player is in play.</li>
                    <li>If a set begins with 5 players, it must finish with those 5 (except injury replacement by libero).</li>
                    <li>If a player is injured during a set, the libero may replace them for the remainder of that set.</li>
                  </ul>
                </section>
                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">Team Registration</h4>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-2">
                    <li>Teams must register a minimum of 6 players.</li>
                    <li>All players must complete registration and the waiver on the league website.</li>
                    <li>All subs must be registered with the official before matches begin.</li>
                    <li>Captains must register subs on the website after each match (same evening).</li>
                  </ul>
                </section>
                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">Substitutes &amp; Playoffs Eligibility</h4>
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
                  </ul>
                  <p className="text-lg text-[#6F6F6F]">Injury exception: If no bench subs are available, the libero may replace an injured player for the remainder of the set, but must take their position.</p>
                </section>
                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">Jerseys &amp; Equipment</h4>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-2">
                    <li>All players must wear numbered jerseys.</li>
                    <li>Libero must wear a different colored jersey.</li>
                    <li>Sub players should wear jerseys that are similar in color to the team’s.</li>
                    <li>OFSL will provide jerseys for the inaugural season. (Future seasons are not guaranteed.)</li>
                  </ul>
                </section>
                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">Officials &amp; Set-Up</h4>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-2">
                    <li>Officials provided for every match.</li>
                    <li>Set-up and take-down is the responsibility of league supervisors and players, as assigned.</li>
                    <li>Referees are responsible for net height and proper set-up.</li>
                  </ul>
                </section>
                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">Playoffs</h4>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-2">
                    <li>Playoffs will be held at the end of the season.</li>
                    <li>Seeding is determined by overall standings, using the average of the last 18 weeks of regular-season play.</li>
                  </ul>
                </section>
              </div>
            </div>
          )}

          {activeTab === "womenElite" && (
            <div className="border border-gray-200 rounded-md p-6">
              {/* In-page navigation buttons */}
              <div className="mb-6">
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => scrollToId("womens-premier")}
                    className="px-4 py-2 rounded border border-[#B20000] text-[#B20000] hover:bg-[#B20000] hover:text-white transition"
                  >
                    Women&rsquo;s Premier
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToId("womens-6x6")}
                    className="px-4 py-2 rounded border border-[#B20000] text-[#B20000] hover:bg-[#B20000] hover:text-white transition"
                  >
                    Women&rsquo;s 6x6
                  </button>
                </div>
              </div>

              <div className="space-y-8">
                {/* Womenâ€™s Elite */}

                {/* Womenâ€™s Premier */}
                <div id="womens-premier" className="scroll-mt-24 space-y-8">
                <section>
                  <h3 className="text-2xl font-bold text-[#6F6F6F] mb-2">Women&rsquo;s Premier Volleyball League</h3>
                  <p className="text-lg text-[#6F6F6F]">
                    The OFSL Women&rsquo;s Premier League provides competitive play for athletes at multiple skill levels. The format emphasizes fast-paced matches, team accountability, and structured tiers to ensure balanced competition.
                  </p>
                </section>

                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">Format</h4>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">League Information</h4>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-2">
                    <li>The league uses a tiered format.</li>
                    <li>All matches are played as best-of-five sets.</li>
                  </ul>
                </section>

                <section>
                  <h5 className="text-lg font-medium text-[#6F6F6F] mb-2">Set scoring:</h5>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-2">
                    <li>All sets are played to 21 points (hard cap at 21).</li>
                    <li>The 5th set is played to 15 points (hard cap).</li>
                  </ul>
                  <p className="text-lg text-[#6F6F6F] mt-2">Match length: Each match is scheduled within its allotted timeslot. 90 minutes including warmup</p>
                  <p className="text-lg text-[#6F6F6F]">Warm-up: Teams should warm up within their timeslot, using available court time efficiently. The official will whistle once the warm-up starts</p>
                </section>

                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">Court Set-Up &amp; Equipment</h4>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-2">
                    <li>Players are responsible for setting up and taking down nets for their assigned court.</li>
                    <li>Officials are responsible for checking net height and equipment where applicable.</li>
                    <li>Preferred game ball: Mikasa V200W (yellow &amp; blue). Teams are expected to provide balls.</li>
                  </ul>
                </section>

                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">Officials</h4>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-2">
                    <li>Matches are officiated in some tiers (tiers assigned by the league).</li>
                    <li>Tiers without officials will require teams to self-officiate in good faith.</li>
                    <li>Any disputes should be brought to the league facilitator and reported to info@ofsl.ca</li>
                  </ul>
                </section>

                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">Player Requirements</h4>
                  <h5 className="text-lg font-medium text-[#6F6F6F] mb-2">Libero-specific rules:</h5>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-2">
                    <li>If a libero is being used, the official must be advised before the match begins.</li>
                    <li>A libero cannot be used if a ghost player is in play.</li>
                    <li>If a player is injured during a set, the libero may replace them for the remainder of that set.</li>
                    <li>If a set begins with 5 players, it must finish with those 5 players (except for injury replacements by the libero).</li>
                  </ul>
                  <p className="text-lg text-[#6F6F6F] mt-2">Teams must start matches with a minimum of 5 players.</p>
                  <p className="text-lg text-[#6F6F6F]">If fewer than 4 players are available at start time, the team will lose a point a minute until a 4th player arrives.</p>
                </section>

                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">Team Registration</h4>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-2">
                    <li>Teams must register a minimum of 6 players on their roster. Teams will not be placed on the schedule until this criteria is met</li>
                    <li>All players must be registered and have signed a waiver through the league website..</li>
                  </ul>
                </section>

                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">Jerseys &amp; Equipment</h4>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-2">
                    <li>Teams are encouraged to wear matching jerseys with numbers. Otherwise, not required.</li>
                  </ul>
                </section>

                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">Playoffs</h4>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-2">
                    <li>Playoffs will be held at the end of the season.</li>
                    <li>Seeding will be determined by overall standings within each tier.</li>
                  </ul>
                </section>
                </div>

                {/* Section break */}
                <div className="h-px bg-gray-200 my-8" />

                {/* Womenâ€™s 6x6 */}
                <div id="womens-6x6" className="scroll-mt-24 space-y-8">
                <section>
                  <h3 className="text-2xl font-bold text-[#6F6F6F] mb-2">Women&rsquo;s 6x6 Volleyball League</h3>
                  <p className="text-lg text-[#6F6F6F]">The OFSL Women&rsquo;s 6x6  League provides competitive play for athletes at multiple skill levels. The format emphasizes fast-paced matches, team accountability, and structured tiers to ensure balanced competition.</p>
                </section>

                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">Format</h4>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">League Information</h4>
                  <p className="text-lg text-[#6F6F6F]">The league uses a  tiered format.</p>
                </section>

                <section>
                  <h5 className="text-lg font-medium text-[#6F6F6F] mb-2">Set scoring:</h5>
                  <p className="text-lg text-[#6F6F6F]">3  team tiers will play games using this format</p>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-1">
                    <li>A vs C</li>
                    <li>A vs C</li>
                    <li>A vs B</li>
                    <li>A vs B</li>
                    <li>B vs C</li>
                    <li>B vs C</li>
                  </ul>
                  <p className="text-lg text-[#6F6F6F] mt-3">2  team tier  will play sets using this format</p>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-1">
                    <li>A vs B</li>
                    <li>A vs B</li>
                    <li>A vs B</li>
                    <li>A vs B</li>
                  </ul>
                  <p className="text-lg text-[#6F6F6F] mt-3">All sets are played to 21 points (hard cap at 21).</p>
                  <p className="text-lg text-[#6F6F6F]">Match length: Each match is scheduled within its allotted timeslot. 90 - 120 minutes</p>
                </section>

                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">Court Set-Up &amp; Equipment</h4>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-2">
                    <li>Team B is responsible for setting up for their assigned court.</li>
                    <li>Team B &amp; C is responsible for taking down for their assigned court</li>
                    <li>Players are responsible for checking net height and equipment where applicable.</li>
                    <li>Preferred game ball: Mikasa V200W (yellow &amp; blue). Teams are expected to provide balls.</li>
                  </ul>
                </section>

                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">Officials</h4>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-2">
                    <li>Matches are officiated in some tiers (tiers assigned by the league).</li>
                    <li>Tiers without officials will require teams to self-officiate in good faith.</li>
                    <li>Any disputes should be brought to the league facilitator and reported to info@ofsl.ca</li>
                  </ul>
                </section>

                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">Player Requirements</h4>
                  <h5 className="text-lg font-medium text-[#6F6F6F] mb-2">Libero-specific rules:</h5>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-2">
                    <li>If a libero is being used, the official and  team captains  must be advised before the match begins.</li>
                    <li>A libero cannot be used if a ghost player is in play.</li>
                    <li>If a player is injured during a set, the libero may replace them for the remainder of that set.</li>
                  </ul>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-2 mt-2">
                    <li>Teams must start matches with a minimum of 5 players.</li>
                    <li>If fewer than 4 players are available at start time, the team will lose a point a minute until a 4th player arrives.</li>
                  </ul>
                </section>

                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">Team Registration</h4>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-2">
                    <li>Teams must register a minimum of 6 players on their roster. Teams will not be placed on the schedule until this criteria is met</li>
                    <li>All players must be registered and have signed a waiver through the league website..</li>
                  </ul>
                </section>

                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">Playoffs</h4>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-2">
                    <li>Playoffs will be held at the end of the season.</li>
                    <li>Seeding will be determined by overall standings within each tier.</li>
                  </ul>
                </section>
                </div>
              </div>
            </div>
          )}

          {activeTab === "coed" && (
            <div className="border border-gray-200 rounded-md p-6">
              {/* In-page navigation buttons */}
              <div className="mb-6">
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => scrollToId("mixed-6x6")}
                    className="px-4 py-2 rounded border border-[#B20000] text-[#B20000] hover:bg-[#B20000] hover:text-white transition"
                  >
                    Mixed 6x6
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToId("mixed-4x4")}
                    className="px-4 py-2 rounded border border-[#B20000] text-[#B20000] hover:bg-[#B20000] hover:text-white transition"
                  >
                    Mixed 4x4
                  </button>
                </div>
              </div>

              <div className="space-y-8">
                {/* Mixed 6x6 */}
                <div id="mixed-6x6" className="scroll-mt-24 space-y-8">
                  <section>
                    <h3 className="text-2xl font-bold text-[#6F6F6F] mb-2">Mixed 6x6 Rules / Standards of Play</h3>
                    <p className="text-lg text-[#6F6F6F]">The OFSL Mixed  6x6  League provides competitive play for athletes at multiple skill levels. The format emphasizes fast-paced matches, team accountability, and structured tiers to ensure balanced competition.</p>
                  </section>

                  <section>
                    <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">Format</h4>
                    <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">League Information</h4>
                    <p className="text-lg text-[#6F6F6F]">The league uses a  tiered format.</p>
                  </section>

                  <section>
                    <h5 className="text-lg font-medium text-[#6F6F6F] mb-2">Set scoring:</h5>
                    <p className="text-lg text-[#6F6F6F]">3  team tiers will play games using this format</p>
                    <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-1">
                      <li>A vs C</li>
                      <li>A vs C</li>
                      <li>A vs B</li>
                      <li>A vs B</li>
                      <li>B vs C</li>
                      <li>B vs C</li>
                    </ul>
                    <p className="text-lg text-[#6F6F6F] mt-3">2  team tier  will play sets using this format</p>
                    <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-1">
                      <li>A vs B</li>
                      <li>A vs B</li>
                      <li>A vs B</li>
                      <li>A vs B</li>
                    </ul>
                    <p className="text-lg text-[#6F6F6F] mt-3">All sets are played to 21 points (hard cap at 21).</p>
                    <p className="text-lg text-[#6F6F6F]">Match length: Each match is scheduled within its allotted timeslot. 90 - 120 minutes</p>
                  </section>

                  <section>
                    <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">Court Set-Up &amp; Equipment</h4>
                    <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-2">
                      <li>Players are responsible for the setup and takedown of the net and other necessary equipment</li>
                      <li>Players are responsible for checking net height and equipment where applicable.</li>
                      <li>Preferred game ball: Mikasa V200W (yellow &amp; blue). Teams are expected to provide balls.</li>
                    </ul>
                  </section>

                  <section>
                    <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">Officials</h4>
                    <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-2">
                      <li>Some tiers are officiated (tiers assigned by the league).</li>
                      <li>Tiers without officials will require teams to self-officiate in good faith.</li>
                      <li>Any disputes should be brought to the league facilitator and reported to info@ofsl.ca</li>
                    </ul>
                  </section>

                  <section>
                    <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">Player Requirements</h4>
                    <h5 className="text-lg font-medium text-[#6F6F6F] mb-2">Libero-specific rules:</h5>
                    <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-2">
                      <li>If a libero is being used, the official and  team captains  must be advised before the match begins.</li>
                      <li>A libero cannot be used if a ghost player is in play.</li>
                      <li>If a player is injured during a set, the libero may replace them for the remainder of that set.</li>
                      <li>Teams must start matches with a minimum of 5 players.</li>
                      <li>If fewer than 4 players are available at start time, the team will lose a point a minute until a 4th player arrives.</li>
                    </ul>
                  </section>

                  <section>
                    <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">Team Registration</h4>
                    <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-2">
                      <li>Teams must register a minimum of 6 players on their roster. Teams will not be placed on the schedule until this criteria is met</li>
                      <li>All players must be registered and have signed a waiver through the league website..</li>
                    </ul>
                  </section>

                  <section>
                    <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">Playoffs</h4>
                    <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-2">
                      <li>Playoffs will be held at the end of the season.</li>
                      <li>Seeding will be determined by overall standings within each tier.</li>
                    </ul>
                  </section>
                </div>

                {/* Section break */}
                <div className="h-px bg-gray-200 my-8" />

                {/* Mixed 4x4 */}
                <div id="mixed-4x4" className="scroll-mt-24 space-y-8">
                  <section>
                    <h3 className="text-2xl font-bold text-[#6F6F6F] mb-2">Mixed 4x4 Rules / Standards of Play</h3>
                  </section>

                  <section>
                    <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">Gender Rules</h4>
                    <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-1">
                      <li>A minimum of two females must be on the court at all times.</li>
                      <li>Men must jump before the 3m line to perform an attack</li>
                      <li>Males may not block females.</li>
                      <li>The net is of mixed height.</li>
                      <li>A minimum of 2 female players is required. Extra female players are allowed, but must play under the â€œguy rules/positionâ€ guideline.</li>
                    </ul>
                  </section>

                  <section>
                    <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">Gameplay Rules</h4>
                    <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-1">
                      <li>A block does not count as a touch.</li>
                      <li>Open hand tips are allowed.</li>
                      <li>On the first contact (except serve reception), a double-hit is allowed unless it is a lift; volleys are permitted.</li>
                    </ul>
                  </section>

                  <section>
                    <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">Substitutes</h4>
                    <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-1">
                      <li>Teams may play with 3 players if no substitute is available.</li>
                      <li>Extra female players on the court must still follow the â€œguy rules/positionâ€ guideline.</li>
                    </ul>
                  </section>

                  <section>
                    <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">Format</h4>
                    <p className="text-lg text-[#6F6F6F]">When you have 3 teams in the Tier, games will be played in the following order: matches will be played to 21 (hard cap).</p>
                    <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-1">
                      <li>A vs C</li>
                      <li>A vs C</li>
                      <li>A vs B</li>
                      <li>A vs B</li>
                      <li>B vs C</li>
                      <li>B vs C</li>
                    </ul>
                    <p className="text-lg text-[#6F6F6F] mt-3">For Tiers with 2 teams, 4 matches will be played to 21 (hard cap).</p>
                    <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-1">
                      <li>A vs B</li>
                      <li>A vs B</li>
                      <li>A vs B</li>
                      <li>A vs B</li>
                    </ul>
                  </section>
                </div>
              </div>
            </div>
          )}

          {activeTab === "pickleball" && (
            <div className="border border-gray-200 rounded-md p-6">
              <div className="space-y-8">
                <section>
                  <h3 className="text-2xl font-bold text-[#6F6F6F] mb-2">Pickleball Standards of Play</h3>
                  <p className="text-lg text-[#6F6F6F]">OFSL&apos;s fall pickleball programs will use different formats for organizing matchups to keep things interesting each week, which will be the case for each fall program. OFSL asks you to review the skill definitions carefully to ensure you register for the appropriate program.</p>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-1 mt-3">
                    <li>Novice</li>
                    <li>Strong Beginner</li>
                    <li>Intermediate (low intermediate and high intermediate)</li>
                  </ul>
                </section>

                <div className="h-px bg-gray-200" />

                <section>
                  <p className="text-lg text-[#6F6F6F]">The fall 2025 offerings will be held in a spacious gym with:</p>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-1 mt-2">
                    <li>4 pickleball courts (16 players playing simultaneously)</li>
                    <li>quality hardwood floors</li>
                    <li>good lighting</li>
                    <li>high ceilings</li>
                  </ul>
                </section>

                <div className="h-px bg-gray-200" />

                <section>
                  <p className="text-lg text-[#6F6F6F]">Different formats will be used to organize play to keep things interesting for players, including:</p>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-1 mt-2">
                    <li>Randomly assigned partners and opponents for each game</li>
                    <li>Ladder format</li>
                    <li>â€œFixed partnerâ€ days</li>
                    <li>â€œSame genderâ€ days</li>
                  </ul>
                  <p className="text-lg text-[#6F6F6F] mt-3">Note: OFSL will be using the existing badminton court lines, so the non-volley zone line will be a bit closer to the pickleball net than a standard pickleball court.</p>
                </section>

                <div className="h-px bg-gray-200" />

                <section>
                  <p className="text-lg text-[#6F6F6F]">Players in OFSL pickleball programs should adhere to the spirit of the rules of pickleball, including:</p>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-1 mt-2">
                    <li>The two bounce rule</li>
                    <li>The non-volley zone rules</li>
                    <li>The service rules</li>
                    <li>Line calling etiquette</li>
                  </ul>
                </section>

                <div className="h-px bg-gray-200" />

                <section>
                  <p className="text-lg text-[#6F6F6F]">A maximum of 20 players will be present on any given week. OFSL will use the Onix Indoor Fuse (orange) pickleball.</p>
                  <p className="text-lg text-[#6F6F6F] mt-3">OFSL provides skill definitions to help players self-identify for the appropriate OFSL offering to ensure each league consists of, for the most part, similarly skilled players.</p>
                  <p className="text-lg text-[#6F6F6F] mt-3">If space and time permits, the onsite coordinator may provide basic coaching and mentoring to help ensure players are reasonably aligned with the other participants.</p>
                </section>
              </div>
            </div>
          )}

          {/* {activeTab === "sundayMixed" && (
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
                    <li>Tier 1: 8:00 â€“ 10:00 PM</li>
                    <li>Tier 2: 6:00 â€“ 8:00 PM</li>
                    <li>Tier 3: 4:00 â€“ 6:00 PM</li>
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
                  <p className="text-lg text-[#6F6F6F]">If the match result is tied (e.g., 24â€“25 / 25â€“24), teams play one additional point to determine which team advances.</p>
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

          */}
          {/* {activeTab === "wednesday4x4" && (
            <div className="border border-gray-200 rounded-md p-6">
              <div className="space-y-8">
                <section>
                  <h3 className="text-2xl font-bold text-[#6F6F6F] mb-2">Wednesday 4x4 Rules / Standards of Play</h3>
                </section>

                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">Gender Rules</h4>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-1">
                    <li>A minimum of two females must be on the court at all times.</li>
                    <li>Men must jump before the 3m line to perform an attack</li>
                    <li>Males may not block females.</li>
                    <li>The net is of mixed height.</li>
                    <li>A minimum of 2 female players is required. Extra female players are allowed, but must play under the â€œmale rules/positionâ€ guideline.</li>
                  </ul>
                </section>

                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">Gameplay Rules</h4>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-1">
                    <li>A block does not count as a touch.</li>
                    <li>Open hand tips are allowed.</li>
                    <li>On the first contact (except serve reception), a double-hit is allowed unless it is a lift; volleys are permitted.</li>
                  </ul>
                </section>

                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">Substitutes</h4>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-1">
                    <li>Teams may play with 3 players if no substitute is available.</li>
                    <li>Extra female players on the court must still follow the â€œguy rules/positionâ€ guideline.</li>
                  </ul>
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

          */}
          {/* {activeTab === "rules4x4" && (
            <div className="border border-gray-200 rounded-md p-6">
              <div className="space-y-8">
                <section>
                  <h3 className="text-2xl font-bold text-[#6F6F6F] mb-2">4x4 Rules / Standards of Play</h3>
                </section>

                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">Gender rules</h4>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-1">
                    <li>Minimum 2 females at all times.</li>
                    <li>Males cannot hit beyond the 3m line (attack line).</li>
                    <li>Males cannot block females.</li>
                    <li>Net is mixed height.</li>
                    <li>Minimum 2 female players on court. Additional females allowed, but extras must play under the â€œguys&apos; rules/positionâ€.</li>
                  </ul>
                </section>

                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">Gameplay rules</h4>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-1">
                    <li>Block does not count as a touch.</li>
                    <li>Open hand tips are allowed.</li>
                    <li>For the first contact (except serve reception), a double-hit is allowed unless it&apos;s a lift; volleys are allowed.</li>
                  </ul>
                </section>

                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">Substitutes</h4>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-1">
                    <li>Teams may play with only 3 players if no substitute is available.</li>
                    <li>Extra female players on the court must still follow the â€œguy rules/positionâ€ guideline.</li>
                  </ul>
                </section>

                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">General (Officiated)</h4>
                  <p className="text-lg text-[#6F6F6F]">
                    Officials must announce the possibility of a time cap at least 5 minutes before it. No time-outs allowed after announcement. When the cap is reached, finish the current point. Leading team wins; if tied, play one more point.
                  </p>
                </section>

                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">Minimum Players on Court</h4>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-1">
                    <li>A team may compete with a minimum of five (5) players only under special circumstances during the regular season (e.g., injury, late arrival, or player cancellation).</li>
                    <li>Teams must maintain three (3) players in the front row.</li>
                    <li>If a set begins with five (5) players, it must be completed with five (5) players.</li>
                    <li>An injured regular player may be replaced by a libero for the remainder of the set.</li>
                  </ul>
                </section>

                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">Minimum 2 females on the court (clarification)</h4>
                  <p className="text-lg text-[#6F6F6F]">
                    If a team has only one female player, it is encouraged that they borrow a female player who is sitting off to help balance the lineup. However, if all captains agree, and a team still has only one female, then that team may field no more than three male players, making a total of four on the court.
                  </p>
                </section>

                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">Late Arrival Policy</h4>
                  <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-1">
                    <li>If a team arrives 20 minutes after the first scheduled game, they will forfeit the first set.</li>
                    <li>If a team arrives 10 minutes after the scheduled first game, they will be deducted one point per minute, accumulating until the opposing team arrives or the 20-minute threshold is met.</li>
                    <li>This rule does not apply if the sitting team agrees to play their games first in place of the late team.</li>
                  </ul>
                  <p className="text-lg text-[#6F6F6F] mt-2">Important Note: Rules may differ in special circumstances (e.g., a last-minute gym cancellation). In such cases, the league will determine the next steps to take.</p>
                </section>

                <section>
                  <h4 className="text-xl font-semibold text-[#6F6F6F] mb-2">Sunday Format</h4>
                  <p className="text-lg text-[#6F6F6F]">See the &ldquo;Sunday Mixed Volleyball&rdquo; tab for detailed Sunday evening format and movement rules.</p>
                </section>
              </div>
            </div>
          )}

          */}
          {activeTab === "men" && (
            <div className="border border-gray-200 rounded-md p-6">
              <div className="space-y-8">
                <section>
                  <h3 className="text-2xl font-bold text-[#6F6F6F] mb-2">Men&rsquo;s Volleyball League</h3>
                  <p className="text-lg text-[#6F6F6F]">
                    The OFSL Monday Men&rsquo;s League provides competitive play for athletes at multiple skill levels. The format emphasizes fast-paced matches, team accountability, and structured tiers to ensure balanced competition.
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
