const state = {
  index: null,
  entries: [],
  selectedId: null,
};

const els = {
  searchInput: document.querySelector("#searchInput"),
  entryList: document.querySelector("#entryList"),
  entryCount: document.querySelector("#entryCount"),
  entryDate: document.querySelector("#entryDate"),
  entryTitle: document.querySelector("#entryTitle"),
  tagList: document.querySelector("#tagList"),
  entryContent: document.querySelector("#entryContent"),
  rawLink: document.querySelector("#rawLink"),
};

async function init() {
  try {
    const response = await fetch("./ai-index.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Failed to load index: ${response.status}`);
    state.index = await response.json();
    state.entries = [...state.index.entries].sort((a, b) => b.date.localeCompare(a.date));
    state.selectedId = getInitialEntryId();
    els.searchInput.addEventListener("input", renderList);
    renderList();
    await selectEntry(state.selectedId || state.entries[0]?.id);
  } catch (error) {
    showError(error.message);
  }
}

function getInitialEntryId() {
  const hash = decodeURIComponent(window.location.hash.replace(/^#/, ""));
  return hash || null;
}

function renderList() {
  const query = els.searchInput.value.trim().toLowerCase();
  const filtered = state.entries.filter((entry) => {
    const text = [entry.title, entry.summary, entry.date, ...(entry.tags || [])].join(" ").toLowerCase();
    return text.includes(query);
  });

  els.entryCount.textContent = `${filtered.length} ${filtered.length === 1 ? "entry" : "entries"}`;
  els.entryList.innerHTML = "";

  if (filtered.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No matching entries.";
    els.entryList.append(empty);
    return;
  }

  for (const entry of filtered) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `entry-button${entry.id === state.selectedId ? " active" : ""}`;
    button.innerHTML = `<strong>${escapeHtml(entry.title)}</strong><span>${escapeHtml(entry.date)} · ${escapeHtml((entry.tags || []).join(", "))}</span>`;
    button.addEventListener("click", () => selectEntry(entry.id));
    els.entryList.append(button);
  }
}

async function selectEntry(id) {
  const entry = state.entries.find((item) => item.id === id) || state.entries[0];
  if (!entry) {
    showError("No entries found.");
    return;
  }

  state.selectedId = entry.id;
  window.history.replaceState(null, "", `#${encodeURIComponent(entry.id)}`);
  renderList();

  els.entryDate.textContent = entry.date;
  els.entryTitle.textContent = entry.title;
  els.rawLink.href = entry.path;
  els.tagList.innerHTML = "";
  for (const tag of entry.tags || []) {
    const span = document.createElement("span");
    span.className = "tag";
    span.textContent = tag;
    els.tagList.append(span);
  }

  const response = await fetch(entry.path, { cache: "no-store" });
  if (!response.ok) {
    showError(`Failed to load entry: ${response.status}`);
    return;
  }
  const markdown = stripFrontMatter(await response.text());
  els.entryContent.innerHTML = renderMarkdown(markdown);
}

function stripFrontMatter(markdown) {
  return markdown.replace(/^---\n[\s\S]*?\n---\n?/, "");
}

function renderMarkdown(markdown) {
  const lines = markdown.split(/\r?\n/);
  const html = [];
  let inCode = false;
  let listType = null;
  let paragraph = [];

  function flushParagraph() {
    if (paragraph.length) {
      html.push(`<p>${inline(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  }

  function closeList() {
    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }
  }

  for (const line of lines) {
    if (line.startsWith("```")) {
      flushParagraph();
      closeList();
      if (inCode) {
        html.push("</code></pre>");
        inCode = false;
      } else {
        html.push("<pre><code>");
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      html.push(escapeHtml(line));
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      closeList();
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      closeList();
      const level = heading[1].length;
      html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }

    const unordered = line.match(/^\s*[-*]\s+(.+)$/);
    if (unordered) {
      flushParagraph();
      if (listType !== "ul") {
        closeList();
        listType = "ul";
        html.push("<ul>");
      }
      html.push(`<li>${inline(unordered[1])}</li>`);
      continue;
    }

    const ordered = line.match(/^\s*\d+\.\s+(.+)$/);
    if (ordered) {
      flushParagraph();
      if (listType !== "ol") {
        closeList();
        listType = "ol";
        html.push("<ol>");
      }
      html.push(`<li>${inline(ordered[1])}</li>`);
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();
  closeList();
  if (inCode) html.push("</code></pre>");
  return html.join("\n");
}

function inline(text) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showError(message) {
  els.entryDate.textContent = "";
  els.entryTitle.textContent = "Could not load";
  els.entryContent.innerHTML = `<div class="empty-state">${escapeHtml(message)}</div>`;
}

init();
