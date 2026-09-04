# Pizzabook - PRD

## Concept
Comprehensive mobile app for home pizza makers - a calculator, planner, and open "Facebook for pizza" community. Prevents overproofing, adapts to home ovens, and lets users share and learn together.

## Features (MVP + v2 - all implemented)

### 1. Open Community ("Facebook for pizza")
- Global feed (no friend requests, all posts public)
- **Method filter chips** at top of feed: All / Direct / Biga / Poolish
- Google OAuth login (Emergent managed)
- Profile: name, avatar, bio, home equipment list
- Post pizza photo + caption + attach recipe from calculator + self-rating (1-5 stars)
- Reactions (🔥 like) + comments
- Push notification to post author on new comment
- **Recipe of the week**: featured top-liked post from last 7 days at top of feed

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

### 8. Shopping List
- Generates a copyable shopping list from last calculator recipe (flour, water, salt, yeast, oil) + recommended extras (mozzarella, San Marzano, olive oil, basil)

### 9. Leftover Dough Guide
- Freezing dough balls, Panuozzo sandwich, next-day focaccia, mini pizzelle, overnight bread

### 10. Multi-language
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
- `POST /api/posts/{id}/rating` — set self-rating (1-5, author only)
- `GET /api/posts/featured` — top-liked post from last 7 days (recipe of the week)
- `GET/POST /api/posts/{id}/comments`
- `POST /api/register-push` — device token registration

## Integrations
- **Emergent Google Auth** (managed)
- **Emergent Object Storage** (managed, path prefix `pizzabook/`)
- **Emergent Push Notifications** (managed SuprSend relay)

## Business enhancement
Consider adding: featured/curated recipes section, weekly community "pizza of the week", or a lightweight badge system for prolific posters — all boost retention and shareability.


## Session Update (2026-06)
- Added detailed BIGA and POOLISH step-by-step recipes in HR/EN/DE/SL, split into 3 phases (Faza 1: Preferment, Faza 2: Final mix — hand OR mixer variant, Faza 3: Rest/Balls/Bake). Direct method keeps the existing 4-phase (A/B/C/D) instructions.
- New file src/i18n/prefermentSteps.ts holds all Biga+Poolish content in 4 languages.
- Added persistent checkboxes on every step: numbered pill becomes a green ✓ and text is struck-through when tapped. State persists via AsyncStorage under key 'completedSteps' with scoped keys `${method}-${mixing}-${phaseKey}-${idx}`. Includes a 'Reset checked steps' link that clears only the currently displayed path.

