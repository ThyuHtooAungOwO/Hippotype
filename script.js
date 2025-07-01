class TypingGame {
  static GAME_TIME = 30 * 1000;
  static LINE_HEIGHT = 35;
  static VISIBLE_LINES = 3;
  static WORDS_THRESHOLD = 100;
  static WORD_BUFFER = 50;

  constructor() {
    // Fallback word list
    this.words = [
      "the",
      "quick",
      "brown",
      "fox",
      "jumps",
      "over",
      "lazy",
      "dog",
    ];
    this.wordsCount = this.words.length;
    this.gameTime = TypingGame.GAME_TIME;
    this.timer = null;
    this.gameStart = null;
    this.totalTyped = 0;
    this.correctTyped = 0;
    this.lineHeight = TypingGame.LINE_HEIGHT;
    this.visibleLines = TypingGame.VISIBLE_LINES;
    this.currentScroll = 0;
    this.isNewGame = true;
    this.typingSounds = [
      new Audio("assets/sounds/click1.wav"),
      new Audio("assets/sounds/click2.wav"),
      new Audio("assets/sounds/click3.wav"),
      new Audio("assets/sounds/click4.wav"),
    ];
    this.typingSounds.volume = 0.5;

    this.initElements();
    this.initEvents();
    this.loadWords();
  }

  async loadWords() {
    try {
      const response = await fetch("words.json");
      if (!response.ok) throw new Error("Failed to load words.json");
      const data = await response.json();

      if (data.words && Array.isArray(data.words) && data.words.length > 0) {
        this.words = data.words;
        this.wordsCount = data.words.length;
        localStorage.setItem("wordList", JSON.stringify(data.words));
      } else {
        console.warn("Invalid word list in JSON, using fallback");
      }
    } catch (error) {
      console.error("Error loading words:", error);
      // Check localStorage for cached words
      const cachedWords = localStorage.getItem("wordList");
      if (cachedWords) {
        try {
          const words = JSON.parse(cachedWords);
          if (Array.isArray(words) && words.length > 0) {
            this.words = words;
            this.wordsCount = words.length;
          }
        } catch (e) {
          console.warn("Invalid cached word list");
        }
      }
    } finally {
      this.newGame();
    }
  }

  initElements() {
    this.elements = {
      game: document.getElementById("game"),
      words: document.getElementById("words"),
      cursor: document.getElementById("cursor"),
      info: document.getElementById("info"),
      wpm: document.getElementById("wpm"),
      accuracy: document.getElementById("accuracy"),
      timerProgress: document.getElementById("timer-progress"),
      newGameBtn: document.getElementById("newGameBtn"),
      restartGameText: document.getElementById("restart-text"),
    };

    this.elements.game.setAttribute("aria-label", "Typing game input area");
    this.elements.info.setAttribute("aria-live", "polite");

    this.elements.cursor.style.position = "absolute";
    this.elements.cursor.style.zIndex = "10";
    this.elements.cursor.style.transition =
      "transform 0.1s ease, opacity 0.1s ease";
  }

  initEvents() {
    this.elements.game.addEventListener("keyup", this.handleKey.bind(this));
    this.elements.newGameBtn.addEventListener("click", () => this.newGame());
  }

  playTypingSound() {
    const randomIndex = Math.floor(Math.random() * this.typingSounds.length);
    const sound = this.typingSounds[randomIndex];
    sound.currentTime = 0;
    sound.play();
  }

  getAccuracy() {
    if (this.totalTyped === 0) return 100;
    return Math.min(
      100,
      Math.round((this.correctTyped / this.totalTyped) * 100)
    );
  }

  randomWord() {
    if (this.wordsCount === 0) return "";
    return this.words[Math.floor(Math.random() * this.wordsCount)];
  }

  formatWord(word) {
    if (!word) return '<div class="word"></div>';
    return `<div class="word"><span class="letter">${word
      .split("")
      .join('</span><span class="letter">')}</span></div>`;
  }

  addMoreWords() {
    if (this.elements.words.children.length < TypingGame.WORDS_THRESHOLD) {
      const fragment = document.createDocumentFragment();
      for (let i = 0; i < TypingGame.WORD_BUFFER; i++) {
        const word = this.randomWord();
        if (!word) continue;
        const wordElement = document.createElement("div");
        wordElement.className = "word";
        wordElement.innerHTML = `<span class="letter">${word
          .split("")
          .join('</span><span class="letter">')}</span>`;
        fragment.appendChild(wordElement);
      }
      this.elements.words.appendChild(fragment);
    }
  }

  updateCursorPosition() {
    const nextLetter = document.querySelector(".letter.current");
    const nextWord = document.querySelector(".word.current");
    const activeElement = nextLetter || nextWord;

    if (activeElement) {
      this.elements.words.offsetHeight; // Force reflow
      const rect = activeElement.getBoundingClientRect();
      const gameRect = this.elements.game.getBoundingClientRect();

      const topPos = rect.top - gameRect.top + this.elements.game.scrollTop;
      const leftPos = nextLetter
        ? rect.left - gameRect.left
        : rect.right - gameRect.left;

      this.elements.cursor.style.transform = `translate(calc(${leftPos}px - 1px), ${topPos}px)`;
      this.elements.cursor.style.height = `${rect.height}px`;
      this.elements.cursor.style.display = "block";
      this.elements.cursor.style.opacity = "1";
      this.elements.cursor.style.width = nextLetter ? "1px" : "2px";
    } else {
      this.elements.cursor.style.opacity = "0";
    }
  }

  newGame() {
    this.elements.words.innerHTML = "";
    this.currentScroll = 0;
    this.isNewGame = true;
    this.elements.restartGameText.style.display = "none";
    this.elements.timerProgress.style.backgroundColor = "var(--primaryColor)";
    this.elements.info.style.color = "var(--primaryColor)";

    const gameWidth = this.elements.game.offsetWidth;
    const wordWidth = 100;
    const wordsPerLine = Math.floor(gameWidth / wordWidth);
    const wordsToGenerate = wordsPerLine * 4 + 10;

    const fragment = document.createDocumentFragment();
    for (let i = 0; i < wordsToGenerate; i++) {
      const word = this.randomWord();
      if (!word) continue;
      const wordElement = document.createElement("div");
      wordElement.className = "word";
      wordElement.innerHTML = `<span class="letter">${word
        .split("")
        .join('</span><span class="letter">')}</span>`;
      fragment.appendChild(wordElement);
    }
    this.elements.words.appendChild(fragment);

    const firstWord = this.elements.words.querySelector(".word");
    if (firstWord) {
      firstWord.classList.add("current");
      const firstLetter = firstWord.querySelector(".letter");
      if (firstLetter) firstLetter.classList.add("current");
    }

    clearInterval(this.timer);
    this.timer = null;
    this.gameStart = null;
    this.totalTyped = 0;
    this.correctTyped = 0;
    this.elements.game.classList.remove("over");

    this.elements.info.textContent = this.gameTime / 1000;
    this.elements.wpm.textContent = "0 WPM";
    this.elements.accuracy.textContent = "100%";
    this.elements.timerProgress.style.width = "100%";

    this.elements.words.style.transform = "translateY(0)";
    this.elements.words.style.transition = "none";
    this.elements.cursor.style.display = "block";
    this.elements.cursor.style.opacity = "0";
    this.elements.cursor.style.transition = "opacity 0.1s ease";

    setTimeout(() => {
      this.elements.game.focus();
      this.updateCursorPosition();
      this.elements.words.style.transition = "transform 0.2s ease";
      this.elements.words.offsetHeight;
      this.updateCursorPosition();
    }, 50);
  }

  getWpm() {
    const words = [...document.querySelectorAll(".word")];
    const lastTypedWord = document.querySelector(".word.current");
    if (!lastTypedWord) return 0;

    const lastTypedWordIndex = words.indexOf(lastTypedWord) + 1;
    const typedWords = words.slice(0, lastTypedWordIndex);
    const correctWords = typedWords.filter((word) => {
      const letters = [...word.children];
      return (
        letters.every((letter) => letter.classList.contains("correct")) &&
        letters.length > 0
      );
    });

    const currentTime = this.gameStart
      ? new Date().getTime() - this.gameStart
      : 0;
    const minutes = currentTime / 60000;
    return minutes > 0 ? correctWords.length / minutes : 0;
  }

  updateStats() {
    this.elements.wpm.textContent = `${Math.round(this.getWpm())} WPM`;
    this.elements.accuracy.textContent = `${Math.round(this.getAccuracy())}%`;
  }

  gameOver() {
    clearInterval(this.timer);
    this.elements.game.classList.add("over");
    this.elements.info.textContent = `Game Over!`;
    this.elements.restartGameText.style.display = "block";
    this.elements.cursor.style.display = "none";
    this.updateStats();
  }

  handleKey(ev) {
    const key = ev.key;
    const currentWord = document.querySelector(".word.current");
    if (this.elements.game.classList.contains("over") && ev.key === " ") {
      this.newGame();
      return;
    }
    if (!currentWord || this.elements.game.classList.contains("over")) return;

    const currentLetter = currentWord.querySelector(".letter.current");
    const expected = currentLetter?.textContent || " ";
    const isLetter = key.length === 1 && key !== " ";
    const isSpace = key === " ";
    const isBackspace = key === "Backspace";
    const isFirstLetter = currentLetter === currentWord.firstChild;

    if (!this.timer && (isLetter || isSpace)) {
      this.gameStart = new Date().getTime();
      this.timer = setInterval(() => {
        const msPassed = new Date().getTime() - this.gameStart;
        const sLeft = Math.round(this.gameTime / 1000 - msPassed / 1000);
        this.elements.timerProgress.style.width = `${
          100 - (msPassed / this.gameTime) * 100
        }%`;

        if (sLeft <= 10) {
          this.elements.timerProgress.style.backgroundColor = "#e74c3c";
          this.elements.info.style.color = "#e74c3c";
        } else {
          this.elements.timerProgress.style.backgroundColor =
            "var(--primaryColor)";
          this.elements.info.style.color = "var(--primaryColor)";
        }

        if (sLeft <= 0) {
          this.gameOver();
          return;
        }
        this.elements.info.textContent = sLeft;
        this.updateStats();
      }, 100);
    }

    if (isLetter) {
      if (currentLetter) {
        currentLetter.classList.add(key === expected ? "correct" : "incorrect");
        currentLetter.classList.remove("current");
        const nextLetter = currentLetter.nextSibling;
        if (nextLetter) nextLetter.classList.add("current");
        this.totalTyped++;
        if (key === expected) this.correctTyped++;
      } else {
        const incorrectLetter = document.createElement("span");
        incorrectLetter.textContent = key;
        incorrectLetter.className = "letter incorrect extra";
        currentWord.appendChild(incorrectLetter);
        this.totalTyped++;
      }
    }

    if (isSpace) {
      if (expected !== " ") {
        currentWord
          .querySelectorAll(".letter:not(.correct)")
          .forEach((letter) => {
            letter.classList.add("incorrect");
          });
      }
      currentWord.classList.remove("current");
      currentWord.classList.add(
        "completed",
        [...currentWord.querySelectorAll(".incorrect")].length > 0
          ? "incorrect"
          : "correct"
      );
      if (currentLetter) currentLetter.classList.remove("current");

      const nextWord = currentWord.nextSibling;
      if (nextWord) {
        nextWord.classList.add("current");
        const firstLetter = nextWord.querySelector(".letter");
        if (firstLetter) firstLetter.classList.add("current");
        this.addMoreWords();
      }
    }

    if (isLetter || isSpace) {
      this.playTypingSound();
    }

    if (isBackspace) {
      const extraLetters = currentWord.querySelectorAll(".letter.extra");
      if (extraLetters.length > 0) {
        extraLetters[extraLetters.length - 1].remove();
        this.totalTyped--;
      } else if (currentLetter && !isFirstLetter) {
        currentLetter.classList.remove("current");
        const prevLetter = currentLetter.previousSibling;
        prevLetter.classList.add("current");
        prevLetter.classList.remove("correct", "incorrect");
        this.totalTyped--;
      } else if (isFirstLetter || !currentLetter) {
        const prevWord = currentWord.previousSibling;
        if (prevWord && !prevWord.classList.contains("completed")) {
          currentWord.classList.remove("current");
          if (currentLetter) currentLetter.classList.remove("current");
          prevWord.classList.add("current");
          const lastLetter = prevWord.querySelector(".letter:last-child");
          if (lastLetter) {
            lastLetter.classList.add("current");
            lastLetter.classList.remove("correct", "incorrect");
            this.totalTyped--;
          }
        }
      }
    }

    const currentActiveWord = document.querySelector(".word.current");
    if (currentActiveWord) {
      const wordRect = currentActiveWord.getBoundingClientRect();
      const gameRect = this.elements.game.getBoundingClientRect();
      const wordTop = wordRect.top - gameRect.top;
      const wordBottom = wordRect.bottom - gameRect.top;
      const containerHeight = gameRect.height;

      if (wordBottom > containerHeight * 0.75) {
        this.currentScroll -= (wordBottom - containerHeight * 0.75) * 0.7;
        this.elements.words.style.transform = `translateY(${this.currentScroll}px)`;
      } else if (wordTop < containerHeight * 0.25 && this.currentScroll < 0) {
        this.currentScroll = Math.min(
          0,
          this.currentScroll + (containerHeight * 0.25 - wordTop) * 0.7
        );
        this.elements.words.style.transform = `translateY(${this.currentScroll}px)`;
      }
    }

    this.updateCursorPosition();
    this.updateStats();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.typingGame = new TypingGame();
  document.getElementById("newGameBtn").addEventListener("click", () => {
    setTimeout(() => window.typingGame.newGame(), 50);
  });
});
