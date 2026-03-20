import { sendSlackAlert } from "./slack";

interface AlertState {
  key: string;
  firstSeen: number;
  lastSent: number;
  suppressedCount: number;
  lastMessage: string;
  resolved: boolean;
  resolvedAt: number | null;
}

interface AlertOptions {
  cooldownMs?: number;
  reminderIntervalMs?: number;
}

interface BatchAlertEntry {
  key: string;
  message: string;
  options?: AlertOptions;
}

const DEFAULT_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes
const DEFAULT_REMINDER_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const RESOLVED_TTL_MS = 60 * 60 * 1000; // 1 hour

export class SlackAlertManager {
  private readonly alerts = new Map<string, AlertState>();
  private readonly webhookUrl: string | null;
  private readonly now: () => number;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(webhookUrl: string | null, options?: { now?: () => number }) {
    this.webhookUrl = webhookUrl;
    this.now = options?.now ?? (() => Date.now());

    if (webhookUrl) {
      this.cleanupTimer = setInterval(
        () => this.cleanup(),
        CLEANUP_INTERVAL_MS,
      );
    }
  }

  async alert(
    key: string,
    message: string,
    options?: AlertOptions,
  ): Promise<void> {
    const now = this.now();
    const cooldownMs = options?.cooldownMs ?? DEFAULT_COOLDOWN_MS;
    const reminderIntervalMs =
      options?.reminderIntervalMs ?? DEFAULT_REMINDER_INTERVAL_MS;

    const existing = this.alerts.get(key);

    if (!existing) {
      // First occurrence — send immediately
      const sent = await sendSlackAlert(message, this.webhookUrl);
      if (sent) {
        this.alerts.set(key, {
          key,
          firstSeen: now,
          lastSent: now,
          suppressedCount: 0,
          lastMessage: message,
          resolved: false,
          resolvedAt: null,
        });
      }
      return;
    }

    // Alert was previously resolved — treat as new
    if (existing.resolved) {
      const sent = await sendSlackAlert(message, this.webhookUrl);
      if (sent) {
        existing.firstSeen = now;
        existing.lastSent = now;
        existing.suppressedCount = 0;
        existing.lastMessage = message;
        existing.resolved = false;
        existing.resolvedAt = null;
      }
      return;
    }

    const sinceLastSent = now - existing.lastSent;

    // Check if reminder is due
    if (sinceLastSent >= reminderIntervalMs) {
      const count = existing.suppressedCount + 1;
      const durationMin = Math.round((now - existing.firstSeen) / 60_000);
      const reminder = `[Ongoing] ${message} (${count} occurrences in the last ${durationMin} min)`;
      const sent = await sendSlackAlert(reminder, this.webhookUrl);
      if (sent) {
        existing.lastSent = now;
        existing.suppressedCount = 0;
        existing.lastMessage = message;
      }
      return;
    }

    // Within cooldown — suppress
    if (sinceLastSent < cooldownMs) {
      existing.suppressedCount++;
      existing.lastMessage = message;
      return;
    }

    // Past cooldown but before reminder — still suppress, count
    existing.suppressedCount++;
    existing.lastMessage = message;
  }

  resolve(key: string): void {
    const existing = this.alerts.get(key);
    if (!existing || existing.resolved) {
      return;
    }

    existing.resolved = true;
    existing.resolvedAt = this.now();
  }

  async sendResolvedBatch(resolvedKeys: string[]): Promise<void> {
    if (resolvedKeys.length === 0) {
      return;
    }

    const resolvedEntries: string[] = [];
    const resolvedAlertKeys: string[] = [];
    for (const key of resolvedKeys) {
      const state = this.alerts.get(key);
      if (state?.resolved) {
        resolvedEntries.push(state.lastMessage);
        resolvedAlertKeys.push(key);
      }
    }

    let sent = false;
    if (resolvedEntries.length === 1) {
      sent = await sendSlackAlert(
        `[Resolved] ${resolvedEntries[0]}`,
        this.webhookUrl,
      );
    } else if (resolvedEntries.length > 1) {
      const body = resolvedEntries.map((m) => `  • ${m}`).join("\n");
      sent = await sendSlackAlert(
        `[Resolved] ${resolvedEntries.length} alerts resolved:\n${body}`,
        this.webhookUrl,
      );
    }

    // Clear resolved entries after successful send to prevent repeated notifications
    if (sent) {
      for (const key of resolvedAlertKeys) {
        this.alerts.delete(key);
      }
    }
  }

  async batchAlert(entries: BatchAlertEntry[]): Promise<void> {
    const toSend: string[] = [];
    const pendingNew: BatchAlertEntry[] = [];
    const pendingReminder: { entry: BatchAlertEntry; now: number }[] = [];

    for (const entry of entries) {
      const now = this.now();
      const reminderIntervalMs =
        entry.options?.reminderIntervalMs ?? DEFAULT_REMINDER_INTERVAL_MS;

      const existing = this.alerts.get(entry.key);

      if (!existing || existing.resolved) {
        // New or re-fired after resolution — defer state write until send succeeds
        pendingNew.push(entry);
        toSend.push(entry.message);
        continue;
      }

      const sinceLastSent = now - existing.lastSent;

      if (sinceLastSent >= reminderIntervalMs) {
        const count = existing.suppressedCount + 1;
        const durationMin = Math.round((now - existing.firstSeen) / 60_000);
        toSend.push(
          `[Ongoing] ${entry.message} (${count} occurrences in the last ${durationMin} min)`,
        );
        pendingReminder.push({ entry, now });
      } else {
        existing.suppressedCount++;
        existing.lastMessage = entry.message;
      }
    }

    if (toSend.length === 0) {
      return;
    }

    let sent = false;
    if (toSend.length === 1) {
      sent = await sendSlackAlert(toSend[0], this.webhookUrl);
    } else {
      const body = toSend.map((m) => `  • ${m}`).join("\n");
      sent = await sendSlackAlert(
        `[KS Node Alert] ${toSend.length} issues detected:\n${body}`,
        this.webhookUrl,
      );
    }

    if (sent) {
      const now = this.now();
      for (const entry of pendingNew) {
        this.alerts.set(entry.key, {
          key: entry.key,
          firstSeen: now,
          lastSent: now,
          suppressedCount: 0,
          lastMessage: entry.message,
          resolved: false,
          resolvedAt: null,
        });
      }
      for (const { entry, now: ts } of pendingReminder) {
        const existing = this.alerts.get(entry.key);
        if (existing) {
          existing.lastSent = ts;
          existing.suppressedCount = 0;
          existing.lastMessage = entry.message;
        }
      }
    }
  }

  private cleanup(): void {
    const now = this.now();
    for (const [key, state] of this.alerts) {
      if (state.resolved && state.resolvedAt) {
        if (now - state.resolvedAt > RESOLVED_TTL_MS) {
          this.alerts.delete(key);
        }
      }
    }
  }

  dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}
