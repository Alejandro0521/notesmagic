// persistence.js — IndexedDB helper for local users and per-user notebook state
(function(){
  const DB_NAME = 'notesmagica_db_v1';
  const DB_VERSION = 1;
  let db = null;

  function openDB() {
    return new Promise((resolve, reject) => {
      if (db) return resolve(db);
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (ev) => {
        const idb = ev.target.result;
        if (!idb.objectStoreNames.contains('users')) {
          const us = idb.createObjectStore('users', { keyPath: 'id' });
          us.createIndex('email', 'email', { unique: true });
        }
        if (!idb.objectStoreNames.contains('states')) {
          const ss = idb.createObjectStore('states', { keyPath: 'userId' });
        }
      };
      req.onsuccess = () => { db = req.result; resolve(db); };
      req.onerror = () => reject(req.error || new Error('IndexedDB error'));
    });
  }

  async function hashPassword(password) {
    const enc = new TextEncoder().encode(password || '');
    const digest = await crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2,'0')).join('');
  }

  async function createUser(email, password) {
    const idb = await openDB();
    const tx = idb.transaction('users', 'readwrite');
    const store = tx.objectStore('users');
    const idx = store.index('email');
    const existing = await new Promise(res => { const r = idx.get(email); r.onsuccess = () => res(r.result); r.onerror = () => res(null); });
    if (existing) throw new Error('Usuario ya existe');
    const passHash = await hashPassword(password);
    const user = { id: 'user_' + Date.now(), email, passHash, createdAt: Date.now() };
    store.add(user);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve({ id: user.id, email: user.email });
      tx.onerror = () => reject(tx.error || new Error('createUser failed'));
    });
  }

  async function signIn(email, password) {
    const idb = await openDB();
    const tx = idb.transaction('users', 'readonly');
    const store = tx.objectStore('users');
    const idx = store.index('email');
    const found = await new Promise(res => { const r = idx.get(email); r.onsuccess = () => res(r.result); r.onerror = () => res(null); });
    if (!found) throw new Error('Usuario no encontrado');
    const passHash = await hashPassword(password);
    if (passHash !== found.passHash) throw new Error('Contraseña incorrecta');
    return { id: found.id, email: found.email };
  }

  async function saveState(userId, stateObj) {
    const idb = await openDB();
    const tx = idb.transaction('states', 'readwrite');
    const store = tx.objectStore('states');
    const payload = { userId, stateJson: JSON.stringify(stateObj), updatedAt: Date.now() };
    store.put(payload);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('saveState failed'));
    });
  }

  async function loadState(userId) {
    const idb = await openDB();
    const tx = idb.transaction('states', 'readonly');
    const store = tx.objectStore('states');
    const req = store.get(userId);
    return new Promise((resolve, reject) => {
      req.onsuccess = () => {
        const rec = req.result;
        if (!rec) return resolve(null);
        try { resolve(JSON.parse(rec.stateJson)); } catch (e) { resolve(null); }
      };
      req.onerror = () => reject(req.error || new Error('loadState failed'));
    });
  }

  // Export/import helpers
  async function exportState(userId) {
    const s = await loadState(userId);
    return s ? JSON.stringify(s) : null;
  }

  async function importState(userId, jsonStr) {
    try {
      const obj = JSON.parse(jsonStr);
      await saveState(userId, obj);
      return true;
    } catch (e) { throw e; }
  }

  // Public API
  window.Persist = {
    init: openDB,
    createUser,
    signIn,
    saveState,
    loadState,
    exportState,
    importState,
    hashPassword
  };

})();
