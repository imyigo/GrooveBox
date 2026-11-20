import { parseProject, SongProject, STORAGE_KEY } from "./project";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("songwriter-pro", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("projects");
    request.onerror = () => reject(request.error);
    request.onblocked = () =>
      reject(new Error("Proje deposu başka bir sekmede kilitli."));
    request.onsuccess = () => resolve(request.result);
  });
}
export async function readSavedProject(): Promise<SongProject | null> {
  if (typeof indexedDB !== "undefined") {
    const db = await openDatabase();
    try {
      const json = await new Promise<unknown>((resolve, reject) => {
        const request = db
          .transaction("projects")
          .objectStore("projects")
          .get("current");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      if (typeof json === "string") return parseProject(json);
    } finally {
      db.close();
    }
  }
  const legacy = localStorage.getItem(STORAGE_KEY);
  return legacy ? parseProject(legacy) : null;
}
export async function saveProject(project: SongProject): Promise<void> {
  const json = JSON.stringify(project);
  if (typeof indexedDB === "undefined") {
    localStorage.setItem(STORAGE_KEY, json);
    return;
  }
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("projects", "readwrite");
      transaction.objectStore("projects").put(json, "current");
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}
