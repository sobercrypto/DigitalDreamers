const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const fetch = require("node-fetch");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

dotenv.config();
const app = express();

// Static file serving and middleware setup
app.use(express.static(path.join(__dirname, "client")));
app.use(express.static("client"));
app.use("/assets", express.static("assets"));
app.use(bodyParser.json());

// CORS configuration
app.use(
  cors({
    origin: "*",
    methods: ["POST", "GET", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "x-api-key",
      "anthropic-version",
      "authorization",
    ],
    credentials: true,
  })
);

// Content Security Policy
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; connect-src 'self' https://enormous-plum-kicker.glitch.me https://api.anthropic.com https://api.replicate.com data: blob:;"
  );
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-api-key, anthropic-version"
  );
  next();
});

// Preflight OPTIONS handling
app.options("*", (req, res) => {
  res.sendStatus(200);
});

// Database initialization
const dbDir = path.join(__dirname, "client", ".data");
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(
  path.join(__dirname, "client", ".data", "game.db"),
  (err) => {
    if (err) {
      console.error("Database connection error:", err.message);
    } else {
      console.log("Connected to the game database.");

      // Create tables if they don't exist
      db.run(`CREATE TABLE IF NOT EXISTS game_sessions (
      id INTEGER PRIMARY KEY,
      player_id TEXT,
      character_type TEXT,
      current_page INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

      db.run(`CREATE TABLE IF NOT EXISTS story_choices (
      id INTEGER PRIMARY KEY,
      session_id INTEGER,
      page_number INTEGER,
      choice_made INTEGER,
      story_text TEXT,
      choice1_text TEXT,
      choice2_text TEXT,
      choice3_text TEXT,
      image_url TEXT,
      FOREIGN KEY(session_id) REFERENCES game_sessions(id)
    )`);

      // Add achievements table
      db.run(`CREATE TABLE IF NOT EXISTS achievements (
      id INTEGER PRIMARY KEY,
      session_id INTEGER,
      achievement_type TEXT,
      unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(session_id) REFERENCES game_sessions(id)
    )`);
    }
  }
);

// Helper function to generate comic art using Replicate
async function generateComicArt(storyText) {
  try {
    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Token ${process.env.REPLICATE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version:
          "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
        input: {
          prompt: `comic book style art, detailed professional illustration of: ${storyText}`,
          negative_prompt:
            "blurry, low quality, distorted, bad anatomy, text, word bubbles, watermark",
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Replicate error details:", error);
      throw new Error(`Replicate API error: ${response.statusText}`);
    }

    const prediction = await response.json();
    console.log("Prediction created:", prediction);

    // Poll for result
    const maxAttempts = 30;
    let attempts = 0;

    while (attempts < maxAttempts) {
      const checkResponse = await fetch(
        `https://api.replicate.com/v1/predictions/${prediction.id}`,
        {
          headers: {
            Authorization: `Token ${process.env.REPLICATE_API_KEY}`,
          },
        }
      );

      if (!checkResponse.ok) {
        throw new Error(
          `Failed to check prediction status: ${checkResponse.statusText}`
        );
      }

      const result = await checkResponse.json();
      console.log("Prediction status:", result.status);

      if (result.status === "succeeded") {
        return result.output[0];
      } else if (result.status === "failed") {
        throw new Error("Image generation failed");
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
      attempts++;
    }

    throw new Error("Timeout waiting for image generation");
  } catch (error) {
    console.error("Error generating comic art:", error);
    throw error;
  }
}

// Story generation endpoint
app.post("/api/generate-story", async (req, res) => {
  try {
    const { character, pageNumber, previousChoices, previousStory } = req.body;
    console.log("[API] Request received:", {
      character,
      pageNumber,
      previousChoices,
    });

    if (!character) {
      return res.status(400).json({ error: "Character not provided" });
    }
    
    // Build a dynamic prompt based on the page number and previous choices
    let prompt = "";
    if (pageNumber === 1) {
      prompt = `You are writing an interactive comic book story for Digital Dreamers. 
The reader has chosen to play as ${character}. 
Write the opening scene of their story (about 1-2 paragraphs) and provide 3 distinct choices for how they could proceed with varying alignments - Good, Neutral and Evil.

Format the response exactly like this:
STORY:
[Your story text here]

CHOICES:
1. [First choice]
2. [Second choice]
3. [Third choice]`;
    } else {
      const choicesText = (previousChoices && previousChoices.length)
        ? previousChoices.map(c => c.choice).join(", ")
        : "None";
      const prevStory = previousStory || "No previous story.";
      prompt = `You are continuing the interactive comic book story for Digital Dreamers. 
The reader has chosen to play as ${character}. This is page ${pageNumber} of their story.
The story so far is: ${prevStory}.
Their previous choices were: ${choicesText}.
Continue the story from where it left off in about 1-2 paragraphs and provide 3 distinct choices for how they could proceed with varying alignments - Good, Neutral and Evil.

Format the response exactly like this:
STORY:
[Your story text here]

CHOICES:
1. [First choice]
2. [Second choice]
3. [Third choice]`;
    }

    console.log("[API] Sending prompt to Anthropic API...");
    
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-opus-20240229",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[API Error]:", error);
      return res.status(response.status).json({ error });
    }

    const data = await response.json();
    console.log("[API] Response received from Anthropic");

    if (
      !data.content ||
      !Array.isArray(data.content) ||
      data.content.length === 0
    ) {
      console.error("[API Error]: Invalid response format", data);
      return res.status(500).json({ error: "Invalid response from Anthropic API" });
    }

    const responseText = data.content[0].text;
    console.log("Response text from Anthropic:", responseText);

    const [storySection, choicesSection] = responseText.split("CHOICES:");
    let storyText = storySection.replace("STORY:", "").trim();
    const choices = choicesSection
      ? choicesSection
          .trim()
          .split("\n")
          .filter((choice) => choice.trim())
          .map((choice) => choice.replace(/^\d+\.\s*/, "").trim())
      : [];

    // Add references if there were previous playthroughs
    const previousPlaythroughs = await checkPreviousPlaythroughs(character);
    if (previousPlaythroughs > 0) {
      storyText = addPreviousPlaythroughReferences(storyText, previousPlaythroughs);
    }

    // Generate comic art
    let imageUrl = null;
    try {
      console.log("[API] Generating comic art...");
      imageUrl = await generateComicArt(storyText);
    } catch (imageError) {
      console.error("Comic art generation failed:", imageError);
    }

    // Store story data if sessionId exists
    if (req.body.sessionId) {
      await storeStoryData(
        req.body.sessionId,
        pageNumber,
        storyText,
        choices,
        imageUrl
      );
    }

    res.json({
      storyText,
      choices,
      imageUrl,
      previousPlaythroughs,
    });
  } catch (error) {
    console.error("[Server Error]:", error);
    res.status(500).json({
      error: "Internal Server Error",
      details: error.message,
    });
  }
});


