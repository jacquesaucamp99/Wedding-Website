(function () {
  // Wedding timeline (all in South African Standard Time - UTC+2)
  const oneWeekBeforeCeremony = new Date(2027, 2, 20, 16, 0, 0); // 20 March 2027, 4:00 PM (1 week before)
  const ceremonyTime = new Date(2027, 2, 27, 16, 0, 0); // 27 March 2027, 4:00 PM
  const morningAfterTime = new Date(2027, 2, 28, 8, 30, 0); // 28 March 2027, 8:30 AM

  // Get DOM elements
  const hashtagAmper = document.getElementById('hashtag-amper');
  const hashtagAmptelik = document.getElementById('hashtag-amptelik');
  const hashtagAltyd = document.getElementById('hashtag-altyd');
  const countdownAmper = document.getElementById('countdown-amper');
  const countdownCeremony = document.getElementById('countdown-ceremony');
  const countdownAltyd = document.getElementById('countdown-altyd');

  if (!hashtagAmper || !hashtagAmptelik || !hashtagAltyd) return;

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

    // Reset all hashtags to greyed out
    hashtagAmper.classList.add('greyed-out');
    hashtagAmptelik.classList.add('greyed-out');
    hashtagAltyd.classList.add('greyed-out');

    // Update countdown displays
    const countdownAmpValue = formatCountdown(oneWeekBeforeCeremony);
    const countdownCeremonyValue = formatCountdown(ceremonyTime);
    const countdownAltydValue = formatCountdown(morningAfterTime);

    if (countdownAmpValue) {
      countdownAmper.textContent = countdownAmpValue;
    } else {
      countdownAmper.textContent = '';
    }

    if (countdownCeremonyValue) {
      countdownCeremony.textContent = countdownCeremonyValue;
    } else {
      countdownCeremony.textContent = '';
    }

    if (countdownAltydValue) {
      countdownAltyd.textContent = countdownAltydValue;
    } else {
      countdownAltyd.textContent = '';
    }

    // Set active phase based on current time
    switch (activePhase) {
      case 1:
        // Before one week before: AmperAucamp is active
        hashtagAmper.classList.remove('greyed-out');
        break;
      case 2:
        // Between one week before and ceremony: AmptelikAucamp is active
        hashtagAmptelik.classList.remove('greyed-out');
        break;
      case 3:
        // Between ceremony and morning after: AltydAucamp is active
        hashtagAltyd.classList.remove('greyed-out');
        break;
      case 4:
        // After morning after: AltydAucamp remains active
        hashtagAltyd.classList.remove('greyed-out');
        break;
    }
  }

  // Initial update
  updateHashtags();

  // Update every second
  setInterval(updateHashtags, 1000);
})();
