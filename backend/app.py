from flask import Flask, request, jsonify
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from pymongo import MongoClient
from dotenv import load_dotenv
import os
import base64
import certifi


# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app, origins="*", supports_credentials=True)

# Connect to MongoDB
client = MongoClient(os.getenv("MONGO_URI"), tlsCAFile=certifi.where())
db = client["docnotes"]          # database name
notes_collection = db["notes"]   # collection (like a table) name

# ─── ROUTES ──────────────────────────────────────────────

# Health check — visit this to confirm the server is running
@app.route("/")
def home():
    return send_from_directory("../frontend", "index.html")

@app.route("/<path:filename>")
def static_files(filename):
    return send_from_directory("../frontend", filename)


# CREATE — Save a new note + document
@app.route("/notes", methods=["POST"])
def create_note():
    data = request.json  # Get JSON data sent from the frontend

    # Basic validation
    if not data.get("title") or not data.get("note"):
        return jsonify({"error": "Title and note are required"}), 400

    new_note = {
        "title": data["title"],       # Document title
        "note": data["note"],         # The user's note text
        "filename": data.get("filename", ""),  # Original file name
        "filedata": data.get("filedata", "")   # File contents (base64 encoded)
    }

    result = notes_collection.insert_one(new_note)  # Save to MongoDB

    return jsonify({"message": "Note saved!", "id": str(result.inserted_id)}), 201


# READ — Get all saved notes
@app.route("/notes", methods=["GET"])
def get_notes():
    notes = list(notes_collection.find())  # Get all notes from MongoDB

    # MongoDB uses "_id" which isn't JSON serializable, so we convert it to a string
    for note in notes:
        note["_id"] = str(note["_id"])
        # Don't send file data in list view (keeps response small)
        note.pop("filedata", None)

    return jsonify(notes)


# READ ONE — Get a single note with its file
@app.route("/notes/<note_id>", methods=["GET"])
def get_note(note_id):
    from bson import ObjectId
    note = notes_collection.find_one({"_id": ObjectId(note_id)})

    if not note:
        return jsonify({"error": "Note not found"}), 404

    note["_id"] = str(note["_id"])
    return jsonify(note)


# DELETE — Remove a note
@app.route("/notes/<note_id>", methods=["DELETE"])
def delete_note(note_id):
    from bson import ObjectId
    notes_collection.delete_one({"_id": ObjectId(note_id)})
    return jsonify({"message": "Note deleted!"})


# ─── START SERVER ─────────────────────────────────────────
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)