/** @type {HTMLDivElement} */
const timerElem = document.getElementById("timer");
/** @type {HTMLSpanElement} */
const endTimeElem = document.getElementById("endTime");
/** @type {HTMLSpanElement} */
const timeLeftElem = document.getElementById("timeLeft");
/** @type {HTMLParagraphElement} */
const timerNochElem = document.getElementById("timerNoch");
/** @type {HTMLDivElement} */
const progressbarElem = document.getElementById("progressbar");
/** @type {HTMLDivElement} */
const currentTimeElem = document.getElementById("currentTime");

/** @type {HTMLButtonElement} */
const openDialogButton = document.getElementById("openDialogButton");
/** @type {HTMLButtonElement} */
const settingsSubmitButton = document.getElementById("settingsSubmit");

/** @type {HTMLDialogElement} */
const dialogElem = document.getElementById("dialog");

/** @type {HTMLInputElement} */
const inputDate = document.getElementById("inputDate");
/** @type {HTMLInputElement} */
const inputTime = document.getElementById("inputTime");

/**
 * Füge führende Nullen zu einem Wert hinzu
 * @param {number} value 
 * @param {number} width Die Mindestlänge der Ausgabe
 * @returns {string}
 */
function pad(value, width) {
  return ("0".repeat(width) + value).slice(-width);
}

/**
 * Wenn der String nicht leer oder null ist, parse ihn als Date,
 * ansonsten gib null zurück.
 * @param {string|null} date 
 * @returns {Date|null}
 */
function parseDate(date) {
  return date ? new Date(date) : null;
}

/**
 * Konvertiert ein Date in HH:mm[:ss] Format
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

/**
 * Zeige eine Push-Benachrichtigung
 * @param {string} body 
 * @returns {Promise<Notification | undefined>}
 */
async function showNotification(body) {
  // wenn Notifications nicht unterstützt werden (kein Support oder kein HTTPS), returne direkt
  if (!("Notification" in window)) {
    return;
  }

  if (Notification.permission === "denied") {
    return;
  }

  // Wenn noch keine Entscheidung getroffen wurde, frage nach Berechtigung und gehe nur weiter
  // wenn diese positiv ausfällt
  if (Notification.permission === "default") {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return;
    }
  }

  return new Notification("Countdown", {
    icon: "/icons/android-chrome-512x512.png",
    // Erlaube das Ersetzen einer alten Nachricht, da sie ja nicht mehr aktuell ist.
    // https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API/Using_the_Notifications_API#replacing_existing_notifications
    tag: "timer-notification",
    renotify: true,
    body: body,
  });
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
const dialogOpeningEvent = new Event("opening");

// Verfolge das Öffnen des Dialogs / Ändern des open-Attributs
const dialogAttrObserver = new MutationObserver((mutations) => {
  mutations.forEach(async mutation => {
    if (mutation.attributeName === "open") {
      const dialog = mutation.target;

      const isOpen = dialog.hasAttribute("open");
      if (isOpen) {
        dialog.dispatchEvent(dialogOpeningEvent);
      } else {
        // Wir lauschen, wann das "open"-Attribut entfernt wird, statt das
        // offizielle "close"-Event, da dieses in Chrome for Android nicht
        // gefeuert wird. Deswegen machen wir unser eigenes "closing"-Event
        dialog.dispatchEvent(dialogClosingEvent);
      }
    }
  })
});
dialogAttrObserver.observe(dialogElem, { 
  attributes: true,
});

/********************
 * State Management
 ********************/

/** @type {Date|null} */
let startOfCountdown = null;
/** @type {Date|null} */
let endOfCountdown = null;

/**
 * Setze Countdown-Start und -Ende in LocalStorage und in Memory
 * @param {Date|null} startDate 
 * @param {Date|null} endDate 
 */
function setState(startDate, endDate) {
  localStorage.setItem("startOfCountdown", (startOfCountdown = startDate).toISOString());
  localStorage.setItem("endOfCountdown", (endOfCountdown = endDate).toISOString());
}

/**
 * Bestücke die Variablen mit dem State aus LocalStorage 
 */
function loadState() {
  startOfCountdown = parseDate(localStorage.getItem("startOfCountdown"));
  endOfCountdown   = parseDate(localStorage.getItem("endOfCountdown"));
}

/**
 * Lösche den State / Setze den Countdown zurück
 */
function resetState() {
  startOfCountdown = null;
  endOfCountdown   = null;
  localStorage.clear();
}

/**************
 * Timer Zeug
 **************/

let timerTimeout = null;
/** 
 * Die Stunden- und Minutenwerte des letzten Ticks, um zu verhindern, dass jede
 * Sekunde eine Push-Notification abgeschickt wird.
 */
let lastTickHours = Number.POSITIVE_INFINITY;
let lastTickMinutes = Number.POSITIVE_INFINITY;

