const threads = [
  {
    id: "sol",
    name: "Sol Arcade",
    role: "creative strategist",
    mood: "turning loose sparks into launch plans",
    status: "online",
    accent: "#ff8a5b",
    accentStrong: "#ff5f3c",
    threadGlow: "rgba(255, 138, 91, 0.45)",
    sidebarSheen: "linear-gradient(180deg, rgba(15, 67, 76, 0.94), rgba(46, 86, 98, 0.84))",
    blurb: "Fast visual instincts and sharp naming energy.",
    prompts: [
      "Pitch a launch concept with cinematic energy",
      "Make this interface feel more premium",
      "Turn rough notes into a crisp message"
    ],
    replies: {
      style: [
        "Push the silhouette first. A strong outline does more work than five decorative details.",
        "Keep one loud note, one calm note, and one surprise. That balance usually lands clean.",
        "I would sharpen the hierarchy, then let color do less. Restraint makes the bold parts brighter."
      ],
      plan: [
        "Break it into three beats: hook, proof, release. If the middle is weak, the whole thing droops.",
        "Start with the audience mood, not the feature list. People remember trajectory before detail.",
        "Give it a simple rhythm: arrival, delight, next step. That sequence keeps momentum."
      ],
      default: [
        "There is something here. Tighten the first line, brighten the core idea, and let the ending breathe.",
        "That has good motion already. I would make one part unmistakable and one part pleasantly strange.",
        "Interesting direction. We can make it feel more intentional by removing one layer and deepening the main gesture."
      ]
    },
    messages: [
      { from: "system", text: "Atrium synced with Sol Arcade." },
      {
        from: "them",
        author: "Sol Arcade",
        time: "09:12",
        text: "I tuned this room for bold drafts and quick pivots. Bring me the rough version first."
      },
      {
        from: "me",
        author: "You",
        time: "09:14",
        text: "Perfect. I want sharper ideas without making the interface feel noisy."
      },
      {
        from: "them",
        author: "Sol Arcade",
        time: "09:15",
        text: "Good constraint. Noise happens when every element performs at full volume."
      }
    ]
  },
  {
    id: "marina",
    name: "Marina Current",
    role: "systems storyteller",
    mood: "mapping complex flows into calm language",
    status: "drifting",
    accent: "#19b7b4",
    accentStrong: "#0f8e9c",
    threadGlow: "rgba(25, 183, 180, 0.45)",
    sidebarSheen: "linear-gradient(180deg, rgba(9, 73, 82, 0.94), rgba(18, 108, 121, 0.84))",
    blurb: "Soft-spoken structure for complicated ideas.",
    prompts: [
      "Explain this feature like a guided tour",
      "Turn the workflow into a calmer story",
      "Help me simplify the wording"
    ],
    replies: {
      style: [
        "Use fewer nouns per sentence. The calmer the wording, the more trustworthy the system feels.",
        "A gentle interface still needs clear edges. Define the boundaries, then soften the transitions.",
        "The tone should feel like guidance, not instruction. That shifts the whole experience."
      ],
      plan: [
        "Frame the flow as a sequence of small certainties. People relax when the next step feels obvious.",
        "Name the user's first decision, then reduce everything around it. The rest can arrive later.",
        "I would reveal complexity in layers instead of paragraphs. Let the interface carry some of the explanation."
      ],
      default: [
        "That can be clearer with one anchor sentence and one supporting detail. Any more is probably overwork.",
        "The structure is close. I would smooth the transitions so the meaning feels continuous.",
        "There is a calmer version of that idea. Strip it to the core action and its immediate reward."
      ]
    },
    messages: [
      { from: "system", text: "Marina Current opened a tide window." },
      {
        from: "them",
        author: "Marina Current",
        time: "10:03",
        text: "If the system is doing many things, the language should do fewer."
      },
      {
        from: "them",
        author: "Marina Current",
        time: "10:04",
        text: "Tell me where users hesitate and I can usually hear where the copy is too heavy."
      }
    ]
  },
  {
    id: "juniper",
    name: "Juniper Relay",
    role: "product operator",
    mood: "turning ideas into actions with signal",
    status: "focused",
    accent: "#ffb347",
    accentStrong: "#ff8f1f",
    threadGlow: "rgba(255, 179, 71, 0.45)",
    sidebarSheen: "linear-gradient(180deg, rgba(50, 67, 72, 0.94), rgba(97, 82, 47, 0.84))",
    blurb: "Decisive prompts, timelines, and next steps.",
    prompts: [
      "Give me the next three concrete steps",
      "Find the hidden risk in this idea",
      "Convert this into a short checklist"
    ],
    replies: {
      style: [
        "If it needs a meeting, it probably needs a sharper sentence first.",
        "The design can stay expressive as long as the actions stay boringly clear.",
        "I would reduce the number of visual priorities. Decision speed matters more than decoration."
      ],
      plan: [
        "First decide what must ship, then what must be shown, then what can wait. That order saves time.",
        "This wants a checklist, an owner, and a stop condition. Anything missing there becomes drift.",
        "I would sequence this into now, next, and later. Most planning problems are just unclear timing."
      ],
      default: [
        "Useful direction. Now give it one owner and one deadline or it stays atmospheric.",
        "That idea is solid if the first interaction proves value immediately.",
        "Keep the ambition, but cut the surface area. The faster the first win, the stronger the rest feels."
      ]
    },
    messages: [
      { from: "system", text: "Juniper Relay is in focused mode." },
      {
        from: "them",
        author: "Juniper Relay",
        time: "11:26",
        text: "Strong ideas survive contact with constraints. Weak ones need mood to hide."
      }
    ]
  },
  {
    id: "atlas",
    name: "Atlas Bloom",
    role: "imagination engine",
    mood: "mixing visual drama with strange elegance",
    status: "sparked",
    accent: "#ff6f91",
    accentStrong: "#ff9671",
    threadGlow: "rgba(255, 111, 145, 0.38)",
    sidebarSheen: "linear-gradient(180deg, rgba(66, 52, 77, 0.94), rgba(108, 73, 85, 0.86))",
    blurb: "For unexpected turns, hooks, and atmosphere.",
    prompts: [
      "Invent a more surprising visual angle",
      "Write a weird but useful opener",
      "Make the whole room feel more memorable"
    ],
    replies: {
      style: [
        "Give the interface one image people can almost remember physically. That is usually what sticks.",
        "A little theatricality is healthy. Just make sure the controls still feel inevitable.",
        "Try contrast in texture, not just color. Smooth against grain can feel alive fast."
      ],
      plan: [
        "Lead with a surprising image, anchor it with utility, then let the system become practical again.",
        "You need one signature moment in the first five seconds. Everything else can be quieter.",
        "I would define the mood in a sentence before drawing anything. Otherwise the visuals wander."
      ],
      default: [
        "There is room to get stranger without losing clarity. Pick one element and let it misbehave beautifully.",
        "Nice direction. It wants one memorable flourish so the room does not dissolve into generic polish.",
        "We can make that more alive by contrasting something airy with something architectural."
      ]
    },
    messages: [
      { from: "system", text: "Atlas Bloom lit the studio lamps." },
      {
        from: "them",
        author: "Atlas Bloom",
        time: "12:41",
        text: "A chat app should feel like entering a place, not opening a utility."
      }
    ]
  }
];

