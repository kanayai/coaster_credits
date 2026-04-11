# Cloud Sync QA Checklist (Compact)

## QA Run Metadata
| Field | Value |
| --- | --- |
| Release/Branch | `main` |
| Build/Commit | Working tree (uncommitted) |
| QA Date | 2026-04-11 |
| QA Owner | Codex (automated pass) |
| Device Matrix | Single local environment |
| Notes | Automated scenarios complete; manual multi-device checks pending |

## Scenario Matrix
| # | Scenario | Result (`PASS` / `FAIL` / `BLOCKED`) | Tester | Date | Evidence | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Login and Bootstrap | PASS | Codex | 2026-04-11 | `tests/appLifecycle.sync-qa.test.ts` | Automated coverage |
| 2 | Logout and Session Clear | PASS | Codex | 2026-04-11 | `tests/appLifecycle.sync-qa.test.ts` | Automated coverage |
| 3 | Offline Local Edit -> Reconnect | PASS | Codex | 2026-04-11 | `tests/appLifecycle.sync-qa.test.ts` | Automated coverage |
| 4 | Manual Refresh/Reconnect Behavior | PASS | Codex | 2026-04-11 | `tests/appLifecycle.sync-qa.test.ts` | Automated reconnect/error-path coverage |
| 5 | Multi-Device Same Account | BLOCKED | Codex | 2026-04-11 | N/A | Requires two real devices/accounts in manual QA |
| 6 | Cross-Account Ownership Guard | PASS | Codex | 2026-04-11 | `tests/dataManagement.migration-conflict-qa.test.ts` | Automated ownership-conflict guard |
| 7 | Conflict Observation (Manual) | BLOCKED | Codex | 2026-04-11 | N/A | Requires concurrent manual edits on two devices |

## Scenario Steps and Expected Results

### 1) Login and Bootstrap
Steps:
1. On Device 1, open the app signed out.
2. Confirm local mode loads and app is usable.
3. Sign in with account A.
4. Verify sync indicator transitions to synced state.
5. Verify users/credits/wishlist/coasters load without errors.

Expected:
- No hydration warnings or crashes.
- No stuck syncing spinner.
- Active profile is set correctly.

### 2) Logout and Session Clear
Steps:
1. While signed in, log out.
2. Verify UI returns to signed-out/local mode.
3. Verify in-memory lists clear (users/credits/wishlist).
4. Sign back in and verify cloud state reloads.

Expected:
- Logged-out state is immediate.
- Re-login restores cloud data.

### 3) Offline Local Edit -> Reconnect
Steps:
1. On Device 1 signed out, create local profile + local credit.
2. Sign in with account A.
3. Wait for migration complete.
4. Verify local keys are cleared in browser storage (`cc_users`, `cc_credits`, `cc_wishlist`, `cc_coasters`).
5. Refresh page and verify migrated data remains from cloud.

Expected:
- Migration success notification.
- No duplicate writes.
- No undefined-field Firestore errors.

### 4) Manual Refresh/Reconnect Behavior
Steps:
1. While signed in, trigger manual refresh.
2. Disable network briefly, trigger refresh, then restore network.
3. Verify app exits syncing state after error path and resumes after reconnect.

Expected:
- Error path does not leave UI permanently syncing.
- A subsequent refresh recovers.

### 5) Multi-Device Same Account
Steps:
1. Sign into account A on Device 1 and Device 2.
2. Add credit on Device 1.
3. Confirm it appears on Device 2.
4. Add wishlist item on Device 2.
5. Confirm it appears on Device 1.

Expected:
- Snapshot updates propagate both directions.
- No data loss after page reloads.

### 6) Cross-Account Ownership Guard
Steps:
1. On Device 1 sign into account A and create new data.
2. On Device 2 sign into account B and attempt restore/migration from a local dataset containing account-A IDs.
3. Verify conflicting entities are not overwritten.

Expected:
- App skips foreign-owned records.
- Migration still completes for safe records.

### 7) Conflict Observation (Manual)
Steps:
1. On both devices under account A, edit the same field (e.g., notes on same credit) within a short window.
2. Observe final stored value on both devices.
3. Record whether last-write-wins occurred.

Expected:
- Current behavior: last-write-wins unless explicit merge logic is added.
- No document corruption.

## Manual Multi-Device Run Log

### Scenario 5 Log (Multi-Device Same Account)
| Field | Value |
| --- | --- |
| Device 1 |  |
| Device 2 |  |
| Account Used |  |
| Start Time |  |
| End Time |  |
| Result | `PASS` / `FAIL` / `BLOCKED` |
| Evidence Links |  |
| Observed Issues |  |
| Follow-up Ticket |  |

### Scenario 7 Log (Conflict Observation)
| Field | Value |
| --- | --- |
| Device 1 |  |
| Device 2 |  |
| Entity Edited (credit/wishlist/etc.) |  |
| Field Edited |  |
| Edit Timestamp (Device 1) |  |
| Edit Timestamp (Device 2) |  |
| Final Stored Value |  |
| Expected Behavior | Last-write-wins (current) |
| Result | `PASS` / `FAIL` / `BLOCKED` |
| Evidence Links |  |
| Observed Issues |  |
| Follow-up Ticket |  |

## Release Sign-Off
| Check | Status |
| --- | --- |
| All scenarios passed | ☐ |
| Known limitations documented | ☑ |
| Console free of new sync-related errors | ☑ |
| QA run date and tester names recorded | ☑ |

| Field | Value |
| --- | --- |
| Final Approver |  |
| Approval Date |  |
