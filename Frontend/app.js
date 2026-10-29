
const API_URL = 'https://mental-health-score-predictor-3uha.onrender.com/predict';

const form = document.querySelector('#prediction-form');
const submitButton = document.querySelector('#submit-button');
const formError = document.querySelector('#form-error');
const resultHeading = document.querySelector('#result-heading');
const resultCopy = document.querySelector('#result-copy');
const scoreWrap = document.querySelector('#score-wrap');
const scoreValue = document.querySelector('#score-value');
const loadingState = document.querySelector('#loading-state');
const resultError = document.querySelector('#result-error');

const integerFields = new Set(['age', 'daily_unlocks']);
const numberFields = new Set([
  'avg_daily_usage_hours',
  'study_hours',
  'physical_activity_hours',
  'sleep_hours_per_night',
]);

function readPayload() {
  const payload = {};
  for (const [key, value] of new FormData(form).entries()) {
    if (integerFields.has(key)) payload[key] = Number.parseInt(value, 10);
    else if (numberFields.has(key)) payload[key] = Number.parseFloat(value);
    else payload[key] = value;
  }
  return payload;
}

function validatePayload(payload) {
  for (const control of form.elements) {
    if (control.willValidate && !control.checkValidity()) {
      control.reportValidity();
      return `${control.labels[0]?.textContent || 'This field'} needs attention. Check the value and try again.`;
    }
  }
  if (!Number.isInteger(payload.age) || !Number.isInteger(payload.daily_unlocks)) {
    return 'Age and daily phone unlocks must be whole numbers.';
  }
  if (Object.values(payload).some((value) => typeof value === 'number' && !Number.isFinite(value))) {
    return 'Enter a valid number in each numeric field.';
  }
  return '';
}

function clearResultError() {
  resultError.hidden = true;
  resultError.textContent = '';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  formError.hidden = true;
  formError.textContent = '';
  clearResultError();
  scoreWrap.hidden = true;

  const payload = readPayload();
  const validationMessage = validatePayload(payload);
  if (validationMessage) {
    formError.textContent = validationMessage;
    formError.hidden = false;
    return;
  }

  submitButton.disabled = true;
  submitButton.querySelector('span:first-child').textContent = 'Generating estimate…';
  loadingState.hidden = false;
  resultHeading.textContent = 'Working on your estimate.';
  resultCopy.textContent = 'Your answers are being sent to the prediction model.';

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = Array.isArray(body?.detail)
        ? body.detail.map((item) => `${item.loc?.at(-1) || 'Field'}: ${item.msg}`).join(' ')
        : typeof body?.detail === 'string' ? body.detail : '';
      throw new Error(detail || `The server returned an error (${response.status}). Please check your answers and try again.`);
    }
    if (typeof body?.predicted_mental_health_score !== 'number' || !Number.isFinite(body.predicted_mental_health_score)) {
      throw new Error('The server response did not include a valid predicted mental health score.');
    }
    scoreValue.textContent = body.predicted_mental_health_score.toFixed(2);
    scoreWrap.hidden = false;
    resultHeading.textContent = 'Your estimate is ready.';
    resultCopy.textContent = 'This is the score predicted from the details you shared.';
  } catch (error) {
    resultHeading.textContent = 'We couldn’t get your estimate.';
    resultCopy.textContent = 'Please try again when the prediction service is available.';
    resultError.textContent = error instanceof TypeError
      ? 'Could not reach the backend at 127.0.0.1:8000. Check that the API is running and try again.'
      : error.message;
    resultError.hidden = false;
  } finally {
    loadingState.hidden = true;
    submitButton.disabled = false;
    submitButton.querySelector('span:first-child').textContent = 'Generate my estimate';
  }
});
