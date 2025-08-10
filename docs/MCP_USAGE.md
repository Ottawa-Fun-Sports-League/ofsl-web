# MCP (Model Context Protocol) Usage Guide

This project uses MCP servers to integrate with various services directly through Claude Code.

## Available MCP Servers

### 1. Supabase MCP Server
The Supabase MCP server provides direct database and backend management capabilities.

**Key Functions:**
- `mcp__supabase__apply_migration` - Apply database migrations
- `mcp__supabase__execute_sql` - Execute SQL queries
- `mcp__supabase__deploy_edge_function` - Deploy edge functions
- `mcp__supabase__generate_typescript_types` - Generate TypeScript types
- `mcp__supabase__get_logs` - Get service logs for debugging
- `mcp__supabase__list_projects` - List all Supabase projects
- `mcp__supabase__search_docs` - Search Supabase documentation

**Usage Example:**
```typescript
// Apply a migration
await mcp__supabase__apply_migration({
  project_id: "aijuhalowwjbccyjrlgf",
  name: "add_user_roles",
  query: "ALTER TABLE users ADD COLUMN role VARCHAR(50);"
});
```

### 2. Stripe MCP Server
The Stripe MCP server handles all payment-related operations.

**Key Functions:**
- `mcp__stripe__create_customer` - Create a new customer
- `mcp__stripe__create_product` - Create products
- `mcp__stripe__create_price` - Set up pricing
- `mcp__stripe__create_payment_link` - Generate payment links
- `mcp__stripe__create_invoice` - Create invoices
- `mcp__stripe__list_subscriptions` - Manage subscriptions
- `mcp__stripe__search_stripe_documentation` - Search Stripe docs

**Usage Example:**
```typescript
// Create a customer
await mcp__stripe__create_customer({
  name: "John Doe",
  email: "john@example.com"
});
```

### 3. Netlify MCP Server
The Netlify MCP server manages deployments and hosting.

**Key Functions:**
- `mcp__netlify__deploy-site` - Deploy site to Netlify
- `mcp__netlify__manage-env-vars` - Manage environment variables
- `mcp__netlify__get-deploy` - Get deployment status
- `mcp__netlify__netlify-coding-rules` - Get Netlify-specific coding guidelines

**Usage Example:**
```typescript
// Deploy the site
await mcp__netlify__netlify-deploy-services({
  selectSchema: {
    operation: "deploy-site",
    params: {
      deployDirectory: "/Users/hongzhang/Workspace/ofsl-web-org",
      siteId: "your-site-id"
    }
  }
});
```

### 4. IDE MCP Server
Provides IDE integration capabilities.

**Key Functions:**
- `mcp__ide__getDiagnostics` - Get language diagnostics (errors, warnings)
- `mcp__ide__executeCode` - Execute code snippets

## Setup Instructions

### 1. Environment Variables
Ensure these environment variables are set in your system:
```bash
# Supabase
export SUPABASE_ACCESS_TOKEN="your-supabase-token"

# Stripe
export STRIPE_API_KEY="your-stripe-api-key"

# Netlify
export NETLIFY_AUTH_TOKEN="your-netlify-token"
```

### 2. Claude Settings
Add to `.claude/settings.local.json`:
```json
{
  "enabledMcpjsonServers": [
    "supabase",
    "stripe",
    "netlify",
    "ide"
  ]
}
```

### 3. Permissions
The following permissions are configured for automated operations:
- Database migrations and queries
- Git operations
- Build and test commands
- File system operations

## Common Use Cases

### Database Migration
```bash
# Create and apply a migration
1. Write migration SQL
2. Use mcp__supabase__apply_migration to apply it
3. Generate updated TypeScript types
```

### Payment Setup
```bash
# Set up a new product with payment
1. Create product with mcp__stripe__create_product
2. Set pricing with mcp__stripe__create_price
3. Generate payment link with mcp__stripe__create_payment_link
```

### Deployment
```bash
# Deploy to production
1. Build the project locally
2. Use mcp__netlify__deploy-site to deploy
3. Monitor deployment with mcp__netlify__get-deploy
```

## Troubleshooting

### MCP Server Not Available
- Check that the server is enabled in `.claude/settings.local.json`
- Verify environment variables are set
- Restart Claude Code if needed

### Permission Denied
- Check the permissions array in `.claude/settings.local.json`
- Add required permissions for the operation

### Connection Issues
- Verify API keys and tokens are valid
- Check network connectivity
- Review service-specific documentation

## Best Practices

1. **Always test migrations** in development before applying to production
2. **Use TypeScript types** generated from the database schema
3. **Monitor logs** after deployments using MCP log functions
4. **Keep API keys secure** and never commit them to the repository
5. **Document MCP usage** in code comments for team awareness

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Netlify Documentation](https://docs.netlify.com)
- [MCP Specification](https://modelcontextprotocol.io)