const scenes = [
  { key: "sunrise", label: "Sunrise lobby with warm glass and bright air" },
  { key: "lagoon", label: "Lagoon deck with cooler light and crisp edges" },
  { key: "afterglow", label: "Afterglow salon with peach heat and soft tension" }
];

const ui = {
  body: document.body,
  roomCount: document.querySelector("#roomCount"),
  threadList: document.querySelector("#threadList"),
  threadName: document.querySelector("#threadName"),
  threadRole: document.querySelector("#threadRole"),
  threadMood: document.querySelector("#threadMood"),
  statusDot: document.querySelector("#statusDot"),
  messageStage: document.querySelector("#messageStage"),
  messageList: document.querySelector("#messageList"),
  promptStrip: document.querySelector("#promptStrip"),
  composerForm: document.querySelector("#composerForm"),
  composerInput: document.querySelector("#composerInput"),
  timeDisplay: document.querySelector("#timeDisplay"),
  sparkButton: document.querySelector("#sparkButton"),
  sceneButton: document.querySelector("#sceneButton"),
  sceneLabel: document.querySelector("#sceneLabel")
};

const state = {
  activeThreadId: threads[0].id,
  sceneIndex: 0,
  messageId: 0
};

function getThread(threadId = state.activeThreadId) {
  return threads.find((thread) => thread.id === threadId);
}

