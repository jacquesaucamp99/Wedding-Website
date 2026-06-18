(function () {
  const form = document.getElementById('rsvpForm');
  if (!form) return;

  const steps = Array.from(form.querySelectorAll('[data-step]'));
  const backButton = document.getElementById('backButton');
  const nextButton = document.getElementById('nextButton');
  const submitButton = document.getElementById('submitButton');
  const progressLabel = document.getElementById('progressLabel');
  const progressBar = document.getElementById('progressBar');
  const formError = document.getElementById('formError');
  const partyRsvps = document.getElementById('partyRsvps');
  const partySize = document.getElementById('partySize');
  const successPanel = document.getElementById('rsvpSuccess');
  const successMessage = document.getElementById('successMessage');
  const declineStep = form.querySelector('[data-decline-step]');
  const completedGuests = [];
  let currentStep = 0;
  let partyTotalExpected = 1;
  let partyLeaderName = '';

  function isDeclining() {
    const attendance = form.querySelector('input[name="attendance"]:checked');
    return attendance && attendance.value === 'No, I cannot attend';
  }

  function getStepRoute() {
    return steps.filter(step => {
      if (step.hasAttribute('data-decline-step')) return isDeclining();
      // always show the party-size question for the first guest (only if attending)
      if (step.hasAttribute('data-party-size-step')) return completedGuests.length === 0 && !isDeclining();
      // show the add-another/person field only for the first guest AND when party total > 1
      if (step.hasAttribute('data-party-step')) {
        // must be attending to show this step
        if (isDeclining()) return false;
        const partyTotalInput = form.querySelector('input[name="party-total"]');
        const total = partyTotalInput ? Math.max(1, parseInt(partyTotalInput.value, 10) || 1) : partyTotalExpected;
        return completedGuests.length === 0 && total > 1;
      }
      if (step.hasAttribute('data-attending-step')) return !isDeclining();
      return true;
    });
  }

  function updateStep() {
    const route = getStepRoute();

    // If the currentStep is not visible in the route (because it's conditionally hidden),
    // move the currentStep to the first visible step.
    if (!route.includes(steps[currentStep])) {
      currentStep = steps.indexOf(route[0]);
    }

    steps.forEach((step, index) => {
      const visible = route.includes(step);
      const active = step === steps[currentStep];
      step.classList.toggle('is-active', active);
      step.classList.toggle('is-hidden', !visible);
      step.setAttribute('aria-hidden', active ? 'false' : 'true');
    });

    const routeIndex = route.indexOf(steps[currentStep]);
    const isFirst = routeIndex === 0;
    const isLast = routeIndex === route.length - 1;
    backButton.style.display = isFirst ? 'none' : 'inline-block';
    nextButton.style.display = isLast ? 'none' : 'inline-block';
    submitButton.style.display = isLast ? 'inline-block' : 'none';
    // adjust submit button label and final-question text based on party flow
    const lastStep = route[route.length - 1];
    if (isLast) {
      // read current party total if present
      const partyTotalInput = form.querySelector('input[name="party-total"]');
      const total = partyTotalInput ? Math.max(1, parseInt(partyTotalInput.value, 10) || 1) : partyTotalExpected;
      // remaining includes the current guest being filled
      const remaining = Math.max(1, total - completedGuests.length);
      // if more than one remaining, show continue; if this is the last person (remaining === 1), show submit
      if (total > 1 && remaining > 1) {
        submitButton.textContent = 'Gaan voort';
        // change last step legend or question if available
        const legend = lastStep && lastStep.querySelector('legend');
        if (legend) legend.textContent = 'RSVP Vir die volgende persoon';
      } else {
        submitButton.textContent = 'Stuur RSVP';
        const legend = lastStep && lastStep.querySelector('legend');
        if (legend) legend.textContent = 'Voltooi RSVP?';
      }
    }
    progressLabel.textContent = `Gas ${completedGuests.length + 1} · Vraag ${routeIndex + 1} of ${route.length}`;
    progressBar.style.width = `${((routeIndex + 1) / route.length) * 100}%`;
    formError.textContent = '';

    const firstControl = steps[currentStep].querySelector('input, select, textarea');
    if (firstControl && currentStep > 0) firstControl.focus({ preventScroll: true });
  }

  function validateCurrentStep() {
    const requiredControls = Array.from(steps[currentStep].querySelectorAll('[required]'));
    const invalidControl = requiredControls.find(control => !control.checkValidity());

    if (!invalidControl) return true;

    if (invalidControl.type === 'radio') {
      formError.textContent = 'Kies asseblief ’n opsie voordat jy voortgaan.';
    } else {
      invalidControl.reportValidity();
      formError.textContent = 'Voltooi asseblief hierdie vraag voordat jy verder gaan.';
      invalidControl.focus();
    }
    return false;
  }

  function collectGuestAnswers() {
    const guest = {};
    const controls = Array.from(form.elements).filter(control => {
      return control.name &&
        control.name !== 'form-name' &&
        control.name !== 'party-rsvps' &&
        control.name !== 'party-size' &&
        control.name !== 'add-another-person' &&
        !control.disabled;
    });

    controls.forEach(control => {
      if ((control.type === 'radio' || control.type === 'checkbox') && !control.checked) return;

      if (control.type === 'checkbox') {
        if (!guest[control.name]) guest[control.name] = [];
        guest[control.name].push(control.value);
        return;
      }

      guest[control.name] = control.value;
    });

    return guest;
  }

  function startNextGuest() {
    // Reset most fields but preserve the party size and leader info if present
    const partyTotalInput = form.querySelector('input[name="party-total"]');
    const keepPartyValue = partyTotalInput ? partyTotalInput.value : '';
    form.reset();
    if (partyTotalInput && keepPartyValue) partyTotalInput.value = keepPartyValue;
    // Hide any previously selected radio/choices and reset navigation to the first visible step
    submitButton.textContent = 'Gaan voort';
    // Move to first visible step
    const route = getStepRoute();
    currentStep = steps.indexOf(route[0]);
    updateStep();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submitGuestToNetlify(guest, index) {
    const params = new URLSearchParams();
    params.append('form-name', 'wedding-rsvp');
    // party metadata
    params.append('party', partyLeaderName || guest.name || '');
    params.append('party-guest', `${index} of ${partyTotalExpected}`);
    params.append('party-size', String(partyTotalExpected));

    // include all guest fields clearly so Netlify receives them
    Object.keys(guest).forEach(key => {
      // add a generic key and a unique per-guest key
      params.append(key, guest[key] || '');
      params.append(`guest_${index}_${key}`, guest[key] || '');
    });

    // include honeypot if present
    const honeypot = form.querySelector('input[name="bot-field"]');
    if (honeypot) params.append('bot-field', honeypot.value || '');

    const resp = await fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    if (!resp.ok) throw new Error(`Submission failed with status ${resp.status}`);
    return resp;
  }

  function encodeFormData() {
    return new URLSearchParams(new FormData(form)).toString();
  }

  function showSuccess(isLocalPreview) {
    progressLabel.parentElement.hidden = true;
    form.hidden = true;
    successPanel.hidden = false;

    if (isLocalPreview) {
      successMessage.textContent = completedGuests.length === 1
        ? 'Plaaslike toets voltooi. Geen RSVP is gestuur nie; dit sal eers op Netlify ingedien word.'
        : `Plaaslike toets vir ${completedGuests.length} mense voltooi. Geen RSVPs is gestuur nie; dit sal eers op Netlify ingedien word.`;
      return;
    }

    successMessage.textContent = completedGuests.length === 1
      ? 'Jou RSVP is suksesvol ingedien.'
      : `Julle ${completedGuests.length} RSVPs is suksesvol ingedien.`;
  }

  form.querySelectorAll('input[name="add-another-person"]').forEach(control => {
    control.addEventListener('change', function () {
      submitButton.textContent = control.value === 'yes' ? 'Voeg persoon by' : 'Stuur RSVP';
    });
  });

  nextButton.addEventListener('click', function () {
    if (!validateCurrentStep()) return;
    const route = getStepRoute();
    const nextStep = route[route.indexOf(steps[currentStep]) + 1];
    currentStep = steps.indexOf(nextStep);
    updateStep();
  });

  backButton.addEventListener('click', function () {
    const route = getStepRoute();
    const previousStep = route[route.indexOf(steps[currentStep]) - 1];
    currentStep = steps.indexOf(previousStep);
    updateStep();
  });

  form.addEventListener('keydown', function (event) {
    const isTextArea = event.target.tagName === 'TEXTAREA';
    const route = getStepRoute();
    const isLast = route.indexOf(steps[currentStep]) === route.length - 1;
    if (event.key === 'Enter' && !isTextArea && !isLast) {
      event.preventDefault();
      nextButton.click();
    }
  });

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (!validateCurrentStep()) return;

    const guest = collectGuestAnswers();
    completedGuests.push(guest);

    const addAnother = form.querySelector('input[name="add-another-person"]:checked');

    // Determine the desired flow: if a party total > 1 was provided, enforce collecting that many RSVPs
    const partyTotalInput = form.querySelector('input[name="party-total"]');
    if (partyTotalInput) partyTotalExpected = Math.max(1, parseInt(partyTotalInput.value, 10) || 1);

    let shouldAddAnother = false;
    if (partyTotalExpected > 1) {
      // If the party expects multiple RSVPs and we haven't reached that total, continue collecting
      shouldAddAnother = completedGuests.length < partyTotalExpected && !isDeclining();
    } else {
      // fallback to the explicit 'add-another-person' radio when party total is 1
      shouldAddAnother = steps[currentStep] !== declineStep && addAnother && addAnother.value.toLowerCase() === 'yes';
    }

    // set leader name if first guest
    if (!partyLeaderName) partyLeaderName = completedGuests[0] && completedGuests[0].name ? completedGuests[0].name : '';

    // If user wants to add another and we haven't reached the expected total, submit this guest now
    if (shouldAddAnother && completedGuests.length < partyTotalExpected) {
      // submit current guest in background with party metadata
      try {
        submitButton.disabled = true;
        submitButton.textContent = 'Stuur…';
        await submitGuestToNetlify(guest, completedGuests.length);
      } catch (err) {
        // rollback and show error
        completedGuests.pop();
        submitButton.disabled = false;
        submitButton.textContent = 'Stuur RSVP';
        formError.textContent = 'Ons kon nie jou RSVP stuur nie. Probeer asseblief weer.';
        console.error(err);
        return;
      }

      // prepare form for next guest but preserve party total
      startNextGuest();
      return;
    }

    // Final guest: set party-rsvps and party-size for record (kept for compatibility)
    partyRsvps.value = JSON.stringify(completedGuests);
    partySize.value = String(completedGuests.length);

    if (window.location.protocol === 'file:') {
      showSuccess(true);
      return;
    }

    // Ensure the primary contact fields reflect the first guest (so Netlify shows a sensible top-level name/email)
    const primary = completedGuests[0] || {};
    const nameField = form.querySelector('input[name="name"]');
    const emailField = form.querySelector('input[name="email"]');
    if (nameField && primary.name) nameField.value = primary.name;
    if (emailField && primary.email) emailField.value = primary.email;

    // Inject hidden inputs for each guest so Netlify displays all party members separately
    // Remove any previous injected fields first
    Array.from(form.querySelectorAll('input[data-injected-guest]')).forEach(n => n.remove());
    completedGuests.forEach((guest, idx) => {
      Object.keys(guest).forEach(key => {
        const input = document.createElement('input');
        input.type = 'hidden';
        // use a clear naming convention: party_0_name, party_0_email, etc.
        input.name = `party_${idx}_${key}`;
        input.value = guest[key];
        input.dataset.injectedGuest = 'true';
        form.appendChild(input);
      });
    });

    submitButton.disabled = true;
    submitButton.textContent = 'Stuur…';

    try {
      const response = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: encodeFormData()
      });

      if (!response.ok) throw new Error(`Submission failed with status ${response.status}`);
      showSuccess(false);
    } catch (error) {
      completedGuests.pop();
      submitButton.disabled = false;
      submitButton.textContent = 'Stuur RSVP';
      formError.textContent = 'Ons kon nie jou RSVP stuur nie. Probeer asseblief weer.';
      console.error(error);
    }
  });

  updateStep();
})();
