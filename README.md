## Getting started

> **Prerequisites:**
> The following steps require [NodeJS](https://nodejs.org/en/) to be installed on your system, so please
> install it beforehand if you haven't already.

To get started with your project, you'll first need to install the dependencies with:

```
npm install
```

Then, you'll be able to run a development version of the project with:

```
npm run dev
```

After a few seconds, your project should be accessible at the address
[http://localhost:5173/](http://localhost:5173/)

If you are satisfied with the result, you can finally build the project for release with:

```
npm run build
```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_STRIPE_PUBLISHABLE_KEY=your-publishable-key
```

## Google OAuth Configuration

When using Google OAuth with a custom domain, you need to:

1. Update your Google Cloud Console OAuth credentials:
   - Go to https://console.cloud.google.com/apis/credentials
   - Edit your OAuth 2.0 Client ID
   - Add the following Authorized redirect URIs:
     - `https://api.ofsl.ca/auth/v1/callback`
     - `https://[your-project-ref].supabase.co/auth/v1/callback` (keep the original as well)

2. Update your Supabase Authentication settings:
   - Go to your Supabase dashboard > Authentication > Providers > Google
   - Ensure the Redirect URL is set to `https://api.ofsl.ca/auth/v1/callback`

This configuration ensures that Google OAuth works correctly with your custom domain.
