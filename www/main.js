/** @type {HTMLDivElement} */
const timerElem = document.getElementById("timer");
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
const settingsSubmitButton = document.getElementById("settingsSubmit");

/** @type {HTMLDialogElement} */
const modalElem = document.getElementById("modal");

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
 * Warte bis alle Animationen auf einem Element/Animatable ihre Promises
 * erfüllt haben.
 * @param {Animatable} element 
 * @returns {Promise<PromiseSettledResult<Animation>[]>}
 */
function waitForAnimationsToComplete(element) {
  return Promise.allSettled(
    element.getAnimations().map(animation => animation.finished)
  );
}

/*
 * Dialog Funktionalität
 * 
 * Das <dialog>-Element, was uns HTML5 gibt, hat einige Probleme. Zum einen ist
 * es schwer animierbar, zusätzlich ist es nicht sehr barrierefrei, und das allerschlimmste:
 * in Chrome for Android werden keine "close"- und "cancel"-Events gefeuert!
 * Diese Funktionalitäten versuche ich hier zurückzuerlangen.
 */

const dialogClosingEvent = new Event("closing");
const dialogClosedEvent = new Event("closed");
const dialogOpeningEvent = new Event("opening");
const dialogOpenedEvent = new Event("opened");

// Verfolge das Öffnen des Dialogs / Ändern des open-Attributs
const dialogAttrObserver = new MutationObserver((mutations) => {
  mutations.forEach(async mutation => {
    if (mutation.attributeName === "open") {
      const dialog = mutation.target;

      const isOpen = dialog.hasAttribute("open");
      if (isOpen) {
        dialog.dispatchEvent(dialogOpeningEvent);
        await waitForAnimationsToComplete(dialog);
        dialog.dispatchEvent(dialogOpenedEvent);
      } else {
        // Wir lauschen, wann das "open"-Attribut entfernt wird, statt das
        // offizielle "close"-Event, da dieses in Chrome for Android nicht
        // gefeuert wird. Deswegen machen wir unser eigenes "closing"- und "closed"-Event
        dialog.dispatchEvent(dialogClosingEvent);
        await waitForAnimationsToComplete(dialog);
        dialog.dispatchEvent(dialogClosedEvent);
      }
    }
  })
});
dialogAttrObserver.observe(modalElem, { 
  attributes: true,
});

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
  timerElem.classList.remove("timer-wrapper-show");
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
  timerElem.classList.add("timer-wrapper-show");
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
  timerElem.classList.add("timer-wrapper-show");
  timerTick();
}

/*
Validiere Eingabe in Modal, und disable OK-Button wenn date oder
time nicht gesetzt sit
*/

function validateInput() {
  const date = inputDate.value;
  const time = inputTime.value;

  if (date !== "" && time !== "") {
    settingsSubmitButton.disabled = false;
  } else {
    settingsSubmitButton.disabled = true;
  }
}

inputDate.addEventListener("change", validateInput);
inputTime.addEventListener("change", validateInput);

openModalButton.addEventListener("click", () => {
  modalElem.showModal();
});

modalElem.addEventListener("opening", () => {
  /*
  Setze die Form auf Standardwerte bevor öffnen des Modals
   */
  const date = new Date();

  date.setHours(date.getHours() + 2);
  date.setMinutes(0, 0, 0);

  inputDate.value = dateToHumanDate(date);
  inputTime.value = dateToHumanTime(date);

  validateInput();
});

modalElem.addEventListener("closing", () => {
  if (modalElem.returnValue === "submit") {
    // Dank der Eingabevalidierung sollte beim Submit der Daten
    // keine Empty-String-Felder geben
    const date = inputDate.value;
    const time = inputTime.value;

    setTimer(new Date(), new Date(`${date} ${time}`));
  }
  else if (modalElem.returnValue === "clear") {
    clearTimer();
  }
});

setIntervalRunInstantly(() => {
  const now = new Date();

  currentTimeElem.innerText = dateToHumanTime(now, true);
}, 1000);

/**
 * Lade Daten aus 
 */

loadTimer();