// Save player choice endpoint
app.post("/api/save-choice", async (req, res) => {
  const { sessionId, pageNumber, choiceIndex } = req.body;

  db.run(
    `UPDATE story_choices 
     SET choice_made = ? 
     WHERE session_id = ? AND page_number = ?`,
    [choiceIndex, sessionId, pageNumber],
    (err) => {
      if (err) {
        console.error("Error saving choice:", err);
        res.status(500).json({ error: "Failed to save choice" });
      } else {
        res.json({ success: true });
      }
    }
  );
});

// Story retrieval endpoint
app.get("/api/story/:sessionId/:pageNumber", async (req, res) => {
  const { sessionId, pageNumber } = req.params;

  db.get(
    `SELECT * FROM story_choices 
     WHERE session_id = ? AND page_number = ?`,
    [sessionId, pageNumber],
    (err, row) => {
      if (err) {
        console.error("Error retrieving story:", err);
        res.status(500).json({ error: "Database error" });
      } else if (!row) {
        res.status(404).json({ error: "Story not found" });
      } else {
        res.json({
          storyId: row.id,
          storyText: row.story_text,
          choices: [row.choice1_text, row.choice2_text, row.choice3_text],
          imageUrl: row.image_url,
        });
      }
    }
  );
});

// Helper function to generate story prompts based on page number
function generateStoryPrompt(character, pageNumber, previousChoices) {
  const choicesHistory = previousChoices
    ? previousChoices.map((c) => c.choice).join(", ")
    : "none";

  switch (pageNumber) {
    case 2:
      return `Continue the Digital Dreamers story for ${character}. This is page 2 where we further develop the conflict. Their previous choice was: ${choicesHistory}. 
              Write 1-2 paragraphs advancing the story and provide 3 new choices that build on their previous decision.`;
    case 3:
      return `Continue the Digital Dreamers story for ${character}. This is page 3 where they face their first major challenge. Their previous choices were: ${choicesHistory}. 
              Write 1-2 paragraphs about their encounter and provide 3 choices for how to handle it.`;
    case 4:
      return `Continue the Digital Dreamers story for ${character}. This is page 4 - the climax. Based on their previous choices: ${choicesHistory}, 
              write 1-2 paragraphs about their final challenge and provide 3 possible resolutions.`;
    case 5:
      return `Conclude the Digital Dreamers story for ${character}. This is page 5 - the resolution. Based on their journey (choices: ${choicesHistory}), 
              write 1-2 paragraphs wrapping up their story and provide 3 choices for their final decision that hints at future adventures.`;
    default:
      return `You are writing an interactive comic book story for Digital Dreamers. The reader has chosen to play as ${character}. 
              Write the opening scene of their story (1-2 paragraphs) and provide 3 distinct choices for how they could proceed.`;
  }
}

// Helper function to check previous playthroughs
async function checkPreviousPlaythroughs(character) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT COUNT(DISTINCT id) as count 
       FROM game_sessions 
       WHERE character_type = ? AND current_page = 5`,
      [character],
      (err, row) => {
        if (err) reject(err);
        else resolve(row ? row.count : 0);
      }
    );
  });
}

// Helper function to add roguelite elements
function addPreviousPlaythroughReferences(storyText, playthroughCount) {
  const references = [
    "A sense of déjà vu washes over you...",
    "You've been here before, though something feels different this time...",
    "The digital realm seems to remember your previous adventures...",
    "Echoes of past decisions ripple through the code...",
  ];

  return `${references[playthroughCount % references.length]} ${storyText}`;
}

// Helper function to store story data
async function storeStoryData(
  sessionId,
  pageNumber,
  storyText,
  choices,
  imageUrl
) {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO story_choices (
        session_id, 
        page_number, 
        story_text, 
        choice1_text, 
        choice2_text, 
        choice3_text, 
        image_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(
      sql,
      [
        sessionId,
        pageNumber,
        storyText,
        choices[0],
        choices[1],
        choices[2],
        imageUrl,
      ],
      function (err) {
        if (err) {
          console.error("Error storing story data:", err);
          reject(err);
        } else {
          resolve(this.lastID);
        }
      }
    );
  });
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT}`);
});
