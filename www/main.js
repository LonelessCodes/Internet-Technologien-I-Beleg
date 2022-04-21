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
 * Setze einen Interval-Timer und führe die gegebene Funktion
 * auch sofort aus
 * @param {TimerHandler} func 
 * @param {number} timeout 
 * @returns {number}
 */
function setIntervalRunInstantly(func, timeout) {
  return func(), setInterval(func, timeout);
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
dialogAttrObserver.observe(modalElem, { 
  attributes: true,
});

/**
 * States und State-Management
 */

const END_DATE_KEY = "endDate";
const START_DATE_KEY = "startDate";

const timer = {
  /** @type {Date|null} */
  startOfCountdown: null,
  /** @type {Date|null} */
  endOfCountdown:   null,
  timeout:          null,
  
  tick() {
    clearTimeout(this.timeout);
  
    if (!this.startOfCountdown || !this.endOfCountdown) {
      return;
    }
  
    const now = new Date();
  
    let timeDeltaMs = this.endOfCountdown.getTime() - this.startOfCountdown.getTime();
    if (timeDeltaMs < 0) {
      timeDeltaMs = 0;
    }
    let timeLeftMs = this.endOfCountdown.getTime() - now.getTime();
    if (timeLeftMs < 0) {
      timeLeftMs = 0;
    }
  
    const percentCompletion = (
      timeDeltaMs > 0
        ? 1.0 - (timeLeftMs / timeDeltaMs)
        : 0.0
    ) * 100;
  
    progressbarElem.style.width = `${percentCompletion}%`;
    progressbarElem.ariaValueNow = Math.floor(percentCompletion).toString();
  
    const hours = Math.floor(timeLeftMs / 3600_000);
    const minutes = Math.ceil((timeLeftMs % 3600_000) / 60_000);
    
    if (hours > 0) {
      timeLeftElem.innerText = `${hours} h ${pad(minutes, 2)} min`;
    }
    else if (minutes > 0) {
      timeLeftElem.innerText = `${minutes} min`;
    }
    else {
      timeLeftElem.innerText = "Zeit abgelaufen";
      timerNochElem.classList.add("timer-noch-text-hide"); // verstecke das "noch" in "noch 0 h 0 min"
    }
  
    // Blinke den Timer alle viertel Stunde
    if (minutes % 15 === 0) {
      timeLeftElem.classList.add("timer-left-time-blink");
    }
    // Blinke den Timer auch bei den letzten 10, 5 und der allerletzten Minute
    else if (hours === 0 && [1, 5, 10].includes(minutes)) {
      timeLeftElem.classList.add("timer-left-time-blink");
    }
    else {
      timeLeftElem.classList.remove("timer-left-time-blink");
    }
    
    // Wenn der Countdown noch nicht abgelaufen ist, wiederhole das ganze in einer Sekunde
    if (timeLeftMs > 0) {
      this.timeout = setTimeout(timerTick, 1000);
    }
  },

  /**
   * Setze den Countdown zurück und zeige ihn nicht mehr an
   */
  clear() {
    clearTimeout(this.timeout);
    this.startOfCountdown = null;
    this.endOfCountdown   = null;
    localStorage.clear();
  
    openModalButton.innerText = "Setze einen Timer";
    timerElem.classList.remove("timer-wrapper-show");
  },

  /**
   * Setze und starte den Countdown
   * @param {Date} startDate 
   * @param {Date} endDate 
   */
  set(startDate, endDate) {
    this.startOfCountdown = startDate;
    this.endOfCountdown   = endDate;
  
    localStorage.setItem(END_DATE_KEY, endDate.toISOString());
    localStorage.setItem(START_DATE_KEY, startDate.toISOString());
  
    endTimeElem.innerText = `${dateToHumanTime(this.endOfCountdown)}`;
    openModalButton.innerText = "Einstellungen";
    timerElem.classList.add("timer-wrapper-show");
    timerNochElem.classList.remove("timer-noch-text-hide");
  
    this.tick();
  },

  /**
   * Lade gespeicherte Daten aus localStorage
   */
  load() {
    this.startOfCountdown = parseDate(localStorage.getItem(START_DATE_KEY));
    this.endOfCountdown   = parseDate(localStorage.getItem(END_DATE_KEY));
    
    if (!this.startOfCountdown || !this.endOfCountdown) {
      this.clear();
      return;
    }
  
    endTimeElem.innerText = `${dateToHumanTime(this.endOfCountdown)}`;
    openModalButton.innerText = "Einstellungen";
    timerElem.classList.add("timer-wrapper-show");
    timerNochElem.classList.remove("timer-noch-text-hide");
  
    this.tick();
  }
};

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

    timer.set(new Date(), new Date(`${date} ${time}`));
  }
  else if (modalElem.returnValue === "clear") {
    timer.clear();
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
