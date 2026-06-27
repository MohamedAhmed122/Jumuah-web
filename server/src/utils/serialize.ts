type AnyDoc = unknown;

export function toJson(doc: AnyDoc, omit: string[] = []) {
  const maybeDoc = doc as { toObject?: () => Record<string, unknown> };
  const obj = typeof maybeDoc.toObject === "function" ? maybeDoc.toObject() : { ...(doc as Record<string, unknown>) };
  const { _id, __v, ...rest } = obj as Record<string, unknown>;
  for (const key of omit) delete rest[key];
  return { id: String(_id), ...rest };
}

export function toJsonList(docs: AnyDoc[], omit: string[] = []) {
  return docs.map((doc) => toJson(doc, omit));
}
