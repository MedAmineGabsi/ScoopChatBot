# ScoopChatBot

A compact chatbot that uses the OpenAI API to research tech products on a target site and give concise, user-friendly advice.

✨ Features
- Summarizes product pages
- Compares items and highlights key differences
- Answers customer questions using model-generated responses

Requirements
- Node.js (v14+)
- An OpenAI API key

Quick start
```bash
git clone https://github.com/MedAmineGabsi/ScoopChatBot.git
cd ScoopChatBot
npm install
```

Configuration
Create a `.env` file with at least:
```
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxx
PORT=3000
```

Run
```bash
npm start
# or for development
npm run dev
```

Example request
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Which laptop from the site is best for photo editing?"}'
```

Notes
- Respect the target site's terms and rate limits.
- Monitor OpenAI usage to control costs.

License
Add a LICENSE file (e.g., MIT) to make the project's license explicit.
