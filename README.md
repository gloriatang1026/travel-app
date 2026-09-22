# Daytrip

A home-screen trip planner. Paste a public Google Maps saved list and it becomes day-by-day stops, a map, a bag checklist, and a forecast.

Hosting matches Gym Tracker: one web app, added to the iPhone home screen. Gym Tracker does not need a server. This one does, only so it can read the Google list. Safari is not allowed to call Google Maps on its own.

## Start

The app lives in this folder. The two users are Sadness and Sulley, and their photos sit beside the app.

```bash
python serve.py
```

Open the iPhone address it prints, on the same Wi-Fi. In Safari choose Share, then Add to Home Screen.

Plans stay in the phone after you stop the server. Importing another list, or asking the planner to reorder days, needs the server running again.

## Free AI planner

Google Gemini has a free tier and does not ask for a card. Create a key at https://aistudio.google.com/apikey and paste it in the app under Plan with AI. The key is written to `.env` on this computer and is never stored in the phone.

Free-tier prompts can be used by Google to improve its models. Don't put passport numbers in the note you send the planner.

A Groq key (`GROQ_API_KEY`) or an xAI key (`XAI_API_KEY`) in that same file works instead. xAI is not free. Set `DAYTRIP_AI=xai` if both keys are present and you want xAI.

## Flights

On Days, tap Add flight. The card shows on the departure day and, if you land the next day, on the arrival day too. Plan with AI reads those times so a landing day does not start at 9.

## Companions

Only two users: Sadness and Sulley. Switch with the star at the top right. Each place has a duration in minutes, shown on the day and editable on the place card.
