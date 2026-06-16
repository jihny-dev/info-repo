const fallbackRecords = [
  {
    id: "KB-001",
    title: '"G: Drive" is missing',
    department: "Service Desk (Stern)",
    system: "No escalation listed",
    severity: "Medium",
    keywords: "Error Google Drive",
    issues: "",
    solution: "G Drive is the Google Drive desktop app. Stern imaged PCs should have this installed already. They just need to log back in.",
    steps: [
      "Confirm the user is referring to the Google Drive desktop app.",
      "Ask them to log back into the Google Drive desktop app."
    ],
    escalation: "No escalation listed.",
    owner: "Service Desk (Stern)",
    reviewed: "Imported CSV",
    source: "Topics CSV",
    moreInfo: "https://support.google.com/drive/answer/10838124?hl=en&ref_topic=11413606",
    attachments: "",
    relatedKbs: ""
  },
  {
    id: "KB-002",
    title: "12Twenty access / Career Account",
    department: "Stern Webspace",
    system: "AppDev",
    severity: "Low",
    keywords: "Error Alumni",
    issues: "12Twenty is the portal used by Career Center of Working Professionals.",
    solution: "Stern IT does not manage this site, please reach out to CCWP for further help.\nPlease provide information after they have activated their Stern account",
    steps: [
      "Direct the user to CCWP for further help.",
      "Provide information after the user's Stern account has been activated."
    ],
    escalation: "AppDev",
    owner: "Stern Webspace",
    reviewed: "Imported CSV",
    source: "Topics CSV",
    moreInfo: "Phone: (212) 998-0235\nE-mail: ccwp@stern.nyu.edu",
    attachments: "",
    relatedKbs: ""
  },
  {
    id: "KB-003",
    title: "Access to Adobe Creative Cloud / Adobe Acrobat",
    department: "Service Desk (Stern)",
    system: "No escalation listed",
    severity: "High",
    keywords: "Adobe Access Adobe Acrobat Subscription Free Trial Request Access",
    issues: "Client is unable to access their Adobe Creative Cloud or Adobe Acrobat. They are getting an error asking them to subscribe or that their trial period is ending.",
    solution: "1) Make sure they are logged into their NYU account\n2) Ask them to log out from all Adobe Applications\n3) When logging back in, for 'Email Address', they should put in 'nyu.edu'. This will prompt for their NYU credentials to sign in.",
    steps: [
      "Make sure they are logged into their NYU account.",
      "Ask them to log out from all Adobe Applications.",
      "When logging back in, enter nyu.edu for Email Address so the NYU credentials prompt appears."
    ],
    escalation: "No escalation listed.",
    owner: "Service Desk (Stern)",
    reviewed: "Imported CSV",
    source: "Expiring/Expired Adobe Creative Cloud License",
    moreInfo: "Adobe Access is only available for Faculty and Admins. Ph.D students are still considered Students.",
    attachments: "",
    relatedKbs: "Expiring/Expired Adobe Creative Cloud License"
  }
];

let records = [];
let selectedId = "";
let editorOpen = false;
let dataMode = "csv";

const appConfig = window.APP_CONFIG || {};
const appsScriptUrl = String(appConfig.APPS_SCRIPT_URL || "").trim();
const backendEnabled = /^https:\/\/script\.google\.com\/(?:macros\/s|a\/macros\/[^/]+\/s)\/.+\/exec$/.test(appsScriptUrl);

const fields = {
  query: document.querySelector("#query"),
  department: document.querySelector("#departmentFilter"),
  system: document.querySelector("#systemFilter"),
  outputMode: document.querySelector("#outputMode"),
  results: document.querySelector("#results"),
  matchCount: document.querySelector("#matchCount"),
  title: document.querySelector("#recordTitle"),
  meta: document.querySelector("#recordMeta"),
  answer: document.querySelector("#answer"),
  editor: document.querySelector("#editor"),
  dataStatus: document.querySelector("#dataSourceStatus")
};

function setDataStatus(text, state = "ok") {
  if (!fields.dataStatus) return;
  fields.dataStatus.textContent = text;
  fields.dataStatus.classList.toggle("warning", state === "warning");
  fields.dataStatus.classList.toggle("error", state === "error");
}

