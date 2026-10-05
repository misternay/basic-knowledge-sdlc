import guide from '../../content/learning-paths.json' with { type: 'json' };

export { guide };

// Imported replacements can have entirely different content, even with a known ID.
export function topicGuide(topic) {
  return topic && !topic.temp ? guide.topics[topic.id] ?? null : null;
}

export function routeTopics(topics) {
  return guide.route.map((id) => topics.find((topic) => topic.id === id && !topic.temp)).filter(Boolean);
}
