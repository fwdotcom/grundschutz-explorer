/**
 * SPDX-FileCopyrightText: 2026 Frank Winter
 * SPDX-License-Identifier: MIT
 *
 * Pure JavaScript IndexedDB Storage Layer (No npm dependencies, zero-build)
 */

const DB_NAME = 'grundschutz_explorer';
const DB_VERSION = 2;

let dbPromise = null;

function openDatabase() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('catalogs')) {
        const catStore = db.createObjectStore('catalogs', { keyPath: 'id' });
        catStore.createIndex('importedAt', 'importedAt');
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
      // Version 2: eigene Listen mit Einträgen (Anforderung + Notiz)
      if (!db.objectStoreNames.contains('lists')) {
        db.createObjectStore('lists', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('listEntries')) {
        const entryStore = db.createObjectStore('listEntries', { keyPath: 'key' });
        entryStore.createIndex('listId', 'listId');
      }
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };

    request.onerror = (event) => {
      dbPromise = null;
      reject(event.target.error);
    };
  });

  return dbPromise;
}

export async function saveCatalogRecord(record) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('catalogs', 'readwrite');
    const store = tx.objectStore('catalogs');
    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getCatalogRecord(id) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('catalogs', 'readonly');
    const store = tx.objectStore('catalogs');
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllCatalogRecords() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('catalogs', 'readonly');
    const store = tx.objectStore('catalogs');
    const req = store.getAll();
    req.onsuccess = () => {
      const records = req.result || [];
      records.sort((a, b) => (b.importedAt || '').localeCompare(a.importedAt || ''));
      resolve(records);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteCatalogRecord(id) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('catalogs', 'readwrite');
    const store = tx.objectStore('catalogs');
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function saveSetting(key, value) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readwrite');
    const store = tx.objectStore('settings');
    const req = store.put({ key, value });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getSetting(key, defaultValue = undefined) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readonly');
    const store = tx.objectStore('settings');
    const req = store.get(key);
    req.onsuccess = () => {
      resolve(req.result ? req.result.value : defaultValue);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function clearAllData() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const stores = ['catalogs', 'settings', 'lists', 'listEntries'];
    const tx = db.transaction(stores, 'readwrite');
    for (const name of stores) tx.objectStore(name).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ---------- Listen ----------

function getAllFrom(storeName) {
  return openDatabase().then(
    (db) =>
      new Promise((resolve, reject) => {
        const req = db.transaction(storeName, 'readonly').objectStore(storeName).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      })
  );
}

export function getAllLists() {
  return getAllFrom('lists');
}

export function getAllListEntries() {
  return getAllFrom('listEntries');
}

// Schreibt Listen und Einträge in einer Transaktion (Anlegen, Umbenennen, Import)
export async function saveListData(lists = [], entries = []) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['lists', 'listEntries'], 'readwrite');
    for (const list of lists) tx.objectStore('lists').put(list);
    for (const entry of entries) tx.objectStore('listEntries').put(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteListEntry(key) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('listEntries', 'readwrite');
    tx.objectStore('listEntries').delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Löscht eine Liste samt aller Einträge
export async function deleteList(listId) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['lists', 'listEntries'], 'readwrite');
    tx.objectStore('lists').delete(listId);
    const cursorReq = tx.objectStore('listEntries').index('listId').openKeyCursor(IDBKeyRange.only(listId));
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (!cursor) return;
      tx.objectStore('listEntries').delete(cursor.primaryKey);
      cursor.continue();
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
