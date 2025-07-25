import { useState, useEffect } from "react";
import { useAuth } from "../../../../contexts/AuthContext";
import { supabase } from "../../../../lib/supabase";
import { Card, CardContent } from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import { useToast } from "../../../../components/ui/toast";
import { getUserIpAddress } from "../../../../lib/ipUtils";
import { FileText, CheckCircle, AlertCircle, Calendar } from "lucide-react";

interface Waiver {
  id: number;
  title: string;
  content: string;
  version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface WaiverAcceptance {
  id: number;
  waiver_id: number;
  accepted_at: string;
  waiver?: Waiver;
}

export function WaiverStatus() {
  const { userProfile, user, refreshUserProfile } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeWaiver, setActiveWaiver] = useState<Waiver | null>(null);
  const [userAcceptances, setUserAcceptances] = useState<WaiverAcceptance[]>(
    [],
  );
  const [showWaiverContent, setShowWaiverContent] = useState(false);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    loadWaiverData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile]);

  const loadWaiverData = async () => {
    if (!userProfile?.id) return;

    try {
      setLoading(true);

      // Load active waiver
      const { data: waiverData, error: waiverError } = await supabase
        .from("waivers")
        .select("*")
        .eq("is_active", true)
        .single();

      if (waiverError && waiverError.code !== "PGRST116") {
        console.error("Error loading active waiver:", waiverError);
      } else if (waiverData) {
        setActiveWaiver(waiverData);
      }

      // Load user's waiver acceptances
      const { data: acceptancesData, error: acceptancesError } = await supabase
        .from("waiver_acceptances")
        .select(
          `
          *,
          waiver:waivers(*)
        `,
        )
        .eq("user_id", userProfile.id)
        .order("accepted_at", { ascending: false });

      if (acceptancesError) {
        console.error("Error loading waiver acceptances:", acceptancesError);
      } else {
        setUserAcceptances(acceptancesData || []);
      }
    } catch (error) {
      console.error("Error loading waiver data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptWaiver = async () => {
    if (!activeWaiver || !userProfile?.id || !user?.id) return;

    try {
      setAccepting(true);

      // Get user's actual IP address
      const userIp = await getUserIpAddress();

      // Record waiver acceptance
      const { error: acceptanceError } = await supabase
        .from("waiver_acceptances")
        .insert({
          user_id: userProfile.id,
          waiver_id: activeWaiver.id,
          accepted_at: new Date().toISOString(),
          ip_address: userIp,
          user_agent: navigator.userAgent,
        });

      if (acceptanceError) throw acceptanceError;

      // Update user profile waiver_accepted status
      const { error: profileError } = await supabase
        .from("users")
        .update({
          waiver_accepted: true,
          date_modified: new Date().toISOString(),
        })
        .eq("id", userProfile.id);

      if (profileError) throw profileError;

      // Refresh data
      await refreshUserProfile();
      await loadWaiverData();

      showToast("Waiver accepted successfully!", "success");
      setShowWaiverContent(false);
    } catch (error) {
      console.error("Error accepting waiver:", error);
      showToast("Failed to accept waiver. Please try again.", "error");
    } finally {
      setAccepting(false);
    }
  };

  const hasAcceptedActiveWaiver =
    activeWaiver &&
    userAcceptances.some(
      (acceptance) => acceptance.waiver_id === activeWaiver.id,
    );


  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#B20000]"></div>
            <span className="ml-2 text-[#6F6F6F]">
              Loading waiver status...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-[#6F6F6F] flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Waiver Status
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Terms & conditions and liability waiver acceptance
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {activeWaiver ? (
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex items-center gap-2 ${hasAcceptedActiveWaiver ? "text-green-600" : "text-orange-600"}`}
                  >
                    {hasAcceptedActiveWaiver ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <AlertCircle className="h-5 w-5" />
                    )}
                    <span className="font-medium">
                      {hasAcceptedActiveWaiver
                        ? "Waiver Accepted"
                        : "Waiver Pending"}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-[#6F6F6F]">
                    {activeWaiver.title}
                  </p>
                  <p className="text-xs text-gray-500">
                    Version {activeWaiver.version}
                  </p>
                </div>
              </div>

              {!hasAcceptedActiveWaiver && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      You need to accept the current waiver to participate in
                      league activities.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setShowWaiverContent(!showWaiverContent)}
                        variant="outline"
                        size="sm"
                      >
                        {showWaiverContent ? "Hide" : "Read"} Waiver
                      </Button>
                      <Button
                        onClick={handleAcceptWaiver}
                        disabled={accepting}
                        size="sm"
                        className="bg-[#B20000] hover:bg-[#8A0000] text-white"
                      >
                        {accepting ? "Accepting..." : "Accept Waiver"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {showWaiverContent && (
                <div className="mt-4 pt-4 border-t">
                  <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                    <div
                      className="prose prose-sm max-w-none text-gray-700"
                      dangerouslySetInnerHTML={{ __html: activeWaiver.content }}
                    />
                  </div>
                  {!hasAcceptedActiveWaiver && (
                    <div className="mt-4 flex justify-end">
                      <Button
                        onClick={handleAcceptWaiver}
                        disabled={accepting}
                        className="bg-[#B20000] hover:bg-[#8A0000] text-white"
                      >
                        {accepting ? "Accepting..." : "Accept Waiver"}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p>No active waiver found</p>
            </div>
          )}

          {/* Previous Acceptances */}
          {userAcceptances.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-[#6F6F6F] mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Waiver History
              </h4>
              <div className="space-y-2">
                {userAcceptances.map((acceptance) => (
                  <div
                    key={acceptance.id}
                    className="bg-gray-50 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-[#6F6F6F]">
                          {acceptance.waiver?.title || "Unknown Waiver"}
                        </p>
                        <p className="text-xs text-gray-500">
                          Version {acceptance.waiver?.version || "N/A"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">
                          Accepted on{" "}
                          {new Date(
                            acceptance.accepted_at,
                          ).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(
                            acceptance.accepted_at,
                          ).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

