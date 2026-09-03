# Pizzabook - PRD

## Concept
Comprehensive mobile app for home pizza makers - a calculator, planner, and open "Facebook for pizza" community. Prevents overproofing, adapts to home ovens, and lets users share and learn together.

## Features (MVP - all implemented)

### 1. Open Community ("Facebook for pizza")
- Global feed (no friend requests, all posts public)
- Google OAuth login (Emergent managed)
- Profile: name, avatar, bio, home equipment list
- Post pizza photo + caption + attach recipe from calculator
- Reactions (🔥 like) + comments
- Push notification to post author on new comment

### 2. Dimensions Calculator
- Diameter (cm) + pizza count → dough ball weight, sauce grams, cheese grams
- Area-based scaling from 30cm baseline (250g)

### 3. Dough & Fermentation Calculator
- Methods: Direct / Biga (50%/45%/1%) / Poolish (35%/100%/0.1%)
- Hydration %, salt %, oil %
- Yeast types: Fresh / Dry (1:3) / Sourdough
- Mixing: Hand / Home mixer / Spiral
- Room + fridge temp, Same-day vs Cold long (24-48h)
- Water temp calc via 55/60 rule + fermentation adjustment
- Warning for hydration > 70%
- Save recipe → attach to next post

### 4. Home Baking Calculator
- Ooni/Witt (430-500°C, 60-90s)
- Home oven with stone/steel (300°C + grill, 4-6 min)
- Home oven with pan (250-280°C, 8-10 min, bottom-then-grill technique)
- Golden rule: "don't look away!"

### 5. Ice Water Calculator (summer)
- Total water + tap temp + target temp → cold water + ice grams

### 6. Reverse Baking Planner
- Pick bake date/time + method → timeline of alarms
- Biga (~24h before), Poolish (~14h), Direct (~8h) + balling + oven preheat
- Local push notifications scheduled per step

### 7. Pizza School (Golden Rules)
- Cheese, tomato sauce, ingredient order, golden baking rule

### 8. Multi-language
- Full HR / EN / DE support via LanguageProvider + AsyncStorage

## Stack
- **Backend**: FastAPI + MongoDB (Motor), Emergent Object Storage, Emergent Push (SuprSend), Emergent Google Auth
- **Frontend**: Expo Router (SDK 57), 4 tabs (Feed/Calculator/Planner/Profile), expo-image, expo-image-picker, expo-notifications, expo-blur
- **Design**: Terracotta #D15900 on sandy #FAF5F0, iOS-native clean personality

## API Endpoints
- `POST /api/auth/session` — exchange session_id for session_token
- `GET /api/me` — current user
- `POST /api/logout`
- `PATCH /api/profile` — update name/bio/equipment
- `POST /api/upload` — multipart image upload → returns path + signed url
- `GET /api/files/{path}` — read image (public for community)
- `GET/POST /api/posts` — list/create post
- `GET /api/posts/{id}` — post detail
- `POST /api/posts/{id}/like` — toggle like
- `GET/POST /api/posts/{id}/comments`
- `POST /api/register-push` — device token registration

## Integrations
- **Emergent Google Auth** (managed)
- **Emergent Object Storage** (managed, path prefix `pizzabook/`)
- **Emergent Push Notifications** (managed SuprSend relay)

## Business enhancement
Consider adding: featured/curated recipes section, weekly community "pizza of the week", or a lightweight badge system for prolific posters — all boost retention and shareability.
