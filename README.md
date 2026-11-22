# Home CDN

[<kbd>Run</kbd>](#run) [<kbd>Scripts</kbd>](#scripts) [<kbd>API</kbd>](#api)

**Simple, handmade file transfers over your local network.**

Use Home CDN to send files from your phone to a computer on the same network. For example, you can upload photos from your phone to your home PC over Wi-Fi.

> Home CDN is designed for local use. Add security controls before making it publicly accessible.

## Run

From the project root, install dependencies and run `server.ts` in watch mode.

```sh
npm install
npm run dev
```

Open `http://localhost:3000` to upload, browse, and download files. To connect from another device on the same network, use the URL printed at startup for the host computer's Wi-Fi or Ethernet adapter.

Both run commands read `.env` when it exists. Copy `.env.example` to `.env` to change the settings. `PORT` defaults to `3000`. `PUBLIC` is the storage directory and defaults to `public/`. Relative paths are resolved from the project root, and the server creates the directory on startup.

To run the compiled server, build it first.

```sh
npm run build
npm start
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Loads `.env` if present and runs `server.ts` in watch mode. |
| `npm run build` | Compiles TypeScript into `dist/`. |
| `npm start` | Loads `.env` if present and runs `dist/server.js`. |
| `npm run typecheck` | Checks TypeScript types without emitting files. |

## API

| Request | What it does |
| --- | --- |
| `GET /api/health` | Returns the server status. |
| `GET /api/files` | Lists saved files with their names, sizes, and modification times. |
| `PUT /api/files/:name` | Saves the raw request body under the URL-encoded file name. Returns `409` when the name is already in use. |
| `GET /api/files/:name` | Downloads a saved file by its URL-encoded name. |
