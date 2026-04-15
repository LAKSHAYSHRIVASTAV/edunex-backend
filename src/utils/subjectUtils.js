const CANONICAL_SUBJECTS = [
  "Physics",
  "Mathematics",
  "English",
  "Computer",
  "General",
];

const SUBJECT_MATCHERS = [
  {
    subject: "Mathematics",
    pattern: /\b(math|maths|algebra|equation|calculus|geometry|trigonometry|derivative|integration|probability|statistics)\b/i,
  },
  {
    subject: "Physics",
    pattern: /\b(physics|force|energy|motion|velocity|acceleration|magnetic|electric|capacitor|momentum|waves?)\b/i,
  },
  {
    subject: "English",
    pattern: /\b(english|grammar|literature|sentence|comprehension|poem|poetry|essay|tenses?|vocabulary)\b/i,
  },
  {
    subject: "Computer",
    pattern: /\b(computer|coding|programming|algorithm|software|hardware|database|javascript|python|java|react|node|html|css|api)\b/i,
  },
];

const normalizeSubject = (value = "", fallbackText = "") => {
  const directValue = String(value || "").trim();

  if (CANONICAL_SUBJECTS.includes(directValue)) {
    return directValue;
  }

  const searchText = [directValue, String(fallbackText || "").trim()]
    .filter(Boolean)
    .join(" ");

  for (const matcher of SUBJECT_MATCHERS) {
    if (matcher.pattern.test(searchText)) {
      return matcher.subject;
    }
  }

  return "General";
};

module.exports = {
  CANONICAL_SUBJECTS,
  normalizeSubject,
};