function tickTimer() {
  // stoppe einen existierenden Timeout, um mehr als einem Timeout
  // auf tickTimer() zugleich vorzubeugen
  clearTimeout(timerTimeout);

  if (!startOfCountdown || !endOfCountdown) {
    return;
  }

  let timeDeltaMs = endOfCountdown.getTime() - startOfCountdown.getTime();
  if (timeDeltaMs < 0) {
    timeDeltaMs = 0;
  }
  let timeLeftMs = endOfCountdown.getTime() - Date.now();
  if (timeLeftMs < 0) {
    timeLeftMs = 0;
  }

  const percentCompletion = timeDeltaMs > 0
    ? (1.0 - (timeLeftMs / timeDeltaMs)) * 100
    : 0.0;
  progressbarElem.style.width = `${percentCompletion}%`;
  progressbarElem.ariaValueNow = Math.floor(percentCompletion).toString();

  if (timeLeftMs > 0) {
    const hours = Math.floor(timeLeftMs / 3600_000);
    const minutes = Math.ceil((timeLeftMs % 3600_000) / 60_000);

    // Nur wenn ein Update notwendig ist sollte der Countdown geändert werden, damit
    // die Push-Notification nicht jede Sekunde geschickt wird.
    if (hours !== lastTickHours || minutes !== lastTickMinutes) {
      lastTickHours = hours;
      lastTickMinutes = minutes;

      const timeLeftStr = hours > 0
        ? `${hours} h ${pad(minutes, 2)} min`
        : `${minutes} min`;

      timeLeftElem.innerText = timeLeftStr;

      // Blinke den Timer alle viertel Stunde und auch bei den letzten 10, 5 und der allerletzten Minute
      //                         |                                         |
      //            |------------|                     |-------------------|
      //            v                                  v
      if (minutes % 15 === 0 || (hours === 0 && [1, 5, 10].includes(minutes))) {
        timeLeftElem.classList.add("timer-left-time-blink");
        showNotification(`Nur noch ${timeLeftStr}!`);
      } else {
        timeLeftElem.classList.remove("timer-left-time-blink");
      }
    }

    // Wenn der Countdown noch nicht abgelaufen ist, wiederhole das ganze in einer Sekunde
    timerTimeout = setTimeout(tickTimer, 1000);
  } else {
    // timeLeftMs === 0 => Zeit ist abgelaufen
    timeLeftElem.innerText = "Zeit abgelaufen";
    timerNochElem.classList.add("timer-noch-text-hide"); // verstecke das "noch" in "noch 0 h 0 min"
    timeLeftElem.classList.add("timer-left-time-blink");

    showNotification("Zeit abgelaufen!!!");
  }
}

/**
 * Setze den Countdown zurück und zeige ihn nicht mehr an
 */
function clearTimer() {
  resetState();

  clearTimeout(timerTimeout);
  lastTickHours = Number.POSITIVE_INFINITY;
  lastTickMinutes = Number.POSITIVE_INFINITY;

  openDialogButton.innerText = "Setze einen Timer";
  timerElem.classList.remove("timer-wrapper-show");
}

/**
 * Setze und starte den Countdown
 * @param {Date} startDate 
 * @param {Date} endDate 
 */
function setTimer(startDate, endDate) {
  setState(startDate, endDate);

  endTimeElem.innerText = `${dateToHumanTime(endOfCountdown)}`;
  openDialogButton.innerText = "Einstellungen";
  timerElem.classList.add("timer-wrapper-show");
  timerNochElem.classList.remove("timer-noch-text-hide");

  tickTimer();
}

/**
 * Lade gespeicherte Daten aus LocalStorage und starte den Countdown
 */
function loadTimer() {
  loadState();
  
  if (!startOfCountdown || !endOfCountdown) {
    return clearTimer();
  }

  setTimer(startOfCountdown, endOfCountdown);
}

/**
 * Validiere Eingabe in Dialog, und disable OK-Button wenn date oder
 * time nicht gesetzt sind
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

openDialogButton.addEventListener("click", () => dialogElem.showModal());

dialogElem.addEventListener("opening", () => {
  /*
  Setze die Form auf Standardwerte bevor öffnen des Dialogs
   */
  const date = new Date();

  date.setHours(date.getHours() + 2);
  date.setMinutes(0, 0, 0);

  inputDate.value = dateToHumanDate(date);
  inputTime.value = dateToHumanTime(date);

  validateInput();
});

dialogElem.addEventListener("closing", () => {
  if (dialogElem.returnValue === "submit") {
    // Dank der Eingabevalidierung sollte beim Submit der Daten
    // keine Empty-String-Felder geben
    const date = inputDate.value;
    const time = inputTime.value;

    setTimer(new Date(), new Date(`${date} ${time}`));
  }
  else if (dialogElem.returnValue === "clear") {
    clearTimer();
  }
});

/**
 * Aktuelle Zeit anzeigen
 */
function currentTimeTick() {
  const now = new Date();

  currentTimeElem.innerText = dateToHumanTime(now, true);
}
setInterval(currentTimeTick, 1000);
currentTimeTick();

/**
 * Lade Daten aus localStorage falls verfügbar
 */
loadTimer();
