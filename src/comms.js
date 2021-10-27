export const Patterns = {
  one_three_five: {
    name: "One Three Five",
    pattern: ["c", "e", "g"],
  },
  five_three_one: {
    name: "Five Three One",
    pattern: ["g", "e", "c"],
  },
  one_two_one_two_one: {
    name: "One Two One Two One",
    pattern: ["c", "d", "c", "d", "c"],
  },
};

const names = Object.keys(Patterns);

export function send(name) {
  console.log(JSON.stringify({ name }));
}

export function receive(payload) {
  const name = names.find((n) => payload.includes(n));
  if (name) {
    return [name, Patterns[name]];
  }
  return null;
}
