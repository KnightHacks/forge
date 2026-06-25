# Blade Reforge Interfaces

Status: Draft.

This document owns contracts between components. Interface changes must be explicit because Forge is a monorepo with multiple apps consuming shared packages.

## Interface categories

- App routes and user-facing URLs
- API procedures/routes and response shapes
- Package exports from `packages/*`
- Database schemas and migration-visible data shape
- Auth/session expectations
- Environment variables
- Email/Discord/Google/Stripe/MinIO or other integration boundaries
- Deployment and runtime assumptions

## Compatibility rule

A shared interface cannot be silently changed. Changes must identify producers, consumers, compatibility strategy, tests, and rollout plan.

## Initial interface inventory tasks

- Document current `@forge/api` consumers.
- Document direct `@forge/db` consumers.
- Document `@forge/utils` behavior that is actually product behavior.
- Document env vars and deployment assumptions used by Blade.