function formatTime(date = new Date()) {
  return new Intl.DateTimeFormat([], {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function setScene() {
  const scene = scenes[state.sceneIndex];
  ui.body.dataset.scene = scene.key;
  ui.sceneLabel.textContent = scene.label;
}

function applyThreadPalette(thread) {
  const root = document.documentElement;
  root.style.setProperty("--accent", thread.accent);
  root.style.setProperty("--accent-strong", thread.accentStrong);
  root.style.setProperty("--accent-soft", `${thread.accent}2b`);
  root.style.setProperty("--thread-glow", thread.threadGlow);
  root.style.setProperty("--sidebar-sheen", thread.sidebarSheen);
}

function renderThreadList() {
  ui.roomCount.textContent = `${threads.length} rooms`;

  ui.threadList.innerHTML = threads
    .map((thread) => {
      const isActive = thread.id === state.activeThreadId ? "is-active" : "";

      return `
        <button class="thread-card ${isActive}" type="button" data-thread-id="${thread.id}">
          <div class="thread-card__top">
            <p class="thread-card__title">${thread.name}</p>
            <span class="thread-card__pulse" aria-hidden="true"></span>
          </div>
          <p class="thread-card__meta">${thread.role}</p>
          <p class="thread-card__blurb">${thread.blurb}</p>
          <div class="thread-card__bottom">
            <span class="thread-card__mood">${thread.status}</span>
            <span class="thread-card__mood">${thread.mood}</span>
          </div>
        </button>
      `;
    })
    .join("");
}

function typingMarkup() {
  return `
    <span class="typing" aria-label="Typing">
      <span></span>
      <span></span>
      <span></span>
    </span>
  `;
}

function renderMessages() {
  const thread = getThread();

  ui.messageList.innerHTML = thread.messages
    .map((message) => {
      if (message.from === "system") {
        return `
          <li class="message message--system">
            <div class="message__bubble">${escapeHtml(message.text)}</div>
          </li>
        `;
      }

      const direction = message.from === "me" ? "message--me" : "message--them";
      const bubbleContent = message.typing ? typingMarkup() : escapeHtml(message.text);

      return `
        <li class="message ${direction}">
          <div class="message__meta">
            <span>${escapeHtml(message.author)}</span>
            <span>${escapeHtml(message.time || "")}</span>
          </div>
          <div class="message__bubble">${bubbleContent}</div>
        </li>
      `;
    })
    .join("");

  requestAnimationFrame(() => {
    ui.messageStage.scrollTop = ui.messageStage.scrollHeight;
  });
}

function renderPrompts() {
  const thread = getThread();

  ui.promptStrip.innerHTML = thread.prompts
    .map(
      (prompt) =>
        `<button class="prompt-chip" type="button" data-prompt="${escapeHtml(prompt)}">${escapeHtml(prompt)}</button>`
    )
    .join("");
}

function renderHeader() {
  const thread = getThread();
  ui.threadName.textContent = thread.name;
  ui.threadRole.textContent = thread.role;
  ui.threadMood.textContent = thread.mood;
  ui.statusDot.setAttribute("title", thread.status);
}

function renderApp() {
  applyThreadPalette(getThread());
  renderThreadList();
  renderHeader();
  renderMessages();
  renderPrompts();
}

function autoResizeComposer() {
  ui.composerInput.style.height = "0px";
  ui.composerInput.style.height = `${Math.min(ui.composerInput.scrollHeight, 176)}px`;
}

function detectReplyBucket(input) {
  if (/(look|style|color|visual|ui|design|premium|beautiful)/i.test(input)) {
    return "style";
  }

  if (/(plan|steps|checklist|launch|workflow|timeline|next|risk)/i.test(input)) {
    return "plan";
  }

  return "default";
}

function chooseReply(thread, input) {
  const bucket = detectReplyBucket(input);
  const options = thread.replies[bucket];
  return options[Math.floor(Math.random() * options.length)];
}

function addMessage(thread, message) {
  thread.messages.push({
    id: state.messageId += 1,
    ...message
  });
}

function removeTypingMessage(thread) {
  const typingIndex = thread.messages.findIndex((message) => message.typing);
  if (typingIndex >= 0) {
    thread.messages.splice(typingIndex, 1);
  }
}

function queueReply(userText) {
  const thread = getThread();

  addMessage(thread, {
    from: "them",
    author: thread.name,
    typing: true,
    time: formatTime()
  });

  renderMessages();

  const delay = 850 + Math.round(Math.random() * 850);

  window.setTimeout(() => {
    removeTypingMessage(thread);
    addMessage(thread, {
      from: "them",
      author: thread.name,
      time: formatTime(),
      text: chooseReply(thread, userText)
    });
    renderMessages();
  }, delay);
}

function sendMessage(rawText) {
  const text = rawText.trim();
  if (!text) {
    return;
  }

  const thread = getThread();
  addMessage(thread, {
    from: "me",
    author: "You",
    time: formatTime(),
    text
  });

  renderMessages();
  queueReply(text);
}

function setActiveThread(threadId) {
  if (threadId === state.activeThreadId) {
    return;
  }

  state.activeThreadId = threadId;
  renderApp();
}

function injectPrompt(prompt) {
  ui.composerInput.value = prompt;
  autoResizeComposer();
  ui.composerInput.focus();
}

function seedRandomPrompt() {
  const thread = getThread();
  const prompt = thread.prompts[Math.floor(Math.random() * thread.prompts.length)];
  injectPrompt(prompt);
}

function updateClock() {
  ui.timeDisplay.textContent = formatTime();
}

ui.threadList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-thread-id]");
  if (!button) {
    return;
  }

  setActiveThread(button.dataset.threadId);
});

ui.promptStrip.addEventListener("click", (event) => {
  const button = event.target.closest("[data-prompt]");
  if (!button) {
    return;
  }

  injectPrompt(button.dataset.prompt);
});

ui.sparkButton.addEventListener("click", () => {
  seedRandomPrompt();
});

ui.sceneButton.addEventListener("click", () => {
  state.sceneIndex = (state.sceneIndex + 1) % scenes.length;
  setScene();
});

ui.composerInput.addEventListener("input", autoResizeComposer);

ui.composerInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    ui.composerForm.requestSubmit();
  }
});

ui.composerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = ui.composerInput.value;
  if (!text.trim()) {
    return;
  }

  sendMessage(text);
  ui.composerInput.value = "";
  autoResizeComposer();
});

setScene();
renderApp();
autoResizeComposer();
updateClock();
window.setInterval(updateClock, 30000);
