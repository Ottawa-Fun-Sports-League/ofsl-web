import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { Link } from "react-router-dom";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { Mail } from "lucide-react";
import { supabase } from "../../../../lib/supabase";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Badge } from "../../../../components/ui/badge";
import { LoadingSpinner } from "../../../../components/ui/loading-spinner";
import { cn } from "../../../../lib/utils";
import { Checkbox } from "../../../../components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../../components/ui/dialog";
import { useToast } from "../../../../components/ui/toast";
import {
  sendBulkEmail,
  type BulkEmailResultSummary,
} from "../UsersTab/utils/sendBulkEmail";
import type { BulkEmailRecipient } from "../UsersTab/types";

type ProgramType = "regular_season" | "tournament" | "skills_drills" | null;
type RegistrationMode = "team" | "individual";

interface RegistrationRow {
  id: number;
  created_at: string;
  user_id: string;
  user_name: string;
  user_email: string;
  league_id: number | null;
  league_name: string;
  league_type: ProgramType;
  mode: RegistrationMode;
}

interface RegistrationQueryRow {
  id: number;
  created_at: string;
  user_id: string;
  team_id: number | null;
  users: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  leagues: {
    id: number;
    name: string;
    league_type: ProgramType;
    team_registration: boolean | null;
  } | null;
}

const MAX_RECORDS = 250;
const REGISTRATION_SELECT = `
  id,
  created_at,
  user_id,
  team_id,
  users:user_id(
    id,
    name,
    email
  ),
  leagues:league_id(
    id,
    name,
    league_type,
    team_registration
  )
`;

const programTypeLabels: Record<Exclude<ProgramType, null>, string> = {
  regular_season: "League",
  tournament: "Tournament",
  skills_drills: "Skills & Drills",
};

const programTypeBadgeClasses: Record<Exclude<ProgramType, null>, string> = {
  regular_season:
    "bg-blue-600/10 text-blue-800 border-blue-200 hover:bg-blue-600/20",
  tournament:
    "bg-purple-600/10 text-purple-800 border-purple-200 hover:bg-purple-600/20",
  skills_drills:
    "bg-amber-500/15 text-amber-900 border-amber-300 hover:bg-amber-500/25",
};

const modeBadgeClasses: Record<RegistrationMode, string> = {
  team: "bg-indigo-600/10 text-indigo-900 border-indigo-200 hover:bg-indigo-600/20",
  individual:
    "bg-emerald-600/10 text-emerald-900 border-emerald-200 hover:bg-emerald-600/20",
};

const DEFAULT_EMAIL_SUBJECT = "OFSL Registration Update";
const DEFAULT_EMAIL_BODY =
  "Hello {{first_name}},\n\nWe wanted to follow up regarding your recent registration.\n\nThanks,\nOFSL Team";
const PAGE_STICKY_OFFSET = 96;

const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));

