const API = "http://ec2-3-138-105-216.us-east-2.compute.amazonaws.com:5000";

// ── Load all notes when page opens ──
window.onload = loadNotes;

async function loadNotes() {
  const res = await fetch(`${API}/notes`);
  const notes = await res.json();

  const list = document.getElementById("notesList");
  list.innerHTML = "";

  if (notes.length === 0) {
    list.innerHTML = "<p style='color:#aaa'>No notes yet. Create one!</p>";
    return;
  }

  notes.forEach(note => {
    const card = document.createElement("div");
    card.className = "note-card";
    card.innerHTML = `
      <div>
        <h3>${note.title}</h3>
        <p>${note.note.substring(0, 80)}${note.note.length > 80 ? "..." : ""}</p>
      </div>
      <div class="card-buttons">
        <button class="btn-view" onclick="viewNote('${note._id}')">👁 View</button>
        <button class="btn-delete" onclick="deleteNote('${note._id}')">🗑 Delete</button>
      </div>
    `;
    list.appendChild(card);
  });
}

// ── Save a new note ──
async function saveNote() {
  const title = document.getElementById("title").value.trim();
  const noteText = document.getElementById("noteText").value.trim();
  const fileInput = document.getElementById("fileInput");

  if (!title || !noteText) {
    alert("Please fill in the title and notes fields.");
    return;
  }

  let filename = "";
  let filedata = "";

  // If a file was uploaded, convert it to base64
  if (fileInput.files.length > 0) {
    const file = fileInput.files[0];
    filename = file.name;
    filedata = await toBase64(file);
  }

  const res = await fetch(`${API}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, note: noteText, filename, filedata })
  });

  const data = await res.json();
  if (res.ok) {
    // Clear the form
    document.getElementById("title").value = "";
    document.getElementById("noteText").value = "";
    document.getElementById("fileInput").value = "";
    loadNotes(); // Refresh the list
  } else {
    alert("Error: " + data.error);
  }
}

// ── View a single note in the modal ──
async function viewNote(id) {
  const res = await fetch(`${API}/notes/${id}`);
  const note = await res.json();

  document.getElementById("modalTitle").textContent = note.title;
  document.getElementById("modalNote").textContent = note.note;

  const iframe = document.getElementById("modalFile");
  if (note.filedata) {
    iframe.src = note.filedata; // base64 data URL works directly in iframe
  } else {
    iframe.src = "";
    iframe.srcdoc = "<p style='padding:20px;color:#aaa'>No document attached.</p>";
  }

  document.getElementById("modal").classList.remove("hidden");
}

// ── Close the modal ──
function closeModal() {
  document.getElementById("modal").classList.add("hidden");
}

// ── Delete a note ──
async function deleteNote(id) {
  if (!confirm("Delete this note?")) return;
  await fetch(`${API}/notes/${id}`, { method: "DELETE" });
  loadNotes();
}

// ── Helper: Convert file to base64 string ──
function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result); // result is a base64 data URL
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}