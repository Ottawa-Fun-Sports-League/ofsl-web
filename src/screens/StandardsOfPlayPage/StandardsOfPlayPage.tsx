import React from "react";
import { HeroBanner } from "../../components/HeroBanner";

export const StandardsOfPlayPage = (): React.ReactElement => {
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
        {/* General League Guidelines */}
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
              <h3 className="text-2xl font-bold text-[#6F6F6F] mb-4">Players&apos; responsibilities</h3>
              <p className="text-lg text-[#6F6F6F] mb-4">
                Team <strong>A & C</strong> are responsible for <strong>net & pole set up</strong> and Team <strong>B & C</strong> for take down. OFSL facilitators will notify players to begin activities 10 minutes after schedule time and to stop activities at 10 minutes before the schedule time ie. For games scheduled for 8:00-10:00 pm, start time will be at 8:10 pm & end time at 9:50 pm. Note if a team is late, the order of play can be changed without penalty as long as the teams present agree to play, All 6 sets must be played within the time permitted. The team who is not sitting off, must score keep for the duration of the matches.
              </p>
              <p className="text-lg text-[#6F6F6F] mb-4">
                A game ball will not be provided by the league. If team captains can not agree upon a ball to use, the team sitting off will make the decision.
              </p>
              <p className="text-lg text-[#6F6F6F]">
                Note that a game ball will be provided by the league if team captains have not already agreed upon a ball to use.
              </p>
            </section>

            <section>
              <h3 className="text-2xl font-bold text-[#6F6F6F] mb-4">Tiering system</h3>
              <p className="text-lg text-[#6F6F6F]">
                Each tier has 3 teams who all play a total of 4 sets (2 each against opposing teams). The team with the most wins moves up a tier, team with second best record stays and team with third best record moves down a tier. Tiebreakers will be determined by head-to-head result, points for/against, then total points between the 2 teams. If still tied, previous week&apos;s standings will determine team&apos;s positioning. In case of a three-way tie, we use points for/against, then total points of all 3 teams. If still tied, previous week&apos;s standing will come into effect. When a team forfeits in a 3 tier, points will be scored as 0 pts and the other two teams will receive 21 pts per set. The remaining two teams will play their two sets as per the original schedule.
              </p>
            </section>

            <section>
              <h3 className="text-2xl font-bold text-[#6F6F6F] mb-4">Games Self-Refereed</h3>
              <p className="text-lg text-[#6F6F6F]">
                All teams are responsible to call own faults including touching the net, doubles and ball in or out of bounds. If a dispute occurs, <strong>captains</strong> need to agree on how to proceed. If both captains disagree, point for that rally will be concluded as a re-serve.
              </p>
            </section>

            <section>
              <h3 className="text-2xl font-bold text-[#6F6F6F] mb-4">Games Order</h3>
              <p className="text-lg text-[#6F6F6F] mb-4">
                When you have 3 teams in the Tier, games will be played in the following order:
              </p>
              <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-2 mb-4">
                <li>A vs C</li>
                <li>A vs C</li>
                <li>A vs B</li>
                <li>A vs B</li>
                <li>B vs C</li>
                <li>B vs C</li>
              </ul>
              <p className="text-lg text-[#6F6F6F]">
                <strong>For Tiers with 2 teams, 4 matches will be played to 21 (hard cap).</strong>
              </p>
            </section>

            <section>
              <h3 className="text-2xl font-bold text-[#6F6F6F] mb-4">Minimum 2 females on the court</h3>
              <p className="text-lg text-[#6F6F6F]">
                If a team only has 1 female, it is encouraged to borrow a player sitting off. If this is not an option and a team still has only 1 female, only 3 males are allowed on the court which makes it a <strong>maximum of 4 players</strong> during play. All agreement should be done prior to game starting.
              </p>
            </section>

            <section>
              <h3 className="text-2xl font-bold text-[#6F6F6F] mb-4">Playoffs</h3>
              <p className="text-lg text-[#6F6F6F] mb-4">
                OFSL Playoffs will be held the last 2 weeks of the season. Seeding of teams will be determined by overall season results in standings.
              </p>
              <p className="text-lg text-[#6F6F6F]">
                Substitute players will be allowed in the playoff after playing a minimum of 2 evenings during the regular season. Players from other teams are not allowed to sub for another team during the playoffs.
              </p>
            </section>

            <section>
              <h3 className="text-2xl font-bold text-[#6F6F6F] mb-4">Two strike rule</h3>
              <p className="text-lg text-[#6F6F6F]">
                OFSL will not tolerate abusive or aggressive behavior. The league&apos;s mission is to offer a safe environment that promotes sportsmanship, healthy competition and social interactions with all participants. If the OFSL committee receives a complaint about an individual and /or team displaying an unsportsmanlike conduct such as verbal or physical abuse towards another player, an initial warning will be given. If a second offense is reported, that player/team will be banned from the league permanently. Note that No refund will be provided. OFSL recognizes that situations may get intense at times. If this occurs, captains will be asked to call a <strong>timeout immediately & request a re-serve.</strong>
              </p>
            </section>

            <section>
              <h3 className="text-2xl font-bold text-[#6F6F6F] mb-4">Noise level</h3>
              <p className="text-lg text-[#6F6F6F]">
                In spirit of OFSL standards, we asked that all players be respectful of other players in the facility by keeping the noise level and music to an moderate volume. Ex. Yelling, screeching, loud music, etc.
              </p>
            </section>
          </div>
        </div>

        <div className="mb-16">
          <h2 className="text-3xl font-bold text-[#6F6F6F] mb-8">OFSL Volleyball Rules</h2>
          
          <div className="space-y-6">
            <p className="text-lg text-[#6F6F6F] mb-6">
              Rules and guidelines from Volleyball Canada will apply except for a few that will be adjusted to fit OFSL (see below)<br />
              Refer to <a href="https://www.volleyball.ca" target="_blank" rel="noopener noreferrer" className="text-[#B20000] hover:underline">www.volleyball.ca</a> for Rules and Guidelines
            </p>

            <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-4">
              <li><strong>Kicking of the ball is allowed</strong></li>
              
              <li>No touching the net – any part of the body touching any part of the net will be considered a fault</li>
              
              <li>No crossing line under the net – A player is allowed to step on the line the center line but are not allowed to cross it and does not interfere with a player. Exception to the rule, if the ball is already down and the momentum is carried during the attack then it is not a fault.</li>
              
              <li>Players can cross the plane of the net when blocking and follow-through on a spike.</li>
              
              <li><strong>Screening:</strong> If the Serving team adjusts their position or places there hands above their head on the court to prevent the Receiving team from first seeing the server and secondly the flight path of the ball, then it is a screen.</li>
              
              <li>Substitute players are allowed. Names must be recorded on the score sheet provided by facilitators to be admissible for playoffs (needs to have subbed twice). Note that substitute players should be a similar caliber to the tier that evening.Teams can ask players who are sitting off but can not have a substitute from a higher tier. Maximum of 3 subs can be used at one time.</li>
              
              <li>Each team must play within its own playing area and space (except Rule 10.1. 2). However, if the first hit had passed outside the antenna, then this would be a legal play, although for indoor volleyball, the player passing under the net may not touch the opponent&apos;s court.A rotation must occur after the receiving team wins their first rally point.</li>
              
              <li>A ball is considered out of bounds when it touches any surface, objects or ground outside the court. <strong>Clarification:</strong> The ball is considered &ldquo;out&rdquo; and can not be played if it touches the ceiling.</li>
              
              <li>A ball can be played when the it passing over on a first and second touch but must pass over or between the side boundary lines (outside of the court) as it crosses the net. A player may run outside the court to play the ball, but cannot cross over the playing surface of the opposing courts or the out of bounds lines between courts.</li>
              
              <li>Rally point system: Team winning a rally scores a point.When receiving team wins the rally, it gains a point and the right to serve and its players rotate one position clockwise.</li>
              
              <li>The ball is not allowed to cross the net with a &ldquo;throwing&rdquo; action.The ball must be hit cleanly.No scooping or carrying the ball is allowed.Only off of a driven ball may a ball be a double hit (ie off the arm and head in one continuous motion)</li>
              
              <li>When 2 or 3 players touch the ball simultaneously, it is counted as 2 or 3 hits with the exception of blocking which does not count as a hit.</li>
              
              <li>If first contact of receiving team during service receive of first dig/touch is a &ldquo;double&rdquo; touch and deemed simultaneous, the play continues.</li>
              
              <li>A served ball my not be blocked, spiked or volleyed directly back over the net if the attack is above the net.</li>
              
              <li>If a team show up 10 minutes after scheduled first game, every minute will be deducted a point, accumulating up to when the team arrives.This rule does not apply if sitting team agrees to play games first in place of late team.</li>
              
              <li>In facilities where the back-court line is within 3 feet of the wall, servers may step into the court to complete their serve.</li>
              
              <li>It is considered a &ldquo;double&rdquo; touch when the ball has 4 or more complete full rotations or when the hands of the setter touch the ball unevenly.</li>
              
              <li>A fault occurs when the ball hits the antenna.</li>
              
              <li><strong>Volleyball scores have a hard cap of 21 points. This may vary for selected leagues.</strong></li>
            </ul>

            <section className="mt-8">
              <h3 className="text-2xl font-bold text-[#6F6F6F] mb-4">Libero Co-ed League Rules:</h3>
              <ul className="list-disc pl-6 text-lg text-[#6F6F6F] space-y-4">
                <li>Teams must communicate to the opposition and identify which player will adhere to the libero position throughout the match. OFSL highly recommends the libero wear a distinguishable T-shirt colour.</li>
                
                <li>If a team designates a female libero, the team must follow the Standard of Rules of always having 2 females on the court at all times not including the libero. Female libero can only replace a female player in the back row. Back row positions are 5,6 and 1 (same applies for male libero). A team cannot replace a female libero with a male player (or vice versa) when the libero&apos;s next rotation is towards the front court (position 4).</li>
                
                <li>Teams cannot use a libero while short-handed. An eligible team must have a minimum of 7 players to use the libero.</li>
                
                <li>If a player on the team using a libero suffers an injury and cannot continue, the libero may replace the injured player in the lineup, losing his/her libero status in the process.</li>
                
                <li>All other rules will be following Volleyball Canada 2022/23 rules.</li>
              </ul>
            </section>

            <p className="text-lg text-[#6F6F6F] mt-8">
              If you still have any questions or concerns please contact <a href="mailto:info@ofsl.ca" className="text-[#B20000] hover:underline">info@ofsl.ca</a>
            </p>
          </div>
        </div>
        
      </div>
    </div>
  );
};