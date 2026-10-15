# SafeChat — Privacy-Focused Real-Time Messaging Platform

SafeChat is a high-assurance, end-to-end encrypted (E2EE), real-time messaging web application built with **React**, **TypeScript**, **Tailwind CSS**, **Supabase**, and an **in-browser AI Scam Jury Ensemble** trained with **Python / Scikit-Learn**.

---

## Key Pillars & Architecture

### 1. Professional Messaging Interface
- **WhatsApp Web / Telegram grade UI**: Clean dark theme (`slate-950` with emerald and cyan accents), refined Plus Jakarta Sans typography, and subtle glassmorphic panels.
- Responsive layout supporting mobile, tablet, and desktop views.
- Conversation sidebar, live search, chat header, verified security badges, real-time message bubbles, timestamps, delivery/read indicators, and auto-expanding message composer.
- **Polished Empty States**: No dummy users or placeholder chats; clean empty states for newly registered accounts.

### 2. Client-Side End-to-End Encryption (E2EE)
- **Asymmetric Key Agreement**: RSA-OAEP 2048-bit with SHA-256 for identity keypairs and envelope distribution.
- **Symmetric Message Cipher**: AES-GCM 256-bit with unique 96-bit initialization vectors (IVs) per message.
- **Zero Server Exposure**: Private keys are stored strictly in the client's browser **IndexedDB** (`SafeChat_KeyStore_v1`). Database administrators and Supabase servers only store ciphertext.
- **Out-of-band Fingerprint Verification**: Displays public key SHA-256 fingerprints to verify channels against MITM attacks.

### 3. AI Jury — Scam & Phishing Detection
- **Voting Ensemble**: Trained on 5,594 real messages using public SMS Spam benchmark data augmented with modern fraud scenarios:
  1. **Decision Tree** (Accuracy: 95.17%, F1: 80.15%)
  2. **Naive Bayes** (Accuracy: 97.77%, F1: 91.29%)
  3. **k-Nearest Neighbors** (Accuracy: 96.87%, F1: 87.27%)
  4. **Artificial Neural Network (ANN/MLP)** (Accuracy: 98.39%, F1: 93.75%)
  - **Voting Ensemble**: **98.30% Accuracy, 97.83% Precision, 93.43% F1**.
- **100% Client-Side Inference**: Sublinear TF-IDF vectorization and ensemble forward passes run entirely inside the user's browser via `public/models/ai_jury_model.json`. Message text is **never** sent to external AI APIs.
- Classifies messages into `SAFE`, `SCAM`, or `UNCERTAIN` with an interactive deliberation breakdown modal and advisory warnings.

### 4. Continuous Keystroke Dynamics Authentication
- Extracts temporal behavioral biometrics locally during typing:
  - **Dwell Time**: Duration a key is held down (keydown to keyup).
  - **Flight Time**: Latency from releasing one key to pressing the next.
- Maintains an opt-in behavioral profile and calculates Z-score normalized deviations.
- If an anomalous typing pattern is detected (e.g. unauthorized device takeover), an **Identity Risk Alert** triggers an option for facial biometric verification.
- **Absolute Privacy**: Raw keystrokes or character codes are **never** uploaded to any server.

### 5. Consent-Based Facial Biometric Verification
- When an identity-risk alert occurs, a user can initiate a verification challenge.
- **Strict User Consent**: Enforces explicit consent before accessing camera hardware.
- Real-time client-side face landmark analysis and cosine similarity comparison against the user's locally enrolled biometric template.
- Includes liveness check and frame stability verification. Biometric data never leaves the device.

---

## Supabase Database Setup & RLS

1. Create a free project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in your Supabase dashboard.
3. Paste and run the contents of [`supabase/schema.sql`](file:///c:/Users/Branesh/Documents/SafeChat/supabase/schema.sql):
   - Sets up `profiles`, `conversations`, `conversation_participants`, `messages`, and `verification_challenges`.
   - Enables **Row Level Security (RLS)** ensuring users only access conversations and records they are authorized to participate in.
   - Enables **Realtime replication** for messages and presence updates.
   - Installs trigger function to automatically create user profiles upon Supabase Auth registration.
4. Add your credentials into `.env` or enter them directly through the in-app **Configure Backend** modal:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

---

## Re-training the AI Jury Models (Python)

```bash
cd ml
pip install -r requirements.txt
python train_models.py
```
This re-downloads the benchmark dataset, trains all 4 models, generates evaluation reports in `ml/model_evaluation.json`, and exports the browser-executable bundle to `public/models/ai_jury_model.json`.

---

## Running the Application Locally

```bash
# Install dependencies
npm install

# Start Vite development server
npm run dev
```

Visit `http://localhost:5173/` in your browser.
