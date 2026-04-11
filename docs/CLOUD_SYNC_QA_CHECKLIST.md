# Cloud Sync QA Checklist

Use this checklist before release when cloud sync logic changes.

## QA Run Metadata
- Release/Branch:
- Build/Commit:
- QA Date:
- QA Owner:
- Device Matrix:
- Notes:

## Preconditions
- Test account A (primary)
- Test account B (secondary)
- Two browsers or devices (Device 1 and Device 2)
- Start each scenario with a known clean state (or document current state)

## 1) Login and Bootstrap
Status:
- Result: `PASS` / `FAIL` / `BLOCKED`
- Tester:
- Date:
- Evidence:

1. On Device 1, open the app signed out.
2. Confirm local mode loads and app is usable.
3. Sign in with account A.
4. Verify sync indicator transitions to synced state.
5. Verify users/credits/wishlist/coasters load without errors.

Expected:
- No hydration warnings or crashes.
- No stuck syncing spinner.
- Active profile is set correctly.

## 2) Logout and Session Clear
Status:
- Result: `PASS` / `FAIL` / `BLOCKED`
- Tester:
- Date:
- Evidence:

1. While signed in, log out.
2. Verify UI returns to signed-out/local mode.
3. Verify in-memory lists clear (users/credits/wishlist).
4. Sign back in and verify cloud state reloads.

Expected:
- Logged-out state is immediate.
- Re-login restores cloud data.

## 3) Offline Local Edit -> Reconnect
Status:
- Result: `PASS` / `FAIL` / `BLOCKED`
- Tester:
- Date:
- Evidence:

1. On Device 1 signed out, create local profile + local credit.
2. Sign in with account A.
3. Wait for migration complete.
4. Verify local keys are cleared in browser storage (`cc_users`, `cc_credits`, `cc_wishlist`, `cc_coasters`).
5. Refresh page and verify migrated data remains from cloud.

Expected:
- Migration success notification.
- No duplicate writes.
- No undefined-field Firestore errors.

## 4) Manual Refresh/Reconnect Behavior
Status:
- Result: `PASS` / `FAIL` / `BLOCKED`
- Tester:
- Date:
- Evidence:

1. While signed in, trigger manual refresh.
2. Disable network briefly, trigger refresh, then restore network.
3. Verify app exits syncing state after error path and resumes after reconnect.

Expected:
- Error path does not leave UI permanently syncing.
- A subsequent refresh recovers.

## 5) Multi-Device Same Account
Status:
- Result: `PASS` / `FAIL` / `BLOCKED`
- Tester:
- Date:
- Evidence:

1. Sign into account A on Device 1 and Device 2.
2. Add credit on Device 1.
3. Confirm it appears on Device 2.
4. Add wishlist item on Device 2.
5. Confirm it appears on Device 1.

Expected:
- Snapshot updates propagate both directions.
- No data loss after page reloads.

## 6) Cross-Account Ownership Guard
Status:
- Result: `PASS` / `FAIL` / `BLOCKED`
- Tester:
- Date:
- Evidence:

1. On Device 1 sign into account A and create new data.
2. On Device 2 sign into account B and attempt restore/migration from a local dataset containing account-A IDs.
3. Verify conflicting entities are not overwritten.

Expected:
- App skips foreign-owned records.
- Migration still completes for safe records.

## 7) Conflict Observation (Manual)
Status:
- Result: `PASS` / `FAIL` / `BLOCKED`
- Tester:
- Date:
- Evidence:

1. On both devices under account A, edit the same field (e.g., notes on same credit) within a short window.
2. Observe final stored value on both devices.
3. Record whether last-write-wins occurred.

Expected:
- Current behavior: last-write-wins unless explicit merge logic is added.
- No document corruption.

## Release Sign-Off
- [ ] All scenarios passed
- [ ] Any known limitations documented
- [ ] Console free of new sync-related errors
- [ ] QA run date and tester names recorded
- Final Approver:
- Approval Date:
