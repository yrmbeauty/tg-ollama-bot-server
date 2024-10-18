import dayjs from "dayjs"

type User = {
  id: number,
  is_bot: boolean,
  first_name: string,
  last_name: string,
  username: string,
  language_code: string,
}

type Msg = {
  message_id: number,
  from: User,
  chat: User,
  date: number,
  reply_to_message?: Msg
  text: string,
  new_chat_participant: [User],
  new_chat_member: [User],
  new_chat_members: [
    [User]
  ],
}

type InlineQuery = {
  id: number,
  from: User,
  chat_type: string,
  query: string,
  offset: string,
}

type TgBody = {
  update_id: number,
  message?: Msg
  inline_query?: InlineQuery
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

type Users = {
  [id: string]: AiBody["context"];
}

let users: Users = {};

async function generateAnswerToUser(message: Msg) {
  const aiBody: AiBody = await fetch(new Request(Bun.env.PK_URL + "/api/generate", {
    method: "POST",
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: "llama3.2",
      prompt: message.text,
      stream: false,
      context: users[message.from.id]
    })
  }))
  .then(response => response.json())

  users[message.from.id] = aiBody.context;

  await fetch(new Request(Bun.env.BOT_URL + "/sendMessage", {
    method: "POST",
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      chat_id: message.chat.id,
      text: aiBody.response
    })
  }));
}

async function greetMembers(message: Msg) {
  const aiBody: AiBody = await fetch(new Request(Bun.env.PK_URL + "/api/generate", {
    method: "POST",
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: "llama3.2",
      prompt: "Тебя только что добавили в новую группу в телеграме, поздоровайся со всеми",
      stream: false,
    })
  }))
  .then(response => response.json())

  await fetch(new Request(Bun.env.BOT_URL + "/sendMessage", {
    method: "POST",
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      chat_id: message.chat.id,
      text: aiBody.response
    })
  }));
}

const server = Bun.serve({
  port: 1400,
  async fetch(req) {
    try {
      const tgBody: TgBody = await req.json()
      tgBody?.message?.text && generateAnswerToUser(tgBody.message);
      tgBody?.message?.new_chat_participant && greetMembers(tgBody?.message);
    } catch (error) {
      console.error(error)
    } finally {
      console.log("Response status code: 200");
      return new Response("200");
    }
  },
});

console.log(`Listening on http://localhost:${server.port} ...`);