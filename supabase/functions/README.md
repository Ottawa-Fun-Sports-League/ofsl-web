# Supabase Edge Functions

## Environment Variables

### Required Environment Variables

#### `RESEND_API_KEY`
- **Required**: Yes
- **Description**: API key for Resend email service
- **Example**: `re_123456789`

### Optional Environment Variables

#### `ALLOWED_ORIGINS`
- **Required**: No
- **Description**: Comma-separated list of allowed CORS origins
- **Default**: `https://ofsl.ca,https://www.ofsl.ca,http://localhost:5173,http://localhost:5174`
- **Example**: `https://ofsl.ca,https://www.ofsl.ca,https://staging.ofsl.ca`

## Setting Environment Variables

### Via Supabase Dashboard
1. Go to your project in the Supabase Dashboard
2. Navigate to Edge Functions
3. Select your function
4. Click on "Settings" or "Environment Variables"
5. Add the required variables

### Via Supabase CLI
```bash
npx supabase secrets set RESEND_API_KEY=your_api_key --project-ref your-project-ref
npx supabase secrets set ALLOWED_ORIGINS="https://ofsl.ca,https://www.ofsl.ca" --project-ref your-project-ref
```

## Edge Functions

### send-contact-email
Handles contact form submissions from the website.

**Features:**
- Rate limiting (5 requests per hour per IP)
- Input validation and sanitization
- XSS protection
- CORS support with configurable origins
- Works for both anonymous and authenticated users

**Configuration:**
- JWT verification is disabled via `config.toml`
- CORS origins can be configured via `ALLOWED_ORIGINS` environment variable

**Deployment:**
```bash
npx supabase functions deploy send-contact-email --project-ref your-project-ref
```