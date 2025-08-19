# Testing Admin Magic Link Generation

## Summary

The admin magic link functionality has been updated to use password reset links instead of direct authentication links. This is because:

1. Supabase doesn't support true "magic links" that allow direct impersonation without password reset
2. The frontend only handles `type=recovery` links in the ResetPasswordPage
3. Other link types (`magiclink`, `invite`) result in "Invalid Reset Link" errors

## Current Implementation

When an admin clicks the magic link button for a user:
- A password reset link is generated using `type: 'recovery'`
- The link can be copied to clipboard or opened in a new tab
- When the user (or admin) opens the link, they will be prompted to set a new password
- After setting the password, they will be logged in as that user

## Testing Steps

1. Login as an admin
2. Navigate to My Account > Users tab
3. Find a user and click the link icon next to their email
4. Copy the link (or Cmd/Ctrl+Click to open in new tab)
5. Open the link in an incognito/private browser window
6. You will be redirected to the password reset page
7. Enter a new password for that user
8. After resetting the password, you will be logged in as that user

## Important Notes

- This is a password reset link, not a true "magic link"
- The user's password will be changed when using this link
- For actual user impersonation without password changes, a different approach would be needed
- The link expires after 24 hours

## Alternative Approaches (Future Consideration)

1. **Custom Auth Handler**: Create a new route specifically for admin-generated auth links that doesn't require password reset
2. **Session Transfer**: Generate a session token server-side and transfer it via secure link
3. **Proxy Authentication**: Use a proxy service that handles the authentication separately

## Current Behavior

- **Edge Function**: `/supabase/functions/admin-magic-link/index.ts`
  - Generates `type: 'recovery'` links using Supabase Admin API
  - Returns the link for copying or opening

- **Frontend Component**: `/src/screens/MyAccount/components/UsersTab/components/MagicLinkButton.tsx`
  - Shows appropriate messages about password reset requirement
  - Allows copying link or opening in new tab

- **Reset Password Page**: `/src/screens/ResetPasswordPage/ResetPasswordPage.tsx`
  - Handles `type=recovery` links
  - Requires user to set a new password before authentication