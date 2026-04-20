const api = window.phonelocal;
const { language, copy } = api.uiContext;

const els = {
  brandSub: document.getElementById("brandSub"),
  discordTokenLabel: document.getElementById("discordTokenLabel"),
  allowedChannelIdsLabel: document.getElementById("allowedChannelIdsLabel"),
  allowedChannelIdsHint: document.getElementById("allowedChannelIdsHint"),
  ollamaModelLabel: document.getElementById("ollamaModelLabel"),
  ollamaHostLabel: document.getElementById("ollamaHostLabel"),
  autoLaunchLabel: document.getElementById("autoLaunchLabel"),
  discordToken: document.getElementById("discordToken"),
  allowedChannelIds: document.getElementById("allowedChannelIds"),
  ollamaModel: document.getElementById("ollamaModel"),
  ollamaHost: document.getElementById("ollamaHost"),
  reloadModelsBtn: document.getElementById("reloadModelsBtn"),
  modelHint: document.getElementById("modelHint"),
  autoLaunch: document.getElementById("autoLaunch"),
  saveBtn: document.getElementById("saveBtn"),
  toggleBotBtn: document.getElementById("toggleBotBtn"),
  status: document.getElementById("status"),
  statusLabel: document.querySelector("#status .status-label"),
  message: document.getElementById("message"),
};

let currentStatus = { status: "stopped" };
let isLoadingModels = false;

function applyStaticCopy() {
  document.documentElement.lang = language;
  document.title = copy.windowTitle;
  els.brandSub.textContent = copy.brandSub;
  els.discordTokenLabel.textContent = copy.labels.discordToken;
  els.allowedChannelIdsLabel.textContent = copy.labels.allowedChannelIds;
  els.allowedChannelIdsHint.textContent = copy.labels.allowedChannelHint;
  els.ollamaModelLabel.textContent = copy.labels.ollamaModel;
  els.ollamaHostLabel.textContent = copy.labels.ollamaEndpoint;
  els.autoLaunchLabel.textContent = copy.labels.autoLaunch;
  els.reloadModelsBtn.textContent = copy.buttons.reload;
  els.modelHint.textContent = copy.hints.initialModelHint;
  els.saveBtn.textContent = copy.buttons.saveSettings;
  els.toggleBotBtn.textContent = copy.buttons.startBot;
  els.statusLabel.textContent = copy.status.loading;
}

function formatCsv(values) {
  return Array.isArray(values) ? values.filter(Boolean).join(", ") : "";
}

function formatModelCount(count) {
  if (language === "ja") {
    return `${count}件のモデルを読み込みました`;
  }
  return `Loaded ${count} model${count === 1 ? "" : "s"}`;
}

function setModelHint(text, kind) {
  els.modelHint.textContent = text ?? "";
  els.modelHint.className = "field-note" + (kind ? ` ${kind}` : "");
}

function fillModelOptions(models, selectedValue) {
  const names = [...new Set(models.map((model) => model.name).filter(Boolean))];
  if (selectedValue && !names.includes(selectedValue)) {
    names.unshift(selectedValue);
  }
  if (names.length === 0) {
    names.push("");
  }

  els.ollamaModel.innerHTML = "";
  for (const name of names) {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name || copy.hints.noModelFound;
    els.ollamaModel.appendChild(opt);
  }

  els.ollamaModel.value = selectedValue && names.includes(selectedValue) ? selectedValue : names[0];
}

async function reloadModelOptions(preferredModel) {
  if (isLoadingModels) return;
  isLoadingModels = true;
  els.reloadModelsBtn.disabled = true;
  els.ollamaModel.disabled = true;
  setModelHint(copy.hints.loadingModels);

  const host = els.ollamaHost.value.trim();
  const selectedValue = preferredModel ?? els.ollamaModel.value;

  try {
    const models = await api.listOllamaModels(host);
    fillModelOptions(models, selectedValue);
    const count = models.length;
    setModelHint(
      count > 0 ? formatModelCount(count) : copy.hints.noModelsAvailable,
      count > 0 ? "" : "error"
    );
  } catch (err) {
    fillModelOptions([], selectedValue);
    setModelHint(err?.message ?? copy.hints.loadModelsFailed, "error");
  } finally {
    isLoadingModels = false;
    els.reloadModelsBtn.disabled = false;
    els.ollamaModel.disabled = false;
  }
}

function renderStatus(state) {
  currentStatus = state ?? { status: "stopped" };
  const cls = `status status-${currentStatus.status}`;
  els.status.className = cls;
  const labelMap = {
    stopped: copy.status.stopped,
    starting: copy.status.starting,
    running: copy.status.running,
    stopping: copy.status.stopping,
    error: copy.status.error,
  };
  els.statusLabel.textContent = labelMap[currentStatus.status] ?? copy.status.unknown;
  els.toggleBotBtn.textContent =
    currentStatus.status === "running" || currentStatus.status === "starting"
      ? copy.buttons.stopBot
      : copy.buttons.startBot;
  if (currentStatus.status === "error" && currentStatus.error) {
    setMessage(currentStatus.error, "error");
  }
}

function setMessage(text, kind) {
  els.message.textContent = text ?? "";
  els.message.className = "message" + (kind ? ` ${kind}` : "");
}

function collectPatch() {
  return {
    discordToken: els.discordToken.value,
    allowedChannelIds: els.allowedChannelIds.value,
    ollamaModel: els.ollamaModel.value,
    ollamaHost: els.ollamaHost.value,
    autoLaunch: els.autoLaunch.checked,
  };
}

async function loadSettings() {
  const s = await api.getSettings();
  els.discordToken.value = s.discordToken ?? "";
  els.allowedChannelIds.value = formatCsv(s.allowedChannelIds);
  els.ollamaHost.value = s.ollamaHost ?? "";
  els.autoLaunch.checked = Boolean(s.autoLaunch);
  await reloadModelOptions(s.ollamaModel ?? "");
  const state = await api.getStatus();
  renderStatus(state);
}

async function save() {
  try {
    await api.updateSettings(collectPatch());
    setMessage(copy.hints.saved, "ok");
  } catch (err) {
    setMessage(err?.message ?? copy.hints.saveFailed, "error");
  }
}

async function toggleBot() {
  setMessage("");
  const isRunningish = currentStatus.status === "running" || currentStatus.status === "starting";
  try {
    if (isRunningish) {
      const next = await api.stopBot();
      renderStatus(next);
    } else {
      await api.updateSettings(collectPatch());
      const next = await api.startBot();
      renderStatus(next);
      if (next.status === "error") {
        setMessage(next.error ?? copy.hints.startFailed, "error");
      }
    }
  } catch (err) {
    setMessage(err?.message ?? String(err), "error");
  }
}

applyStaticCopy();
els.saveBtn.addEventListener("click", save);
els.toggleBotBtn.addEventListener("click", toggleBot);
els.reloadModelsBtn.addEventListener("click", () => {
  void reloadModelOptions();
});
els.ollamaHost.addEventListener("change", () => {
  void reloadModelOptions();
});
els.ollamaHost.addEventListener("blur", () => {
  void reloadModelOptions();
});
api.onStatusChanged(renderStatus);

loadSettings().catch((err) => setMessage(err?.message ?? String(err), "error"));
