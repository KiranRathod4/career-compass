// Local datasets for Arena games (no DB needed).

export const UNSCRAMBLE_WORDS: Array<{ word: string; hint: string }> = [
  { word: "ALGORITHM", hint: "Step-by-step solution" },
  { word: "RECURSION", hint: "Function calls itself" },
  { word: "DATABASE", hint: "Stores rows" },
  { word: "VARIABLE", hint: "Stores a value" },
  { word: "FUNCTION", hint: "Reusable block of code" },
  { word: "INHERITANCE", hint: "OOP concept" },
  { word: "POLYMORPHISM", hint: "Many forms" },
  { word: "INTERFACE", hint: "Contract in OOP" },
  { word: "COMPILER", hint: "Translates code" },
  { word: "DEBUGGER", hint: "Bug hunter tool" },
  { word: "BINARY", hint: "Base 2" },
  { word: "NETWORK", hint: "Connected machines" },
  { word: "PROTOCOL", hint: "Rules of comms" },
  { word: "ENCRYPTION", hint: "Scramble data" },
  { word: "FRAMEWORK", hint: "React, Vue, ..." },
  { word: "GRADIENT", hint: "Used in ML" },
  { word: "POINTER", hint: "Holds address" },
  { word: "QUEUE", hint: "FIFO" },
  { word: "STACK", hint: "LIFO" },
  { word: "HEAP", hint: "Priority queue" },
];

export function scramble(word: string): string {
  const arr = word.split("");
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  const out = arr.join("");
  return out === word ? scramble(word) : out;
}

export function randomMathProblem(): { q: string; answer: number } {
  const ops = ["+", "-", "*"] as const;
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a = 0, b = 0, answer = 0;
  if (op === "+") {
    a = rand(10, 99); b = rand(10, 99); answer = a + b;
  } else if (op === "-") {
    a = rand(20, 99); b = rand(1, a); answer = a - b;
  } else {
    a = rand(2, 12); b = rand(2, 12); answer = a * b;
  }
  return { q: `${a} ${op} ${b}`, answer };
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
