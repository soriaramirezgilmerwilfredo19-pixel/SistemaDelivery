const TTL_MS = 5 * 60 * 1000;

const store = new Map();

function set(courierId, lat, lng) {
  const entry = { lat, lng, updatedAt: Date.now() };
  store.set(Number(courierId), entry);
  return entry;
}

function get(courierId) {
  if (!courierId) return null;
  const entry = store.get(Number(courierId));
  if (!entry) return null;
  if (Date.now() - entry.updatedAt > TTL_MS) {
    store.delete(Number(courierId));
    return null;
  }
  return entry;
}

module.exports = { set, get, TTL_MS };
