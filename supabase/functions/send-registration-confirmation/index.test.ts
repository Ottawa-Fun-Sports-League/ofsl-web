import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

Deno.test("Email template should not show deposit section when only depositAmount is provided", () => {
  const emailHtml = generateEmailHtml({
    userName: "John Doe",
    teamName: "Test Team",
    leagueName: "Test League",
    isWaitlist: false,
    depositAmount: 200,
    depositDate: null,
  });

  // Should not contain the "Important: Secure Your Spot" section
  assertEquals(emailHtml.includes("Important: Secure Your Spot"), false);
  assertEquals(emailHtml.includes("ofslpayments@gmail.com"), false);
  assertEquals(emailHtml.includes("non-refundable deposit"), false);
  
  // Should have generic next steps
  assertEquals(emailHtml.includes("Your registration has been received"), true);
  assertEquals(emailHtml.includes("We'll be in touch with more information about the league"), true);
});

Deno.test("Email template should not show deposit section when only depositDate is provided", () => {
  const emailHtml = generateEmailHtml({
    userName: "John Doe",
    teamName: "Test Team",
    leagueName: "Test League",
    isWaitlist: false,
    depositAmount: null,
    depositDate: "2025-01-20",
  });

  // Should not contain the "Important: Secure Your Spot" section
  assertEquals(emailHtml.includes("Important: Secure Your Spot"), false);
  assertEquals(emailHtml.includes("ofslpayments@gmail.com"), false);
  assertEquals(emailHtml.includes("non-refundable deposit"), false);
  
  // Should have generic next steps
  assertEquals(emailHtml.includes("Your registration has been received"), true);
  assertEquals(emailHtml.includes("We'll be in touch with more information about the league"), true);
});

Deno.test("Email template should not show deposit section when deposit info is not provided", () => {
  const emailHtml = generateEmailHtml({
    userName: "John Doe",
    teamName: "Test Team",
    leagueName: "Test League",
    isWaitlist: false,
    depositAmount: null,
    depositDate: null,
  });

  // Should not contain the "Important: Secure Your Spot" section
  assertEquals(emailHtml.includes("Important: Secure Your Spot"), false);
  assertEquals(emailHtml.includes("ofslpayments@gmail.com"), false);
  assertEquals(emailHtml.includes("non-refundable deposit"), false);
  
  // Should have generic next steps
  assertEquals(emailHtml.includes("Your registration has been received"), true);
  assertEquals(emailHtml.includes("We'll be in touch with more information about the league"), true);
});

Deno.test("Email template should show deposit section when deposit info is provided", () => {
  const emailHtml = generateEmailHtml({
    userName: "John Doe",
    teamName: "Test Team",
    leagueName: "Test League",
    isWaitlist: false,
    depositAmount: 50,
    depositDate: "2025-01-20",
  });

  // Should contain the "Important: Secure Your Spot" section
  assertEquals(emailHtml.includes("Important: Secure Your Spot"), true);
  assertEquals(emailHtml.includes("ofslpayments@gmail.com"), true);
  assertEquals(emailHtml.includes("non-refundable deposit of $50.00"), true);
  assertEquals(emailHtml.includes("January 20, 2025"), true);
  
  // Should have payment-specific next steps
  assertEquals(emailHtml.includes("Send your $50.00 deposit via e-transfer"), true);
});

Deno.test("Email template should show waitlist section for waitlist registrations", () => {
  const emailHtml = generateEmailHtml({
    userName: "John Doe",
    teamName: "Test Team",
    leagueName: "Test League",
    isWaitlist: true,
    depositAmount: null,
    depositDate: null,
  });

  // Should show waitlist section instead of deposit section
  assertEquals(emailHtml.includes("You're on the Waitlist"), true);
  assertEquals(emailHtml.includes("No payment is required at this time"), true);
  assertEquals(emailHtml.includes("Important: Secure Your Spot"), false);
  
  // Should have waitlist-specific next steps
  assertEquals(emailHtml.includes("Sit tight!"), true);
  assertEquals(emailHtml.includes("We'll monitor the league for any openings"), true);
});

