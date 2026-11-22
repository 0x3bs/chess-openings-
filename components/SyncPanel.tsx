"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import {
  clearSyncCode,
  connectSyncProfile,
  createSyncProfile,
  databaseConfigured,
  deleteRemoteProfile,
  formatSyncCode,
  getSyncCode,
  normalizeSyncCode,
} from "@/lib/db/progress";

type Message = { kind: "ok" | "error"; text: string };

export function SyncPanel() {
  const { m } = useI18n();
  const [ready, setReady] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  useEffect(() => {
    setConfigured(databaseConfigured());
    setCode(getSyncCode());
    setReady(true);
  }, []);

  if (!ready) return null;

  if (!configured) {
    return (
      <section className="sync-panel" id="sync">
        <div className="sync-panel-head">
          <p className="eyebrow">{m.sync.eyebrow}</p>
          <h2>{m.sync.setupTitle}</h2>
          <p>{m.sync.setupText}</p>
        </div>
      </section>
    );
  }

  async function create() {
    setBusy(true);
    setMessage(null);
    try {
      await createSyncProfile();
      window.location.reload();
    } catch {
      setMessage({ kind: "error", text: m.sync.errorGeneric });
      setBusy(false);
    }
  }

  async function connect(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    try {
      if (normalizeSyncCode(input).length !== 20) {
        setMessage({ kind: "error", text: m.sync.errorInvalid });
        return;
      }
      await connectSyncProfile(input);
      window.location.reload();
    } catch (error) {
      const text = error instanceof Error ? error.message : "";
      setMessage({
        kind: "error",
        text: text.includes("No profile")
          ? m.sync.errorNotFound
          : m.sync.errorInvalid,
      });
      setBusy(false);
    }
  }

  async function copy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(formatSyncCode(code));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard access can be blocked; the code is still visible.
    }
  }

  function disconnect() {
    clearSyncCode();
    window.location.reload();
  }

  async function remove() {
    if (!window.confirm(m.sync.deleteConfirm)) return;
    setBusy(true);
    try {
      await deleteRemoteProfile();
      clearSyncCode();
      window.location.reload();
    } catch {
      setMessage({ kind: "error", text: m.sync.errorGeneric });
      setBusy(false);
    }
  }

  return (
    <section className="sync-panel" id="sync">
      <div className="sync-panel-head">
        <p className="eyebrow">{m.sync.eyebrow}</p>
        <h2>{m.sync.title}</h2>
        <p>{m.sync.lead}</p>
      </div>

      {code ? (
        <div className="sync-code-box">
          <span className="sync-code-label">{m.sync.codeLabel}</span>
          <code>{formatSyncCode(code)}</code>
          <div className="sync-actions">
            <button type="button" className="btn btn-primary" onClick={copy}>
              {copied ? m.sync.copied : m.sync.copy}
            </button>
            <button type="button" className="btn btn-ghost" onClick={disconnect}>
              {m.sync.disconnect}
            </button>
          </div>
          <p className="sync-hint">{m.sync.disconnectHint}</p>
        </div>
      ) : (
        <div className="sync-connect">
          <div className="sync-connect-card">
            <h3>{m.sync.noCodeTitle}</h3>
            <p>{m.sync.noCodeText}</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void create()}
              disabled={busy}
            >
              {busy ? m.sync.creating : m.sync.create}
            </button>
          </div>

          <form className="sync-connect-card" onSubmit={connect}>
            <h3>{m.sync.connectTitle}</h3>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={m.sync.connectPlaceholder}
              aria-label={m.sync.connectTitle}
              autoComplete="off"
              spellCheck={false}
            />
            <button type="submit" className="btn btn-ghost" disabled={busy}>
              {busy ? m.sync.connecting : m.sync.connect}
            </button>
          </form>
        </div>
      )}

      {message ? (
        <p className={`sync-message is-${message.kind}`}>{message.text}</p>
      ) : null}

      {code ? (
        <div className="sync-danger">
          <div>
            <h3>{m.sync.deleteTitle}</h3>
            <p>{m.sync.deleteText}</p>
          </div>
          <button
            type="button"
            className="danger-btn"
            onClick={() => void remove()}
            disabled={busy}
          >
            {m.sync.delete}
          </button>
        </div>
      ) : null}
    </section>
  );
}
