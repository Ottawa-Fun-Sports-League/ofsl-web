# Admin Impersonation (Masquerade) Flow

This feature lets an admin generate a one-time magic link that signs them in as a target user without resetting the user's password.

## Summary

- Admin-only Edge Function `admin-impersonate` mints a Supabase `magiclink` for the user.
- The function returns a SPA-friendly link with `token_hash` and `email` params.
- The frontend `AuthRedirectPage` calls `supabase.auth.verifyOtp({ type: 'magiclink', token_hash, email })` to establish a session as the target user.
- Open the link in a private/incognito window to avoid overwriting the admin's session.

## How to Use

1. Login as an admin.
2. Go to My Account → Users tab.
3. Click the new impersonation icon (user check) next to the user’s email.
4. Cmd/Ctrl+Click to open the masquerade link in a new tab, or click to copy and paste into a private/incognito window.
5. You will land authenticated as that user and redirected into the app.

## Files

- Edge Function: `supabase/functions/admin-impersonate/index.ts`
- Button: `src/screens/MyAccount/components/UsersTab/components/ImpersonateButton.tsx`
- Redirect handler: `src/screens/AuthRedirectPage/AuthRedirectPage.tsx`

## Security Notes

- Only admins can generate impersonation links. Admin status is checked against the `users` table before generating.
- Supabase OTP magic links are time-limited and one-time use.
- Encourage admins to use private/incognito windows to prevent clobbering their own session.

## Future Enhancements

- Add a UI banner when masquerading with a button to end masquerade and return to admin (would require preserving admin session or a separate admin return flow).

