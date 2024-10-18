type From = {
  id: number,
  is_bot: boolean,
  first_name: string,
  last_name: string,
  username: string,
  language_code: string,
}

type Msg = {
  message_id: number,
  from: From,
  chat: From,
  date: number,
  reply_to_message?: Msg
  text: string,
}

type TgBody = {
  update_id: number,
  message: Msg
}

type AiBody = {
  model: string,
  created_at: string,
  response: string,
  done: boolean,
  done_reason: string,
  context: number[]
  total_duration: number,
  load_duration: number,
  prompt_eval_count: number,
  prompt_eval_duration: number,
  eval_count: number,
  eval_duration: number
}

async function generateAnswerToUser(req: Request) {
  const tgBody: TgBody = await req.json()
  if (!tgBody?.message?.text) throw new Error("empty tgBody.message.text");
  console.log("tgBody", tgBody.message.text);

  const aiBody: AiBody = await fetch(new Request(Bun.env.PK_URL + "/api/generate", {
    method: "POST",
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: "llama3.2",
      prompt: tgBody.message.text,
      stream: false
    })
  }))
  .then(response => response.json())
  .then(body => body);

  await fetch(new Request(Bun.env.BOT_URL + "/sendMessage", {
    method: "POST",
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      chat_id: tgBody.message.chat.id,
      text: aiBody.response
    })
  }));
}

const server = Bun.serve({
  port: 1400,
  async fetch(req) {
    generateAnswerToUser(req);
    return new Response("200");
  },
});

console.log(`Listening on http://localhost:${server.port} ...`);