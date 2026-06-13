import React, { useState } from 'react';
import { Compass, Copy, Check } from 'lucide-react';

interface Props {
  /** Tighter spacing/typography for the small Dashboard card. */
  compact?: boolean;
}

/**
 * Single source of truth for the "sign in from Safari, not the Home Screen app"
 * explanation. Used in both the Dashboard sign-in prompt and the Profile manager
 * so the wording can never drift between the two places again.
 *
 * Google OAuth is intentionally blocked in iOS standalone (Home Screen) mode
 * because it triggered `403 disallowed_useragent`. The user signs in once in
 * Safari, then uses the installed app for everything else.
 */
const StandaloneSignInNotice: React.FC<Props> = ({ compact = false }) => {
  const [copied, setCopied] = useState(false);

  const openInSafari = async () => {
    const url = window.location.origin;
    // Primary path: on iOS a standalone PWA hands window.open() off to Safari.
    const opened = window.open(url, '_blank');
    // Fallback: if the browser blocked the popup, copy the URL so the user can
    // paste it into Safari manually instead of being stuck.
    if (!opened) {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch {
        /* clipboard unavailable — nothing more we can do silently */
      }
    }
  };

  const text = compact ? 'text-[10px]' : 'text-[11px]';

  return (
    <div
      className={`rounded-2xl bg-amber-500/10 border border-amber-500/20 text-left space-y-2 ${
        compact ? 'p-3' : 'p-4'
      }`}
    >
      <p className={`${compact ? 'text-[10px]' : 'text-xs'} text-amber-200 leading-relaxed font-bold`}>
        Sign in from Safari, not the Home Screen app
      </p>
      <ul className={`${text} text-amber-300/90 leading-relaxed list-disc pl-4 space-y-1`}>
        <li>Safari is only needed for the one-time login.</li>
        <li>After signing in, return here — the Home Screen app is for daily use.</li>
        <li>Safari does not need to stay open afterwards.</li>
        <li>If you sign out or your session expires, sign in again in Safari.</li>
      </ul>
      <button
        type="button"
        onClick={openInSafari}
        className="mt-1 w-full flex items-center justify-center gap-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-100 text-[10px] font-black uppercase tracking-widest py-2 rounded-lg transition-all border border-amber-500/30 active:scale-95"
      >
        {copied ? (
          <>
            <Check size={12} /> Link copied — paste in Safari
          </>
        ) : (
          <>
            <Compass size={12} /> Open in Safari
          </>
        )}
      </button>
    </div>
  );
};

export default StandaloneSignInNotice;
