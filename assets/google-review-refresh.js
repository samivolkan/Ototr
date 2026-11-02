(function () {
  'use strict';

  // Refreshing and verification never publish. The separate preparation hook
  // creates drafts only. Loading this asset twice must not add timers.
  if (window.OTOTRGoogleReviewRefresh) return;
  // The timer is intentionally lightweight: the UI keeps the last good cache
  // visible, while reviews are checked every five minutes and the approval
  // queue every minute. Errors back off to fifteen minutes rather than making
  // the user wait an hour for a transient Google/API failure.
  const POLL_MS = 60 * 1000, REVIEW_MS = 5 * 60 * 1000, MAX_BACKOFF_MS = 15 * 60 * 1000;
  const jobs = {
    reviews: { interval: REVIEW_MS, due: 0, failures: 0, seenSuccess: 0, lastConnected: null },
    workflow: { interval: POLL_MS, due: 0, failures: 0, seenSuccess: 0 },
  };
  let running = false;

  function allowed() {
    if (location.hash !== '#google-reviews' || document.visibilityState === 'hidden' || navigator.onLine === false) return false;
    if (document.documentElement.classList.contains('ototr-access-locked')) return false;
    if (document.getElementById('googleReviewAiModal')?.classList.contains('open')) return false;
    const reviews = window.OTOTRGoogleReputation, ai = window.OTOTRGoogleReviewAI;
    return Boolean(reviews?.syncAllGoogleReviews && reviews.getRefreshState && ai?.refreshWorkflow && ai.getRefreshState &&
      !reviews.getRefreshState().busy && !ai.getRefreshState().busy);
  }

  function observeSuccess(job, status) {
    const timestamp = Number(status.lastSuccessAt) || 0;
    if (timestamp > job.seenSuccess) {
      job.seenSuccess = timestamp;
      job.failures = 0;
      job.due = timestamp + job.interval;
    }
  }

  async function run(job, request) {
    let success = false;
    try {
      const result = await request();
      if (result?.skipped) return;
      success = result?.ok === true || (result?.syncedBranches > 0 && !result?.missing?.length);
    } catch (_) {
      // Existing APIs retain errors in their panels. An unexpected rejection
      // must also back off, without creating an unhandled interval promise.
    }
    job.failures = success ? 0 : Math.min(job.failures + 1, 10);
    job.due = Date.now() + (success ? job.interval : Math.min(MAX_BACKOFF_MS, job.interval * 2 ** (job.failures - 1)));
  }

  async function check() {
    if (running || !allowed()) return;
    running = true;
    try {
      observeSuccess(jobs.reviews, window.OTOTRGoogleReputation.getRefreshState());
      const connectionState = window.OTOTRGoogleReputation.getRefreshState();
      // A failed unauthenticated first check can schedule a long backoff. Once
      // OAuth becomes available, immediately retry once so cached data can be
      // refreshed without waiting for the hourly timer.
      if (connectionState.connected === true && jobs.reviews.failures > 0 && jobs.reviews.lastConnected !== true) jobs.reviews.due = Date.now();
      jobs.reviews.lastConnected = connectionState.connected;
      observeSuccess(jobs.workflow, window.OTOTRGoogleReviewAI.getRefreshState());
      if (Date.now() >= jobs.reviews.due) {
        await run(jobs.reviews, () => window.OTOTRGoogleReputation.syncAllGoogleReviews({ quiet: true }));
        observeSuccess(jobs.reviews, window.OTOTRGoogleReputation.getRefreshState());
      }
      // The user can leave this page or open the editor while sync is in flight.
      if (!allowed()) return;
      observeSuccess(jobs.workflow, window.OTOTRGoogleReviewAI.getRefreshState());
      if (Date.now() >= jobs.workflow.due) {
        await run(jobs.workflow, () => window.OTOTRGoogleReviewAI.refreshWorkflow());
        observeSuccess(jobs.workflow, window.OTOTRGoogleReviewAI.getRefreshState());
      }
      if (allowed()) await window.OTOTRGoogleReviewAI.verifyPendingReply?.();
      if (allowed()) window.OTOTRGoogleReviewAI.preparePendingDrafts?.();
    } finally { running = false; }
  }

  window.OTOTRGoogleReviewRefresh = Object.freeze({ check });
  window.addEventListener('hashchange', check);
  window.addEventListener('online', check);
  window.addEventListener('focus', check);
  document.addEventListener('visibilitychange', check);
  setInterval(check, POLL_MS);
  setTimeout(check, 0);
})();
