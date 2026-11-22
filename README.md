# Home CDN

[<kbd>Run</kbd>](#run) [<kbd>Scripts</kbd>](#scripts)

**Simple, handmade file transfers over your local network.**

Use Home CDN to send files from your phone to a computer on the same network. For example, you can upload photos from your phone to your home PC over Wi-Fi.

> Home CDN is designed for local use. Add security controls before making it publicly accessible.

## Run

From the project root, install dependencies and run `server.ts` in watch mode.

```sh
npm install
npm run dev
```

To run the compiled server, build it first.

```sh
npm run build
npm start
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Runs `server.ts` with `tsx` and restarts it when files change. |
| `npm run build` | Compiles TypeScript into `dist/`. |
| `npm start` | Runs the compiled server at `dist/server.js`. |
| `npm run typecheck` | Checks TypeScript types without emitting files. |
