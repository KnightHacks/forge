# API / Permissions Development Guide

This guide covers how to work with the tRPC API in Forge, including our permission system, procedure types, and common patterns.

## tRPC Procedures

We have four types of procedures. Choose the right one based on authentication and permission requirements.

### `publicProcedure`

Use when the endpoint doesn't require authentication.

```typescript
export const myRouter = {
  getPublicData: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      // Anyone can call this
      return await db.query.SomeTable.findFirst({
        where: eq(SomeTable.id, input.id),
      });
    }),
};
```

**When to use:** Public data that anyone can access without logging in.

### `protectedProcedure`

Use when the user must be signed in, but no specific permissions are required.

```typescript
export const myRouter = {
  getUserProfile: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input, ctx }) => {
      // ctx.session.user is guaranteed to exist
      return await db.query.User.findFirst({
        where: eq(User.id, input.userId),
      });
    }),
};
```

**When to use:** Any feature that requires authentication but is available to all logged-in users.

### `permProcedure`

Use when specific permissions are required. This procedure automatically loads the user's permissions into `ctx.session.permissions`.

```typescript
import { controlPerms } from "../utils";

export const myRouter = {
  deleteEvent: permProcedure
    .input(z.object({ eventId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // Check if user has the required permission
      controlPerms.or(["MANAGE_EVENTS"], ctx);
      
      return await db.delete(Events).where(eq(Events.id, input.eventId));
    }),
};
```

**When to use:** Admin features or actions that require specific permissions.

### `judgeProcedure`

**Status:** Deprecated and will be removed in the future. Use `permProcedure` with appropriate permissions instead.

## Permission System

Forge uses a custom role-based permission system that syncs with Discord roles.

### How Permissions Work

Permissions are stored as a bit string (e.g., `"111010"`). Each position represents a specific permission:

- `1` = user has the permission
- `0` = user doesn't have the permission

The mapping is defined in `@forge/consts/knight-hacks` in the `PERMISSIONS` object.

### Permission Checking

Use the `controlPerms` middleware from `@forge/api/src/utils`:

#### `controlPerms.or()`

Returns true if the user has **any** of the required permissions.

```typescript
// User needs at least ONE of these permissions
controlPerms.or(["MANAGE_EVENTS", "MANAGE_MEMBERS"], ctx);
```

**Special behavior:** If the user has the `IS_OFFICER` permission, they automatically pass all permission checks.

#### `controlPerms.and()`

Returns true only if the user has **all** of the required permissions.

```typescript
// User needs ALL of these permissions
controlPerms.and(["MANAGE_EVENTS", "DELETE_EVENTS"], ctx);
```

**Special behavior:** If the user has the `IS_OFFICER` permission, they automatically pass all permission checks.

### Permission Gating for Pages

For admin pages, use the permissions router to check if a user can access a page:

```typescript
// Example: Gate a page with OR logic
// If someone has edit rights, they need to see the page
// Same is true for read-only access
export const pageRouter = {
  canAccessEventsPage: permProcedure
    .query(async ({ ctx }) => {
      // Will throw UNAUTHORIZED if they don't have either permission
      controlPerms.or(["VIEW_EVENTS", "MANAGE_EVENTS"], ctx);
      return { canAccess: true };
    }),
};
```

**Pattern:** We typically use OR logic for page gating. If someone can edit, they need to see the page. If someone can only read, they also need to see the page.

### Discord Role Syncing

Permissions are based on Discord roles:

1. **Manual Assignment (Recommended):** Use the role assignment page in Blade. This immediately adds/removes Discord roles on the server.

2. **Automatic Sync:** Runs daily at 8:00 AM to sync Discord roles with the database for users who had roles changed directly in Discord.

**Best Practice:** Always assign roles through the Blade UI when possible for instant synchronization.

## Form Integration Pattern

When creating tRPC procedures that will be called from dynamic forms, you must include metadata for the form responder client.

### Required Pattern

```typescript
export const myRouter = {
  submitApplication: protectedProcedure
    .meta({
      id: "submitApplication",
      inputSchema: z.object({
        name: z.string().min(1),
        email: z.string().email(),
        major: z.string().min(1),
      }),
    })
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        major: z.string().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Handle form submission
    }),
};
```

### Requirements

1. **`.meta()` must include:**
   - `id`: String identifier for the procedure (usually matches the procedure name)
   - `inputSchema`: The Zod schema object (must match the `.input()` schema)

2. **Both `.meta()` and `.input()` are required** with the same schema

3. **The form responder client** consumes this metadata to validate and submit form data

### Why Both?

- `.input()` - Used by tRPC for runtime validation
- `.meta()` with `inputSchema` - Used by the form builder/responder to generate forms and validate on the client side

## Logging Requirement

**Every tRPC procedure that performs state changes (mutations) MUST log both success and failure.**

We use Discord webhooks for logging to maintain an audit trail of all actions in the system.

### The Log Function

Import from utils:

```typescript
import { log } from "../utils";
```

Usage:

```typescript
await log({
  title: "Action Title",
  message: "Detailed description of what happened",
  color: "success_green", // or "uhoh_red", "blade_purple", "tk_blue"
  userId: ctx.session.user.discordUserId,
});
```

### Color Guide

- `success_green` - Successful operations
- `uhoh_red` - Errors and failures
- `blade_purple` - General informational logs
- `tk_blue` - Bot-related actions

### Required Pattern for Mutations

Every mutation must wrap its logic in a try-catch block with appropriate logging:

