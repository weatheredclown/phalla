import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const gamesRoot = path.resolve("madia.new/public/secret/1989");

function escapeForRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const entries = await fs.readdir(gamesRoot, { withFileTypes: true });

const { scoreConfigs } = await import(
  pathToFileURL(path.join(gamesRoot, "score-config.js"))
);

const gameDirs = entries
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .filter((name) => !name.startsWith("."));

await Promise.all(
  gameDirs.map(async (gameId) => {
    const directory = path.join(gamesRoot, gameId);
    const indexPath = path.join(directory, "index.html");
    const scriptPath = path.join(directory, `${gameId}.js`);

    try {
      await fs.access(indexPath);
      await fs.access(scriptPath);
    } catch (error) {
      return;
    }

    const source = await fs.readFile(scriptPath, "utf8");
    const indexSource = await fs.readFile(indexPath, "utf8");
    const escapedId = escapeForRegExp(gameId);
    const directBannerPattern = new RegExp(
      `initHighScoreBanner\\s*\\(\\s*{[\\s\\S]*?gameId\\s*:\\s*["']${escapedId}["']`,
      "m",
    );

    let hasBanner = directBannerPattern.test(source);
    if (!hasBanner) {
      const constantPattern = /const\s+([A-Z0-9_]+)\s*=\s*["']([^"']+)["']/g;
      for (const match of source.matchAll(constantPattern)) {
        const [, constantName, constantValue] = match;
        if (constantValue === gameId) {
          const indirectPattern = new RegExp(`gameId\\s*:\\s*${constantName}\\b`);
          if (indirectPattern.test(source)) {
            hasBanner = true;
            break;
          }
        }
      }
    }

    test(`1989 game '${gameId}' registers its shared high score banner`, () => {
      assert.ok(
        hasBanner,
        `Expected ${gameId} to initialize initHighScoreBanner with gameId \"${gameId}\"`,
      );
    });

    const hasSubmit = /highScore\.submit\s*\(/.test(source);
    const hasDirectRecord = new RegExp(
      `recordHighScore\\s*\\(\\s*["']${escapedId}["']`,
    ).test(source);

    test(`1989 game '${gameId}' records a score on completion`, () => {
      assert.ok(
        hasSubmit || hasDirectRecord,
        `Expected ${gameId} to submit a high score when the run completes`,
      );
    });

    test(`1989 game '${gameId}' registers its script in the cabinet shell`, () => {
      const scriptPattern = new RegExp(
        `<script[^>]+src=["'][./]*${escapeForRegExp(gameId)}\\.js["']`,
        "i",
      );
      assert.ok(
        scriptPattern.test(indexSource),
        `Expected ${gameId}/index.html to load ${gameId}.js as a module script`,
      );
    });

    test(`1989 game '${gameId}' defines a score configuration`, () => {
      const config = scoreConfigs?.[gameId];
      assert.ok(config, `Expected score-config.js to include an entry for ${gameId}`);
      assert.equal(
        typeof config.label,
        "string",
        `Expected score config for ${gameId} to include a string label`,
      );
      assert.equal(
        typeof config.empty,
        "string",
        `Expected score config for ${gameId} to include a string empty text`,
      );
      assert.equal(
        typeof config.format,
        "function",
        `Expected score config for ${gameId} to provide a formatter`,
      );
      const sample = config.format({ value: 0, meta: {} });
      assert.equal(
        typeof sample,
        "string",
        `Expected score config for ${gameId} to format into display text`,
      );
    });
  }),
);
