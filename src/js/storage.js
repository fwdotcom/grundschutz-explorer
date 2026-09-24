/**
 * SPDX-FileCopyrightText: 2026 Frank Winter
 * SPDX-License-Identifier: MIT
 *
 * Pure JavaScript IndexedDB Storage Layer (No npm dependencies, zero-build)
 */

const DB_NAME = 'bsi_gs_explorer_db';
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
      // Version 2: gespeichertes Gefährdungs-Mapping wird nicht mehr verwendet
      if (db.objectStoreNames.contains('threats')) {
        db.deleteObjectStore('threats');
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
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
    const tx = db.transaction(['catalogs', 'settings'], 'readwrite');
    tx.objectStore('catalogs').clear();
    tx.objectStore('settings').clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
