"use client";

import { useEffect, useState } from "react";
import { LocaleLink as Link } from "./LocaleLink";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { hasSyncCode } from "@/lib/db/progress";

/** Shown on a course when progress cannot be persisted yet. */
export function SyncNotice() {
  const { m } = useI18n();
  const [ready, setReady] = useState(false);
  const [hasCode, setHasCode] = useState(true);

  useEffect(() => {
    setHasCode(hasSyncCode());
    setReady(true);
  }, []);

  if (!ready || hasCode) return null;

  return (
    <div className="sync-notice" role="status">
      <span>{m.sync.notSaved}</span>
      <Link href="/progress#sync">{m.sync.openDashboard}</Link>
    </div>
  );
}
