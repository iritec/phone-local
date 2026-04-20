import { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, screen, shell } from "electron";
import { join } from "node:path";
import { BotController, type BotStatusPayload } from "./bot-controller.js";
import {
  getSettings,
  updateSettings,
  migrateFromDotEnvIfNeeded,
  type StoredSettings,
} from "./settings-store.js";
import { listOllamaModels } from "../src/ollama.js";
import {
  getCopy,
  resolveLanguage,
  type SupportedLanguage,
} from "../src/i18n.js";

const isDev = !app.isPackaged;
const showsDockInCurrentMode = process.platform === "darwin" && isDev;

let tray: Tray | null = null;
let settingsWindow: BrowserWindow | null = null;
const controller = new BotController();

function getCurrentLanguage(): SupportedLanguage {
  try {
    const preferred = app.getPreferredSystemLanguages();
    if (preferred.length > 0) {
      return resolveLanguage(preferred);
    }
  } catch {
    /* ignore */
  }

  try {
    return resolveLanguage(app.getLocale());
  } catch {
    return "en";
  }
}

function getUiContext() {
  const language = getCurrentLanguage();
  return {
    language,
    copy: getCopy(language).ui,
  };
}

function hideDockIfPossible(): void {
  if (process.platform === "darwin" && app.dock && !showsDockInCurrentMode) {
    app.dock.hide();
  }
}

function buildTrayIcon(): Electron.NativeImage {
  const iconPath = join(__dirname, "..", "..", "build", "trayTemplate.png");
  try {
    const img = nativeImage.createFromPath(iconPath);
    if (!img.isEmpty()) {
      img.setTemplateImage(true);
      return img;
    }
  } catch {
    /* ignore */
  }
  const fallback = nativeImage.createEmpty();
  return fallback;
}

