/** @type {HTMLDivElement} */
const timerWrapperElem = document.getElementById("timerWrapper");
/** @type {HTMLDivElement} */
const currentTimeElem = document.getElementById("currentTime");
/** @type {HTMLDivElement} */
const progressbarElem = document.getElementById("progressbar");
/** @type {HTMLSpanElement} */
const endTimeElem = document.getElementById("endTime");
/** @type {HTMLSpanElement} */
const timeLeftElem = document.getElementById("timeLeft");

/** @type {HTMLButtonElement} */
const openModalButton = document.getElementById("openModalButton");
/** @type {HTMLButtonElement} */
const settingsSubmitButton = document.getElementById("settingsSubmitButton");

/** @type {HTMLDivElement} */
const modalContainerElem = document.getElementById("modalContainer");
/** @type {HTMLDivElement} */
const modalBgElem = document.getElementById("modalBg");

/** @type {HTMLInputElement} */
const inputDate = document.getElementById("inputDate");
/** @type {HTMLInputElement} */
const inputTime = document.getElementById("inputTime");

const END_DATE_KEY = "endDate";
const START_DATE_KEY = "startDate";

/**
 * Utility Funktionen
 */

/**
 * @param {number} value 
 * @param {number} width Die Mindestlänge der Ausgabe
 * @returns {string}
 */
function pad(value, width) {
  return ("0".repeat(width) + value).slice(-width);
}

/**
 * @param {string|null} date 
 * @returns {Date|null}
 */
function parseDate(date) {
  return date && new Date(date);
}

/**
 * Konvertiert ein Date in HH:mm Format
 * @param {Date} date 
 * @param {boolean} seconds Ob die Sekunden angezeigt werden sollen
 * @returns {string}
 */
function dateToHumanTime(date, seconds = false) {
  if (seconds) {
    return `${pad(date.getHours(), 2)}:${pad(date.getMinutes(), 2)}:${pad(date.getSeconds(), 2)}`;
  } else {
    return `${pad(date.getHours(), 2)}:${pad(date.getMinutes(), 2)}`;
  }
}

/**
 * Konvertiert ein Date in YYYY-MM-DD Format
 * @param {Date} date 
 * @returns {string}
 */
function dateToHumanDate(date) {
  return `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1, 2)}-${pad(date.getDate(), 2)}`
}

function setIntervalRunInstantly(func, timeout) {
  return func(), setInterval(func, timeout);
}

/**
 * States und State-Management
 */

/** @type {Date|null} */
let startOfCountdown = null;
/** @type {Date|null} */
let endOfCountdown = null;
let timerTimeout = null;

function timerTick() {
  clearTimeout(timerTimeout);

  if (!startOfCountdown || !endOfCountdown) {
    return;
  }

  const now = new Date();

  let timeDeltaMs = endOfCountdown.getTime() - startOfCountdown.getTime();
  if (timeDeltaMs < 0) {
    timeDeltaMs = 0;
  }
  let timeLeftMs = endOfCountdown.getTime() - now.getTime();
  if (timeLeftMs < 0) {
    timeLeftMs = 0;
  }

  const percent = (
    timeDeltaMs > 0
      ? 1.0 - (timeLeftMs / timeDeltaMs)
      : 0.0
  ) * 100;

  const hours = Math.floor(timeLeftMs / 3600_000);
  const minutes = Math.ceil((timeLeftMs % 3600_000) / 60_000);
  
  if (hours > 0) {
    timeLeftElem.innerText = `${hours} h ${pad(minutes, 2)} min`;
  } else {
    timeLeftElem.innerText = `${minutes} min`;
  }

  progressbarElem.style.width = `${percent}%`;
  progressbarElem.ariaValueNow = Math.floor(percent).toString();

  if (timeLeftMs > 0) {
    timerTimeout = setTimeout(timerTick, 1000);
  }
}

/**
 * Timer Funktionen
 */

function clearTimer() {
  endOfCountdown = null;
  startOfCountdown = null;
  localStorage.clear();
  clearTimeout(timerTimeout);
  timerWrapperElem.classList.remove("timer-wrapper-show");
}

/**
 * @param {Date} startDate 
 * @param {Date} endDate 
 */
function setTimer(startDate, endDate) {
  endOfCountdown = endDate;
  startOfCountdown = startDate;

  localStorage.setItem(END_DATE_KEY, endDate.toISOString());
  localStorage.setItem(START_DATE_KEY, startDate.toISOString());

  endTimeElem.innerText = `${dateToHumanTime(endOfCountdown)}`;
  timerWrapperElem.classList.add("timer-wrapper-show");
  timerTick();
}

function loadTimer() {
  startOfCountdown = parseDate(localStorage.getItem(START_DATE_KEY));
  endOfCountdown = parseDate(localStorage.getItem(END_DATE_KEY));
  
  if (!startOfCountdown || !endOfCountdown) {
    clearTimer();
    return;
  }

  endTimeElem.innerText = `${dateToHumanTime(endOfCountdown)}`;
  timerWrapperElem.classList.add("timer-wrapper-show");
  timerTick();
}

function closeModal() {
  modalContainerElem.classList.remove("modal-container-open");
  document.body.blur();
}

function openModal() {
  modalContainerElem.classList.add("modal-container-open");
  inputDate.focus();
}

settingsSubmitButton.addEventListener("click", () => {
  const date = inputDate.value;
  const time = inputTime.value;

  if (date === "" || time === "") {
    return;
  }

  setTimer(new Date(), new Date(`${date} ${time}`));

  closeModal();
});

openModalButton.addEventListener("click", () => {
  /*
  Setze die Form auf Standardwerte bevor öffnen des Modals
   */
  const date = new Date();

  date.setHours(date.getHours() + 2);
  date.setMinutes(0, 0, 0);

  inputDate.value = dateToHumanDate(date);
  inputTime.value = dateToHumanTime(date);

  openModal();
});

modalBgElem.addEventListener("click", () => {
  closeModal();
});

setIntervalRunInstantly(() => {
  const now = new Date();

  currentTimeElem.innerText = dateToHumanTime(now, true);
}, 1000);

/**
 * Lade Daten aus 
 */

loadTimer();
