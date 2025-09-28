import { supabase } from '../../../../../lib/supabase';
import { BulkEmailRecipient } from '../types';

export interface BulkEmailRequest {
  subject: string;
  htmlBody: string;
  recipients: Array<{
    email: string;
    name?: string | null;
    userId?: string;
  }>;
}

export interface BulkEmailResultSummary {
  sent: number;
  failed: number;
  invalid: number;
}

export async function sendBulkEmail(request: BulkEmailRequest): Promise<BulkEmailResultSummary> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('You must be signed in to send emails');
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase environment variables are not configured');
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/admin-bulk-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    let errorMessage = 'Failed to send email';
    try {
      const errorData = await response.json();
      errorMessage = errorData?.error ?? errorMessage;
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(errorMessage);
  }

  try {
    const data = await response.json();
    return {
      sent: Number(data?.sent ?? 0),
      failed: Number(data?.failed ?? 0),
      invalid: Number(data?.invalid ?? 0),
    };
  } catch {
    return { sent: 0, failed: 0, invalid: 0 };
  }
}

export function mapUsersToEmailRecipients(users: { id: string; email: string | null; name: string | null }[]): {
  recipients: BulkEmailRecipient[];
  invalidCount: number;
} {
  let invalid = 0;
  const list: BulkEmailRecipient[] = [];

  users.forEach((user) => {
    const email = user.email?.trim();
    if (!email) {
      invalid += 1;
      return;
    }

    list.push({
      userId: user.id,
      email,
      name: user.name ?? null,
    });
  });

  return { recipients: list, invalidCount: invalid };
}
