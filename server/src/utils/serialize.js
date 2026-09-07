export const PUBLIC_USER_FIELDS =
  "name username email phone avatarUrl about isOnline lastSeenAt privacy createdAt";

export const serializeUser = (user) => {
  if (!user) return null;
  const doc = user.toObject ? user.toObject() : user;
  return {
    id: doc._id?.toString() || doc.id,
    name: doc.name,
    username: doc.username,
    email: doc.email,
    phone: doc.phone || "",
    avatarUrl: doc.avatarUrl || "",
    about: doc.about || "",
    isOnline: Boolean(doc.isOnline),
    lastSeenAt: doc.lastSeenAt || null,
    privacy: doc.privacy || {},
    createdAt: doc.createdAt || null,
  };
};

export const serializeUserLight = (user) => {
  if (!user) return null;
  const doc = user.toObject ? user.toObject() : user;
  return {
    id: doc._id?.toString() || doc.id,
    name: doc.name,
    username: doc.username,
    avatarUrl: doc.avatarUrl || "",
    about: doc.about || "",
    isOnline: Boolean(doc.isOnline),
    lastSeenAt: doc.lastSeenAt || null,
  };
};