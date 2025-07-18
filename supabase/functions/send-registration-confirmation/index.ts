import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface RegistrationRequest {
  email: string;
  userName: string;
  teamName: string;
  leagueName: string;
}

serve(async (req: Request) => {
  try {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      email,
      userName,
      teamName,
      leagueName,
    }: RegistrationRequest = await req.json();

    if (!email || !userName || !teamName || !leagueName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Initialize Supabase client with service role for database operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user is authenticated by checking their token
    const token = authHeader.replace("Bearer ", "");

    // Initialize regular Supabase client to verify auth
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Create the registration confirmation email content
    const emailContent = {
      to: [email],
      subject: `🏐 Registration Confirmation: ${teamName} in ${leagueName}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #B20000 0%, #8B0000 100%); padding: 30px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">Ottawa Fun Sports League</h1>
            <p style="color: #ffcccc; margin: 8px 0 0 0; font-size: 14px;">Ottawa's Premier Adult Sports Community</p>
          </div>
          
          <!-- Main Content -->
          <div style="padding: 40px 30px; background: #ffffff;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="background: #f8f9fa; border-radius: 50px; width: 80px; height: 80px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 32px; line-height: 1; display: block;">✅</span>
              </div>
              <h2 style="color: #2c3e50; margin: 0 0 10px 0; font-size: 24px; font-weight: 600;">Registration Received!</h2>
            </div>
            
            <div style="background: #f8f9fa; border-radius: 12px; padding: 25px; margin: 25px 0;">
              <p style="color: #2c3e50; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">
                Hello ${userName},
              </p>
              <p style="color: #2c3e50; font-size: 16px; line-height: 1.6; margin: 0;">
                Thank you for registering your team <strong style="color: #B20000;">${teamName}</strong> 
                for <strong style="color: #B20000;">${leagueName}</strong>!
              </p>
            </div>
            
            <div style="background: #fff5f5; border: 1px solid #ffe0e0; border-radius: 12px; padding: 25px; margin: 30px 0;">
              <h3 style="color: #B20000; font-size: 18px; margin: 0 0 15px 0; display: flex; align-items: center;">
                <span style="font-size: 24px; margin-right: 8px;">⚠️</span> Important: Secure Your Spot
              </h3>
              <p style="color: #2c3e50; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">
                In order to secure your spot, please provide a <strong>non-refundable deposit of $200</strong> by e-transfer within <strong>48 hours</strong> to the following email address:
              </p>
              <div style="background: #ffffff; border: 2px solid #B20000; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
                <p style="color: #B20000; font-size: 18px; font-weight: 600; margin: 0;">
                  ofslpayments@gmail.com
                </p>
                <p style="color: #5a6c7d; font-size: 14px; margin: 10px 0 0 0;">
                  Please indicate your team name <strong>"${teamName}"</strong> on the e-transfer
                </p>
              </div>
              <p style="color: #7f8c8d; font-size: 14px; line-height: 1.5; margin: 15px 0 0 0; font-style: italic;">
                Note: After the allotted time, we will unfortunately be unable to hold your spot.
              </p>
            </div>
            
            <div style="margin: 30px 0;">
              <h3 style="color: #2c3e50; font-size: 18px; margin-bottom: 15px;">Next Steps:</h3>
              <ol style="color: #5a6c7d; font-size: 16px; line-height: 1.8; padding-left: 20px;">
                <li style="margin-bottom: 8px;">Send your $200 deposit via e-transfer to <strong>ofslpayments@gmail.com</strong></li>
                <li style="margin-bottom: 8px;">Include your team name "<strong>${teamName}</strong>" in the e-transfer message</li>
                <li style="margin-bottom: 8px;">You'll receive a confirmation once we process your payment</li>
                <li>Get ready for an amazing season!</li>
              </ol>
            </div>
            
            <div style="text-align: center; margin: 40px 0;">
              <p style="color: #7f8c8d; font-size: 14px; line-height: 1.5;">
                If you have any questions or concerns, please feel free to contact us at<br>
                <a href="mailto:info@ofsl.ca" style="color: #B20000; text-decoration: none; font-weight: 600;">info@ofsl.ca</a>
              </p>
            </div>
            
            <div style="background: #e8f4f8; border-radius: 12px; padding: 20px; margin: 30px 0; text-align: center;">
              <p style="color: #2c3e50; font-size: 16px; line-height: 1.5; margin: 0;">
                Thank you,<br>
                <strong>OFSL Team</strong>
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background: #2c3e50; padding: 25px 20px; text-align: center;">
            <p style="color: #bdc3c7; font-size: 12px; margin: 0 0 5px 0;">
              © ${new Date().getFullYear()} Ottawa Fun Sports League. All rights reserved.
            </p>
            <p style="color: #95a5a6; font-size: 11px; margin: 0;">
              This email was sent because you registered a team for ${leagueName}.
            </p>
          </div>
        </div>
      `,
    };

    // Send email using Resend API
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not found");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "OFSL <noreply@ofsl.ca>",
        ...emailContent,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("Resend API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to send registration confirmation email" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const emailResult = await emailResponse.json();
    console.log("Email sent successfully:", emailResult);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Registration confirmation email sent successfully",
        emailId: emailResult.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error in send-registration-confirmation function:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});