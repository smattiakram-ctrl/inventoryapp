<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run your inventory app locally

This project runs locally with a React frontend and Express API.
All app data is stored locally on disk in the `./data` folder:
- Database: `./data/database.sqlite`
- Uploaded images: `./data/uploads/`

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Start the API server:
   `npx tsx server.ts`
4. Run the frontend:
   `npm run dev`
