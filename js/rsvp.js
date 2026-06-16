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

  function isDeclining() {
    const attendance = form.querySelector('input[name="attendance"]:checked');
    return attendance && attendance.value === 'No, I cannot attend';
  }

  function getStepRoute() {
    return steps.filter(step => {
      if (step.hasAttribute('data-decline-step')) return isDeclining();
      if (step.hasAttribute('data-attending-step')) return !isDeclining();
      return true;
    });
  }

  function updateStep() {
    steps.forEach((step, index) => {
      step.classList.toggle('is-active', index === currentStep);
      step.setAttribute('aria-hidden', index === currentStep ? 'false' : 'true');
    });

    const route = getStepRoute();
    const routeIndex = route.indexOf(steps[currentStep]);
    const isFirst = routeIndex === 0;
    const isLast = routeIndex === route.length - 1;
    backButton.style.display = isFirst ? 'none' : 'inline-block';
    nextButton.style.display = isLast ? 'none' : 'inline-block';
    submitButton.style.display = isLast ? 'inline-block' : 'none';
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
      formError.textContent = 'Please choose an option before continuing.';
    } else {
      invalidControl.reportValidity();
      formError.textContent = 'Please complete this question before continuing.';
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
    form.reset();
    submitButton.textContent = 'Gaan voort';
    currentStep = 0;
    updateStep();
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

    completedGuests.push(collectGuestAnswers());

    const addAnother = form.querySelector('input[name="add-another-person"]:checked');
    const shouldAddAnother = steps[currentStep] !== declineStep &&
      addAnother && addAnother.value.toLowerCase() === 'yes';

    if (shouldAddAnother) {
      startNextGuest();
      return;
    }

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
    submitButton.textContent = 'Sending…';

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
      submitButton.textContent = 'Send RSVP';
      formError.textContent = 'Ons kon nie jou RSVP stuur nie. Probeer asseblief weer.';
      console.error(error);
    }
  });

  updateStep();
})();
