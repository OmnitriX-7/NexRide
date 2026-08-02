<div align="center">
  <h1>🚕 NexRide</h1>
  <p><strong>A Next-Generation Premium Ride-Sharing Platform</strong></p>
  <p>Available on Mobile (Android) & Web</p>
</div>

<br/>

## 📖 Overview
NexRide is a comprehensive, full-stack ride-sharing application built to rival industry leaders. Designed with a premium, sleek user interface and lightning-fast real-time architecture, NexRide provides seamless transportation solutions for both Riders and Drivers.

Whether you're booking a quick trip across the city on your mobile phone or monitoring your driver fleet from the web dashboard, NexRide offers a flawless, synchronized experience.

---

## ✨ Key Features
- **Dual Platforms:** Perfectly synchronized experiences on both React Native (Mobile) and React (Web).
- **Real-Time Tracking & Dispatch:** Live GPS location tracking, instant ride requests, and status updates powered by Supabase Realtime WebSockets.
- **Dynamic Vehicle Selection:** Choose from 20 visually stunning vehicle models during registration (from Subcompacts to Hypercars).
- **NexRide Elite:** A premium subscription tier providing riders with exclusive discounts and perks.
- **Secure Payments:** Fully integrated Stripe payment gateway for seamless credit card processing.
- **Emergency SOS System:** Built-in safety features that flag emergency rides and allow instant dispatch of authorities.
- **AI HelpBot:** An intelligent, in-app assistant powered by the Google Gemini 2.0 Flash API to answer user queries instantly.
- **Coupon & Promo System:** Apply dynamic discount codes instantly to ride fares.

---

## 🛠️ Tech Stack

**Frontend (Web & Mobile)**
- **React Native / Expo** (Mobile App Architecture)
- **React.js + Vite** (Web App Architecture)
- **Framer Motion** (Micro-animations and fluid UI transitions)
- **Lucide Icons** (Clean, modern iconography)

**Backend & Infrastructure**
- **Supabase** (PostgreSQL Database, Authentication, Edge Functions)
- **Supabase Realtime** (WebSocket connections for live GPS tracking)
- **Stripe API** (Payment Intents & Billing)
- **Google Gemini API** (AI HelpBot integration)

---

## 📱 How to Run the App (Local Development)

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

### 1. Web Version (Laptop / Desktop)
Run the React web application locally to access the Rider or Driver dashboards through your browser.

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```
*Your web app will typically be available at `http://localhost:5173`.*

### 2. Mobile Version (Android APK)
Run the Expo development server to test the mobile app on your physical device or an emulator.

```bash
# Navigate to the mobile directory
cd mobile

# Install dependencies
npm install

# Start the Metro Bundler
npx expo start --dev-client --clear
```
*To run this on your physical phone, you must have the NexRide APK installed. When the Metro server starts, simply open the app on your phone, and it will automatically connect to your local server to fetch the latest code!*

---

## 🚀 Building for Production

If you are ready to distribute the final Mobile App to your users, you can generate a standalone `.apk` using Expo Application Services (EAS).

1. Install the EAS CLI globally: `npm install -g eas-cli`
2. Log into your Expo account: `eas login`
3. Generate the production APK: `eas build -p android --profile preview`
4. Once the build finishes on Expo's cloud servers, download the APK and share it with your users!

---

<div align="center">
  <p>Built with ❤️ for a seamless riding experience.</p>
</div>
