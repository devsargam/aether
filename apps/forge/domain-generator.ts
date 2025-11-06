// Simple word lists for generating friendly, memorable domain names
// Like crypto wallet seed phrases: "purple-mountain-tiger-river"

const adjectives = [
  "azure", "brilliant", "calm", "daring", "eager", "fierce", "gentle", "happy",
  "ivory", "jolly", "kind", "lively", "merry", "noble", "proud", "quiet",
  "rapid", "silver", "tender", "unique", "vivid", "warm", "wise", "young",
  "brave", "clever", "bright", "swift", "bold", "cosmic", "crystal", "divine",
  "electric", "golden", "jade", "lunar", "mystic", "ocean", "prism", "quantum",
  "royal", "sonic", "stellar", "turbo", "ultra", "velvet", "wild", "zen"
];

const nouns = [
  "anchor", "breeze", "cloud", "dawn", "ember", "frost", "grove", "hawk",
  "island", "jade", "kite", "leaf", "moon", "nest", "oak", "peak",
  "quest", "river", "star", "tide", "valley", "wave", "wind", "zenith",
  "comet", "delta", "echo", "flame", "galaxy", "horizon", "iris", "jungle",
  "lotus", "meadow", "nebula", "orchid", "phoenix", "quasar", "ridge", "summit",
  "thunder", "unity", "vertex", "willow", "zephyr", "aurora", "forest", "harbor"
];

const animals = [
  "bear", "cobra", "deer", "eagle", "fox", "gecko", "heron", "jaguar",
  "koala", "lynx", "moose", "newt", "otter", "panda", "raven", "seal",
  "tiger", "viper", "wolf", "zebra", "falcon", "hawk", "lion", "owl",
  "shark", "whale", "bison", "crane", "drake", "gazelle", "hound", "ibex",
  "jackal", "leopard", "manta", "nautilus", "osprey", "python", "rhino", "stork"
];

const verbs = [
  "rising", "flowing", "soaring", "blazing", "shining", "dancing", "glowing", "flying",
  "racing", "sailing", "diving", "jumping", "running", "roaming", "drifting", "spinning",
  "charging", "surging", "rushing", "leaping", "sprinting", "gliding", "streaming", "floating"
];

/**
 * Generates a random word-based domain name using 3-4 simple words
 * Examples: "brave-tiger-rising", "golden-phoenix-mountain", "swift-river-dancing"
 *
 * This avoids using repo names which may contain illegal characters like . / etc
 */
export function generateDomainName(): string {
  const random = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

  // Use 3-4 words for uniqueness while keeping it memorable
  const useVerb = Math.random() > 0.5;

  const parts = [
    random(adjectives),
    random(nouns),
    random(animals),
  ];

  if (useVerb) {
    parts.push(random(verbs));
  }

  return parts.join("-");
}

/**
 * Generates a unique domain name by appending a short random suffix if needed
 * This is useful when checking against existing deployments
 */
export function generateUniqueDomainName(existingDomains: Set<string>): string {
  let domain = generateDomainName();

  // If collision occurs (very rare), append a short random suffix
  if (existingDomains.has(domain)) {
    const suffix = Math.random().toString(36).substring(2, 6);
    domain = `${domain}-${suffix}`;
  }

  return domain;
}
