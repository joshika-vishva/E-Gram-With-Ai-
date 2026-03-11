# e-Gram Digital Platform Implementation Plan

The objective is to build a complete web application called **"e-Gram Digital Platform"** tailored for Smart Agriculture & Rural Innovation. The application will permit villagers to report issues, receive announcements, and access essential services. An admin dashboard will also be provided to manage incoming complaints, announcements, and services.

## Architecture & Technology Stack
- **Backend:** Python with Flask framework
- **Database:** SQLite
- **Frontend:** HTML5, CSS3, Bootstrap 5, JavaScript
- **Host Directory:** `c:\Users\Vishnu Varthan\OneDrive\Desktop\New folder (2)\e-gram-platform`

## Proposed Changes

### Project Structure Setup
The project will be structured as follows:
- `app.py`: The main Flask application and routing.
- `models.py`: Database initialization and connection handling.
- `requirements.txt`: Python package dependencies (Flask, Werkzeug, etc.).
- `static/css/style.css`: Custom styling.
- `static/js/main.js`: Form validations and frontend logic.
- `static/uploads/`: Directory to store user-uploaded issue images.
- `templates/`: HTML templates (base, index, report, services, announcements, admin_login, admin_dashboard).

### Database Schema
We will create a SQLite database (`egram.db`) with the following tables:
1. **Users**: `id` (PK), `name`, `phone`, `village`
2. **Complaints**: `id` (PK), `user_name`, `village`, `phone`, `problem_type`, `description`, `image_path`, `status` (Pending/In Progress/Resolved), `created_at`
3. **Announcements**: `id` (PK), `title`, `description`, `date`
4. **Services**: `id` (PK), `service_name`, `service_description`

*(Note: We will also add a simple admin authentication mechanism, possibly hardcoded for simplicity as requested for a beginner-friendly setup, or a basic Admin table.)*

### Backend Core (`app.py`)
- Initialize Flask app and configure upload folder.
- **Routes:**
  - `/` -> Home Page
  - `/report` (GET, POST) -> Complaint submission form processing and image saving.
  - `/services` -> Fetch and display services from DB.
  - `/announcements` -> Fetch and display announcements from DB.
  - `/admin/login` -> Admin authentication.
  - `/admin/dashboard` -> View all complaints, update status, add announcements, and add services.
  - `/api/chat` (POST) -> Receives chat messages and context from the frontend, uses `google.generativeai` with the farmer-specific Persona prompt, and returns the response.

### AI Agriculture Chatbot Integration
- **Backend Model Setup**: Use `google-generativeai` with a strict system instruction tailored for agronomy, Tamil/English bilingual capability, and crop tracking. The Gemini API key will be read from the environment or `.env`.
- **Dedicated Chat Page** (`chatbot.html`): A new full-page interface for interacting with the AI. It features a large centered glass panel consistent with the platform's aesthetic.
- **Frontend Logic** (`static/js/main.js`): Refactored to handle the dedicated page interactions, automatic focus, and message processing.
- **Voice Interaction**: Includes both **Voice-to-Text** (mic input) and robust **Text-to-Speech** (voice output) with browser audio-context unlocking and language auto-detection (Tamil/English). 
- **Manual Review Workflow**: Disables automatic message sending after voice recognition, allowing users to review and edit the transcribed text before clicking the send button manually.
- **Voice Interaction**: Includes both **Voice-to-Text** (mic input) and robust **Text-to-Speech** (voice output) with browser audio-context unlocking and language auto-detection (Tamil/English).
- **Safety**: The model is prompted to avoid harmful advice and defer critical issues to agricultural officers.

### Frontend Development
- **`base.html`**: The unified layout with a responsive Bootstrap navbar and footer.
- **`index.html`**: Landing page with an introduction to the platform and quick links.
- **`report.html`**: Form specifically designed for rural users to report issues (with category dropdown and optional image upload), including JS validation.
- **`services.html` & `announcements.html`**: Dynamic pages generating lists/cards of DB records.
- **`admin_dashboard.html`**: A simple CMS interface for resolving complaints and publishing new content.
- Visuals will be clean, utilizing vibrant colors suited for an agriculture theme (greens, earth tones) to give a modern yet accessible feel.
- **Responsiveness**: All pages will be optimized for mobile, tablet, and desktop screens using Bootstrap's grid system and custom CSS media queries. The chatbot page will use adaptive sizing to ensure it fills the viewport comfortably on any device.

## Deployment Strategy (Render)

We will deploy the application as a Web Service on **Render**.

### Configuration
1. **Build Command**: `pip install -r requirements.txt`
2. **Start Command**: `gunicorn app:app`
3. **Internal Port**: `10000` (Render default)

### Environment Variables
The following secrets must be configured in the Render Dashboard:
- `GEMINI_API_KEY`: Your Google AI SDK key.
- `SECRET_KEY`: A strong random string for Flask sessions.

> [!WARNING]
> Since SQLite is a file-based database, data added on Render will be reset whenever the service restarts (e.g., during a new deploy). For a permanent data store, consider migrating to a hosted PostgreSQL database in the future.

## Verification Plan

### Automated/Local Tests
- Run `python app.py` and ensure the Flask development server starts without errors.
- Verify `egram.db` is automatically created with the correct schema if it doesn't exist.

### Manual Verification
- **Navigation:** Open `http://localhost:5000` in the browser and verify all navigation links work.
- **Form Submission:** Submit a test complaint with an image upload. Verify that the image is saved in `static/uploads/` and the record appears in the SQLite database.
- **Admin Access:** Log into the admin portal, check the newly submitted complaint, change its status to "Resolved", and verify the change persists. Add a test announcement and test service, ensuring they immediately render on their respective public pages.
- **Responsiveness:** Resize the browser window to mobile dimensions to ensure Bootstrap styling gracefully adapts to smaller screens. 
