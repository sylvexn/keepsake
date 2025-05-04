import os
import uuid
import logging
from flask import Flask, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
from flask_cors import CORS
import google.auth.transport.requests
from google.oauth2 import id_token
import requests

# Load environment variables from .env file
load_dotenv()

# Configuration settings
# Base directory of the backend
BASE_DIR = Path(__file__).resolve().parent

# Upload folder for images
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")

# Create uploads directory if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Database file path
DATABASE_PATH = os.path.join(BASE_DIR, "keepsake.db")

# Secret key for authentication
SECRET_KEY = os.environ.get("KEEPSAKE_SECRET_KEY")

# Base URL for image access
BASE_URL = os.environ.get("KEEPSAKE_BASE_URL", "https://i.syl.rest/")

# Server settings
HOST = os.environ.get("KEEPSAKE_HOST", "0.0.0.0")
PORT = int(os.environ.get("KEEPSAKE_PORT", 5005))
DEBUG = os.environ.get("KEEPSAKE_DEBUG", "False").lower() == "true"

# Import database module and make DATABASE_PATH available to it
import database
database.DATABASE_PATH = DATABASE_PATH

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(os.path.dirname(__file__), 'keepsake.log')),
        logging.StreamHandler()
    ]
)

# Initialize the Flask app
app = Flask(__name__)
CORS(app, resources={
    r"/api/*": {"origins": ["http://localhost:5173", "https://i.syl.rest"]},
    r"/upload": {"origins": ["http://localhost:5173", "https://i.syl.rest"]},
    r"/*": {"origins": ["http://localhost:5173", "https://i.syl.rest"]}
}, supports_credentials=True)  # Enable CORS for specific routes with credential support

# Set security headers to avoid COOP issues
@app.after_request
def set_security_headers(response):
    # Set Cross-Origin-Opener-Policy to same-origin-allow-popups to allow Google Auth popups
    response.headers['Cross-Origin-Opener-Policy'] = 'same-origin-allow-popups'
    return response

# Initialize database function
def initialize_database():
    database.init_db()
    logging.info("Application started, database initialized")
    database.add_log("INFO", "Application started", "app.py", "Server startup complete")

# Helper function to get file extension
def get_file_extension(filename):
    return os.path.splitext(filename)[1].lower() if "." in filename else ""

# Helper function to generate unique filename
def generate_unique_filename(original_filename):
    extension = get_file_extension(original_filename)
    return f"{uuid.uuid4().hex[:6]}{extension}"

# Helper function to check if file type is allowed
def allowed_file(filename):
    # Define allowed extensions
    ALLOWED_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'}
    extension = get_file_extension(filename)
    return extension in ALLOWED_EXTENSIONS

# Route for image upload (ShareX endpoint)
@app.route('/upload', methods=['POST'])
def upload_image():
    # Check if secret key is provided and valid
    if 'secret' not in request.form:
        logging.warning("Upload attempt without secret key")
        database.add_log("WARNING", "Upload attempt without secret key", "app.py", f"IP: {request.remote_addr}")
        return jsonify({"error": "Authentication required"}), 403
    
    if request.form['secret'] != SECRET_KEY:
        logging.warning("Upload attempt with invalid secret key")
        database.add_log("WARNING", "Upload attempt with invalid secret key", "app.py", f"IP: {request.remote_addr}")
        return jsonify({"error": "Authentication failed"}), 403
    
    # Check if image file is included in the request
    if 'image' not in request.files:
        logging.warning("Upload attempt without image file")
        database.add_log("WARNING", "Upload attempt without image file", "app.py", f"IP: {request.remote_addr}")
        return jsonify({"error": "No image file provided"}), 400
    
    image_file = request.files['image']
    
    # Check if the file has a name
    if image_file.filename == '':
        logging.warning("Upload attempt with empty filename")
        database.add_log("WARNING", "Upload attempt with empty filename", "app.py", f"IP: {request.remote_addr}")
        return jsonify({"error": "No selected file"}), 400
    
    # Secure the filename and check if the file type is allowed
    original_filename = secure_filename(image_file.filename)
    if not allowed_file(original_filename):
        extension = get_file_extension(original_filename)
        logging.warning(f"Upload attempt with disallowed file type: {extension}")
        database.add_log("WARNING", f"Upload attempt with disallowed file type: {extension}", "app.py", f"IP: {request.remote_addr}")
        return jsonify({"error": "File type not allowed"}), 400
    
    try:
        # Generate a unique filename
        saved_filename = generate_unique_filename(original_filename)
        file_path = os.path.join(UPLOAD_FOLDER, saved_filename)
        
        # Save the file
        image_file.save(file_path)
        
        # Get file size
        file_size = os.path.getsize(file_path)
        
        # Build the URL for accessing the image
        image_url = f"{BASE_URL}{saved_filename}"
        
        # Store metadata in the database
        file_extension = get_file_extension(original_filename)
        image_id = database.add_image(
            original_filename=original_filename,
            saved_filename=saved_filename,
            url=image_url,
            file_extension=file_extension,
            file_size=file_size
        )
        
        if not image_id:
            raise Exception("Failed to store image metadata in the database")
        
        # Log the successful upload
        logging.info(f"Image uploaded successfully: {saved_filename}")
        database.add_log("INFO", f"Image uploaded successfully", "app.py", f"File: {saved_filename}, Size: {file_size} bytes")
        
        # Return the URL to the uploaded image
        return jsonify({"url": image_url}), 200
        
    except Exception as e:
        logging.error(f"Error during image upload: {str(e)}")
        database.add_error("Image upload error", str(e), "high")
        return jsonify({"error": "Failed to upload image"}), 500

