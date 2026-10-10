/**
 * db.js — IndexedDB hand-written wrapper
 * Stores: users, complaints
 */

const DB_NAME = 'gujarat-metro-v1';
const DB_VER  = 1;

let _db = null;

function open() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('session')) {
        db.createObjectStore('session', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('complaints')) {
        const cs = db.createObjectStore('complaints', { keyPath: 'id', autoIncrement: true });
        cs.createIndex('userId',  'userId');
        cs.createIndex('status',  'status');
        cs.createIndex('trainId', 'trainId');
        cs.createIndex('synced',  'synced');
      }
    };
    req.onsuccess  = (e) => { _db = e.target.result; resolve(_db); };
    req.onerror    = ()  => reject(req.error);
  });
}

function tx(store, mode, fn) {
  return open().then(db => new Promise((resolve, reject) => {
    const t  = db.transaction(store, mode);
    const s  = t.objectStore(store);
    const req = fn(s);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  }));
}

function txAll(store, mode, fn) {
  return open().then(db => new Promise((resolve, reject) => {
    const t   = db.transaction(store, mode);
    const s   = t.objectStore(store);
    const req = s.getAll();
    req.onsuccess = () => {
      const result = fn ? fn(s, req.result) : req.result;
      // If fn returns a promise-like, wait; else resolve directly
      if (result && typeof result.then === 'function') {
        result.then(resolve).catch(reject);
      } else {
        resolve(result);
      }
    };
    req.onerror = () => reject(req.error);
  }));
}

/* ── Session (current logged-in user) ── */
export function setSession(user) {
  return tx('session', 'readwrite', s => s.put({ key: 'currentUser', ...user }));
}
export function getSession() {
  return tx('session', 'readonly', s => s.get('currentUser'));
}
export function clearSession() {
  return tx('session', 'readwrite', s => s.delete('currentUser'));
}

/* ── Complaints ── */
export function addComplaint(complaint) {
  const record = {
    ...complaint,
    id: `C-${Date.now()}`,
    createdAt: Date.now(),
    synced: false,
    status: 'submitted',
    statusHistory: [{ status: 'submitted', ts: Date.now(), note: 'Report received' }],
  };
  return tx('complaints', 'readwrite', s => s.put(record)).then(() => record);
}

export function getAllComplaints() {
  return txAll('complaints', 'readonly');
}

export function getComplaintsByUser(userId) {
  return open().then(db => new Promise((resolve, reject) => {
    const t   = db.transaction('complaints', 'readonly');
    const idx = t.objectStore('complaints').index('userId');
    const req = idx.getAll(userId);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  }));
}

export function updateComplaint(id, patch) {
  return open().then(db => new Promise((resolve, reject) => {
    const t   = db.transaction('complaints', 'readwrite');
    const s   = t.objectStore('complaints');
    const req = s.get(id);
    req.onsuccess = () => {
      const updated = { ...req.result, ...patch };
      const put = s.put(updated);
      put.onsuccess = () => resolve(updated);
      put.onerror   = () => reject(put.error);
    };
    req.onerror = () => reject(req.error);
  }));
}

export function pushStatusUpdate(id, status, note) {
  return open().then(db => new Promise((resolve, reject) => {
    const t   = db.transaction('complaints', 'readwrite');
    const s   = t.objectStore('complaints');
    const req = s.get(id);
    req.onsuccess = () => {
      const rec = req.result;
      if (!rec) return reject(new Error('Not found'));
      rec.status = status;
      rec.statusHistory = [
        ...(rec.statusHistory || []),
        { status, ts: Date.now(), note: note || status },
      ];
      const put = s.put(rec);
      put.onsuccess = () => resolve(rec);
      put.onerror   = () => reject(put.error);
    };
    req.onerror = () => reject(req.error);
  }));
}
