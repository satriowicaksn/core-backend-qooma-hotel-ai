// Known feature flag names + FLAG_MIN_TIER map. Spec §1.8:262 says "19 flags
// total" but explicit enumeration (§1.8:265-269) is 14. The remaining 5 are
// in the FE fixtures file (`src/mocks/fixtures/feature-flags.ts` in FE repo,
// not accessible here). Q-T26-#7 escalates to PARENT §3a for PO to publish
// the authoritative 19-name list + per-flag `min_tier` map.
//
// PM ACK tightening #4: `FLAG_MIN_TIER` is structural placeholder only —
// all values null slice-1. Do NOT invent values (would ship misleading UX
// data + silently regress when PO ratifies the real map).

import type { TierName } from '../billing/index.js';

export const KNOWN_FLAGS = [
  // Core
  'multi_language',
  'vip_profile',
  'privacy_mode',
  'outbound_quota_alerts',
  // Channels
  'menu_ordering',
  'wa_templates',
  'voice_groundwork',
  // AI
  'sentiment_detection',
  'butler_anticipate',
  'loyalty_integration',
  'compensation_auto',
  'post_stay_relationship',
  // Verification
  'pending_verification',
  'failed_verification_alert',
] as const;

export type KnownFlag = (typeof KNOWN_FLAGS)[number];

export const KNOWN_FLAGS_SET: ReadonlySet<string> = new Set(KNOWN_FLAGS);

// Structural placeholder — all values null slice-1 pending PO ratify at Q-T26-#7.
export const FLAG_MIN_TIER: Readonly<Record<KnownFlag, TierName | null>> = {
  multi_language: null,
  vip_profile: null,
  privacy_mode: null,
  outbound_quota_alerts: null,
  menu_ordering: null,
  wa_templates: null,
  voice_groundwork: null,
  sentiment_detection: null,
  butler_anticipate: null,
  loyalty_integration: null,
  compensation_auto: null,
  post_stay_relationship: null,
  pending_verification: null,
  failed_verification_alert: null,
};