# Route to serve images
@app.route('/<filename>', methods=['GET'])
def serve_image(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

# API endpoint to get statistics
@app.route('/api/stats', methods=['GET'])
def get_stats():
    try:
        stats = database.get_stats()
        return jsonify(stats), 200
    except Exception as e:
        logging.error(f"Error retrieving stats: {str(e)}")
        database.add_error("Stats retrieval error", str(e), "medium")
        return jsonify({"error": "Failed to retrieve statistics"}), 500

# API endpoint to get paginated list of images
@app.route('/api/images', methods=['GET'])
def get_images():
    try:
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        
        # Parse filter parameters
        filters = {}
        for param in ['file_extension', 'filename', 'date_from', 'date_to', 'min_size', 'max_size', 'sort_by', 'sort_order']:
            if param in request.args:
                filters[param] = request.args.get(param)
        
        images_data = database.get_images(page=page, per_page=per_page, filters=filters)
        return jsonify(images_data), 200
    except Exception as e:
        logging.error(f"Error retrieving images: {str(e)}")
        database.add_error("Images retrieval error", str(e), "medium")
        return jsonify({"error": "Failed to retrieve images"}), 500

# API endpoint to get a specific image
@app.route('/api/images/<int:image_id>', methods=['GET'])
def get_image(image_id):
    try:
        image = database.get_image(image_id)
        if not image:
            return jsonify({"error": "Image not found"}), 404
        return jsonify(image), 200
    except Exception as e:
        logging.error(f"Error retrieving image {image_id}: {str(e)}")
        database.add_error(f"Image {image_id} retrieval error", str(e), "medium")
        return jsonify({"error": "Failed to retrieve image"}), 500

# API endpoint to delete an image
@app.route('/api/images/<int:image_id>', methods=['DELETE'])
def delete_image(image_id):
    try:
        # Get the image details before deletion for file removal
        image = database.get_image(image_id)
        if not image:
            return jsonify({"error": "Image not found"}), 404
        
        # Delete from database
        success = database.delete_image(image_id)
        if not success:
            return jsonify({"error": "Failed to delete image from database"}), 500
        
        # Delete the physical file
        file_path = os.path.join(UPLOAD_FOLDER, image['saved_filename'])
        if os.path.exists(file_path):
            os.remove(file_path)
            logging.info(f"Image file deleted: {file_path}")
        
        return jsonify({"message": "Image deleted successfully"}), 200
    except Exception as e:
        logging.error(f"Error deleting image {image_id}: {str(e)}")
        database.add_error(f"Image {image_id} deletion error", str(e), "medium")
        return jsonify({"error": "Failed to delete image"}), 500

# API endpoint to get logs
@app.route('/api/logs', methods=['GET'])
def get_logs():
    try:
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 50))
        
        # Parse filter parameters
        filters = {}
        for param in ['level', 'search', 'date_from', 'date_to']:
            if param in request.args:
                filters[param] = request.args.get(param)
        
        logs_data = database.get_logs(page=page, per_page=per_page, filters=filters)
        return jsonify(logs_data), 200
    except Exception as e:
        logging.error(f"Error retrieving logs: {str(e)}")
        database.add_error("Logs retrieval error", str(e), "medium")
        return jsonify({"error": "Failed to retrieve logs"}), 500

