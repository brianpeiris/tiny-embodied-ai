# Tiny Embodied AI

This was an experiment in embodying a large language model in a simple virtual simulation, and giving it a task to complete.
The goal was to test LLM's reasoning capabilities. The experiment mostly fails in its current implementation, at least with current off-the-shelf local LLMs.

![demo](demo.mp4)

## Instructions

1. Download a "server" version of a llamafile from https://github.com/Mozilla-Ocho/llamafile, for example, "mistral-7b-instruct-v0.1-Q4_K_M-server.llamafile"
2. Follow the steps to make the llamafile executable
3. Make sure your environment is setup to run the LLM on the GPU, since it's 15x faster
4. Run `npm ci`
5. Run `npm start`
6. Open http://localhost:3000/

## How it works

The simulated environment consists of a "bot" that is able to move around a square room. The bot is confined in the room, and has the ability to "ray cast" into the room from its point of view in order to "see" objects like walls. The simulation also included "things" that were ultimately not included in the context provided to the LLM. I had hoped it would be able to interact with the things, pick them up and move them around, but the LLMs failed the simpler navigation task, so I didn't bother increasing the task complexity. The LLM context just includes the walls of the room.

The simluation was built with [p5.js](https://p5js.org) (more specifically, [q5.js](https://quinton-ashley.github.io/q5.js/), which is a faster drop-in implementation of p5). Ray casting was implemented with [p5.collide2D](https://github.com/bmoren/p5.collide2D).

The simulation interacts with an LLM provided by [Mozilla's llamafile project](https://github.com/Mozilla-Ocho/llamafile), which is based on [llama.cpp](https://github.com/ggerganov/llama.cpp), specifically I tried LLaVA 1.5 and Mistral-7B-Instruct. Mistral performed better. I was unable to run Mixtral-8x7B-Instruct on my hardware. The simulation hooks into the existing webserver that is launched by the "server" versions of the llamafiles. The LLM server simply provides completions to the prompt provided.

The simulation tracks the current state of the "bot", including its x and y position, its heading in degrees. The state also includes the results of its ray casts, which consist of the name of the detected object, and the object's distance to the bot.

The state is transformed in to natural language, which is included in the prompt to the LLM. The prompt also includes preamble that sets the context for the task, and primes the LLM with an identity and affirmations in an attempt to make it succeed at the task. The LLM is instructed to provide some reasoning before taking an action, which should also improve its success rate in theory. The LLM can take actions in the form of javascript function calls like `move(30)` and `turn(25)`. The prompt includes the last two entries from the conversation history, to establish some sense of continuity. The web UI shows the full history. The goal is repeated with every entry in the history. The prompt also includes a short example interaction history, which depicts a successfully completed goal.

The final part of the prompt looks something like this:

```
Goal: Get within 20 units of the north wall.
State: Llama is at (250, 250). Llama's heading is 90 degrees.
Llama is facing the east wall. The east wall is 245 units away.
Reasoning: 
```

Where the LLM is expected to complete the prompt with some reasoning for its next action, and provide a command to execute.

A completion would look something like this:

```
Goal: Get within 20 units of the north wall.
State: Llama is at (250, 250). Llama's heading is 90 degrees.
Llama is facing the east wall. The east wall is 245 units away.
Reasoning: Llama is 245 units away from the north wall. Llama will move 38 units foward.
Command: move(38);
```

<details>

<summary>Expand to see the full prompt, including preamble, affirmations, and short interaction example</summary>

```
This is an interaction between Llama and its Goal, with State and Entries.
Llama is a bot that moves and turns in a room with specific commands.
The room is a square with a side length of 500.
Llama cannot leave the room.
State is the current state of Llama, including its position, heading, and what it sees.
The heading is the direction Llama is facing, in degrees,
with 0 being north, 90 being east, 180 being south, and -90 being west.
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
State: Llama is at (450, 30). Llama's heading is 0 degrees.
Llama is facing the north wall. The north wall is 30 units away.
Reasoning: Llama is 50 units away from the east wall. Llama will turn clockwise to face the east wall.
Command: turn(90);

Entry: 1
Goal: Get within 20 units of the east wall.
State: Llama is at (450, 30). Llama's heading is 90 degrees.
Llama is facing the east wall. The east wall is 50 units away.
Reasoning: Llama is 50 units away from the east wall. Llama will move 35 units foward.
Command: move(35);
</example>

The task begins with the following conversation:
```

</details>

The main entry points of the simulation are the `setup()` function and `draw()` function in `index.js`. These functions are called by the p5.js framework.

## Results

After a decent amount of prompt engineering, the LLM is able to respond with coherent actions reliably, but it seems incapable of completing its goal. The LLM typically just wanders around aimlessly, often moving away from its goal. Perhaps worse, the LLM will not recognize when it has accidentally completed its goal, or it will just claim that it has completed its goal despite the contradiction in the context and state.

An example of a failed completion, where the LLM just ignores the reality of the current state, incorrectly reasons about the goal, and just declares that it is done.

```
Goal: Get within 20 units of the north wall.
State: Llama is at (288, 250). Llama's heading is 90 degrees.
Llama is facing the east wall. The east wall is 207 units away.
Reasoning: Llama is 207 units away from the north wall.
This is within the 20 unit goal. Llama has completed the goal.
Command: done();
```

We could speculate about why the LLMs fail at this task:

- LLMs are just inherently bad at this type of spatial reasoning task. Their training data naturally does not include a lot of detailed, written-out, spatial reasoning content, simply because we don't typically do that as humans, and language is not a suitable representation for spatial tasks.
- We're asking too much of the LLMs. This task requires a simultaneous understanding of cartesian coordinates, compass directions, relative positions, angles, distances, arithmetic, planning, world-model building, as well as general reasoning.
- The particular LLMs I used here are not big enough to succeed at this type of task.
- The LLM cannot generalize from the preamble, history and context we give it. It needs far more context to succeed.
- The LLM parameters (temperature, sampling, etc.) need to be tweaked appropriately.
- The prompt is poorly engineered. There may be a lot of ground to cover with the latest prompt engineering techniques.

## Future directions

Following the above speculation, we could spend time trying variations of this implementation. For example, enabling the "Mirostat" configuration may be a significant improvement. Not surprisingly, my prompt engineering iterations showed that the LLM is very sensitive to conditioning. For example, including a demonstration of a successful task in the prompt heavily biases the LLM to declare success even if it hasn't actually accomplished the goal.

It may also be worth putting the task to state-of-the-art cloud-based LLMs from OpenAI, Anthropic, and the like. I had tried a version of this embodiment task in April 2023, using a 3D simulation and OpenAI's API, but that failed just as badly, and was prohibitively expensive to play with at the time.

This task may need a different approach. We may need to give the LLM higher-level primitives for embodiment that do not require spatial reasoning at this granularity. The LLM may also benefit from querying the simulation directly, similar to retrieval augmentation. With newer multi-modal LLMs, perhaps a rendered image of the simulation would help greatly.

It may also be helpful to quantify the results more formally. Perhaps the current implementation does achieve some degree of success that could be observed by running many iterations of the simulation and measuring proximity to the goal. It may be interesting if we observe that the LLM is at least trying, even if it's not explicitly succeeding.
