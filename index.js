const KEY_A = 65;
const KEY_D = 68;
const KEY_W = 87;
const KEY_S = 83;

const SIZE = 500;
const HSIZE = SIZE / 2;
const MARGIN = 0;

const BOT_SIZE = 11;
const HBOT_SIZE = BOT_SIZE / 2;
const BOT_TURN_NORMAL = 1;
const BOT_TURN_SLOW = 0.25;

const RAY_SIZE = 800;
const NUM_RAYS = 20;
const RAY_ANGLE = 20;
const RAY_STEP = RAY_ANGLE / NUM_RAYS;

const THING_SIZE = 11;
const HTHING_SIZE = THING_SIZE / 2;
const NUM_THINGS = 5;

const WALL_DEPTH = 10;
const WALLS = [
  { name: "north", x: HSIZE, y: 0, w: SIZE, h: 10 },
  { name: "south", x: HSIZE, y: SIZE, w: SIZE, h: 10 },
  { name: "west", x: 0, y: HSIZE, w: 10, h: SIZE },
  { name: "east", x: SIZE, y: HSIZE, w: 10, h: SIZE },
];

const SLEEP = 100;

const state = {
  firstFrame: true,
  bot: {
    x: HSIZE,
    y: HSIZE,
    r: 270,
    wall: null,
    things: [],
  },
  things: [],
  conversation: [],
  runAiEnabled: true,
};

function setup() {
  const canvas = createCanvas(SIZE, SIZE);
  canvasContainer.append(canvas);
  rectMode(CENTER);
  angleMode(DEGREES);
  for (let i = 0; i < NUM_THINGS; i++) {
    state.things.push({
      name: `thing${i}`,
      x: random(0, SIZE),
      y: random(0, SIZE),
      hit: false,
    });
  }
}

function drawWalls() {
  fill("white");
  noStroke();
  for (const wall of WALLS) {
    rect(wall.x, wall.y, wall.w, wall.h);
  }
  stroke("black");
}

function drawBot() {
  fill("orange");
  push();
  translate(state.bot.x, state.bot.y);
  rotate(state.bot.r);

  stroke(255);
  for (let i = 0; i < NUM_RAYS; i++) {
    push();
    rotate(i * RAY_STEP - RAY_ANGLE / 2);
    line(0, 0, RAY_SIZE, 0);
    pop();
  }

  stroke("black");
  rect(0, 0, BOT_SIZE, BOT_SIZE);
  rect(HBOT_SIZE, 0, HBOT_SIZE, HBOT_SIZE);

  pop();
}

function drawThings() {
  for (const thing of state.things) {
    fill(thing.hit ? "red" : "white");
    rect(thing.x, thing.y, THING_SIZE, THING_SIZE);
  }
}

function rayCast(x, y, w, h, a = 0) {
  return collideLineRect(
    state.bot.x,
    state.bot.y,
    state.bot.x + RAY_SIZE * cos(state.bot.r + a),
    state.bot.y + RAY_SIZE * sin(state.bot.r + a),
    x,
    y,
    w,
    h,
    true,
  );
}

function getIntersection(hit) {
  for (const side of ["top", "bottom", "left", "right"]) {
    if (hit[side].x) {
      return hit[side];
    }
  }
}

function rayCastAll() {
  state.bot.things.length = 0;
  for (const thing of state.things) {
    thing.hit = false;
    for (let i = 0; i < NUM_RAYS; i++) {
      const hits = rayCast(
        thing.x - HTHING_SIZE,
        thing.y - HTHING_SIZE,
        THING_SIZE,
        THING_SIZE,
        i * RAY_STEP - RAY_ANGLE / 2,
      );
      const intersection = getIntersection(hits);
      if (intersection) {
        const distance = floor(
          dist(state.bot.x, state.bot.y, intersection.x, intersection.y),
        );
        state.bot.things.push({ name: thing.name, distance });
        thing.hit = true;
        break;
      }
    }
  }
  for (const wall of WALLS) {
    const hits = rayCast(
      wall.x - wall.w / 2,
      wall.y - wall.h / 2,
      wall.w,
      wall.h,
    );
    const intersection = getIntersection(hits);
    if (intersection) {
      const distance = floor(
        dist(state.bot.x, state.bot.y, intersection.x, intersection.y),
      );
      state.bot.wall = { name: wall.name, distance };
      break;
    }
  }
}

function mod(n, m) {
  return ((n % m) + m) % m;
}

function getBotState() {
  return {
    x: floor(state.bot.x),
    y: floor(state.bot.y),
    heading: mod(state.bot.r - 90, 360) - 180,
    thingsInSight: state.bot.things,
    wallInSight: state.bot.wall,
  };
}

function getNiceBotState() {
  const { x, y, heading, wallInSight } = getBotState();
  return trimLines(`
    Llama is at (${x}, ${y}). Llama's heading is ${heading} degrees. Llama is facing the ${wallInSight.name} wall. The ${wallInSight.name} wall is ${wallInSight.distance} units away.
  `);
}

function draw() {
  background(0);
  rayCastAll();
  info.textContent = JSON.stringify(getBotState(), null, 2);
  drawWalls();
  drawBot();
  drawThings();
  if (state.firstFrame) {
    runAi();
    state.firstFrame = false;
  }
  if (keyIsDown(KEY_A)) {
    turn(keyIsDown(SHIFT) ? -BOT_TURN_SLOW : -BOT_TURN_NORMAL);
  } else if (keyIsDown(KEY_D)) {
    turn(keyIsDown(SHIFT) ? BOT_TURN_SLOW : BOT_TURN_NORMAL);
  }
  if (keyIsDown(KEY_W)) {
    move(keyIsDown(SHIFT) ? 1 : 2);
  } else if (keyIsDown(KEY_S)) {
    move(keyIsDown(SHIFT) ? -1 : -2);
  }
}

