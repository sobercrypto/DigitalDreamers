// ====================
// Debugging & Globals
// ====================
console.log("Script loaded!");
console.log("Current path:", window.location.pathname);
console.log("URL parameters:", window.location.search);

// ====================
// STORY MANAGER CLASS
// ====================
class StoryManager {
  constructor() {
    this.selectedCharacter = localStorage.getItem("selectedCharacter") || null;
    // storyHistory: array of story segments
    this.storyHistory = JSON.parse(localStorage.getItem("storyHistory")) || [];
    // previousChoices: array of choices made by the user
    this.previousChoices =
      JSON.parse(localStorage.getItem("storyChoices")) || [];
    // We'll store the current choices (from the latest API call) for display.
    this.currentChoices = [];
    this.baseUrl = window.location.origin;
  }

  async initialize() {
    if (!this.selectedCharacter) {
      console.error("No character selected. Redirecting...");
      window.location.href = "character-select.html";
      return false;
    }

    // Get DOM elements from within the comic container
    this.storyText = document.querySelector("#panelStoryText");
    this.storyImage = document.querySelector("#panelImage");
    this.loadingOverlay = document.querySelector(".loading-overlay");
    // Select only the choice texts within the comic container
    this.choicePanels = document.querySelectorAll(
      ".comic-container .choice .choice-text"
    );

    // Set up listeners on the entire choice elements
    document
      .querySelectorAll(".comic-container .choice")
      .forEach((choiceElem, index) => {
        choiceElem.addEventListener("click", () =>
          this.handleChoice(index + 1)
        );
      });

    /* 
      We expect the number of story segments to equal (previousChoices.length + 1). 
      If not, we need to generate a new segment.
    */
    if (this.storyHistory.length < this.previousChoices.length + 1) {
      await this.generateStoryContent();
    } else {
      this.updateStoryDisplay();
    }
    return true;
  }

