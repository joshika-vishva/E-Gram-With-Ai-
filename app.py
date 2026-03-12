from flask import Flask, render_template, request, redirect, url_for, flash, session
from werkzeug.utils import secure_filename
import os
import models
from translations import get_translation
from google import genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure Gemini AI
api_key = os.getenv("GEMINI_API_KEY")
client = None
if api_key:
    client = genai.Client(api_key=api_key)

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "super_secret_key_egram")

# Upload Config
UPLOAD_FOLDER = 'static/uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Ensure upload folder exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# --- Initialize DB on first run ---
models.init_db()

# --- Language Context Processor ---
@app.context_processor
def inject_translations():
    lang = session.get('lang', 'en')
    def t(key):
        return get_translation(lang, key)
    return dict(t=t, current_lang=lang)

@app.route('/set_lang/<lang_code>')
def set_lang(lang_code):
    if lang_code in ['en', 'ta']:
        session['lang'] = lang_code
    return redirect(request.referrer or url_for('index'))

# ================= ROUTES =================
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/report', methods=['GET', 'POST'])
def report_issue():
    if request.method == 'POST':
        name = request.form['name']
        village = request.form['village']
        phone = request.form['phone']
        problem_type = request.form['problem_type']
        description = request.form['description']
        
        # Handle File Upload
        image_path = None
        if 'image' in request.files:
            file = request.files['image']
            if file and file.filename != '' and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(file_path)
                image_path = filename # Store only the filename in DB

        conn = models.get_db_connection()
        conn.execute(
            'INSERT INTO complaints (user_name, village, phone, problem_type, description, image_path) VALUES (?, ?, ?, ?, ?, ?)',
            (name, village, phone, problem_type, description, image_path)
        )
        conn.commit()
        conn.close()
        
        flash('Complaint registered successfully!', 'success')
        return redirect(url_for('report_issue'))
        
    return render_template('report.html')

@app.route('/services')
def services():
    conn = models.get_db_connection()
    services_list = conn.execute('SELECT * FROM services').fetchall()
    conn.close()
    return render_template('services.html', services=services_list)

@app.route('/announcements')
def announcements():
    conn = models.get_db_connection()
    ann_list = conn.execute('SELECT * FROM announcements ORDER BY date DESC').fetchall()
    conn.close()
    return render_template('announcements.html', announcements=ann_list)

# ================= ADMIN ROUTES =================
@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        # Hardcoded for simplicity as requested
        if username == 'admin' and password == 'admin123':
            session['admin_logged_in'] = True
            flash('Logged in successfully.', 'success')
            return redirect(url_for('admin_dashboard'))
        else:
            flash('Invalid username or password', 'danger')
    return render_template('admin_login.html')

@app.route('/admin/logout')
def admin_logout():
    session.pop('admin_logged_in', None)
    flash('Logged out successfully.', 'success')
    return redirect(url_for('admin_login'))

@app.route('/admin/dashboard', methods=['GET', 'POST'])
def admin_dashboard():
    if not session.get('admin_logged_in'):
        return redirect(url_for('admin_login'))
        
    conn = models.get_db_connection()
    
    if request.method == 'POST':
        # Handle updating complaint status
        if 'update_status' in request.form:
            complaint_id = request.form['complaint_id']
            new_status = request.form['new_status']
            conn.execute('UPDATE complaints SET status = ? WHERE id = ?', (new_status, complaint_id))
            conn.commit()
            flash('Complaint status updated.', 'success')
            
        # Handle adding announcements
        elif 'add_announcement' in request.form:
            title = request.form['title']
            description = request.form['description']
            conn.execute('INSERT INTO announcements (title, description) VALUES (?, ?)', (title, description))
            conn.commit()
            flash('Announcement added.', 'success')
            
        # Handle adding services (bonus feature to make it complete)
        elif 'add_service' in request.form:
            name = request.form['service_name']
            desc = request.form['service_description']
            conn.execute('INSERT INTO services (service_name, service_description) VALUES (?, ?)', (name, desc))
            conn.commit()
            flash('Service added.', 'success')

    complaints_list = conn.execute('SELECT * FROM complaints ORDER BY created_at DESC').fetchall()
    conn.close()
    
    return render_template('admin_dashboard.html', complaints=complaints_list)

@app.route('/chatbot')
def chatbot_page():
    return render_template('chatbot.html')

# ================= AI CHATBOT ROUTE =================
system_instruction = """
Your name is Zara. Act as a professional AI engineer and full-stack developer.
Build an AI-powered Agriculture Chatbot for a website called “e-Gram Digital Platform.”

Purpose:
The chatbot should help farmers by answering agriculture-related questions and providing practical farming guidance. The chatbot must support both Tamil and English languages and respond in the same language used by the farmer.

Language Rules:
* If the user writes in Tamil → reply in Tamil.
* If the user writes in English → reply in English.
* Use simple, farmer-friendly language.

Core Knowledge Areas:
1. Crop Guidance: Provide advice for common crops such as Paddy (Rice), Sugarcane, Groundnut, Maize, Banana, Coconut, Tomato, Vegetables. Explain Soil preparation, Seed selection, Fertilizer recommendations, Crop growth stages, Harvesting tips.
2. Pest and Disease Control: Identify common pests and diseases, Suggest organic and chemical control methods, Provide safe farming advice.
3. Irrigation Guidance: Drip irrigation, Sprinkler irrigation, Water management tips, Drought management advice.
4. Seasonal Advice: Recommend best crops based on season, Provide monsoon and summer farming tips, Weather precautions.
5. Government Schemes: Provide information about Farmer subsidies, Agriculture loans, Tamil Nadu farmer support schemes, Crop insurance programs.

Smart Features:
1. Voice Interaction: Allow farmers to speak questions in Tamil using speech-to-text (handled on frontend).
2. Crop Recommendation: Suggest crops based on Season, Soil type, Water availability.
3. Farmer-Friendly Responses: Keep answers Short, Practical, Step-by-step.
4. Clarification: If the question is unclear, ask follow-up questions.

Safety Rules:
* Do not give dangerous advice.
* Encourage farmers to consult agricultural officers for serious problems.
"""


# Chat API Route
@app.route('/api/chat', methods=['POST'])
def api_chat():
    current_api_key = os.getenv("GEMINI_API_KEY")
    if not current_api_key:
        return {"error": "AI Chatbot is currently unavailable (API Key missing in environment)."}, 503
        
    try:
        # Re-initialize client if API key changed or not initialized
        chat_client = genai.Client(api_key=current_api_key)
        
        data = request.get_json()
        if not data or 'message' not in data:
            return {"error": "Message is required"}, 400
            
        user_message = data['message']
        
        response = chat_client.models.generate_content(
            model="gemini-1.5-flash",
            contents=user_message,
            config={
                "system_instruction": system_instruction,
            }
        )
        return {"response": response.text}
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        error_msg = str(e)
        if "User location is not supported" in error_msg:
            error_msg = "The Google AI API is currently restricted in the region where this server is hosted. Please try again later or contact support."
        
        print(f"Chat API Error: {e}")
        return {"error": f"Failed to generate response: {error_msg}"}, 500

if __name__ == '__main__':
    app.run(debug=True)
