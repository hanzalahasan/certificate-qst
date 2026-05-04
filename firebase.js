/* =====================================================
   QST — Firebase Backend Abstraction
   Wraps Firestore + Storage + Auth into a clean API
   that the rest of the app uses.
   ===================================================== */

const Backend = (() => {
  let app, auth, db, storage;
  let currentUser = null;
  let mode = 'local';   // 'local' | 'cloud'
  let initialized = false;

  // ── Initialization ────────────────────────────────
  function init() {
    if (initialized) return mode;
    const cfg = window.__firebaseConfig;

    // Detect placeholder config
    if (!cfg || cfg.apiKey === 'YOUR_API_KEY_HERE' || !cfg.apiKey) {
      mode = 'local';
      initialized = true;
      console.log('%c[QST] Running in LOCAL mode (no Firebase config)', 'color:#D97706;');
      return 'local';
    }

    try {
      app     = firebase.initializeApp(cfg);
      auth    = firebase.auth();
      db      = firebase.firestore();
      storage = firebase.storage();
      mode    = 'cloud';
      initialized = true;
      console.log('%c[QST] Cloud mode active — connected to ' + cfg.projectId, 'color:#16A34A;');
    } catch (e) {
      console.error('Firebase init failed:', e);
      mode = 'local';
      initialized = true;
    }
    return mode;
  }

  function isCloud() { return mode === 'cloud'; }
  function getMode() { return mode; }
  function getUser() { return currentUser; }

  // ── Authentication ────────────────────────────────
  function onAuthChange(callback) {
    if (!isCloud()) {
      callback(null);
      return () => {};
    }
    return auth.onAuthStateChanged((user) => {
      currentUser = user;
      callback(user);
    });
  }

  async function signIn(email, password) {
    if (!isCloud()) throw new Error('Cloud mode not configured');
    const result = await auth.signInWithEmailAndPassword(email, password);
    currentUser = result.user;
    return result.user;
  }

  async function signUp(email, password, displayName) {
    if (!isCloud()) throw new Error('Cloud mode not configured');
    const result = await auth.createUserWithEmailAndPassword(email, password);
    if (displayName) {
      await result.user.updateProfile({ displayName });
    }
    currentUser = result.user;
    return result.user;
  }

  async function signOut() {
    if (!isCloud()) return;
    await auth.signOut();
    currentUser = null;
  }

  async function resetPassword(email) {
    if (!isCloud()) throw new Error('Cloud mode not configured');
    return auth.sendPasswordResetEmail(email);
  }

  // ── Templates ─────────────────────────────────────
  async function loadTemplates() {
    if (!isCloud()) return JSON.parse(localStorage.getItem('qst_templates') || '[]');
    try {
      const snapshot = await db.collection('templates').orderBy('createdAt', 'desc').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.error('loadTemplates error:', e);
      return [];
    }
  }

  async function saveTemplate(tpl) {
    if (!isCloud()) {
      const list = JSON.parse(localStorage.getItem('qst_templates') || '[]');
      const idx  = list.findIndex(t => t.id === tpl.id);
      if (idx >= 0) list[idx] = tpl;
      else list.unshift(tpl);
      localStorage.setItem('qst_templates', JSON.stringify(list));
      return tpl;
    }

    const data = { ...tpl };
    const id   = data.id;
    delete data.id;
    if (currentUser) data.updatedBy = currentUser.uid;
    await db.collection('templates').doc(id).set(data, { merge: true });
    return { id, ...data };
  }

  async function deleteTemplate(id) {
    if (!isCloud()) {
      const list = JSON.parse(localStorage.getItem('qst_templates') || '[]').filter(t => t.id !== id);
      localStorage.setItem('qst_templates', JSON.stringify(list));
      return;
    }
    await db.collection('templates').doc(id).delete();
  }

  // ── Certificates ──────────────────────────────────
  async function loadCertificates() {
    if (!isCloud()) return JSON.parse(localStorage.getItem('qst_certificates') || '[]');
    try {
      const snapshot = await db.collection('certificates').orderBy('createdAt', 'desc').limit(1000).get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.error('loadCertificates error:', e);
      return [];
    }
  }

  async function saveCertificate(cert) {
    if (!isCloud()) {
      const list = JSON.parse(localStorage.getItem('qst_certificates') || '[]');
      const idx  = list.findIndex(c => c.id === cert.id);
      if (idx >= 0) list[idx] = cert;
      else list.unshift(cert);
      localStorage.setItem('qst_certificates', JSON.stringify(list));
      return cert;
    }

    const data = { ...cert };
    const id   = data.id;
    delete data.id;

    // Big imageData → upload to Storage instead of inlining
    if (data.imageData && data.imageData.length > 50000) {
      try {
        const url = await uploadCertImage(id, data.imageData);
        data.imageUrl  = url;
        data.imageData = null;
      } catch (e) {
        console.warn('Image upload failed, keeping inline:', e);
      }
    }

    if (currentUser) data.createdBy = data.createdBy || currentUser.uid;

    await db.collection('certificates').doc(id).set(data, { merge: true });
    return { id, ...data };
  }

  async function deleteCertificate(id) {
    if (!isCloud()) {
      const list = JSON.parse(localStorage.getItem('qst_certificates') || '[]').filter(c => c.id !== id);
      localStorage.setItem('qst_certificates', JSON.stringify(list));
      return;
    }
    // Delete image from storage too
    try { await storage.ref(`certificates/${id}.png`).delete(); } catch(e) {}
    await db.collection('certificates').doc(id).delete();
  }

  // ── Settings ──────────────────────────────────────
  async function loadSettings() {
    if (!isCloud()) {
      return JSON.parse(localStorage.getItem('qst_settings') || '{}');
    }
    try {
      const doc = await db.collection('config').doc('settings').get();
      return doc.exists ? doc.data() : {};
    } catch (e) {
      console.error('loadSettings error:', e);
      return {};
    }
  }

  async function saveSettings(settings) {
    if (!isCloud()) {
      localStorage.setItem('qst_settings', JSON.stringify(settings));
      return;
    }
    await db.collection('config').doc('settings').set(settings, { merge: true });
  }

  // ── Storage Helpers ───────────────────────────────
  async function uploadCertImage(certId, dataUrl) {
    if (!isCloud()) return dataUrl;
    const ref = storage.ref(`certificates/${certId}.png`);
    await ref.putString(dataUrl, 'data_url');
    return await ref.getDownloadURL();
  }

  async function uploadTemplateThumb(tplId, dataUrl) {
    if (!isCloud()) return dataUrl;
    const ref = storage.ref(`templates/${tplId}_thumb.jpg`);
    await ref.putString(dataUrl, 'data_url');
    return await ref.getDownloadURL();
  }

  // ── Public verification (no auth) ─────────────────
  async function verifyCertificate(certNo) {
    if (!isCloud()) {
      const list = JSON.parse(localStorage.getItem('qst_certificates') || '[]');
      return list.find(c => c.certificateNo?.toLowerCase() === certNo?.toLowerCase());
    }
    try {
      const snapshot = await db.collection('certificates')
        .where('certificateNo', '==', certNo)
        .limit(1).get();
      if (snapshot.empty) return null;
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    } catch (e) {
      console.error('verify error:', e);
      return null;
    }
  }

  // ── Real-time listeners (optional) ────────────────
  function listenToTemplates(callback) {
    if (!isCloud()) return () => {};
    return db.collection('templates').orderBy('createdAt', 'desc')
      .onSnapshot(snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }

  function listenToCertificates(callback) {
    if (!isCloud()) return () => {};
    return db.collection('certificates').orderBy('createdAt', 'desc').limit(1000)
      .onSnapshot(snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }

  // Force local mode (useful for offline use)
  function forceLocalMode() {
    mode = 'local';
    initialized = true;
    console.log('%c[QST] Forced LOCAL mode', 'color:#D97706;');
  }

  return {
    init, isCloud, getMode, getUser,
    onAuthChange, signIn, signUp, signOut, resetPassword,
    loadTemplates, saveTemplate, deleteTemplate,
    loadCertificates, saveCertificate, deleteCertificate,
    loadSettings, saveSettings,
    uploadCertImage, uploadTemplateThumb,
    verifyCertificate,
    listenToTemplates, listenToCertificates,
    forceLocalMode,
  };
})();

window.Backend = Backend;
