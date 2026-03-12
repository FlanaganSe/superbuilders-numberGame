# 1-Week Challenge: Build an OSMO Clone with Computer Vision

**Status:** Proposed
**Category:** Ed-tech, Computer Vision, 1-Week Challenge
**Technical Contact:** Patrick Skinner (patrick.skinner@superbuilders.school)
**Background Research:** Education via Computer Vision (WorkFlowy)

---

## Problem Statement

OSMO proved that combining physical play with digital interaction creates a powerful learning experience. The core challenge is to **bridge the physical world (a child's hands and number tiles) with the digital world (an iPad app)**.

Your task: **clone OSMO's core functionality** by building a simple, demonstrable **math game** in one week. The app uses **computer vision** to see and react to physical number tiles, proving this learning model can be replicated with modern web technologies.

---

## Scope

This is a **rapid prototyping sprint**. Build a single, functional educational math game that is demonstrable by end of week. The focus is on creating a **robust computer vision pipeline** that reliably recognizes physical number tiles (0–9).

> **Why number tiles?** Digits are a smaller, more distinct set than letters, making the CV model faster and more reliable to train.

You will be provided with an **iPad and a stand**.

---

## Functional Requirements

### 1. Hardware Setup

- You will be provided with an iPad and a stand.
- Position the iPad so its camera has a **clear, stable view** of a designated play area on the table.
- No custom mirror (like OSMO's) is required — a simple, creative setup using the existing camera is sufficient.

### 2. Computer Vision Pipeline

- Use the iPad's **camera feed** to identify physical number tiles in **real time**.
- Reliably recognize **digits 0 through 9** from physical tiles (e.g., printed/laminated cards, wooden tiles, or similar).
- Recognition must be **fast enough** that the game feels responsive, not sluggish.

### 3. Game Logic: Math Game

- Display a math problem on screen (e.g., `3 + 4 = ?` or `9 - 5 = ?`).
- Start with **simple addition and subtraction** appropriate for **ages 5–8**.
- The player places physical number tile(s) representing their answer into the camera's view.
- The CV pipeline **detects the tile(s) and reads the number(s)**.
- The app **validates** whether the placed tiles represent the correct answer.
- **Correct answer:** Clear, positive feedback (animation, success sound) → present the next problem.
- **Incorrect answer:** Gentle, encouraging feedback → let the player try again.

---

## Deliverables

1. **Working iPad application** (web app is sufficient) that runs the math game.
2. **Physical number tiles** (0–9, with duplicates as needed) for the demonstration.
3. **3–5 minute demo video** showing the game in action: displaying a problem, placing tiles, and the app recognizing and responding.
4. **README file** with setup/run instructions and a brief overview of the CV pipeline's technical approach.

---

## Required Technologies

| Layer | Technology |
|---|---|
| **Application** | TypeScript — web-based using **React** or **Next.js** |
| **Computer Vision** | JavaScript CV library such as **TensorFlow.js** or **OpenCV.js** for camera feed processing and digit recognition |