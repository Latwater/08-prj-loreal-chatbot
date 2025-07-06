// Copy this code into your Cloudflare Worker script

async function handleRequest(request, env) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  // Handle CORS preflight requests
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST requests for chat
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    // Check for API key
    if (!env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({
          error: "Missing OpenAI API key in Worker environment.",
        }),
        {
          status: 500,
          headers: corsHeaders,
        }
      );
    }

    const apiKey = env.OPENAI_API_KEY; // Set this secret in your Cloudflare Worker dashboard
    const apiUrl = "https://api.openai.com/v1/chat/completions";
    let userInput;
    try {
      userInput = await request.json();
    } catch (err) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request." }),
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    // Log incoming messages for debugging
    console.log("Received messages:", JSON.stringify(userInput.messages));

    const requestBody = {
      model: "gpt-4o",
      messages: userInput.messages,
      max_tokens: 300, // Correct property for OpenAI API
    };

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    // Log OpenAI response for debugging
    console.log("OpenAI response:", JSON.stringify(data));

    // If OpenAI returns an error, forward it
    if (data.error) {
      return new Response(JSON.stringify({ error: data.error.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    return new Response(JSON.stringify(data), { headers: corsHeaders });
  } catch (err) {
    // Log error for debugging
    console.log("Worker error:", err.message);
    return new Response(
      JSON.stringify({ error: "Worker error: " + err.message }),
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request, event.env));
});
