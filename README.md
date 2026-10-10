# Metro Triage Desk

Problem addressed: PS-07 Every Complaint Heard

This project is a React + Vite PWA built to modernise and streamline the complaint management system for the Gujarat Metro. Passengers report issues in various languages (Gujarati, Hindi, English, and Gujlish) across multiple channels (QR codes, app, paper forms, etc.). Urgent issues can easily get buried in the noise. This tool solves the problem by providing an automated triage pipeline and a local-first operator dashboard that works flawlessly even during network outages.

## Features for the Station Controller (Operator)
- **Automated Triage Engine**: Automatically scores incoming complaints based on urgency, categorising them into specific departments (Safety, Lifts, Cleanliness, Fare, Staff, Other) using a lexicon-driven pure logic engine.
- **Kanban-Style Dashboard**: Visualize complaints organized by department and ranked by computed urgency.
- **Clustering**: Automatically groups related complaints (e.g., 5 people reporting the same lift failure at Thaltej Gam within 72 hours) and boosts their urgency score.
- **Draft AI Replies**: Uses template-driven responses (in the original language of the complaint) with an optional feature to polish the tone using a local on-device AI model (Ollama).
- **Offline First**: PWA architecture with IndexedDB caching and Service Worker precaching ensures the controller can always access and update tickets, with background sync catching up once the network returns.

## What is real vs sample data
- **Timetables**: Sourced from `public/data/metro.json` (sample data structure mapping the Ahmedabad Line 1 & 2 layout).
- **Complaints**: `public/data/complaints.json` contains a simulated batch of 55 mixed-language, mixed-channel complaints used for testing the intake engine.
- **Lexicon**: `public/data/lexicon.json` is a highly customised scoring dictionary containing weighted trigger words in Gujarati, Hindi, English, and Romanised Gujarati (Gujlish).
- **Templates**: `public/data/reply_templates.json` provides the baseline official responses per department and language.
- **Login**: Dummy authentication for demonstration purposes (simulates commuter vs. operator roles).

## Offline Behavior & Sync
The application is strictly local-first. 
- All data is read/written to the browser's IndexedDB. 
- The UI never halts or crashes due to network failures. 
- A lightweight Node server (`server/server.js`) runs locally as a sync endpoint. 
- The app polls this endpoint (every 20 seconds or upon connection restore) to reconcile timelines via timestamp-based merging. Pending changes are held in an offline outbox ("X waiting to sync").