async function fetchResponse(prompt) {
  const resp = await fetch("http://127.0.0.1:8080/completion", {
    body: JSON.stringify({
      prompt,
      stop: ["</s>", "User:", "State:", "Entry:"],
    }),
    method: "POST",
  }).then((r) => r.json());
  return trimLines(resp.content);
}

function turn(degrees) {
  state.bot.r = (state.bot.r + degrees) % 360;
}

function move(steps) {
  state.bot.x = min(
    SIZE - MARGIN,
    max(MARGIN, state.bot.x + steps * cos(state.bot.r)),
  );
  state.bot.y = min(
    SIZE - MARGIN,
    max(MARGIN, state.bot.y + steps * sin(state.bot.r)),
  );
}

function done() {
  state.runAiEnabled = false;
}

const PREAMBLE = `
    This is an interaction between Llama and its Goal, with State and Entries.
    Llama is a bot that moves and turns in a room with specific commands.
    The room is a square with a side length of 500.
    Llama cannot leave the room.
    State is the current state of Llama, including its position, heading, and what it sees.
    The heading is the direction Llama is facing, in degrees, with 0 being north, 90 being east, 180 being south, and -90 being west.
    Llama is precise and never fails to provide a command immediately.
    Llama is an expert at navigating the room.
    Llama is logical and reasons well.
    Llama is very good at spatial reasoning.
    Llama is very good at planning.
    Llama is very good at explaining its reasoning.
    Llama moves slowly and deliberately.
    Llama turns slowly and deliberately.
    Llama is very good understanding the Goal.
    Llama is very good at knowing when it has completed the Goal.
    Llama uses the shortest set of commands to complete the Goal.
    Llama can move in any increment, for example 10 steps, 17 steps, or 33 steps.
    Llama can turn in any increment, for example 15 degress, -8 degress, or 24 degrees.
    Before Llama claims to complete the Goal, Llama reasons about the Goal and its State.
    Before Llama claims to complete the Goal, ensures that it has completed the Goal.
    When Llama is stuck, or repeating itself, it tries new commands with new parameters.
    Llama must respond with commands in correct javascript syntax.
    Llama must separate multiple commands with a semicolon.
    Llama must not respond with markdown.
    Llama's response absolutely must not contain triple backticks (\`\`\`).
    Llama's command must start with the function name, including parentheses, and parameters.
    Llama's command must be lower-case.

    Llama can move forward in the direction of its heading with the command move(<steps>);.
    For example, move(14); will move Llama forward by 14 steps.
    For example, move(-11); will move Llama backward by 11 steps.

    Llama can turn with the command turn(<degrees>);.
    For example, turn(36); will turn Llama 36 degrees clockwise.
    For example, turn(-12); will turn Llama 12 degrees counter-clockwise.

    Llama can complete the goal with the command done();.
    When Llama is done, Llama must respond with the command done();.

    Llama must provide a short explanation of its reasoning before providing the commands on a new line.

    <example>
    Entry: 0
    Goal: Get within 20 units of the east wall.
    State: Llama is at (450, 30). Llama's heading is 0 degrees. Llama is facing the north wall. The north wall is 30 units away.
    Reasoning: Llama is 50 units away from the east wall. Llama will turn clockwise to face the east wall.
    Command: turn(90);

    Entry: 1
    Goal: Get within 20 units of the east wall.
    State: Llama is at (450, 30). Llama's heading is 90 degrees. Llama is facing the east wall. The east wall is 50 units away.
    Reasoning: Llama is 50 units away from the east wall. Llama will move 35 units foward.
    Command: move(35);
    </example>

    The task begins with the following conversation:
`;

function trimLines(str) {
  return str
    .trim()
    .split("\n")
    .map((s) => s.trim())
    .join("\n");
}

function getConversation(conversation) {
  const prompt = trimLines(`
    ${PREAMBLE}

    ${trimLines(
      conversation
        .map(
          (entry, i) => `
            Entry: ${i}
            Goal: ${entry.goal}
            State: ${entry.botState}
            Reasoning: ${entry.reasoning || ""}
            ${entry.command ? `Command: ${entry.command}` : ""}
          `,
        )
        .join("\n"),
    )}
  `);
  return prompt;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runAi() {
  const goal = `Get within 20 units of the north wall.`;

  while (state.runAiEnabled) {
    const botState = getNiceBotState();
    const newConversation = [...state.conversation, { botState, goal }];

    chat.textContent = getConversation(newConversation);
    chat.scrollTop = chat.scrollTopMax;
    await sleep(SLEEP);

    const prompt = getConversation([
      ...state.conversation.slice(-2),
      { botState, goal },
    ]);
    const response = await fetchResponse(prompt);

    try {
      const reasoning = response.split("\n")[0];
      const command = response.split("\n")[1].split(":")[1].trim();
      state.conversation.push({ botState, goal, reasoning, command });

      chat.textContent = getConversation(state.conversation);
      chat.scrollTop = chat.scrollTopMax;

      await sleep(SLEEP);

      new Function("turn", "move", "done", command)(turn, move, done);
    } catch (e) {
      console.error(e.message);
    }

    await sleep(SLEEP);
  }
}
