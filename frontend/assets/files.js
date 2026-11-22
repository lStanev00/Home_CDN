const form = document.querySelector("#upload-form");
const fileInput = document.querySelector("#file-input");
const uploadButton = form.querySelector("button");
const uploadStatus = document.querySelector("#upload-status");
const refreshButton = document.querySelector("#refresh");
const search = document.querySelector("#file-search");
const fileCount = document.querySelector("#file-count");
const fileStatus = document.querySelector("#file-status");
const fileList = document.querySelector("#file-list");
const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
const sizeFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });

let files = [];
let loaded = false;
let listRequest;

function fileUrl(name) {
    return `/api/files/${encodeURIComponent(name)}`;
}

function formatSize(bytes) {
    const units = ["B", "KB", "MB", "GB", "TB"];
    let unit = 0;
    while (bytes >= 1024 && unit < units.length - 1) {
        bytes /= 1024;
        unit++;
    }
    return `${sizeFormat.format(bytes)} ${units[unit]}`;
}

function renderFiles() {
    if (!loaded) return;

    const query = search.value.trim().toLocaleLowerCase();
    const matches = files.filter(({ name }) => name.toLocaleLowerCase().includes(query));
    const count = query ? `${matches.length} of ${files.length}` : files.length;
    fileCount.textContent = `${count} ${files.length === 1 ? "file" : "files"}`;
    fileStatus.textContent = query ? "No matching files." : "No files yet. Upload a file to get started.";
    fileStatus.hidden = matches.length > 0;
    fileList.hidden = matches.length === 0;
    fileList.replaceChildren(...matches.map(({ name, size, modifiedAt }) => {
        const row = document.createElement("li");
        const details = document.createElement("div");
        const title = document.createElement("span");
        title.className = "file-name";
        title.textContent = name;
        const metadata = document.createElement("span");
        metadata.className = "file-meta";
        metadata.textContent = `${formatSize(size)} · ${dateFormat.format(new Date(modifiedAt))}`;
        details.append(title, metadata);

        const download = document.createElement("a");
        download.className = "download";
        download.href = fileUrl(name);
        download.textContent = "Download";
        download.setAttribute("aria-label", `Download ${name}`);
        row.append(details, download);
        return row;
    }));
}

async function refreshFiles() {
    listRequest?.abort();
    const request = new AbortController();
    listRequest = request;
    refreshButton.disabled = true;

    try {
        const response = await fetch("/api/files", { signal: request.signal });
        if (!response.ok) throw new Error("Could not load files.");
        const result = await response.json();
        if (request.signal.aborted) return;
        files = result;
        loaded = true;
        renderFiles();
    } catch {
        if (request.signal.aborted) return;
        loaded = false;
        fileCount.textContent = "";
        fileList.hidden = true;
        fileStatus.hidden = false;
        fileStatus.textContent = "Could not load files. Select Refresh to try again.";
    } finally {
        if (listRequest === request) refreshButton.disabled = false;
    }
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const selection = Array.from(fileInput.files);
    if (selection.length === 0 || uploadButton.disabled) return;

    fileInput.disabled = true;
    uploadButton.disabled = true;
    uploadStatus.classList.remove("error");
    const failures = [];

    for (const [index, file] of selection.entries()) {
        uploadStatus.textContent = `Uploading ${index + 1} of ${selection.length}: ${file.name}`;
        try {
            const response = await fetch(fileUrl(file.name), {
                method: "PUT",
                headers: { "Content-Type": "application/octet-stream" },
                body: file,
            });
            if (!response.ok) {
                const result = await response.json().catch(() => ({}));
                failures.push(`${file.name}: ${result.error || "Upload failed."}`);
            }
        } catch {
            failures.push(`${file.name}: Lost connection to the server.`);
        }
    }

    const uploaded = selection.length - failures.length;
    uploadStatus.classList.toggle("error", failures.length > 0);
    uploadStatus.textContent = [`Uploaded ${uploaded} of ${selection.length}.`, ...failures].join(" ");
    form.reset();
    fileInput.disabled = false;
    uploadButton.disabled = false;
    await refreshFiles();
});

refreshButton.addEventListener("click", refreshFiles);
search.addEventListener("input", renderFiles);
refreshFiles();