function createSettingsWindow(): BrowserWindow {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    return settingsWindow;
  }
  const { copy } = getUiContext();
  const win = new BrowserWindow({
    width: 460,
    height: 620,
    show: false,
    frame: true,
    resizable: true,
    title: copy.windowTitle,
    backgroundColor: "#1a1a1f",
    webPreferences: {
      preload: join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.setMenuBarVisibility(false);
  win.loadFile(join(__dirname, "..", "..", "renderer", "index.html"));
  if (isDev) {
    // win.webContents.openDevTools({ mode: "detach" });
  }
  win.on("closed", () => {
    if (settingsWindow === win) settingsWindow = null;
  });
  win.on("close", (e) => {
    if (!isQuitting) {
      e.preventDefault();
      win.hide();
    }
  });
  settingsWindow = win;
  return win;
}

function positionWindowUnderTray(win: BrowserWindow): void {
  try {
    const trayBounds = tray?.getBounds();
    if (!trayBounds) return;
    const display = screen.getDisplayNearestPoint({
      x: trayBounds.x + Math.floor(trayBounds.width / 2),
      y: trayBounds.y,
    });
    const winBounds = win.getBounds();
    let x = Math.round(trayBounds.x + trayBounds.width / 2 - winBounds.width / 2);
    let y = Math.round(trayBounds.y + trayBounds.height + 6);

    const work = display.workArea;
    x = Math.max(work.x + 8, Math.min(x, work.x + work.width - winBounds.width - 8));
    y = Math.max(work.y + 8, y);
    win.setPosition(x, y, false);
  } catch (err) {
    console.error("[tray] position error:", err);
  }
}

function toggleSettingsWindow(): void {
  const win = createSettingsWindow();
  if (win.isVisible()) {
    win.hide();
    return;
  }
  positionWindowUnderTray(win);
  win.show();
  win.focus();
}

let isQuitting = false;

function statusLabel(state: BotStatusPayload): string {
  const { copy } = getUiContext();
  switch (state.status) {
    case "running":
      return copy.status.running;
    case "starting":
      return copy.status.starting;
    case "stopping":
      return copy.status.stopping;
    case "error":
      return `${copy.status.error}: ${state.error ?? ""}`.slice(0, 60);
    case "stopped":
    default:
      return copy.status.stopped;
  }
}

function rebuildTrayMenu(): void {
  if (!tray) return;
  const state = controller.getState();
  const { copy } = getUiContext();
  const menu = Menu.buildFromTemplate([
    { label: `PhoneLocal — ${statusLabel(state)}`, enabled: false },
    { type: "separator" },
    { label: copy.menu.openSettings, click: () => toggleSettingsWindow() },
    {
      label:
        state.status === "running" || state.status === "starting"
          ? copy.buttons.stopBot
          : copy.buttons.startBot,
      click: async () => {
        if (state.status === "running" || state.status === "starting") {
          await controller.stop();
        } else {
          await controller.start(getSettings(), getCurrentLanguage());
        }
      },
    },
    { type: "separator" },
    {
      label: copy.menu.quit,
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(menu);
  tray.setToolTip(`PhoneLocal (${statusLabel(state)})`);
}

function createTray(): void {
  const icon = buildTrayIcon();
  tray = new Tray(icon);
  tray.setTitle(icon.isEmpty() ? "PL" : "");
  tray.on("click", () => toggleSettingsWindow());
  tray.on("right-click", () => {
    tray?.popUpContextMenu();
  });
  rebuildTrayMenu();
}

function applyLoginItem(autoLaunch: boolean): void {
  if (process.platform !== "darwin") return;
  app.setLoginItemSettings({
    openAtLogin: autoLaunch,
    openAsHidden: true,
  });
}

function registerIpc(): void {
  ipcMain.on("app:get-ui-context-sync", (event) => {
    event.returnValue = getUiContext();
  });

  ipcMain.handle("settings:get", () => getSettings());

  ipcMain.handle(
    "settings:update",
    (_evt, patch: Partial<StoredSettings>): StoredSettings => {
      const next = updateSettings(sanitizePatch(patch));
      if (typeof patch.autoLaunch === "boolean") {
        applyLoginItem(next.autoLaunch);
      }
      return next;
    }
  );

  ipcMain.handle("bot:status", () => controller.getState());
  ipcMain.handle("bot:start", async () =>
    controller.start(getSettings(), getCurrentLanguage())
  );
  ipcMain.handle("bot:stop", async () => controller.stop());
  ipcMain.handle("ollama:list-models", async (_evt, host?: string) => {
    const targetHost = typeof host === "string" && host.trim() ? host.trim() : getSettings().ollamaHost;
    return listOllamaModels(targetHost.replace(/\/$/, ""));
  });

  ipcMain.handle("app:open-store-dir", async () => {
    const { getStorePath } = await import("./settings-store.js");
    const p = getStorePath();
    await shell.showItemInFolder(p);
  });
}

function sanitizePatch(patch: Partial<StoredSettings>): Partial<StoredSettings> {
  const out: Partial<StoredSettings> = {};
  if (typeof patch.discordToken === "string") out.discordToken = patch.discordToken.trim();
  if (typeof patch.allowedChannelIds === "string") {
    out.allowedChannelIds = parseCsv(patch.allowedChannelIds);
  } else if (Array.isArray(patch.allowedChannelIds)) {
    out.allowedChannelIds = patch.allowedChannelIds
      .map((value) => String(value).trim())
      .filter((value) => value.length > 0);
  }
  if (typeof patch.ollamaHost === "string") {
    out.ollamaHost = patch.ollamaHost.trim().replace(/\/$/, "");
  }
  if (typeof patch.ollamaModel === "string") out.ollamaModel = patch.ollamaModel.trim();
  if (typeof patch.autoLaunch === "boolean") out.autoLaunch = patch.autoLaunch;
  if (typeof patch.systemPrompt === "string") out.systemPrompt = patch.systemPrompt;
  if (typeof patch.historyTurns === "number" && Number.isFinite(patch.historyTurns)) {
    out.historyTurns = Math.max(1, Math.floor(patch.historyTurns));
  }
  return out;
}

function parseCsv(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function wireControllerEvents(): void {
  controller.on("status", (state: BotStatusPayload) => {
    rebuildTrayMenu();
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.webContents.send("bot:status-changed", state);
    }
  });
}

app.whenReady().then(() => {
  hideDockIfPossible();
  migrateFromDotEnvIfNeeded();
  registerIpc();
  wireControllerEvents();
  createTray();

  const settings = getSettings();
  applyLoginItem(settings.autoLaunch);

  if (settings.discordToken) {
    void controller.start(settings, getCurrentLanguage());
  } else {
    toggleSettingsWindow();
  }
});

app.on("activate", () => {
  if (!showsDockInCurrentMode) {
    return;
  }

  const win = createSettingsWindow();
  if (!win.isVisible()) {
    win.show();
  }
  win.focus();
});

app.on("window-all-closed", () => {
  // Keep running as a menu bar app; do nothing.
});

app.on("before-quit", () => {
  isQuitting = true;
});

app.on("will-quit", async (event) => {
  if (controller.getState().status === "running") {
    event.preventDefault();
    await controller.stop();
    app.quit();
  }
});
