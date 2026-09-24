/**
 * Pure JavaScript IndexedDB Storage Layer (No npm dependencies, zero-build)
 */

const DB_NAME = 'bsi_gs_explorer_db';
const DB_VERSION = 1;

let dbInstance = null;

function openDatabase() {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('catalogs')) {
        const catStore = db.createObjectStore('catalogs', { keyPath: 'id' });
        catStore.createIndex('importedAt', 'importedAt');
      }
      if (!db.objectStoreNames.contains('threats')) {
        db.createObjectStore('threats', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
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

export async function saveThreatsMappingRecord(sourceName, mappingMap) {
  const db = await openDatabase();
  const data = Array.from(mappingMap.entries());
  const record = {
    id: 'elementare_gefaehrdungen',
    importedAt: new Date().toISOString(),
    sourceName,
    mappingData: data,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction('threats', 'readwrite');
    const store = tx.objectStore('threats');
    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getThreatsMappingRecord() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('threats', 'readonly');
    const store = tx.objectStore('threats');
    const req = store.get('elementare_gefaehrdungen');
    req.onsuccess = () => {
      const rec = req.result;
      if (!rec || !rec.mappingData) {
        resolve(null);
      } else {
        resolve(new Map(rec.mappingData));
      }
    };
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
    const tx = db.transaction(['catalogs', 'threats', 'settings'], 'readwrite');
    tx.objectStore('catalogs').clear();
    tx.objectStore('threats').clear();
    tx.objectStore('settings').clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
