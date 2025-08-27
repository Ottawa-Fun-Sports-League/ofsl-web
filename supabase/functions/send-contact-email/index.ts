import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ============================================================================
// CORS Configuration
// ============================================================================

// Get allowed origins from environment variable or use defaults
const getAllowedOrigins = (): string[] => {
  const envOrigins = Deno.env.get("ALLOWED_ORIGINS");
  
  if (envOrigins) {
    // Parse comma-separated list of origins from environment variable
    return envOrigins.split(",").map((origin) => origin.trim());
  }
  
  // Default allowed origins if environment variable is not set
  return [
    "https://ofsl.ca",
    "https://www.ofsl.ca",
    "http://localhost:5173",
    "http://localhost:5174",
  ];
};

// Production CORS headers with dynamic origin validation
const getCorsHeaders = (origin: string | null) => {
  const allowedOrigins = getAllowedOrigins();
  
  // Check if the origin is in the allowed list
  const isAllowed = origin && allowedOrigins.includes(origin);
  
  // Use the origin if allowed, otherwise use the first allowed origin as default
  const responseOrigin = isAllowed ? origin : allowedOrigins[0];
  
  return {
    "Access-Control-Allow-Origin": responseOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
  };
};

// ============================================================================
// Rate Limiting
// ============================================================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

function checkRateLimit(
  identifier: string,
  maxRequests: number = 5,
  windowMs: number = 3600000 // 1 hour
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  // Clean up old entries periodically to prevent memory bloat
  if (rateLimitMap.size > 1000) {
    for (const [key, value] of rateLimitMap.entries()) {
      if (value.resetTime < now) {
        rateLimitMap.delete(key);
      }
    }
  }

  if (!entry || entry.resetTime < now) {
    // No entry or expired, create new one
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return { allowed: true };
  }

  if (entry.count >= maxRequests) {
    // Rate limit exceeded
    return {
      allowed: false,
      retryAfter: Math.ceil((entry.resetTime - now) / 1000), // seconds
    };
  }

  // Increment count
  entry.count++;
  return { allowed: true };
}

// ============================================================================
// Validation and Sanitization
// ============================================================================

// HTML escape function to prevent XSS
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Email validation
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

// Contact form validation
interface _ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

function validateContactForm(data: unknown): ValidationResult {
  const errors: string[] = [];

  // Check required fields
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push('Name is required');
  }
  
  if (!data.email || typeof data.email !== 'string') {
    errors.push('Email is required');
  } else if (!isValidEmail(data.email)) {
    errors.push('Invalid email format');
  }
  
  if (!data.subject || typeof data.subject !== 'string' || data.subject.trim().length === 0) {
    errors.push('Subject is required');
  }
  
  if (!data.message || typeof data.message !== 'string' || data.message.trim().length === 0) {
    errors.push('Message is required');
  }

  // Check field lengths
  if (data.name && data.name.length > 100) {
    errors.push('Name must be less than 100 characters');
  }
  
  if (data.subject && data.subject.length > 200) {
    errors.push('Subject must be less than 200 characters');
  }
  
  if (data.message && data.message.length > 5000) {
    errors.push('Message must be less than 5000 characters');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  // CRITICAL: Handle CORS preflight requests first
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ 
        error: "Method not allowed",
        allowed: ["POST", "OPTIONS"]
      }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    // Get client IP for rate limiting
    const clientIp = req.headers.get("x-forwarded-for") || 
                     req.headers.get("x-real-ip") || 
                     req.headers.get("cf-connecting-ip") || // Cloudflare
                     "unknown";

    // Check rate limit (5 requests per hour per IP)
    const rateLimitResult = checkRateLimit(clientIp, 5, 3600000);
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ 
          error: "Too many requests. Please try again later.",
          retryAfter: rateLimitResult.retryAfter 
        }),
        {
          status: 429,
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Retry-After": String(rateLimitResult.retryAfter || 3600)
          },
        }
      );
    }

    // Parse and validate request body
    let requestData;
    try {
      requestData = await req.json();
    } catch (e) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate contact form data
    const validation = validateContactForm(requestData);
    if (!validation.isValid) {
      return new Response(
        JSON.stringify({ 
          error: "Validation failed",
          details: validation.errors 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check for Resend API key
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY environment variable is not set");
      return new Response(
        JSON.stringify({ 
          error: "Email service is not configured. Please contact support." 
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Sanitize all user inputs
    const safeName = escapeHtml(requestData.name.trim());
    const safeEmail = escapeHtml(requestData.email.trim());
    const safeSubject = escapeHtml(requestData.subject.trim());
    const safeMessage = escapeHtml(requestData.message.trim());

    // Create timestamp for logging
    const timestamp = new Date().toISOString();

    // Create HTML email content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body>
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #B20000; border-bottom: 2px solid #B20000; padding-bottom: 10px;">
            New Contact Form Submission
          </h2>
          
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; color: #333;">
              <strong>From:</strong> ${safeName}
            </p>
            <p style="margin: 0 0 10px 0; color: #333;">
              <strong>Email:</strong> ${safeEmail}
            </p>
            <p style="margin: 0 0 10px 0; color: #333;">
              <strong>Subject:</strong> ${safeSubject}
            </p>
          </div>
          
          <div style="margin: 20px 0;">
            <h3 style="color: #6F6F6F; margin-bottom: 10px;">Message:</h3>
            <div style="background-color: white; padding: 15px; border: 1px solid #ddd; border-radius: 5px; white-space: pre-wrap; color: #333;">
${safeMessage}
            </div>
          </div>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <div style="font-size: 12px; color: #888;">
            <p style="margin: 5px 0;">
              <strong>Submitted at:</strong> ${timestamp}
            </p>
            <p style="margin: 5px 0;">
              <strong>IP Address:</strong> ${clientIp}
            </p>
            <p style="margin: 5px 0;">
              <strong>Origin:</strong> ${origin || 'Direct API call'}
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Prepare email data for Resend
    const emailData = {
      from: "OFSL Contact Form <noreply@ofsl.ca>",
      to: ["info@ofsl.ca"],
      reply_to: requestData.email, // Use raw email for reply-to
      subject: `[Contact Form] ${safeSubject}`,
      html: htmlContent,
      headers: {
        "X-Entity-Ref-ID": crypto.randomUUID(), // Unique ID for tracking
      }
    };

    // Send email via Resend API
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(emailData),
    });

    if (resendResponse.ok) {
      const resendData = await resendResponse.json();
      
      // Log successful submission
      console.log("Contact form submitted successfully", {
        timestamp,
        ip: clientIp,
        email: safeEmail,
        messageId: resendData.id,
      });

      return new Response(
        JSON.stringify({ 
          success: true,
          message: "Your message has been sent successfully. We'll get back to you soon!",
          id: resendData.id
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } else {
      // Handle Resend API errors
      const errorText = await resendResponse.text();
      console.error("Resend API error", {
        status: resendResponse.status,
        error: errorText,
        timestamp,
        ip: clientIp,
      });

      return new Response(
        JSON.stringify({ 
          error: "Failed to send your message. Please try again later.",
          support: "If this problem persists, please email info@ofsl.ca directly."
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    // Log unexpected errors
    console.error("Unexpected error in send-contact-email function:", {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ 
        error: "An unexpected error occurred. Please try again later.",
        support: "If this problem persists, please email info@ofsl.ca directly."
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});