const timeAgo = (iso: string) => {
  const diffMs = Date.now() - new Date(iso).getTime();
  if (diffMs < 0) return "Just now";
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

const toRegistrationRow = (row: RegistrationQueryRow): RegistrationRow => {
  const mode: RegistrationMode = row.team_id ? "team" : "individual";
  return {
    id: row.id,
    created_at: row.created_at,
    user_id: row.user_id,
    user_name: row.users?.name || "Unknown user",
    user_email: row.users?.email || "Unknown email",
    league_id: row.leagues?.id ?? null,
    league_name: row.leagues?.name || "Unknown program",
    league_type: row.leagues?.league_type ?? "regular_season",
    mode,
  };
};

type LeaguePaymentChangePayload = {
  id: number;
};

export function RegistrationsTab() {
  const { showToast } = useToast();
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<
    "connecting" | "connected" | "error"
  >("connecting");
  const hasLoadedOnceRef = useRef(false);
  const [selectedRegistrationIds, setSelectedRegistrationIds] = useState<
    Set<number>
  >(new Set());
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailRecipients, setEmailRecipients] = useState<BulkEmailRecipient[]>(
    [],
  );
  const [emailSubject, setEmailSubject] = useState(DEFAULT_EMAIL_SUBJECT);
  const [emailBody, setEmailBody] = useState(DEFAULT_EMAIL_BODY);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendCopyToInfo, setSendCopyToInfo] = useState(true);
  const [sendCopyToFacilitator, setSendCopyToFacilitator] = useState(true);
  const [emailResult, setEmailResult] = useState<BulkEmailResultSummary | null>(
    null,
  );

  const fetchRegistrations = useCallback(
    async (options?: { silent?: boolean }) => {
      try {
        setError(null);
        const shouldShowFullSpinner =
          !options?.silent && !hasLoadedOnceRef.current;

        if (shouldShowFullSpinner) {
          setLoading(true);
        } else if (!options?.silent) {
          setRefreshing(true);
        }

        const { data, error: fetchError } = await supabase
          .from("league_payments")
          .select(REGISTRATION_SELECT)
          .order("created_at", { ascending: false })
          .limit(MAX_RECORDS)
          .returns<RegistrationQueryRow[]>();

        if (fetchError) {
          throw fetchError;
        }

        setRegistrations((data || []).map(toRegistrationRow));
        setLastUpdated(new Date().toISOString());
        hasLoadedOnceRef.current = true;
      } catch (err) {
        console.error("Failed to load registrations feed", err);
        setError("Unable to load registrations. Please try again.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  const fetchRegistrationById = useCallback(async (id: number) => {
    const { data, error: fetchError } = await supabase
      .from("league_payments")
      .select(REGISTRATION_SELECT)
      .eq("id", id)
      .maybeSingle<RegistrationQueryRow>();

    if (fetchError || !data) {
      if (fetchError) {
        console.error("Failed to fetch registration row", fetchError);
      }
      return null;
    }

    return toRegistrationRow(data);
  }, []);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  useEffect(() => {
    const channel = supabase
      .channel("league-registrations-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "league_payments" },
        async (
          payload: RealtimePostgresChangesPayload<LeaguePaymentChangePayload>,
        ) => {
          const record = payload.new as Partial<LeaguePaymentChangePayload>;
          if (typeof record.id !== "number") {
            return;
          }
          const fresh = await fetchRegistrationById(record.id);
          if (!fresh) return;
          setRegistrations((prev) => {
            const updated = [fresh, ...prev.filter((row) => row.id !== fresh.id)];
            return updated.slice(0, MAX_RECORDS);
          });
          setLastUpdated(new Date().toISOString());
        },
      )
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          setRealtimeStatus("connected");
        } else if (status === "CHANNEL_ERROR" || status === "CLOSED") {
          setRealtimeStatus("error");
        }
      });

    return () => {
      supabase.removeChannel(channel);
      setRealtimeStatus("connecting");
    };
  }, [fetchRegistrationById]);

  const filteredRegistrations = useMemo(() => {
    if (!searchTerm) return registrations;
    const query = searchTerm.toLowerCase();
    return registrations.filter((registration) => {
      return (
        registration.user_name.toLowerCase().includes(query) ||
        registration.user_email.toLowerCase().includes(query) ||
        registration.league_name.toLowerCase().includes(query)
      );
    });
  }, [registrations, searchTerm]);

  useEffect(() => {
    setSelectedRegistrationIds((prev) => {
      const allowed = new Set(filteredRegistrations.map((reg) => reg.id));
      let changed = false;
      const next = new Set<number>();
      prev.forEach((id) => {
        if (allowed.has(id)) {
          next.add(id);
        } else {
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [filteredRegistrations]);

  const selectedRegistrations = useMemo(
    () =>
      filteredRegistrations.filter((registration) =>
        selectedRegistrationIds.has(registration.id),
      ),
    [filteredRegistrations, selectedRegistrationIds],
  );

  const selectedCount = selectedRegistrationIds.size;
  const allVisibleSelected =
    filteredRegistrations.length > 0 &&
    filteredRegistrations.every((reg) => selectedRegistrationIds.has(reg.id));
  const selectionCheckboxState =
    allVisibleSelected && filteredRegistrations.length > 0
      ? true
      : selectedCount > 0
        ? "indeterminate"
        : false;

  const liveIndicatorColor =
    realtimeStatus === "connected"
      ? "bg-emerald-500"
      : realtimeStatus === "error"
        ? "bg-red-500"
        : "bg-amber-400";

  const liveIndicatorLabel =
    realtimeStatus === "connected"
      ? "Live"
      : realtimeStatus === "error"
        ? "Live updates unavailable"
        : "Connecting…";

  const handleToggleRegistration = useCallback((id: number, checked: boolean) => {
    setSelectedRegistrationIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const handleToggleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedRegistrationIds(
          new Set(filteredRegistrations.map((registration) => registration.id)),
        );
      } else {
        setSelectedRegistrationIds(new Set());
      }
    },
    [filteredRegistrations],
  );

  const clearSelection = useCallback(() => {
    setSelectedRegistrationIds(new Set());
  }, []);

  const buildRecipientsFromRows = useCallback(
    (rows: RegistrationRow[]): BulkEmailRecipient[] => {
      const map = new Map<string, BulkEmailRecipient>();
      rows.forEach((row) => {
        const email = row.user_email?.trim();
        if (!email || email === "Unknown email") {
          return;
        }
        const key = email.toLowerCase();
        if (!map.has(key)) {
          map.set(key, {
            email,
            name: row.user_name || null,
            userId: row.user_id,
          });
        }
      });
      return Array.from(map.values());
    },
    [],
  );

  const openEmailModalForRows = useCallback(
    (rows: RegistrationRow[]) => {
      const recipients = buildRecipientsFromRows(rows);
      if (!recipients.length) {
        showToast(
          "No valid email addresses found for the selected registrations.",
          "info",
        );
        return;
      }
      setEmailRecipients(recipients);
      setEmailSubject(DEFAULT_EMAIL_SUBJECT);
      setEmailBody(DEFAULT_EMAIL_BODY);
      setSendCopyToInfo(true);
      setSendCopyToFacilitator(true);
      setEmailResult(null);
      setEmailModalOpen(true);
    },
    [buildRecipientsFromRows, showToast],
  );

  const handleStartEmailSelected = useCallback(() => {
    if (!selectedRegistrations.length) {
      showToast("Select at least one registration to email.", "info");
      return;
    }
    openEmailModalForRows(selectedRegistrations);
  }, [openEmailModalForRows, selectedRegistrations, showToast]);

  const handleEmailModalOpenChange = useCallback(
    (open: boolean) => {
      if (!open && sendingEmail) {
        return;
      }
      setEmailModalOpen(open);
      if (!open) {
        setEmailRecipients([]);
      }
    },
    [sendingEmail],
  );

  const handleSendEmail = useCallback(async () => {
    if (!emailRecipients.length) {
      showToast("Add at least one recipient.", "info");
      return;
    }

    if (!emailSubject.trim() || !emailBody.trim()) {
      showToast("Subject and message are required.", "error");
      return;
    }

    try {
      setSendingEmail(true);
      const htmlBody = emailBody.trim().replace(/\n/g, "<br />");
      const result = await sendBulkEmail({
        subject: emailSubject.trim(),
        htmlBody,
        sendCopyToInfo,
        sendCopyToFacilitator,
        recipients: emailRecipients,
      });
      setEmailResult(result);
      showToast(
        `Email sent to ${result.sent} recipient${result.sent === 1 ? "" : "s"}.`,
        "success",
      );
      setEmailModalOpen(false);
      setEmailRecipients([]);
      setEmailBody(DEFAULT_EMAIL_BODY);
    } catch (sendError) {
      console.error("Failed to send email", sendError);
      showToast(
        sendError instanceof Error
          ? sendError.message
          : "Failed to send email. Please try again.",
        "error",
      );
    } finally {
      setSendingEmail(false);
    }
  }, [
    emailBody,
    emailRecipients,
    emailSubject,
    sendCopyToFacilitator,
    sendCopyToInfo,
    showToast,
  ]);

  return (
    <>
      <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <div className="space-y-4">
          <div
            className="sticky z-30 bg-white pb-4 space-y-4 border-b border-gray-100"
            style={{ top: `${PAGE_STICKY_OFFSET}px` }}
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-3xl font-semibold text-[#6F6F6F]">
                  Registration Feed
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Monitor the most recent league, tournament, and Skills &amp; Drills
                  registrations in real time.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span
                    className={cn(
                      "h-2.5 w-2.5 rounded-full animate-pulse",
                      liveIndicatorColor,
                    )}
                  />
                  {liveIndicatorLabel}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fetchRegistrations()}
                  disabled={refreshing}
                >
                  {refreshing ? "Refreshing…" : "Refresh"}
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <Input
                type="text"
                placeholder="Search by name, email, or program"
                value={searchTerm}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setSearchTerm(event.target.value)
                }
                className="max-w-md"
              />
              <div className="text-sm text-gray-500">
                Showing {filteredRegistrations.length} of {registrations.length} recent
                registrations
                {lastUpdated ? (
                  <span className="ml-2 text-gray-400">
                    · Updated {timeAgo(lastUpdated)}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Checkbox
                  id="select-all-registrations"
                  checked={selectionCheckboxState as boolean | "indeterminate"}
                  onCheckedChange={(checked) =>
                    handleToggleSelectAll(checked === true)
                  }
                  aria-label="Select all visible registrations"
                />
                <label htmlFor="select-all-registrations" className="cursor-pointer">
                  {selectedCount > 0
                    ? `${selectedCount} registration${selectedCount === 1 ? "" : "s"} selected`
                    : "Select registrations to email"}
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleStartEmailSelected}
                  disabled={selectedCount === 0}
                  className="flex items-center gap-2"
                >
                  <Mail className="h-4 w-4" />
                  Email Selected
                </Button>
                {selectedCount > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearSelection}
                    className="text-gray-600"
                  >
                    Clear Selection
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          {error ? (
            <div className="p-4 border border-red-200 bg-red-50 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          ) : loading ? (
            <LoadingSpinner />
          ) : filteredRegistrations.length === 0 ? (
            <div className="border border-dashed border-gray-200 rounded-xl p-10 text-center">
              <p className="text-lg font-medium text-[#6F6F6F]">
                No registrations found
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Try adjusting your search or check back once new sign-ups come in.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">
                      <span className="sr-only">Select</span>
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      Participant
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      Registration
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      Program Type
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      Mode
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      Signed
                    </th>
                  </tr>
                </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRegistrations.map((registration) => {
                const programType =
                  registration.league_type ?? "regular_season";
                const typeLabel =
                  programTypeLabels[
                    (programType as Exclude<ProgramType, null>) ?? "regular_season"
                  ] || "League";
                return (
                  <tr
                    key={registration.id}
                    className="hover:bg-gray-50/60"
                  >
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={selectedRegistrationIds.has(registration.id)}
                        onCheckedChange={(checked) =>
                          handleToggleRegistration(registration.id, checked === true)
                        }
                        aria-label={`Select registration for ${registration.user_name}`}
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div
                        className="font-medium text-[#6F6F6F] max-w-[140px] truncate"
                        title={registration.user_name}
                      >
                        {registration.user_name}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-[#B20000] break-all">
                        {registration.user_email}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {registration.league_id ? (
                        <Link
                          to={`/leagues/${registration.league_id}/teams`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#B20000] font-medium hover:underline block max-w-[320px] truncate"
                          title={registration.league_name}
                        >
                          {registration.league_name}
                        </Link>
                      ) : (
                        <span
                          className="font-medium text-[#6F6F6F] block max-w-[320px] truncate"
                          title={registration.league_name}
                        >
                          {registration.league_name}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge
                        className={cn(
                          "border text-xs font-semibold",
                          programTypeBadgeClasses[
                            (programType as Exclude<ProgramType, null>) ??
                              "regular_season"
                          ],
                        )}
                      >
                        {typeLabel}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge
                        className={cn(
                          "border text-xs font-semibold",
                          modeBadgeClasses[registration.mode],
                        )}
                      >
                        {registration.mode === "team" ? "Team" : "Individual"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      <div>{formatDateTime(registration.created_at)}</div>
                      <div className="text-xs text-gray-400">
                        {timeAgo(registration.created_at)}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
        </div>
      </section>

      <Dialog open={emailModalOpen} onOpenChange={handleEmailModalOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Email {emailRecipients.length} recipient{emailRecipients.length === 1 ? "" : "s"}</DialogTitle>
            <DialogDescription>
              Send a direct message to the selected registrants. Each person receives an individual email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-700">Recipients ({emailRecipients.length})</p>
              <p className="text-xs text-gray-500 mt-1">
                {emailRecipients.slice(0, 4).map((recipient) => recipient.email).join(", ")}
                {emailRecipients.length > 4
                  ? `, +${emailRecipients.length - 4} more`
                  : ""}
              </p>
              {emailResult ? (
                <p className="text-xs text-gray-500 mt-2">
                  Last send: {emailResult.sent} sent · {emailResult.failed} failed · {emailResult.invalid} invalid
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700" htmlFor="registration-email-subject">
                Subject
              </label>
              <Input
                id="registration-email-subject"
                value={emailSubject}
                onChange={(event) => setEmailSubject(event.target.value)}
                placeholder="Subject line"
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700" htmlFor="registration-email-body">
                Message
              </label>
              <textarea
                id="registration-email-body"
                value={emailBody}
                onChange={(event) => setEmailBody(event.target.value)}
                className="min-h-[180px] w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-[#B20000] focus:outline-none focus:ring-1 focus:ring-[#B20000]"
              />
              <p className="text-xs text-gray-500">
                Supports personalization tokens such as{" "}
                <code className="bg-gray-100 px-1 rounded">
                  {"{{first_name}}"}
                </code>{" "}
                and{" "}
                <code className="bg-gray-100 px-1 rounded">
                  {"{{full_name}}"}
                </code>
                .
              </p>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <Checkbox
                  checked={sendCopyToInfo}
                  onCheckedChange={(checked) => setSendCopyToInfo(checked === true)}
                />
                Send copy to info@ofsl.ca
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <Checkbox
                  checked={sendCopyToFacilitator}
                  onCheckedChange={(checked) =>
                    setSendCopyToFacilitator(checked === true)
                  }
                />
                Send copy to facilitators
              </label>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleEmailModalOpenChange(false)}
              disabled={sendingEmail}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSendEmail}
              disabled={
                sendingEmail ||
                !emailRecipients.length ||
                !emailSubject.trim() ||
                !emailBody.trim()
              }
            >
              {sendingEmail ? "Sending…" : `Send Email (${emailRecipients.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
