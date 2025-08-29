import { Route, Routes } from "react-router-dom";
import { HomePage } from "./screens/HomePage";
import { VolleyballPage } from "./screens/VolleyballPage";
import { BadmintonPage } from "./screens/BadmintonPage";
import { PickleballPage } from "./screens/PickleballPage";
import { LeaguesPage } from "./screens/LeaguesPage";
import { LoginPage } from "./screens/LoginPage";
import { SignupPage } from "./screens/SignupPage";
import { ForgotPasswordPage } from "./screens/ForgotPasswordPage";
import { ResetPasswordPage } from "./screens/ResetPasswordPage";
import { SignupConfirmation } from "./screens/SignupPage";
import { AboutUsPage } from "./screens/AboutUsPage";
import { StandardsOfPlayPage } from "./screens/StandardsOfPlayPage";
import { SkillsAndDrillsPage } from "./screens/SkillsAndDrillsPage";
import { TournamentsPage } from "./screens/TournamentsPage";
import { SuccessPage } from "./screens/SuccessPage";
import { CancelPage } from "./screens/CancelPage";
import { Layout } from "./components/Layout";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ScrollToTop } from "./components/ScrollToTop";
import { LeagueDetailPage } from "./screens/LeagueDetailPage";
import { ToastProvider } from "./components/ui/toast";
import {
  AccountLayout,
  ProfileTab,
  TeamsTab,
  LeaguesTab,
  SchoolsTab,
  UsersTab,
  WaiversTab,
  ManageTeamsTab,
  SparesTab,
  LeagueEditPage,
  TeamEditPage,
  IndividualEditPage,
  LeagueNewPage,
  UserRegistrationsPage,
} from "./screens/MyAccount";
import { LeagueTeamsPage } from "./screens/LeagueTeamsPage";
import { ProfileCompletionPage } from "./screens/ProfileCompletionPage/ProfileCompletionPage";
import { Navigate } from "react-router-dom";
import { GoogleSignupRedirect } from "./screens/SignupPage/GoogleSignupRedirect";
import { AdminOnlyRoute } from "./components/AdminOnlyRoute";
import { ConditionalRoute } from "./components/ConditionalRoute";
import { ComingSoonPage } from "./screens/ComingSoonPage";
import { useGoogleAnalytics } from "./hooks/useGoogleAnalytics";
import { AuthErrorHandler } from "./components/AuthErrorHandler";

// Create a catch-all route component to handle direct URL access
// const CatchAllRoute = () => {
//   // This will redirect any unknown routes to the home page
//   return <Navigate to="/" replace />;
// };

export function App() {
  // Track page views for Google Analytics
  useGoogleAnalytics();
  
  return (
    <ToastProvider>
      <AuthProvider>
        <AuthErrorHandler />
        <ScrollToTop />
        <Routes>
          <Route element={<Layout />}>
            <Route path="/complete-profile" element={<ProfileCompletionPage />} />
            <Route path="/" element={<ConditionalRoute><HomePage /></ConditionalRoute>} />
            <Route path="/volleyball" element={<ConditionalRoute><VolleyballPage /></ConditionalRoute>} />
            <Route path="/badminton" element={<ConditionalRoute><BadmintonPage /></ConditionalRoute>} />
            <Route path="/pickleball" element={<ConditionalRoute><PickleballPage /></ConditionalRoute>} />
            <Route path="/leagues" element={<ConditionalRoute><LeaguesPage /></ConditionalRoute>} />
            <Route
              path="/google-signup-redirect"
              element={<GoogleSignupRedirect />}
            />
            <Route path="/leagues/:id" element={<ConditionalRoute><LeagueDetailPage /></ConditionalRoute>} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/signup-confirmation" element={<SignupConfirmation />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            {/* Ensure reset-password route can handle both query params and hash fragments */}
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/about-us" element={<ConditionalRoute><AboutUsPage /></ConditionalRoute>} />
            <Route
              path="/standards-of-play"
              element={<ConditionalRoute><StandardsOfPlayPage /></ConditionalRoute>}
            />
            <Route
              path="/skills-and-drills"
              element={<ConditionalRoute><SkillsAndDrillsPage /></ConditionalRoute>}
            />
            <Route
              path="/tournaments"
              element={<ConditionalRoute><TournamentsPage /></ConditionalRoute>}
            />
            <Route path="/success" element={<ConditionalRoute><SuccessPage /></ConditionalRoute>} />
            <Route path="/cancel" element={<ConditionalRoute><CancelPage /></ConditionalRoute>} />

            {/* My Account routes with proper routing */}
            <Route
              path="/my-account"
              element={
                <ProtectedRoute>
                  <Navigate to="/my-account/profile" replace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-account"
              element={
                <ProtectedRoute>
                  <AccountLayout />
                </ProtectedRoute>
              }
            >
              <Route path="teams" element={<TeamsTab />} />
              <Route path="profile" element={<ProfileTab />} />
              <Route path="spares" element={<SparesTab />} />
              <Route
                path="leagues"
                element={
                  <ProtectedRoute requireAdmin>
                    <LeaguesTab />
                  </ProtectedRoute>
                }
              />
              <Route
                path="schools"
                element={
                  <ProtectedRoute requireAdmin>
                    <SchoolsTab />
                  </ProtectedRoute>
                }
              />
              <Route
                path="users"
                element={
                  <ProtectedRoute requireAdmin>
                    <UsersTab />
                  </ProtectedRoute>
                }
              />
              <Route
                path="waivers"
                element={
                  <ProtectedRoute requireAdmin>
                    <WaiversTab />
                  </ProtectedRoute>
                }
              />
              <Route
                path="manage-teams"
                element={
                  <ProtectedRoute requireAdmin>
                    <ManageTeamsTab />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* League New Page - separate route */}
            <Route
              path="/my-account/leagues/new"
              element={
                <ProtectedRoute requireAdmin>
                  <LeagueNewPage />
                </ProtectedRoute>
              }
            />

            {/* League Edit Page - separate route */}
            <Route
              path="/my-account/leagues/edit/:id"
              element={
                <ProtectedRoute requireAdmin>
                  <LeagueEditPage />
                </ProtectedRoute>
              }
            />

            {/* Team Edit Page - separate route */}
            <Route
              path="/my-account/teams/edit/:id"
              element={
                <ProtectedRoute requireAdmin>
                  <TeamEditPage />
                </ProtectedRoute>
              }
            />

            {/* Individual Edit Page - separate route */}
            <Route
              path="/my-account/individual/edit/:userId/:leagueId"
              element={
                <ProtectedRoute requireAdmin>
                  <IndividualEditPage />
                </ProtectedRoute>
              }
            />

            {/* User Registrations Page - separate route */}
            <Route
              path="/my-account/users/:userId/registrations"
              element={
                <ProtectedRoute requireAdmin>
                  <UserRegistrationsPage />
                </ProtectedRoute>
              }
            />


            {/* League Teams Page - separate route */}
            <Route
              path="/leagues/:leagueId/teams"
              element={
                <ProtectedRoute requireAdmin>
                  <LeagueTeamsPage />
                </ProtectedRoute>
              }
            />


            {/* Coming Soon page route */}
            <Route path="/coming-soon" element={<ComingSoonPage />} />

            {/* Catch-all route for any unmatched routes */}
            <Route path="*" element={<AdminOnlyRoute><Navigate to="/" replace /></AdminOnlyRoute>} />

            {/* Legacy redirects for backward compatibility */}
            <Route
              path="/my-teams"
              element={
                <ProtectedRoute>
                  <Navigate to="/my-account/teams" replace />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </ToastProvider>
  );
}
