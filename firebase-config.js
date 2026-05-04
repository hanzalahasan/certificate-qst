/* =====================================================
   Firebase Configuration
   ─────────────────────────────────────────────────────
   Replace the placeholder values below with the values
   from your Firebase project Console:
     1. Go to https://console.firebase.google.com
     2. Create a project (or open existing)
     3. Click ⚙️ → Project settings → "Your apps" → Web app
     4. Copy the firebaseConfig object and paste below
   See SETUP.md for full step-by-step instructions.
   ===================================================== */

const firebaseConfig = {
  apiKey:            "YOUR_API_KEY_HERE",
  authDomain:        "your-project.firebaseapp.com",
  projectId:         "your-project-id",
  storageBucket:     "your-project.appspot.com",
  messagingSenderId: "000000000000",
  appId:             "1:000000000000:web:abcdef0123456789",
};

// Don't change anything below this line
window.__firebaseConfig = firebaseConfig;
