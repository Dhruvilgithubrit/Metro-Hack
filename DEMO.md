# Triage Desk Demo Script

This script takes approximately 2 minutes to run and demonstrates the core offline-first capabilities, intelligent routing, clustering, and AI drafting of the Metro Triage Desk.

### Prerequisites
- Run `npm run dev` to start the frontend.
- Run `node server/server.js` to start the sync server.
- Have a local instance of Ollama running `gemma3:4b` if you wish to demo the AI polish.

### The Script

1. **Go Offline**: 
   - Open Developer Tools (F12) -> Network tab -> Change throttling to "Offline". 
   - Alternatively, turn on Airplane Mode on your device.
   - *Observe the top nav bar updates to show the red "Offline" indicator.*

2. **Operator Intake**:
   - Log in as the **Operator (Station Controller)**.
   - Click the "Import" panel.
   - Click "Load sample batch" (this ingests `public/data/complaints.json`).
   - *Watch the Kanban queues instantly fill. The app calculates triage scores, language tags, and departments locally.*

3. **Explore Triage Engine**:
   - Look at the top of the **Safety** column. The most urgent complaint is automatically pinned to the top.
   - Click on it to open the side panel. 
   - Check the "Why this score" section to see exactly which lexicon keywords triggered its urgency band.

4. **Verify Clustering**:
   - Look at the **Lifts** column.
   - You should see a "🔗 X complaints" cluster badge for the Thaltej Gam lift failures. 
   - *This demonstrates spatial-temporal clustering giving an urgency boost to repeat issues.*

5. **Draft a Reply**:
   - Pick a Gujarati or Gujlish complaint from the board.
   - Check the "Draft Reply" box in the side panel. Notice it has automatically generated a response in the correct language using the templates.
   - (Optional) Click "✨ Polish with local AI" to see the local Ollama model refine the tone.
   - Click **Approve and send**.
   - *Observe the "1 waiting to sync" badge appear in the top header.*

6. **Rider Experience**:
   - Open a new tab and log in as a **Rider (Commuter)**. (Keep offline mode on).
   - Use the QR Scanner (or type in a dummy code) simulating scanning a Lift QR.
   - The form will open with the Station and Asset (e.g., Lift 2) pre-filled, and "Lifts" automatically suggested.
   - Submit a new complaint (e.g., "Lift ma ek baalak fasai gayo chhe").
   - Go to "My Reports" and see it queued.

7. **The Great Sync**:
   - Turn off Airplane Mode (or switch Network back to "No throttling").
   - *Watch the magic:* Both the Operator and Rider apps will detect the connection, automatically trigger a sync, and the "waiting to sync" counters will gracefully count down to zero as local IndexedDB merges with the server.
   - The Rider will instantly see the Operator's official reply appear in their timeline!
