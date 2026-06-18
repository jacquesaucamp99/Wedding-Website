(function () {
  // Wedding timeline (all in South African Standard Time - UTC+2)
  const oneWeekBeforeCeremony = new Date(2027, 2, 20, 16, 0, 0); // 20 March 2027, 4:00 PM (1 week before)
  const ceremonyTime = new Date(2027, 2, 27, 16, 0, 0); // 27 March 2027, 4:00 PM
  const morningAfterTime = new Date(2027, 2, 28, 8, 30, 0); // 28 March 2027, 8:30 AM

  // Helper: choose the first visible element for a given selector (handles cloned overlays)
  function firstVisible(selector) {
    const nodes = Array.from(document.querySelectorAll(selector));
    for (const n of nodes) {
      try {
        const style = window.getComputedStyle(n);
        if (style && style.display !== 'none' && style.visibility !== 'hidden' && n.offsetParent !== null) return n;
      } catch (e) {
        // ignore and continue
      }
    }
    return nodes[0] || null;
  }

  function formatCountdown(targetTime) {
    const now = new Date();
    const diff = targetTime - now;

    if (diff <= 0) {
      return null; // Event has passed
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else {
      return `${minutes}m ${seconds}s`;
    }
  }

  function updateHashtags() {
    const now = new Date();
    let activePhase = 1; // Default to phase 1

    // Determine which phase we're in
    if (now >= morningAfterTime) {
      activePhase = 4;
    } else if (now >= ceremonyTime) {
      activePhase = 3;
    } else if (now >= oneWeekBeforeCeremony) {
      activePhase = 2;
    }

    // Find the visible elements for hashtags and countdowns (handles clones/injected mobile overlays)
    const hashtagAmper = firstVisible('#hashtag-amper');
    const hashtagAmptelik = firstVisible('#hashtag-amptelik');
    const hashtagAltyd = firstVisible('#hashtag-altyd');
    const countdownAmper = firstVisible('#countdown-amper');
    const countdownCeremony = firstVisible('#countdown-ceremony');
    const countdownAltyd = firstVisible('#countdown-altyd');

    // If hashtags aren't present yet, skip (will retry on next interval)
    if (!hashtagAmper && !hashtagAmptelik && !hashtagAltyd) return;

    // Reset all hashtags to greyed out where elements exist
    [hashtagAmper, hashtagAmptelik, hashtagAltyd].forEach(h => { if (h) h.classList.add('greyed-out'); });

    // Update countdown displays if elements found
    const countdownAmpValue = formatCountdown(oneWeekBeforeCeremony);
    const countdownCeremonyValue = formatCountdown(ceremonyTime);
    const countdownAltydValue = formatCountdown(morningAfterTime);

    if (countdownAmper) countdownAmper.textContent = countdownAmpValue || '';
    if (countdownCeremony) countdownCeremony.textContent = countdownCeremonyValue || '';
    if (countdownAltyd) countdownAltyd.textContent = countdownAltydValue || '';

    // Set active phase based on current time
    switch (activePhase) {
      case 1:
        if (hashtagAmper) hashtagAmper.classList.remove('greyed-out');
        break;
      case 2:
        if (hashtagAmptelik) hashtagAmptelik.classList.remove('greyed-out');
        break;
      case 3:
      case 4:
        if (hashtagAltyd) hashtagAltyd.classList.remove('greyed-out');
        break;
    }
  }

  // Run immediately and then every second
  updateHashtags();
  setInterval(updateHashtags, 1000);
})();
