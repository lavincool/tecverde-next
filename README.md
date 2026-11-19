# TecVerde

Campus reporting and animal adoption for Tec campus Matamoros. The public interface uses Mexican Spanish. See [architecture](docs/architecture.md) for the application boundaries and technical decisions.

## Local setup

1. Install [Bun](https://bun.sh/) 1.4.4.
2. Run `bun install --frozen-lockfile`. This installs the required Git hooks.
3. Copy `.env.example` to `.env.local`.
4. Run `bun run dev` and open [localhost:3000](http://localhost:3000).

Before opening a pull request, run:

```sh
bun run lint
bun run format:check
bun run typecheck
bun run test
bun run build
```

Run `bun run format` to apply formatting. Use `bun run start` to serve a completed production build locally.
