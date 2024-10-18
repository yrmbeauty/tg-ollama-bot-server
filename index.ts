import dayjs from "dayjs"

type User = {
  id: number,
  is_bot: boolean,
  first_name: string,
  last_name: string,
  username: string,
  type?: string,
  language_code: string,
}

type Photo = {
  file_id: string,
  file_unique_id: string,
  file_size: number,
  width: number,
  height: number,
}

type Msg = {
  message_id: number,
  from: User,
  chat: User,
  date: number,
  reply_to_message?: Msg
  text?: string,
  caption?: string,
  new_chat_participant: [User],
  new_chat_member: [User],
  new_chat_members: [
    [User]
  ],
  photo: Photo[],
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

async function getImage(photo: Photo[]) {
  const file_id = photo[0]?.file_id;

  const sizeRes: {
    ok: boolean,
    result: {
      file_id: string,
      file_unique_id: string,
      file_size: number,
      file_path: string
    }
  } = await fetch(new Request(Bun.env.BOT_URL + "/getFile" + `?file_id=${file_id}`))
    .then(response => response.json());

  const fileRes = await fetch(new Request("https://api.telegram.org/file/bot" + Bun.env.BOT_TOKEN + "/" + sizeRes.result.file_path, {
    method: "GET",
    headers: {
      'Content-Type': 'application/jpg',
      'Content-Disposition': 'attachment; filename="filename.jpg"'
    }
  }))
  .then(async response => {
    return new Buffer(await response.arrayBuffer()).toString('base64');
  });

  return fileRes;
}

async function generateAnswerToUser(message: Msg) {
  const iamgeBase64 = message?.photo?.length && await getImage(message?.photo);

  const aiBody: AiBody = await fetch(new Request(Bun.env.PK_URL + "/api/generate", {
    method: "POST",
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: "llava:13b",
      prompt: message.text,
      stream: false,
      images: iamgeBase64 ? [iamgeBase64] : null
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

async function greetMembers(message: Msg) {
  const aiBody: AiBody = await fetch(new Request(Bun.env.PK_URL + "/api/generate", {
    method: "POST",
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: "llava:13b",
      prompt: "Тебя только что добавили в группу в телеграме, поздоровайся со всеми",
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
      if (tgBody?.message?.text || tgBody?.message?.caption) {
        const text = tgBody.message?.text || tgBody.message?.caption
        const message = {
          ...tgBody.message,
          text: text?.replace(/@pk_mnbvc_bot/g,'')
        }
        await generateAnswerToUser(message);
      }
      tgBody?.message?.new_chat_participant && await greetMembers(tgBody?.message);
    } catch (error) {
      console.error(error)
    } finally {
      console.log(dayjs().format('YYYY-MM-DD HH:mm:ss'), "Response status code: 200");
      return new Response("200");
    }
  },
});

console.log(`Listening on http://localhost:${server.port} ...`);