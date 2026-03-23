# Dosewise: AI-Powered Medical Document Parser

Dosewise is a specialized medical document parsing application designed for the **IAR Udaan Hackathon 2026**. It leverages advanced AI models to accurately extract, translate, and explain medical prescriptions and reports for patients.

## 🚀 How It Works

### 1. Document Upload & Pre-processing
- **Input:** Users can upload medical documents as images (PNG, JPEG) or PDFs, or manually enter prescription text.
- **Conversion:** On the frontend, uploaded files are converted into high-resolution base64 data to ensure maximum clarity for the AI model.
- **Secure Transfer:** The data is sent via a secure Express.js backend to the Gemini API.

### 2. AI-Powered Parsing (Gemini 3 Flash)
Dosewise uses the **Gemini 3 Flash Preview** model for its core parsing logic. This model is chosen for its high-speed reasoning and exceptional ability to understand complex, handwritten medical documents.

- **System Prompting:** A specialized medical prompt instructs the model to extract data with 100% verbatim accuracy for medication dosages.
- **Handwriting Recognition:** The model uses its internal medical knowledge and context (like diagnosis) to infer difficult-to-read handwriting.
- **Verification:** Every extracted medication is cross-referenced with medical databases to flag unverified or uncertain names.
- **JSON Output:** The model returns a structured JSON object containing:
  - Diagnosis (in simple terms)
  - Medication list (name, dosage, frequency, duration, purpose)
  - Simplified patient instructions (e.g., "twice a day" instead of "bid")
  - Potential side effects and their severity
  - Follow-up reminders and general health notes

### 3. Multi-Language Support (Hindi & English)
- **Real-time Translation:** The model can translate the entire analysis into Hindi while keeping medication names in English for safety and clarity.
- **Cultural Nuances:** It uses correct Hindi punctuation (।) and formal, warm language suitable for medical contexts.

### 4. AI Voice Explanation (Gemini 2.5 Flash TTS)
Dosewise provides an accessible "Voice Explanation" feature using the **Gemini 2.5 Flash Preview TTS** model.
- **Script Generation:** A custom script is generated based on the analysis results.
- **Natural Speech:** The model generates warm, natural-sounding audio in the user's chosen language (English or Hindi).
- **Streaming Playback:** Audio is fetched and played sentence-by-sentence for a responsive user experience.

### 5. Export & Accessibility
- **PDF Download:** Users can generate a high-quality PDF summary of their analysis using `html2canvas` and `jsPDF`.
- **Print Ready:** The dashboard is optimized for printing, allowing users to keep physical copies of their simplified medical summaries.

## 🛠️ Technical Stack

- **Frontend:** React 19, Tailwind CSS 4, Motion (Framer Motion), Lucide Icons.
- **Backend:** Node.js, Express.js, TypeScript.
- **AI Models:** 
  - `gemini-3-flash-preview` (Parsing & Reasoning)
  - `gemini-2.5-flash-preview-tts` (Text-to-Speech)
- **Libraries:** `html2canvas`, `jsPDF`, `@google/genai`.

## 🛡️ Safety & Privacy
- **No Hallucinations:** The model is strictly instructed never to invent medicine names or suggest new treatments.
- **Disclaimer:** Dosewise is an assistant tool and always advises users to consult their healthcare provider for final medical decisions.