async function backendRequest(payload) {
  const response = await fetch(appsScriptUrl, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Backend request failed: ${response.status}`);
  }

  const data = await response.json();
  if (!data.ok) {
    throw new Error(data.error || "Backend request failed");
  }
  return data;
}

function normalizeBackendRecord(record) {
  return {
    id: record.id || crypto.randomUUID(),
    title: record.title || "Untitled record",
    department: record.department || "General",
    system: record.system || record.escalation || "No escalation listed",
    severity: record.severity || (record.escalation ? "Medium" : "Low"),
    keywords: record.keywords || "",
    issues: record.issues || "",
    solution: record.solution || record.issues || record.moreInfo || "",
    steps: asList(record.steps || record.solution || ""),
    escalation: record.escalation || record.system || "No escalation listed",
    owner: record.owner || record.department || "General",
    reviewed: record.reviewed || record.updatedAt || "From Google Sheet",
    source: record.source || record.relatedKbs || "Google Sheet",
    moreInfo: record.moreInfo || "",
    attachments: record.attachments || "",
    relatedKbs: record.relatedKbs || record.source || "",
    status: record.status || "Active",
    updatedAt: record.updatedAt || "",
    updatedBy: record.updatedBy || ""
  };
}

async function loadBackendRecords() {
  const data = await backendRequest({ action: "listRecords" });
  return (data.records || []).map(normalizeBackendRecord);
}

async function saveRecordToBackend(record) {
  const data = await backendRequest({
    action: "saveRecord",
    record
  });
  return normalizeBackendRecord(data.record || record);
}

async function replaceBackendRecords(nextRecords) {
  const data = await backendRequest({
    action: "replaceAllRecords",
    records: nextRecords
  });
  return (data.records || nextRecords).map(normalizeBackendRecord);
}

function normalize(value) {
  return String(value || "").toLowerCase().trim();
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function asList(value) {
  if (Array.isArray(value)) return value;
  return String(value || "")
    .split(/\||\n+/)
    .map((item) => item.trim().replace(/^(?:\d+[\).]|[-*])\s*/, ""))
    .filter(Boolean);
}

function recordText(record) {
  return [
    record.title,
    record.department,
    record.system,
    record.severity,
    record.keywords,
    record.issues,
    record.solution,
    record.steps.join(" "),
    record.moreInfo,
    record.attachments,
    record.relatedKbs,
    record.escalation,
    record.owner,
    record.source
  ].join(" ");
}

function score(record) {
  const query = normalize(fields.query.value);
  if (!query) return 1;
  const tokens = query.split(/\s+/).filter(Boolean);
  const title = normalize(record.title);
  const keywords = normalize(record.keywords);
  const text = normalize(recordText(record));

  return tokens.reduce((total, token) => {
    if (title.includes(token)) total += 8;
    if (keywords.includes(token)) total += 5;
    if (text.includes(token)) total += 2;
    return total;
  }, 0);
}

function filteredRecords() {
  return records
    .filter((record) => fields.department.value === "all" || record.department === fields.department.value)
    .filter((record) => fields.system.value === "all" || record.system === fields.system.value)
    .map((record) => ({ record, score: score(record) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.record.title.localeCompare(b.record.title));
}

function currentRecord() {
  return records.find((record) => record.id === selectedId) || records[0];
}

function fillSelect(select, values) {
  const current = select.value || "all";
  select.innerHTML = '<option value="all">All</option>';
  [...new Set(values)].sort().forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
  select.value = [...select.options].some((option) => option.value === current) ? current : "all";
}

function recommendedOutputMode(record) {
  const solution = record.solution || "";
  const text = normalize([record.title, record.issues, record.solution, record.moreInfo].join(" "));
  const steps = record.steps || [];
  const hasNumberedSteps = /(^|\n)\s*(?:\d+[\).]|[-*])\s+/.test(solution);
  const routingAnswer = /(does not manage|reach out|contact|e-mail|email|phone|call|refer|escalate to)/.test(text);
  const actionTerms = [
    "download",
    "install",
    "configure",
    "verify",
    "confirm",
    "reset",
    "restart",
    "upload",
    "log out",
    "log in",
    "sign in",
    "select",
    "open",
    "click",
    "submit",
    "remove"
  ];
  const actionCount = actionTerms.filter((term) => text.includes(term)).length;

  if (hasNumberedSteps && steps.length >= 3) return "sop";
  if (steps.length >= 4) return "sop";
  if (steps.length >= 3 && actionCount >= 2) return "sop";
  if (solution.length > 320 && steps.length >= 2 && !routingAnswer) return "sop";
  return "solution";
}

function activeOutputMode(record) {
  return fields.outputMode.value === "auto" ? recommendedOutputMode(record) : fields.outputMode.value;
}

function outputModeLabel(mode) {
  if (mode === "sop") return "SOP";
  if (mode === "checklist") return "Checklist";
  return "Solution";
}

function renderResults(matches) {
  fields.results.innerHTML = "";
  fields.matchCount.textContent = `${matches.length} ${matches.length === 1 ? "record" : "records"}`;
  const hasInquiry = normalize(fields.query.value).length > 0;
  fields.results.classList.toggle("empty-inquiry", !hasInquiry);

  if (!matches.some((item) => item.record.id === selectedId) && matches.length) {
    selectedId = matches[0].record.id;
  }

  if (!matches.length) {
    fields.results.innerHTML = '<div class="result"><h3>No match found</h3><p>Try fewer filters or broader wording.</p></div>';
    return;
  }

  matches.forEach(({ record }) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `result${record.id === selectedId ? " active" : ""}`;
    button.innerHTML = `
      <h3>${escapeHtml(record.title)}</h3>
      <p>${escapeHtml(record.solution || record.issues || record.moreInfo)}</p>
    `;
    button.addEventListener("click", () => {
      selectedId = record.id;
      editorOpen = false;
      render();
    });
    fields.results.appendChild(button);
  });
}

function renderAnswer(record) {
  if (!record) return;

  const recommendedMode = recommendedOutputMode(record);
  const displayMode = activeOutputMode(record);
  const outputNote = fields.outputMode.value === "auto"
    ? `Best fit: ${outputModeLabel(displayMode)}`
    : `Suggested: ${outputModeLabel(recommendedMode)}`;

  fields.title.textContent = record.title;
  fields.meta.textContent = `${record.department} | ${record.system || "No escalation listed"} | ${outputNote}`;

  if (displayMode === "solution") {
    fields.answer.innerHTML = `
      ${record.issues ? `
      <section class="answer-block">
        <h3>Main Issue</h3>
        <p class="prewrap">${escapeHtml(record.issues)}</p>
      </section>
      ` : ""}
      <section class="answer-block">
        <h3>Resolution</h3>
        <p class="prewrap">${escapeHtml(record.solution || "No resolution listed.")}</p>
      </section>
      ${record.moreInfo ? `
      <section class="answer-block">
        <h3>More Information</h3>
        <p class="prewrap">${escapeHtml(record.moreInfo)}</p>
      </section>
      ` : ""}
      ${record.relatedKbs ? `
      <section class="answer-block">
        <h3>Related KBs</h3>
        <p class="prewrap">${escapeHtml(record.relatedKbs)}</p>
      </section>
      ` : ""}
      ${record.attachments ? `
      <section class="answer-block">
        <h3>Attachments / Images</h3>
        <p class="prewrap">${escapeHtml(record.attachments)}</p>
      </section>
      ` : ""}
      <section class="answer-block">
        <h3>Escalation</h3>
        <p class="prewrap">${escapeHtml(record.escalation || "No escalation listed.")}</p>
      </section>
    `;
  }

  if (displayMode === "checklist") {
    fields.answer.innerHTML = `
      <section class="answer-block">
        <h3>Checklist</h3>
        <div class="checklist">
          ${record.steps.map((step, index) => `
            <label class="checkline">
              <input type="checkbox">
              <span>${index + 1}. ${escapeHtml(step)}</span>
            </label>
          `).join("")}
        </div>
      </section>
    `;
  }

  if (displayMode === "sop") {
    fields.answer.innerHTML = `
      <section class="answer-block">
        <h3>Purpose</h3>
        <p class="prewrap">${escapeHtml(record.issues || record.solution || record.title)}</p>
      </section>
      <section class="answer-block">
        <h3>Procedure</h3>
        <ol class="steps">
          ${record.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}
        </ol>
      </section>
      <section class="answer-block">
        <h3>Reference Notes</h3>
        <p class="prewrap">${escapeHtml(record.moreInfo || "No additional notes listed.")}</p>
      </section>
      <section class="answer-block">
        <h3>Escalation</h3>
        <p class="prewrap">${escapeHtml(record.escalation || "No escalation listed.")}</p>
      </section>
      <section class="answer-block">
        <h3>Related KBs</h3>
        <p class="prewrap">${escapeHtml(record.relatedKbs || record.source || "No related KBs listed.")}</p>
      </section>
    `;
  }
}

function renderEditor(record) {
  const submitButton = fields.editor.querySelector("button[type='submit']");
  if (submitButton) {
    submitButton.textContent = dataMode === "google-sheet" ? "Save Record" : "Save Draft";
  }
  fields.editor.classList.toggle("hidden", !editorOpen);
  if (!editorOpen || !record) return;
  fields.editor.elements.title.value = record.title;
  fields.editor.elements.department.value = record.department;
  fields.editor.elements.system.value = record.system;
  fields.editor.elements.source.value = record.source;
  fields.editor.elements.issues.value = record.issues || "";
  fields.editor.elements.solution.value = record.solution;
  fields.editor.elements.steps.value = record.steps.join("\n");
  fields.editor.elements.moreInfo.value = record.moreInfo || "";
  fields.editor.elements.attachments.value = record.attachments || "";
}

function render() {
  fillSelect(fields.department, records.map((record) => record.department));
  fillSelect(fields.system, records.map((record) => record.system));
  const matches = filteredRecords();
  renderResults(matches);
  const record = currentRecord();
  renderAnswer(record);
  renderEditor(record);
}

function parseCsv(text) {
  const rows = [];
  let cell = "";
  let row = [];
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  const [headers, ...data] = rows.filter((items) => items.some((item) => item.trim()));
  if (!headers) return [];
  const keys = headers.map((header) => normalize(header).replace(/[^a-z0-9]/g, ""));

  return data.map((items, index) => {
    const rowObject = {};
    keys.forEach((key, cellIndex) => {
      rowObject[key] = cleanText(items[cellIndex] || "");
    });
    const title = firstValue(rowObject, ["title", "topic"]) || "Untitled record";
    const service = firstValue(rowObject, ["department", "universityservice", "service"]) || "General";
    const escalationRoute = firstValue(rowObject, ["system", "escalation"]) || "No escalation listed";
    const issues = firstValue(rowObject, ["issues", "mainissues", "symptoms"]) || "";
    const resolution = firstValue(rowObject, ["solution", "resolution"]) || "";
    const moreInfo = firstValue(rowObject, ["moreinformation", "moreinfo", "notes"]) || "";
    const attachments = firstValue(rowObject, ["attachmentsimages", "attachments", "images"]) || "";
    const relatedKbs = firstValue(rowObject, ["relatedkbs", "relatedkb", "source", "sourcedoc"]) || "";
    const keywords = [
      firstValue(rowObject, ["keywords", "tags"]),
      issues,
      relatedKbs,
      moreInfo
    ].filter(Boolean).join(" ");
    const rawSteps = firstValue(rowObject, ["steps", "sopsteps"]) || resolution;

    return {
      id: firstValue(rowObject, ["id"]) || `CSV-${index + 1}`,
      title,
      department: service,
      system: escalationRoute,
      severity: firstValue(rowObject, ["severity"]) || (escalationRoute === "No escalation listed" ? "Low" : "Medium"),
      keywords,
      issues,
      solution: resolution || issues || moreInfo,
      steps: asList(rawSteps),
      escalation: escalationRoute,
      owner: firstValue(rowObject, ["owner"]) || service,
      reviewed: firstValue(rowObject, ["reviewed", "lastreviewed"]) || "Imported CSV",
      source: relatedKbs || "Topics CSV",
      moreInfo,
      attachments,
      relatedKbs
    };
  });
}

function cleanText(value) {
  return String(value || "").replace(/\r\n/g, "\n").trim();
}

function firstValue(rowObject, keys) {
  for (const key of keys) {
    if (rowObject[key]) return rowObject[key];
  }
  return "";
}

function csvEscape(value) {
  const text = Array.isArray(value) ? value.join("|") : String(value || "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function exportRows() {
  const headers = ["id", "title", "department", "system", "severity", "keywords", "issues", "solution", "steps", "moreInfo", "attachments", "relatedKbs", "escalation", "owner", "reviewed", "source"];
  return [
    headers.join(","),
    ...records.map((record) => headers.map((key) => csvEscape(record[key])).join(","))
  ].join("\n");
}

function downloadCsv() {
  const blob = new Blob([exportRows()], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "stern-it-service-desk-export.csv";
  link.click();
  URL.revokeObjectURL(url);
}

async function loadInitialData() {
  if (backendEnabled) {
    try {
      setDataStatus("Google Sheet mode", "ok");
      records = await loadBackendRecords();
      dataMode = "google-sheet";
      selectedId = records[0]?.id || "";
      render();
      return;
    } catch (error) {
      console.error(error);
      setDataStatus("Sheet unavailable - CSV fallback", "error");
    }
  } else {
    setDataStatus("CSV mode", "warning");
  }

  try {
    const response = await fetch("knowledge.csv", { cache: "no-store" });
    if (!response.ok) throw new Error("CSV not available");
    records = parseCsv(await response.text());
  } catch {
    records = structuredClone(fallbackRecords);
  }
  selectedId = records[0]?.id || "";
  render();
}

fields.query.addEventListener("input", render);
fields.department.addEventListener("input", render);
fields.system.addEventListener("input", render);
fields.outputMode.addEventListener("input", render);

document.querySelector("#clearQuery").addEventListener("click", () => {
  fields.query.value = "";
  render();
});

document.querySelector("#toggleEditor").addEventListener("click", () => {
  editorOpen = !editorOpen;
  render();
});

document.querySelector("#closeEditor").addEventListener("click", () => {
  editorOpen = false;
  render();
});

fields.editor.addEventListener("submit", async (event) => {
  event.preventDefault();
  const record = currentRecord();
  if (!record) return;
  const submitButton = fields.editor.querySelector("button[type='submit']");
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = dataMode === "google-sheet" ? "Saving..." : "Saving Draft...";
  }

  record.title = fields.editor.elements.title.value.trim();
  record.department = fields.editor.elements.department.value.trim();
  record.system = fields.editor.elements.system.value.trim();
  record.source = fields.editor.elements.source.value.trim();
  record.issues = fields.editor.elements.issues.value.trim();
  record.solution = fields.editor.elements.solution.value.trim();
  record.steps = asList(fields.editor.elements.steps.value.replaceAll("\n", "|"));
  record.moreInfo = fields.editor.elements.moreInfo.value.trim();
  record.attachments = fields.editor.elements.attachments.value.trim();
  record.escalation = record.system;
  record.owner = record.department;
  record.relatedKbs = record.source;

  try {
    if (dataMode === "google-sheet") {
      const savedRecord = await saveRecordToBackend(record);
      const index = records.findIndex((item) => item.id === record.id);
      if (index >= 0) records[index] = savedRecord;
      selectedId = savedRecord.id;
      setDataStatus("Saved to Google Sheet", "ok");
    } else {
      setDataStatus("Draft saved locally", "warning");
    }
    editorOpen = false;
    render();
  } catch (error) {
    console.error(error);
    setDataStatus("Save failed", "error");
    alert(`Unable to save this record: ${error.message}`);
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = dataMode === "google-sheet" ? "Save Record" : "Save Draft";
    }
  }
});

document.querySelector("#csvUpload").addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (!file) return;
  const imported = parseCsv(await file.text());
  if (!imported.length) return;

  if (dataMode === "google-sheet") {
    const confirmed = confirm("Replace all Google Sheet records with this CSV import? This will write an audit log entry.");
    if (!confirmed) {
      event.target.value = "";
      return;
    }

    try {
      setDataStatus("Importing to Google Sheet...", "warning");
      records = await replaceBackendRecords(imported);
      setDataStatus("CSV imported to Google Sheet", "ok");
    } catch (error) {
      console.error(error);
      setDataStatus("Import failed", "error");
      alert(`Unable to import CSV to Google Sheet: ${error.message}`);
      return;
    }
  } else {
    records = imported;
    setDataStatus("CSV imported locally", "warning");
  }

  selectedId = records[0].id;
  editorOpen = false;
  render();
});

document.querySelector("#exportCsv").addEventListener("click", downloadCsv);

document.querySelector("#copyAnswer").addEventListener("click", async () => {
  const text = `${fields.title.textContent}\n\n${fields.answer.innerText}`;
  await navigator.clipboard.writeText(text.trim());
});

loadInitialData();
