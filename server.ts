import express from "express";
import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { link, lstat, mkdir, readdir, rm } from "node:fs/promises";
import { networkInterfaces } from "node:os";
import { join, resolve } from "node:path";
import { pipeline } from "node:stream/promises";

const app = express();
const port = Number(process.env.PORT ?? 3000);
const frontendDirectory = resolve("frontend");
const publicDirectory = resolve(process.env.PUBLIC || "public");
const uploadDirectory = join(publicDirectory, ".uploads");

await mkdir(uploadDirectory, { recursive: true });

function isFileName(name: string): boolean {
    return name.length > 0 && Buffer.byteLength(name) <= 255 &&
        !name.startsWith(".") && !/[ .]$/.test(name) &&
        !/[<>:"/\\|?*\x00-\x1f\x7f]/.test(name) &&
        !/^(con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³]) *(?:\.|$)/i.test(name);
}

function hasErrorCode(error: unknown, code: string): boolean {
    return error instanceof Error && "code" in error && error.code === code;
}

app.get("/", (_request, response) => {
    response.sendFile(join(frontendDirectory, "index.html"));
});

app.use("/assets", express.static(join(frontendDirectory, "assets")));

const api = express.Router();

api.get("/health", (_request, response) => {
    response.json({ status: "ok" });
});

api.get("/files", async (_request, response) => {
    const entries = await readdir(publicDirectory, { withFileTypes: true });
    const files = await Promise.all(entries.filter((entry) => entry.isFile() && isFileName(entry.name)).map(async ({ name }) => {
        try {
            const info = await lstat(join(publicDirectory, name));
            if (info.isFile()) {
                return { name, size: info.size, modifiedAt: info.mtime.toISOString() };
            }
        } catch (error) {
            if (!hasErrorCode(error, "ENOENT")) throw error;
        }
    }));

    response.json(files.filter((file) => file !== undefined)
        .sort((first, second) => first.name.localeCompare(second.name, undefined, { numeric: true })));
});

api.put("/files/:name", async (request, response) => {
    const { name } = request.params;
    if (!isFileName(name)) {
        response.status(400).json({ error: "Invalid file name." });
        return;
    }

    const temporaryPath = join(uploadDirectory, randomUUID());
    try {
        await pipeline(request, createWriteStream(temporaryPath, { flags: "wx" }));
        await link(temporaryPath, join(publicDirectory, name));
    } catch (error) {
        if (hasErrorCode(error, "EEXIST")) {
            response.status(409).json({ error: "A file with that name already exists." });
            return;
        }
        if (request.destroyed && !request.complete) return;
        throw error;
    } finally {
        await rm(temporaryPath, { force: true }).catch(console.error);
    }

    response.status(201).json({ name });
});

api.get("/files/:name", async (request, response, next) => {
    const { name } = request.params;
    if (!isFileName(name)) {
        response.status(400).json({ error: "Invalid file name." });
        return;
    }

    try {
        const info = await lstat(join(publicDirectory, name));
        if (info.isFile()) {
            response.download(name, name, { root: publicDirectory, headers: { "X-Content-Type-Options": "nosniff" } }, (error) => {
                if (error) next(error);
            });
            return;
        }
    } catch (error) {
        if (!hasErrorCode(error, "ENOENT")) throw error;
    }

    response.status(404).json({ error: "File not found." });
});

api.use((_request, response) => {
    response.status(404).json({ error: "API endpoint not found." });
});

const handleApiError: express.ErrorRequestHandler = (error, _request, response, next) => {
    if (response.headersSent) {
        next(error);
        return;
    }

    const status: 400 | 404 | 416 | 500 =
        error.status === 400 || error.status === 404 || error.status === 416 ? error.status : 500;
    if (status === 500) console.error(error);
    const messages = { 400: "Invalid request.", 404: "File not found.", 416: "Invalid download range.", 500: "File operation failed." };
    response.status(status).json({ error: messages[status] });
};

api.use(handleApiError);
app.use("/api", api);

const server = app.listen(port, "0.0.0.0");

server.once("listening", () => {
    const address = server.address();
    if (!address || typeof address === "string") return;

    console.log(`Home CDN is listening on port ${address.port}`);
    console.log(`  Local: http://localhost:${address.port}`);

    for (const [name, interfaces] of Object.entries(networkInterfaces())) {
        for (const entry of interfaces ?? []) {
            if (entry.family === "IPv4" && !entry.internal) {
                console.log(`  ${name}: http://${entry.address}:${address.port}`);
            }
        }
    }
});