# API endpoint to get errors
@app.route('/api/errors', methods=['GET'])
def get_errors():
    try:
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        include_resolved = request.args.get('include_resolved', 'false').lower() == 'true'
        
        errors_data = database.get_errors(page=page, per_page=per_page, include_resolved=include_resolved)
        return jsonify(errors_data), 200
    except Exception as e:
        logging.error(f"Error retrieving errors: {str(e)}")
        # Don't add an error here to avoid potential loop
        return jsonify({"error": "Failed to retrieve errors"}), 500

# API endpoint to resolve an error
@app.route('/api/errors/<int:error_id>/resolve', methods=['POST'])
def resolve_error(error_id):
    try:
        success = database.resolve_error(error_id)
        if not success:
            return jsonify({"error": "Error not found or already resolved"}), 404
        return jsonify({"message": "Error resolved successfully"}), 200
    except Exception as e:
        logging.error(f"Error resolving error {error_id}: {str(e)}")
        database.add_error(f"Error {error_id} resolve error", str(e), "medium")
        return jsonify({"error": "Failed to resolve error"}), 500

# API endpoint for Google authentication
@app.route('/api/auth/google', methods=['POST'])
def google_auth():
    try:
        # Get the ID token from the request
        data = request.get_json()
        if not data or 'idToken' not in data:
            return jsonify({"error": "ID token is required"}), 400
        
        token = data['idToken']
        
        # Specify the CLIENT_ID of the app that accesses the backend
        CLIENT_ID = '80900908307-8kjc4tcjjt26kk53taogjj1qr3es80mc.apps.googleusercontent.com'
        
        # Set the authorized email(s) - only this email can log in
        AUTHORIZED_EMAILS = os.environ.get("AUTHORIZED_EMAILS", "").split(",")
        
        # If no authorized emails are set, use a default one for development
        if not AUTHORIZED_EMAILS or (len(AUTHORIZED_EMAILS) == 1 and AUTHORIZED_EMAILS[0] == ""):
            logging.warning("No AUTHORIZED_EMAILS environment variable set, using default safety measures")
            # You would typically add your email here as a fallback
            # This is empty now and will cause all logins to fail unless env var is set
            AUTHORIZED_EMAILS = []
        
        # Verify the token
        try:
            # Verify the token's signature and extract its payload
            idinfo = id_token.verify_oauth2_token(
                token, google.auth.transport.requests.Request(), CLIENT_ID)
            
            # Get user info
            userid = idinfo['sub']
            email = idinfo.get('email', '')
            name = idinfo.get('name', '')
            
            # Check if the user is authorized
            if email not in AUTHORIZED_EMAILS:
                logging.warning(f"Unauthorized login attempt: {email}")
                database.add_log("WARNING", "Unauthorized login attempt", "app.py", f"User: {email}")
                return jsonify({"error": "You are not authorized to access this application"}), 403
            
            # Log the successful login
            logging.info(f"User logged in with Google: {email}")
            database.add_log("INFO", f"User logged in with Google", "app.py", f"User: {email}")
            
            # Return user info
            return jsonify({
                "success": True,
                "user": {
                    "id": userid,
                    "email": email,
                    "name": name
                }
            }), 200
            
        except ValueError as e:
            # Invalid token
            logging.warning(f"Invalid Google ID token: {str(e)}")
            database.add_log("WARNING", "Invalid Google ID token", "app.py", str(e))
            return jsonify({"error": "Invalid token"}), 401
            
    except Exception as e:
        logging.error(f"Google auth error: {str(e)}")
        database.add_error("Google auth error", str(e), "high")
        return jsonify({"error": "Authentication failed"}), 500

# Health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "timestamp": datetime.now().isoformat()}), 200

# Run the app
if __name__ == '__main__':
    initialize_database()
    app.run(host=HOST, port=PORT, debug=DEBUG) 