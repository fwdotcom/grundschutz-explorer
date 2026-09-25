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

    // Ein anderer Tab hält noch eine ältere Version der Datenbank offen: nicht endlos warten
    request.onblocked = () => {
      dbPromise = null;
      reject(new Error('Die Daten sind in einem anderen Tab mit einer älteren Version geöffnet. Bitte schließen Sie diesen Tab.'));
    };
  });

  return dbPromise;
}

// Schreibvorgang in einer Transaktion; erfolgreich erst, wenn die Transaktion abgeschlossen ist
// (ein Quota-Fehler zeigt sich oft erst beim Abschluss)
async function write(storeNames, fn) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeNames, 'readwrite');
    fn(tx);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Speichern abgebrochen'));
  });
}

export function saveCatalogRecord(record) {
  return write('catalogs', (tx) => tx.objectStore('catalogs').put(record));
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

export function deleteCatalogRecord(id) {
  return write('catalogs', (tx) => tx.objectStore('catalogs').delete(id));
}

export function saveSetting(key, value) {
  return write('settings', (tx) => tx.objectStore('settings').put({ key, value }));
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

export function clearAllData() {
  const stores = ['catalogs', 'settings', 'lists', 'listEntries'];
  return write(stores, (tx) => {
    for (const name of stores) tx.objectStore(name).clear();
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
export function saveListData(lists = [], entries = []) {
  return write(['lists', 'listEntries'], (tx) => {
    for (const list of lists) tx.objectStore('lists').put(list);
    for (const entry of entries) tx.objectStore('listEntries').put(entry);
  });
}

export function deleteListEntry(key) {
  return write('listEntries', (tx) => tx.objectStore('listEntries').delete(key));
}

// Löscht eine Liste samt aller Einträge
export function deleteList(listId) {
  return write(['lists', 'listEntries'], (tx) => {
    tx.objectStore('lists').delete(listId);
    const cursorReq = tx.objectStore('listEntries').index('listId').openKeyCursor(IDBKeyRange.only(listId));
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (!cursor) return;
      tx.objectStore('listEntries').delete(cursor.primaryKey);
      cursor.continue();
    };
  });
}