// Helper function to extract HTML generation logic for testing
function generateEmailHtml(params: {
  userName: string;
  teamName: string;
  leagueName: string;
  isWaitlist: boolean;
  depositAmount?: number | null;
  depositDate?: string | null;
}) {
  const { userName, teamName, leagueName, isWaitlist, depositAmount, depositDate } = params;
  
  function formatLocalDate(dateStr: string | null): string {
    if (!dateStr) return '';
    
    const date = new Date(dateStr + 'T00:00:00');
    
    if (isNaN(date.getTime())) {
      return '';
    }
    
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  return `
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5;">
      <tr>
        <td align="center" style="padding: 20px 0;">
          <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff;">
            <!-- Header -->
            <tr>
              <td align="center" style="background-color: #B20000; padding: 30px 20px;">
                <img src="https://ofsl.ca/group-1.png" alt="OFSL" style="width: 300px; height: auto; max-width: 100%;" />
                <p style="color: #ffcccc; margin: 15px 0 0 0; font-size: 14px; font-family: Arial, sans-serif;">OFSL</p>
              </td>
            </tr>
            
            <!-- Main Content -->
            <tr>
              <td style="padding: 40px 30px; background-color: #ffffff;">
                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                  <!-- Title Section -->
                  <tr>
                    <td align="center" style="padding-bottom: 30px;">
                      <h2 style="color: #2c3e50; margin: 0; font-size: 24px; font-weight: bold; font-family: Arial, sans-serif;">
                        ${isWaitlist ? "Added to Waitlist!" : "Registration Received!"}
                      </h2>
                    </td>
                  </tr>
                  
                  <!-- Greeting -->
                  <tr>
                    <td style="padding-bottom: 25px;">
                      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f8f9fa;">
                        <tr>
                          <td style="padding: 25px;">
                            <p style="color: #2c3e50; font-size: 16px; line-height: 24px; margin: 0 0 15px 0; font-family: Arial, sans-serif;">
                              Hello ${userName},
                            </p>
                            <p style="color: #2c3e50; font-size: 16px; line-height: 24px; margin: 0; font-family: Arial, sans-serif;">
                              ${
                                isWaitlist
                                  ? `Thank you for joining the waitlist for <strong style="color: #B20000;">${leagueName}</strong>! Your team <strong style="color: #B20000;">${teamName}</strong> has been added to our waitlist.`
                                  : `Thank you for registering your team <strong style="color: #B20000;">${teamName}</strong> for <strong style="color: #B20000;">${leagueName}</strong>!`
                              }
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Important Notice -->
                  ${
                    isWaitlist || (!isWaitlist && depositAmount && depositDate)
                      ? `
                  <tr>
                    <td style="padding-bottom: 30px;">
                      ${
                        isWaitlist
                          ? `
                      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #fff8e1; border: 1px solid #ffe082;">
                        <tr>
                          <td style="padding: 25px;">
                            <table cellpadding="0" cellspacing="0" border="0" width="100%">
                              <tr>
                                <td style="font-family: Arial, sans-serif;">
                                  <h3 style="color: #f57f17; font-size: 18px; margin: 0 0 15px 0;">
                                    ⏳ You're on the Waitlist
                                  </h3>
                                </td>
                              </tr>
                              <tr>
                                <td>
                                  <p style="color: #2c3e50; font-size: 16px; line-height: 24px; margin: 0 0 15px 0; font-family: Arial, sans-serif;">
                                    The league is currently full, but don't worry! Sometimes people change their plans and spots open up. We'll keep you posted if a space becomes available.
                                  </p>
                                  <p style="color: #2c3e50; font-size: 16px; line-height: 24px; margin: 0; font-family: Arial, sans-serif;">
                                    <strong>No payment is required at this time.</strong> If a spot opens up, we'll contact you with payment instructions.
                                  </p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                      `
                          : `
                      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #fff5f5; border: 1px solid #ffe0e0;">
                        <tr>
                          <td style="padding: 25px;">
                            <table cellpadding="0" cellspacing="0" border="0" width="100%">
                              <tr>
                                <td style="font-family: Arial, sans-serif;">
                                  <h3 style="color: #B20000; font-size: 18px; margin: 0 0 15px 0;">
                                    ⚠️ Important: Secure Your Spot
                                  </h3>
                                </td>
                              </tr>
                              <tr>
                                <td>
                                  <p style="color: #2c3e50; font-size: 16px; line-height: 24px; margin: 0 0 15px 0; font-family: Arial, sans-serif;">
                                    In order to secure your spot, please provide a <strong>non-refundable deposit of $${depositAmount.toFixed(2)}</strong> by e-transfer by <strong>${formatLocalDate(depositDate)}</strong> to the following email address:
                                  </p>
                                </td>
                              </tr>
                              <tr>
                                <td align="center" style="padding: 20px 0;">
                                  <table cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border: 2px solid #B20000;">
                                    <tr>
                                      <td style="padding: 20px 40px;">
                                        <p style="color: #B20000; font-size: 18px; font-weight: bold; margin: 0; font-family: Arial, sans-serif;">
                                          ofslpayments@gmail.com
                                        </p>
                                        <p style="color: #5a6c7d; font-size: 14px; margin: 10px 0 0 0; font-family: Arial, sans-serif;">
                                          Please indicate your team name <strong>"${teamName}"</strong> on the e-transfer
                                        </p>
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                              <tr>
                                <td>
                                  <p style="color: #7f8c8d; font-size: 14px; line-height: 21px; margin: 15px 0 0 0; font-style: italic; font-family: Arial, sans-serif;">
                                    Note: After the allotted time, we will unfortunately be unable to hold your spot.
                                  </p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                      `
                      }
                    </td>
                  </tr>
                  `
                      : ''
                  }
                  
                  <!-- Next Steps -->
                  <tr>
                    <td style="padding-bottom: 30px;">
                      <h3 style="color: #2c3e50; font-size: 18px; margin: 0 0 15px 0; font-family: Arial, sans-serif;">Next Steps:</h3>
                      <table cellpadding="0" cellspacing="0" border="0" width="100%">
                        <tr>
                          <td style="color: #5a6c7d; font-size: 16px; line-height: 28px; font-family: Arial, sans-serif; padding-left: 20px;">
                            ${
                              isWaitlist
                                ? `
                            1. <strong>Sit tight!</strong> We'll monitor the league for any openings<br>
                            2. If a spot becomes available, we'll contact you immediately<br>
                            3. You'll have 24 hours to confirm and provide payment<br>
                            4. Keep an eye on your email for updates!
                            `
                                : depositAmount && depositDate
                                ? `
                            1. Send your $${depositAmount.toFixed(2)} deposit via e-transfer to <strong>ofslpayments@gmail.com</strong><br>
                            2. Include your team name "<strong>${teamName}</strong>" in the e-transfer message<br>
                            3. Ensure payment is sent by <strong>${formatLocalDate(depositDate)}</strong><br>
                            4. You'll receive a confirmation once we process your payment<br>
                            5. Get ready for an amazing season!
                            `
                                : `
                            1. Your registration has been received<br>
                            2. We'll be in touch with more information about the league<br>
                            3. Get ready for an amazing season!
                            `
                            }
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Contact -->
                  <tr>
                    <td align="center" style="padding-bottom: 30px;">
                      <p style="color: #7f8c8d; font-size: 14px; line-height: 21px; font-family: Arial, sans-serif;">
                        If you have any questions or concerns, please feel free to contact us at<br>
                        <a href="mailto:info@ofsl.ca" style="color: #B20000; text-decoration: none; font-weight: bold;">info@ofsl.ca</a>
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Thank You -->
                  <tr>
                    <td align="center">
                      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #e8f4f8;">
                        <tr>
                          <td style="padding: 20px;" align="center">
                            <p style="color: #2c3e50; font-size: 16px; line-height: 24px; margin: 0; font-family: Arial, sans-serif;">
                              Thank you,<br>
                              <strong>OFSL Team</strong>
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            
            <!-- Footer -->
            <tr>
              <td align="center" style="background-color: #2c3e50; padding: 25px 20px;">
                <p style="color: #bdc3c7; font-size: 12px; margin: 0 0 5px 0; font-family: Arial, sans-serif;">
                  © ${new Date().getFullYear()} Ottawa Fun Sports League. All rights reserved.
                </p>
                <p style="color: #95a5a6; font-size: 11px; margin: 0; font-family: Arial, sans-serif;">
                  This email was sent because you ${isWaitlist ? "joined the waitlist for" : "registered a team for"} ${leagueName}.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}