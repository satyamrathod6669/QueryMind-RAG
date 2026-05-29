export default {
  async fetch(request, env) {
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json"
    };

    if (request.method === "OPTIONS") return new Response(null, { headers });
    if (request.method !== "POST") return new Response(JSON.stringify({ error: "POST only" }), { headers });

    try {
      const { question, context } = await request.json();

      const chunkSize = 1000;
      const overlap = 200;
      const chunks = [];
      for (let i = 0; i < context.length; i += chunkSize - overlap) {
        chunks.push(context.substring(i, i + chunkSize));
        if (i + chunkSize >= context.length) break;
      }

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: `You are a helpful assistant. The content may be in Hindi, English or any other language. Answer the question in the same language as the question. Answer based on the provided content only. If answer is not found say "This is not covered on this page." Be concise and direct.`
            },
            {
              role: "user",
              content: `Content:\n\n${chunks.slice(0, 12).join('\n---\n')}\n\nQuestion: ${question}`
            }
          ],
          max_tokens: 500
        })
      });

      const data = await response.json();
      const answer = data?.choices?.[0]?.message?.content || JSON.stringify(data);

      return new Response(JSON.stringify({
        answer,
        rewritten_question: question
      }), { headers });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { headers });
    }
  }
};
