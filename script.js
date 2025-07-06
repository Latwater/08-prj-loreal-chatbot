/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

/* --- Conversation history for context --- */
const messages = [
  {
    role: "system",
    content:
      "You are a helpful assistant for L’Oréal. Only answer questions about L’Oréal products, routines, recommendations, and beauty-related topics. If asked about anything else, politely refuse and guide the user back to L’Oréal topics.",
  },
];

/* --- Helper: Add a message bubble to the chat window --- */
function addMessage(content, sender) {
  // sender: "user" or "ai"
  const msgDiv = document.createElement("div");
  msgDiv.className = `msg ${sender}`;
  msgDiv.textContent = content;
  chatWindow.appendChild(msgDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight; // Scroll to bottom
}

/* --- Initialize chat with greeting --- */
chatWindow.innerHTML = ""; // Clear any existing content
addMessage("👋 Hello! How can I help you today?", "ai");

/* --- Handle form submit --- */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const question = userInput.value.trim();
  if (!question) return;

  // Add user message to chat and history
  addMessage(question, "user");
  messages.push({ role: "user", content: question });

  // Show loading message
  const loadingMsg = document.createElement("div");
  loadingMsg.className = "msg ai";
  loadingMsg.textContent = "Thinking…";
  chatWindow.appendChild(loadingMsg);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  // Set your Cloudflare Worker URL here
  const workerUrl = "https://your-worker-id.workers.dev"; // Make sure this matches your deployed Worker URL

  if (!workerUrl || workerUrl.includes("YOUR-CLOUDFLARE-WORKER-URL")) {
    // Remove loading message
    chatWindow.removeChild(loadingMsg);
    addMessage(
      "⚠️ Please set your Cloudflare Worker URL in script.js for the chatbot to work.",
      "ai"
    );
    userInput.value = "";
    return;
  }

  try {
    const response = await fetch(workerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      // Try to get error message from response
      let errorMsg = "Network response was not ok";
      try {
        const errorData = await response.json();
        if (errorData && errorData.error) {
          errorMsg = errorData.error;
        }
      } catch {}
      throw new Error(errorMsg);
    }

    const data = await response.json();

    // Remove loading message
    chatWindow.removeChild(loadingMsg);

    // Handle errors from the Worker or OpenAI
    if (data.error) {
      addMessage("Sorry, there was a problem with the AI: " + data.error, "ai");
      console.error("AI error:", data.error);
      userInput.value = "";
      return;
    }

    // Get assistant's reply
    let aiReply = "Sorry, I couldn't get a response. Please try again.";
    if (
      data &&
      data.choices &&
      Array.isArray(data.choices) &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content
    ) {
      aiReply = data.choices[0].message.content.trim();
    }

    addMessage(aiReply, "ai");
    messages.push({ role: "assistant", content: aiReply });
  } catch (err) {
    // Remove loading message
    chatWindow.removeChild(loadingMsg);
    addMessage(
      "Sorry, there was a problem connecting to the AI. " +
        "Please check your internet connection, Cloudflare Worker setup, and browser console for errors. " +
        "Error: " +
        err.message,
      "ai"
    );
    console.error("Fetch error:", err);
  }

  userInput.value = "";
});
