# ⚔️ Contributing to Forge

Welcome aboard and thank you for considering contributing to Forge! We appreciate your interest in our project and look forward to working with you. Before you get started, please read the rest of this document to understand how you can effectively contribute to Forge.

## 📦 Setup

1. Install [Node LTS](https://nodejs.org/en/download/)
2. Install [pnpm](https://pnpm.io/installation)
3. Install [Docker](https://docs.docker.com/get-docker/)
4. Clone this repository
5. Change directory to the root of the repository
6. Install project dependencies with `pnpm install`

### Environment Variables

Create a `.env` file in the root of the repository like [`.env.example`](/.env.example).

If you're a Knight Hacks dev team member, we will have a document with the environment variables you need to set. If you don't have access to this document, please reach out to a member of the dev team.

If you are not a Knight Hacks dev team member, you can still contribute to Forge! However, you will need to provide your own environment variables for the services we use.

### Database

Install Docker Desktop if you don't already have it.

To create a Postgres database locally with docker, you can run `docker compose up`. You will then need to push the schema to the database by running `pnpm db:push`.

To stop the Postgres container, run `docker compose stop`. To completely reset your database, run `docker compose down --volumes`.

If you'd like to preview the contents of the database, you can run `pnpm db:studio`. This will run Drizzle Studio on [`local.drizzle.studio`](http://local.drizzle.studio), a GUI for interacting with your database.

## 🏗️ Development

To run all of forge's applications, run `pnpm dev`. This will concurrently run development servers for all applications in the monorepo.

To run a specific application, you can run `pnpm dev --filter=<package-name>`. For example, to run the club site, you can run `pnpm dev --filter=@forge/club`.

### Adding a new UI component from shadcn/ui

Run the ui-add script to add a new UI component using the interactive shadcn/ui CLI:

```bash
pnpm ui-add <component-name>
```

When the component(s) has been installed, you should be good to go and start using it in your app.

### Adding a new package

To add a new package, simply run `pnpm turbo gen init` in the monorepo root. This will prompt you for a package name as well as if you want to install any dependencies to the new package (of course you can also do this yourself later).

The generator sets up the package.json, tsconfig.json and a index.ts, as well as configures all the necessary configurations for tooling around your package such as formatting, linting and typechecking. When the package is created, you're ready to go build out the package.

## ✅ Testing

In your pull request, it's important you provide a thorough test plan walking through how you tested your changes. This will help reviewers understand your changes and ensure they are working as expected.

- For frontend changes, please provide screenshots or a video demonstrating the changes you've made. A before and after comparison is always helpful.

- For backend changes, please provide a detailed test plan outlining how you tested your changes. This could include unit tests, integration tests, or manual testing.

## 📝 Commits and Pull Requests

For commit messages, simply keep it concise, descriptive, and **in all lowercase**. If this is your first time contributing to a large project like Forge, you could look through this neat tutorial: [How to Write a Git Commit Message](https://chris.beams.io/posts/git-commit/).

## 🔎 Before Submitting

Try to keep CI green! To do this, please ensure the following:

- Your code is formatted correctly (run `pnpm format`)
- Your code passes linting (run `pnpm lint`)
- Your code is type-checked (run `pnpm typecheck`)
- Your code is able to build (run `pnpm build`)

Most importantly, make sure your code is well-documented and easy to understand!