```typescript
export const myRouter = {
  updateMember: permProcedure
    .input(z.object({
      memberId: z.string(),
      name: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Check permissions
        controlPerms.or(["MANAGE_MEMBERS"], ctx);
        
        // Perform the action
        const result = await db.update(Members)
          .set({ name: input.name })
          .where(eq(Members.id, input.memberId))
          .returning();
        
        // Log success
        await log({
          title: "Member Updated",
          message: `Updated member ${input.memberId}: name changed to "${input.name}"`,
          color: "success_green",
          userId: ctx.session.user.discordUserId,
        });
        
        return result;
      } catch (error) {
        // Log failure
        await log({
          title: "Member Update Failed",
          message: `Failed to update member ${input.memberId}: ${error instanceof Error ? error.message : "Unknown error"}`,
          color: "uhoh_red",
          userId: ctx.session.user.discordUserId,
        });
        
        // Re-throw to let tRPC handle the error response
        throw error;
      }
    }),
};
```

### Logging Best Practices

1. **Be specific in titles** - "Member Updated" not "Success"
2. **Include relevant IDs** - Always include what was changed
3. **Log before and after values** for updates when relevant
4. **Don't log sensitive data** - No passwords, tokens, or PII details
5. **Keep messages concise** - The Discord embed has character limits

### Read Operations (Queries)

Queries typically don't require logging unless they're sensitive or expensive operations:

```typescript
// Normal query - no logging needed
export const myRouter = {
  getMember: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return await db.query.Members.findFirst({
        where: eq(Members.id, input.id),
      });
    }),
    
  // Sensitive query - should be logged
  exportAllMemberData: permProcedure
    .query(async ({ ctx }) => {
      try {
        controlPerms.or(["EXPORT_DATA"], ctx);
        
        const data = await db.query.Members.findMany();
        
        await log({
          title: "Member Data Exported",
          message: `Exported ${data.length} member records`,
          color: "blade_purple",
          userId: ctx.session.user.discordUserId,
        });
        
        return data;
      } catch (error) {
        await log({
          title: "Member Export Failed",
          message: `Failed to export member data: ${error instanceof Error ? error.message : "Unknown error"}`,
          color: "uhoh_red",
          userId: ctx.session.user.discordUserId,
        });
        
        throw error;
      }
    }),
};
```


## Best Practices

### 1. Always Log State Changes

Every mutation must log both success and failure. No exceptions.

```typescript
// ❌ Bad - no logging
.mutation(async ({ input, ctx }) => {
  return await db.update(Something).set(input);
});

// ✅ Good - proper logging
.mutation(async ({ input, ctx }) => {
  try {
    const result = await db.update(Something).set(input);
    
    await log({
      title: "Something Updated",
      message: `Updated something with ID ${input.id}`,
      color: "success_green",
      userId: ctx.session.user.discordUserId,
    });
    
    return result;
  } catch (error) {
    await log({
      title: "Update Failed",
      message: `Failed to update: ${error instanceof Error ? error.message : "Unknown error"}`,
      color: "uhoh_red",
      userId: ctx.session.user.discordUserId,
    });
    
    throw error;
  }
});
```

### 2. Always Use the Right Procedure Type

Don't use `protectedProcedure` when you need permissions. Use `permProcedure` instead.

### 3. Use OR Logic for Page Access

When gating pages, use `controlPerms.or()` so users with any relevant permission can access:

```typescript
// Good: Users with read OR write can see the page
controlPerms.or(["VIEW_EVENTS", "MANAGE_EVENTS"], ctx);

// Less common: Requiring multiple permissions
controlPerms.and(["VIEW_EVENTS", "MANAGE_EVENTS"], ctx);
```

### 4. Validate Input Thoroughly

Always use Zod schemas for input validation:

```typescript
.input(
  z.object({
    email: z.string().email(),
    age: z.number().min(0).max(150),
    name: z.string().min(1).max(100),
  }),
)
```

### 5. Handle Errors Gracefully

Throw appropriate tRPC errors and always log them:

```typescript
import { TRPCError } from "@trpc/server";

try {
  const found = await db.query.Something.findFirst();
  
  if (!found) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Resource not found",
    });
  }
  
  // ... rest of logic
} catch (error) {
  await log({
    title: "Operation Failed",
    message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
    color: "uhoh_red",
    userId: ctx.session.user.discordUserId,
  });
  
  throw error;
}
```

### 6. Keep Routers Organized

Group related procedures into routers by domain:

```
routers/
├── members.ts      # Member management
├── events.ts       # Event management
├── roles.ts        # Role/permission management
├── misc.ts         # Form integrations and misc
└── index.ts        # Main router that combines all
```

### 7. Document Complex Procedures

Add comments for non-obvious logic:

```typescript
export const complexRouter = {
  doComplexThing: permProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // Check permissions first
      controlPerms.or(["COMPLEX_PERMISSION"], ctx);
      
      // Step 1: Fetch related data
      const data = await db.query.Something.findFirst();
      
      // Step 2: Process based on business logic
      // Note: We do X because of Y business requirement
      
      // Step 3: Update database
      // ...
    }),
};
```

## Testing Your Procedures

When developing locally:

1. **Use the tRPC devtools** (if enabled) to inspect requests
2. **Check the console** - tRPC logs execution time for each procedure
3. **Test permission logic** - Create test roles with specific permissions
4. **Use Drizzle Studio** to verify database changes

## Next Steps

- Review existing routers in `packages/api/src/routers/` for examples
- Check `@forge/consts/knight-hacks` for available permissions
- Read the [Architecture Guide](./ARCHITECTURE.md) to understand data flow
- See [CONTRIBUTING.md](../CONTRIBUTING.md) for general contribution guidelines
- Read our [GitHub Etiquette](./GITHUB-ETIQUETTE.md) guide for how to contribute to the project
- Check out the [Getting Started](./GETTING-STARTED.md) guide for setup instructions if you haven't already