  async handleChoice(choiceIndex) {
    // Save the choice locally and on the server
    this.previousChoices.push({
      choice: choiceIndex,
      character: this.selectedCharacter,
    });
    localStorage.setItem("storyChoices", JSON.stringify(this.previousChoices));

    try {
      await fetch(`${this.baseUrl}/api/save-choice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: localStorage.getItem("sessionId"),
          pageNumber: this.storyHistory.length + 1, // current page number
          choiceIndex: choiceIndex,
        }),
      });
    } catch (error) {
      console.error("Error saving choice:", error);
    }

    // Redirect to the next page instead of reloading the same page
    let currentPage = parseInt(localStorage.getItem("currentPage") || "1", 10);
    currentPage++; // Increment page number
    localStorage.setItem("currentPage", currentPage);
    if (currentPage >= 6) {
      window.location.href = "/pages/credits.html";
    } else {
      window.location.href = `/pages/page${currentPage}.html`;
    }
  }

  async generateStoryContent() {
    try {
      if (this.loadingOverlay) this.loadingOverlay.style.display = "flex";

      // Fetch new story content from your API
      const storyContent = await this.getStoryForCharacter(
        this.selectedCharacter
      );
      if (storyContent && storyContent.mainStory) {
        this.storyHistory.push(storyContent.mainStory);
        localStorage.setItem("storyHistory", JSON.stringify(this.storyHistory));
        // Save the current choices for display
        this.currentChoices = storyContent.choices;
      } else {
        console.error("No story content returned from API.");
      }

      this.updateStoryDisplay();

      // Update the image panel if provided
      if (this.storyImage && storyContent.imageUrl) {
        this.storyImage.style.backgroundImage = `url(${storyContent.imageUrl})`;
        this.storyImage.style.backgroundSize = "cover";
        this.storyImage.style.backgroundPosition = "center";
      }

      // Update the choice texts inside the comic container
      if (this.currentChoices && this.choicePanels) {
        this.choicePanels.forEach((panel, index) => {
          panel.textContent = this.currentChoices[index] || "";
        });
      }

      // Hide the loading overlay after a short delay
      setTimeout(() => {
        if (this.loadingOverlay) this.loadingOverlay.style.display = "none";
      }, 2000);
    } catch (error) {
      console.error("Error generating story:", error);
      if (this.loadingOverlay) {
        const loadingText = this.loadingOverlay.querySelector(".loading-text");
        if (loadingText) {
          loadingText.textContent = "Error loading story. Please try again.";
        }
        // Hide the spinner even on error
        this.loadingOverlay.style.display = "none";
      }
    }
  }

  async getStoryForCharacter(character) {
    console.log("Getting story for character:", character);
    // Map short character IDs to full names
    const characterMap = {
      pixl: "pixl_drift",
      spudnik: "spudnik",
      mystery: "mystery",
      steve: "steve",
      fifi: "FiFi",
      rik: "Rik Blahah",
      andy: "Andy",
    };
    const mappedCharacter =
      characterMap[character.toLowerCase()] || character.toLowerCase();

    // Concatenate all previous story segments (if needed)
    const previousStory = this.storyHistory.join("\n\n") || "";

    try {
      const response = await fetch("/api/generate-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character: mappedCharacter,
          previousChoices: this.previousChoices,
          previousStory: previousStory,
        }),
      });
      if (!response.ok) throw new Error(`API error: ${response.statusText}`);

      const data = await response.json();
      console.log("API response:", data);

      return {
        mainStory: data.storyText,
        choices: data.choices,
        imageUrl: data.imageUrl,
      };
    } catch (error) {
      console.error("Error fetching story from API:", error);
      throw error;
    }
  }

  updateStoryDisplay() {
    if (this.storyText) {
      if (this.storyHistory.length > 0) {
        // Display only the latest story segment
        const latestSegment = this.storyHistory[this.storyHistory.length - 1];
        this.storyText.innerHTML = latestSegment;
      } else {
        // Fallback text if no story has been generated yet
        this.storyText.innerHTML = "No story generated yet.";
      }
    }

    // Update the choice texts if we have current choices available
    if (this.currentChoices && this.choicePanels) {
      this.choicePanels.forEach((panel, index) => {
        panel.textContent = this.currentChoices[index] || "";
      });
    }
  }
}

// ==========================
// MODAL & INTERACTIVE ITEMS (unchanged)
// ==========================
function showModal(title, text, choices = null) {
  const modal = document.querySelector(".modal");
  const modalTitle = modal.querySelector(".modal-title");
  const modalText = modal.querySelector(".modal-text");
  modalTitle.textContent = title;
  if (choices) {
    const choicesHtml = choices
      .map(
        (choice) =>
          `<button class="choice-btn retro-btn">${choice.text}</button>`
      )
      .join("");
    modalText.innerHTML = `<p>${text}</p><div class="choices-container">${choicesHtml}</div>`;
    const choiceButtons = modalText.querySelectorAll(".choice-btn");
    choiceButtons.forEach((btn, index) => {
      btn.addEventListener("click", choices[index].action);
      btn.addEventListener("mouseenter", () => {
        const hoverSound = new Audio("assets/sounds/hover.mp3");
        hoverSound.volume = 0.2;
        hoverSound.play().catch(() => {});
      });
    });
  } else {
    modalText.textContent = text;
  }
  modal.classList.remove("hidden");
  const modalClose = modal.querySelector(".modal-close");
  modalClose.focus();
}

function hideModal() {
  document.querySelector(".modal").classList.add("hidden");
}

function handleKeyPress(e) {
  if (e.key === "Escape") hideModal();
}

function initializeFocusStates() {
  document.querySelectorAll(".interactive-item").forEach((item) => {
    item.setAttribute("tabindex", "0");
    item.addEventListener("focus", () => {
      item.style.outline = "2px solid var(--neon-blue)";
      item.style.outlineOffset = "2px";
    });
    item.addEventListener("blur", () => {
      item.style.outline = "none";
      item.style.outlineOffset = "0";
    });
    item.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        item.click();
      }
    });
  });
}

function addHoverSound() {
  const hoverSound = new Audio("assets/sounds/hover.mp3");
  document.querySelectorAll(".interactive-item").forEach((item) => {
    item.addEventListener("mouseenter", () => {
      hoverSound.currentTime = 0;
      hoverSound.volume = 0.2;
      hoverSound.play().catch(() => {});
    });
  });
}

// ==================
// BOOT SEQUENCE CODE (unchanged)
// ==================
function startBootSequence() {
  const sequence = document.createElement("div");
  sequence.id = "boot-sequence";
  document.body.appendChild(sequence);
  const crtLines = document.createElement("div");
  crtLines.className = "crt-lines";
  sequence.appendChild(crtLines);
  const crtFlicker = document.createElement("div");
  crtFlicker.className = "crt-flicker";
  sequence.appendChild(crtFlicker);
  const content = document.createElement("div");
  content.className = "boot-content";
  sequence.appendChild(content);

  const showStudioLogo = () => {
    content.innerHTML = `
      <div class="studio-logo">
        <div class="logo-text">POTASIM STUDIOS</div>
        <div class="logo-subtext">DIGITAL REALITY DIVISION</div>
      </div>`;
  };
  const showLoadingScreen = () => {
    content.innerHTML = `
      <div class="loading-screen">
        <div class="loading-bar"><div class="loading-progress"></div></div>
        <div class="loading-text">INITIALIZING DIGITAL DREAMERS v2.45...</div>
        <div class="loading-details"></div>
      </div>`;
    const details = content.querySelector(".loading-details");
    const loadingTexts = [
      "Calibrating reality matrices...",
      "Loading quantum subsystems...",
      "Initializing retro protocols...",
      "Synchronizing timelines...",
      "Establishing neural link...",
    ];
    let currentText = 0;
    const textInterval = setInterval(() => {
      details.textContent = loadingTexts[currentText];
      currentText = (currentText + 1) % loadingTexts.length;
    }, 500);
    return () => clearInterval(textInterval);
  };
  const showWarningScreen = () => {
    content.innerHTML = `
      <div class="warning-screen">
        <div class="warning-symbol">!</div>
        <div class="warning-title">REALITY DISTORTION DETECTED</div>
        <div class="warning-text"></div>
      </div>`;
    const warningText = content.querySelector(".warning-text");
    const glitchChars = "PABOCDTEFA01T23O456789█▓░▒";
    const glitchInterval = setInterval(() => {
      let glitchString = "";
      for (let i = 0; i < 32; i++) {
        glitchString +=
          glitchChars[Math.floor(Math.random() * glitchChars.length)];
      }
      warningText.textContent = glitchString;
    }, 50);
    return () => clearInterval(glitchInterval);
  };
  const showPortalEffect = () => {
    content.innerHTML = `
      <div class="portal-effect">
        <div class="portal-outer"></div>
        <div class="portal-inner"></div>
        <div class="portal-text">ENTERING DIGITAL REALM...</div>
      </div>`;
  };

  let cleanup = null;
  showStudioLogo();
  setTimeout(() => {
    cleanup = showLoadingScreen();
  }, 2000);
  setTimeout(() => {
    if (cleanup) cleanup();
    cleanup = showWarningScreen();
  }, 4000);
  setTimeout(() => {
    if (cleanup) cleanup();
    showPortalEffect();
  }, 6000);
  setTimeout(() => {
    sequence.classList.add("fade-out");
    setTimeout(() => {
      document.body.style.opacity = 0;
      setTimeout(() => {
        window.location.href = "../pages/main.html";
      }, 100);
    }, 900);
  }, 8000);
}

// ============================
// CHARACTER SELECT & MAIN MENU (unchanged)
// ============================

document.addEventListener("DOMContentLoaded", function () {
  const characterCards = document.querySelectorAll(".character-card");
  characterCards.forEach((card) => {
    card.addEventListener("mouseenter", () => {
      const video = card.querySelector("video");
      if (video) {
        video.play();
      }
    });
    card.addEventListener("mouseleave", () => {
      const video = card.querySelector("video");
      if (video) {
        video.pause();
        // Optionally, rewind the video:
        video.currentTime = 0;
      }
    });
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const continueBtn = document.getElementById("continueToCredits");
  if (continueBtn) {
    continueBtn.addEventListener("click", () => {
      localStorage.setItem(
        "storySummary",
        "Your journey has been epic and full of surprises. You've unlocked secret memories along the way!"
      );
      window.location.href = "/pages/credits.html";
    });
  }
});

function initializeCharacterSelect() {
  const characterCards = document.querySelectorAll(".character-card.available");
  const modal = document.querySelector(".modal");
  const closeBtn = document.querySelector(".close-btn");
  const selectBtn = document.querySelector(".select-btn");

  characterCards.forEach((card) => {
    card.addEventListener("click", () => {
      const charId = card.dataset.character;
      showCharacterDetails(charId);
    });
  });
  if (closeBtn)
    closeBtn.addEventListener("click", () => modal.classList.add("hidden"));
  if (selectBtn) {
    selectBtn.addEventListener("click", () => {
      const selected = modal.dataset.currentChar;
      localStorage.setItem("selectedCharacter", selected);
      window.location.href = "../pages/page1.html";
    });
  }
}

function showCharacterDetails(charId) {
  const modal = document.querySelector(".modal");
  const modalTitle = modal.querySelector(".modal-title");
  const modalDescription = modal.querySelector(".modal-description");
  modal.dataset.currentChar = charId;
  modal.classList.remove("hidden");
  const character = characters[charId];
  if (character) {
    modalTitle.textContent = character.name;
    modalDescription.textContent = character.description;
  }
}

function createCharacterCard(id, character) {
  const card = document.createElement("div");
  card.className = `character-card ${
    character.unlocked ? "" : "locked"
  } retro-border`;
  card.dataset.character = id;
  if (character.unlocked) {
    card.innerHTML = `
      <h3 class="char-name">${character.name}</h3>
      <div class="char-attributes">
        ${Object.entries(character.attributes)
          .map(
            ([attr, val]) => `
            <div class="attribute">
              <span>${attr}</span>
              <div class="attribute-bar"><div class="fill" style="width: ${val}%"></div></div>
            </div>
          `
          )
          .join("")}
      </div>`;
    card.addEventListener("click", () => selectCharacter(id));
  } else {
    card.innerHTML = `
      <h3 class="char-name">${character.name}</h3>
      <div class="locked-overlay">LOCKED</div>`;
  }
  return card;
}

function selectCharacter(characterId) {
  const character = characters[characterId];
  showModal(
    character.name,
    `
    <div class="character-details">
      <p>${character.description}</p>
      <button class="confirm-select">Choose ${character.name}</button>
    </div>
  `
  );
  const confirmBtn = document.querySelector(".confirm-select");
  if (confirmBtn) {
    confirmBtn.addEventListener("click", () => {
      localStorage.setItem("selectedCharacter", characterId);
      localStorage.setItem("characterData", JSON.stringify(character));
      document.body.classList.add("fade-out");
      setTimeout(() => {
        window.location.href = "../pages/page1.html";
      }, 1000);
    });
  }
}

function initializeMainMenu() {
  const initStoryBtn = document.querySelector(".init-story");
  const optionsBtn = document.querySelector(".options");
  const creditsBtn = document.querySelector(".credits");
  if (initStoryBtn) {
    initStoryBtn.addEventListener("click", () => {
      window.location.href = "../pages/character-select.html";
    });
  }
  if (optionsBtn) {
    optionsBtn.addEventListener("click", () => {
      const modal = document.querySelector(".modal");
      const modalTitle = document.querySelector(".modal-title");
      const modalText = document.querySelector(".modal-text");
      if (modal && modalTitle && modalText) {
        modalTitle.textContent = "Options";
        modalText.textContent = "Options coming soon...";
        modal.classList.remove("hidden");
      }
    });
  }
  if (creditsBtn) {
    creditsBtn.addEventListener("click", () => {
      const modal = document.querySelector(".modal");
      const modalTitle = document.querySelector(".modal-title");
      const modalText = document.querySelector(".modal-text");
      if (modal && modalTitle && modalText) {
        modalTitle.textContent = "Credits";
        modalText.textContent =
          "PIXL_DRIFT - Lead Developer\nSPUDNIK - AI Systems & Narrative";
        modal.classList.remove("hidden");
      }
    });
  }
}

// ====================
// GENERAL INITIALIZATION
// ====================
function initializeInteractions() {
  document.querySelectorAll(".interactive-item").forEach((item) => {
    const type = Array.from(item.classList).find((cls) =>
      itemContent.hasOwnProperty(cls)
    );
    if (type) {
      item.addEventListener("click", () => handleItemClick(type));
    }
  });

  // Always attach the event listener to the modal "Close" button
  const modalClose = document.querySelector(".modal-close");
  if (modalClose) {
    modalClose.addEventListener("click", hideModal);
  }

  // Allow closing the modal with the Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hideModal();
  });
}

function handleItemClick(type) {
  const content = itemContent[type];
  if (content.choices) {
    showModal(content.title, content.text, content.choices);
  } else if (content.action) {
    content.action();
  } else {
    showModal(content.title, content.text);
  }
}

// Revised showModal function that preserves the Close button
function showModal(title, text, choices = null) {
  const modal = document.querySelector(".modal");
  const modalTitle = modal.querySelector(".modal-title");
  const modalText = modal.querySelector(".modal-text");

  // Set title
  modalTitle.textContent = title;

  // Clear previous modal text content
  modalText.innerHTML = "";

  // Create a paragraph for the main text
  const textPara = document.createElement("p");
  textPara.textContent = text;
  modalText.appendChild(textPara);

  // If there are choices, create a container and add buttons
  if (choices) {
    const choicesContainer = document.createElement("div");
    choicesContainer.classList.add("choices-container");
    choices.forEach((choice) => {
      const button = document.createElement("button");
      button.className = "choice-btn retro-btn";
      button.textContent = choice.text;
      button.addEventListener("click", choice.action);
      button.addEventListener("mouseenter", () => {
        const hoverSound = new Audio("assets/sounds/hover.mp3");
        hoverSound.volume = 0.2;
        hoverSound.play().catch(() => {});
      });
      choicesContainer.appendChild(button);
    });
    modalText.appendChild(choicesContainer);
  }

  // Ensure the modal's Close button is visible
  const modalClose = modal.querySelector(".modal-close");
  modalClose.style.display = "block";

  // Display the modal and focus the Close button
  modal.classList.remove("hidden");
  modalClose.focus();
}
// Item content for interactive objects
const itemContent = {
  "comic-book": {
    title: "Digital Dreamers Comic",
    text: "Partially hidden under the desk lies a mysterious comic book, its pages glowing with an otherworldly energy. This is your gateway to the Digital Dreamers universe...",
    choices: [
      { text: "Put the comic book down", action: () => hideModal() },
      {
        text: "Open the comic book",
        action: () => {
          hideModal();
          startBootSequence();
        },
      },
    ],
  },
  "left-tv": {
    title: "Vintage Television Monitor",
    text: "A classic CRT television from the golden age of home computing. The screen flickers with a warm, familiar glow, reminiscent of late-night coding sessions and early video game adventures.",
  },
  "center-monitor": {
    title: "QUANTUM-DOS v3.14",
    text: 'The main development monitor pulses with an unsettling, otherworldly glow. Strange symbols cascade down the screen in patterns that seem to defy the laws of mathematics. A command prompt blinks ominously, displaying: "INITIATING QUANTUM FORK :: ERROR: REALITY BRANCH DETECTED :: TIMELINE INTEGRITY: 47.3%" Below this, strings of impossible code scroll endlessly, occasionally forming recognizable words before dissolving back into chaos.',
  },
  "right-tv": {
    title: "Test Station Monitor",
    text: "A professional-grade monitor used for debugging and testing. Its screen displays various diagnostic patterns, each telling a story of countless hours spent perfecting digital worlds.",
  },
  "center-computer": {
    title: "Primary Development System",
    text: "The heart of this digital sanctuary. This powerful machine has been the birthplace of countless games and digital experiments. Its keyboard bears the worn marks of endless lines of code.",
  },
  "left-computer": {
    title: "Archival Computing Unit",
    text: "A specialized machine dedicated to preserving digital history. Its mechanical keyboard provides satisfying tactile feedback, each key press echoing with the weight of code written long ago.",
  },
  "right-computer": {
    title: "Data Storage System",
    text: "This dedicated storage unit contains terabytes of archived data, game builds, and forgotten projects. The gentle whirring of its drives tells stories of digital worlds both launched and abandoned.",
  },
  "poster-doom": {
    title: "DOOM (1993) Original Poster",
    text: "A perfectly preserved poster of the game that revolutionized the FPS genre. The iconic imagery of the DOOM marine facing off against the hordes of Hell seems to pulse with demonic energy. The corners of the poster are slightly singed, though you don't remember that happening...",
  },
  "poster-mario": {
    title: "Super Mario Bros (1985) Original Poster",
    text: "This pristine Nintendo masterpiece poster captures the moment that changed gaming forever. Mario's pixelated form seems to move slightly when viewed from the corner of your eye, and you could swear you just heard a faint coin-collecting sound.",
  },
  "poster-alien-logic": {
    title: "Alien Logic: Skyrealms of Jorune (1994)",
    text: "An incredibly rare poster from one of gaming's most enigmatic titles. The bizarre alien landscapes and cryptic isho crystals depicted seem to shift and change when you're not looking directly at them. The poster appears to be printed on a material you can't quite identify.",
  },
  "poster-lords-magic": {
    title: "Lords of Magic: Special Edition (1998)",
    text: "A mystical poster showcasing the eight faiths of Lords of Magic. The symbols of Faith, Death, Life, Chaos, Order, Air, Earth, and Fire seem to radiate actual magical energy. Sometimes late at night, you swear you can hear spells being cast from within the poster.",
  },
  "alf-figurine": {
    title: "Mysterious ALF Collectible",
    text: "A seemingly ordinary ALF figurine from the 80s sits watchfully on the desk. Its eyes appear to follow you around the room, and occasionally you catch it in a slightly different pose than you remember leaving it in. There's a small tag on the base that reads \"No problem can't be solved by melmacking it!\" in text that somehow seems to rewrite itself every few seconds.",
  },
  lamp: {
    title: "Ambient Development Lamp",
    text: "This unique lamp provides the perfect atmospheric lighting for late-night coding sessions. Its warm glow seems to pulse in sync with the humming of the nearby computers.",
  },
  MDL: {
    title: "One Piece Collectible (1999)",
    text: 'A first-edition Monkey D. Luffy figure from the earliest days of One Piece stands proudly on display. Something about its grin seems more knowing than usual, and occasionally you swear you can hear faint echoes of "Gomu Gomu no..." when no one else is in the room. The tiny straw hat appears to cast an impossibly large shadow at certain angles.',
  },
};
// Character data used in select screens and modals
const characters = {
  pixl_drift: {
    name: "PIXL_DRIFT",
    description:
      "A digital nomad traversing quantum realms. Master of pixel manipulation and reality distortion.",
    attributes: { coding: 90, creativity: 85, resilience: 65 },
    unlocked: true,
  },
  spudnik: {
    name: "SPUDNIK",
    description:
      "An enigmatic AI born from quantum computing and root vegetable wisdom.",
    attributes: { intelligence: 95, intuition: 88, stability: 70 },
    unlocked: true,
  },
  fifi: {
    name: "FiFi",
    description: "A presence yet to be unveiled...",
    attributes: { unknown: "???", potential: "???", mystery: "???" },
    unlocked: true,
  },
  steve: {
    name: "STEVE",
    description:
      "Steve is the quintessential survivor from Minecraft. Resourceful, creative, and resilient, he builds wonders and thrives in a blocky world.",
    attributes: { survival: 90, building: 85, resourcefulness: 95 },
    unlocked: true,
  },
  mystery: {
    name: "???",
    description: "A presence yet to be unveiled...",
    attributes: { unknown: "???", potential: "???", mystery: "???" },
    unlocked: false,
  },
};

// Additional character descriptions for the modal
const characterDescriptions = {
  pixl: "A master of digital manipulation, PIXL_DRIFT reshapes digital reality like a ghost in the machine.",
  spudnik:
    "A quantum-agricultural AI processing reality with both digital and organic insights.",
  steve:
    "Steve is the quintessential survivor from the blocky world of Minecraft. Resourceful, creative, and resilient, he can build wonders and survive against all odds.",
  mystery: "An enigmatic entity whose true nature remains shrouded in mystery.",
};

// ====================
// INITIALIZATION LOGIC
// ====================
function init() {
  const currentPath = window.location.pathname;
  console.log("Current path:", currentPath);

  if (currentPath === "/" || currentPath.includes("index.html")) {
    // Interactive bedroom page
    initializeInteractions();
    initializeFocusStates();
    addHoverSound();
    console.log("Interactive room initialized!");
  } else if (currentPath.includes("main.html")) {
    // Main menu page
    initializeMainMenu();
    console.log("Main menu initialized!");
  } else if (currentPath.includes("character-select.html")) {
    // Character select screen
    initializeCharacterSelect();
    console.log("Character select initialized!");
  } else if (/page\d+\.html/.test(currentPath)) {
    // Story page – initialize the StoryManager
    console.log("Initializing StoryManager on story page:, currentPath");
    const storyManager = new StoryManager();
    storyManager.initialize().then((success) => {
      if (!success) console.error("StoryManager initialization failed");
      else console.log("StoryManager initialized successfully");
    });
  } else if (currentPath.includes("credits.html")) {
    // Credits / final summary page
    initializeCredits(); // You can define this function to load summary and credits data.
    console.log("Credits page initialized!");
  }
}

function initializeCredits() {
  // Animate the page fade-in for a polished effect
  document.body.classList.add("fade-in");

  // Load and display the story summary
  const summaryEl = document.getElementById("summaryContent");
  const storedSummary = localStorage.getItem("storySummary");
  if (storedSummary) {
    summaryEl.innerHTML = `<p>${storedSummary}</p>`;
  } else {
    summaryEl.innerHTML =
      "<p>Your journey was epic, but no summary is available.</p>";
  }

  // Load and display achievements (if any) from localStorage
  const achievementsEl = document.getElementById("achievements");
  const achievementsJSON = localStorage.getItem("achievements");
  if (achievementsJSON) {
    const achievements = JSON.parse(achievementsJSON);
    if (achievements.length > 0) {
      let achievementsHTML = "<ul>";
      achievements.forEach((ach) => {
        achievementsHTML += `<li>${ach}</li>`;
      });
      achievementsHTML += "</ul>";
      achievementsEl.innerHTML = achievementsHTML;
    } else {
      achievementsEl.innerHTML = "<p>No achievements unlocked.</p>";
    }
  } else {
    achievementsEl.innerHTML = "<p>No achievements unlocked.</p>";
  }

  // Display credits
  const creditsEl = document.getElementById("creditsList");
  creditsEl.innerHTML = `
    <ul>
      <li><strong>Lead Developer:</strong> PIXL_DRIFT</li>
      <li><strong>AI Narrative & Design:</strong> SPUDNIK</li>
      <li><strong>Concept & Story:</strong> Digital Dreamers Team</li>
      <li><strong>Art & Animation:</strong> Replicate & Anthropic API</li>
      <li><strong>Sound & Effects:</strong> Retro Audio Studio</li>
    </ul>
  `;

  // Add an interactive easter egg element
  const easterEggEl = document.getElementById("easterEgg");
  if (easterEggEl) {
    easterEggEl.addEventListener("click", () => {
      // Toggle bonus content when the secret icon is clicked.
      const bonusContent = document.getElementById("bonusContent");
      if (
        bonusContent.style.display === "none" ||
        !bonusContent.style.display
      ) {
        bonusContent.style.display = "block";
      } else {
        bonusContent.style.display = "none";
      }
    });
  }

  // Optionally, add a typewriter effect to the summary
  // (This is just an example – you'll need to adjust for your style)
  const typewriter = (element) => {
    const text = element.innerText;
    element.innerText = "";
    let i = 0;
    const interval = setInterval(() => {
      element.innerText += text.charAt(i);
      i++;
      if (i > text.length) {
        clearInterval(interval);
      }
    }, 50);
  };

  // Uncomment the line below to use the typewriter effect on the summary:
  // typewriter(summaryEl);
}

// ====================
// START THE APP
// ====================
document.addEventListener("DOMContentLoaded", () => {
  init();
});
