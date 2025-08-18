import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// Get allowed origins from environment or use defaults
const getAllowedOrigin = (req: Request): string => {
  const origin = req.headers.get('origin') || ''
  
  // In production, you can set ALLOWED_ORIGINS env variable
  // Example: "https://ofsl.ca,https://www.ofsl.ca"
  const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') || 'https://ofsl.ca,https://www.ofsl.ca,http://localhost:5173').split(',')
  
  // Return the origin if it's in the allowed list, otherwise return the first allowed origin
  return allowedOrigins.includes(origin) ? origin : allowedOrigins[0]
}

// Dynamic CORS headers based on request origin
const getCorsHeaders = (req: Request) => ({
  'Access-Control-Allow-Origin': getAllowedOrigin(req),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
})

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

// Rate limiting using Supabase
async function checkRateLimit(clientIp: string): Promise<boolean> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  // Check submissions in last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  
  const { data, error } = await supabase
    .from('contact_submissions')
    .select('id')
    .eq('ip_address', clientIp)
    .gte('created_at', oneHourAgo)
  
  if (error) {
    console.error('Rate limit check error:', error)
    return true // Allow on error to not block legitimate users
  }
  
  // Allow max 5 submissions per hour per IP
  return !data || data.length < 5
}

// Log submission for rate limiting
async function logSubmission(clientIp: string, email: string): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  await supabase.from('contact_submissions').insert({
    ip_address: clientIp,
    email: email,
    created_at: new Date().toISOString()
  })
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  try {
    // Get client IP for rate limiting
    const clientIp = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     'unknown'
    
    // Check rate limit
    const canProceed = await checkRateLimit(clientIp)
    if (!canProceed) {
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { 
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
    
    const { name, email, subject, message } = await req.json()

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
    
    // Validate field lengths
    if (name.length > 100 || subject.length > 200 || message.length > 5000) {
      return new Response(
        JSON.stringify({ error: 'Field length exceeded' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
    
    // Validate email format
    if (!isValidEmail(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email address' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Sanitize all user inputs before embedding in HTML
    const safeName = escapeHtml(name)
    const safeEmail = escapeHtml(email)
    const safeSubject = escapeHtml(subject)
    const safeMessage = escapeHtml(message)

    // Create HTML email content with sanitized inputs
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #B20000; border-bottom: 2px solid #B20000; padding-bottom: 10px;">
          New Contact Form Submission
        </h2>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0;"><strong>From:</strong> ${safeName}</p>
          <p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${safeEmail}</p>
          <p style="margin: 0 0 10px 0;"><strong>Subject:</strong> ${safeSubject}</p>
        </div>
        
        <div style="margin: 20px 0;">
          <h3 style="color: #6F6F6F; margin-bottom: 10px;">Message:</h3>
          <div style="background-color: white; padding: 15px; border: 1px solid #ddd; border-radius: 5px; white-space: pre-wrap;">${safeMessage}</div>
        </div>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        <p style="font-size: 12px; color: #888; margin: 0;">
          This message was sent via the OFSL contact form at ${new Date().toLocaleString()}
        </p>
        <p style="font-size: 12px; color: #888; margin: 0;">
          IP: ${clientIp}
        </p>
      </div>
    `

    const emailData = {
      from: 'OFSL <noreply@ofsl.ca>',
      to: ['info@ofsl.ca'],
      reply_to: email, // This is safe as Resend validates it
      subject: `Contact Form: ${safeSubject}`,
      html: htmlContent,
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(emailData),
    })

    if (response.ok) {
      // Log successful submission for rate limiting
      await logSubmission(clientIp, email)
      
      return new Response(
        JSON.stringify({ message: 'Email sent successfully' }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    } else {
      const error = await response.text()
      console.error('Resend API error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to send email' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

  } catch (error) {
    console.error('Error sending contact email:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})