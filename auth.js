// Lightweight Firebase Authentication integration for static site.
// Requires a `firebase-config.js` that sets `window.FIREBASE_CONFIG`.
(function(){
  const loginBtnId = 'btn-login';
  const userDisplayId = 'user-display';
  const loginModalId = 'login-modal';

  function loadFirebase(callback) {
    if (window.firebase && window.firebase.auth) return callback();
    const script1 = document.createElement('script');
    script1.src = 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js';
    document.head.appendChild(script1);
    const script2 = document.createElement('script');
    script2.src = 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth-compat.js';
    document.head.appendChild(script2);
    script2.onload = () => { callback(); };
  }

  function ensureLoginModal() {
    if (document.getElementById(loginModalId)) return;
    const div = document.createElement('div');
    div.id = loginModalId;
    div.style.display = 'none';
    div.style.position = 'fixed';
    div.style.top = '0';
    div.style.left = '0';
    div.style.width = '100%';
    div.style.height = '100%';
    div.style.backgroundColor = 'rgba(0,0,0,0.5)';
    div.style.zIndex = '9999';
    div.innerHTML = `
      <div style="position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);background:#fff;padding:20px;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.3);z-index:10000;min-width:300px;">
        <h3 style="margin-top:0;">Iniciar Sesión</h3>
        <form id="login-form">
          <div style="margin-bottom:12px;">
            <label style="display:block;margin-bottom:6px;">
              <input type="radio" name="login-mode" value="signin" checked> Iniciar sesión
            </label>
            <label style="display:block;">
              <input type="radio" name="login-mode" value="signup"> Registrarse
            </label>
          </div>
          <div style="margin-bottom:10px;"><input id="login-email" type="email" placeholder="Correo" required style="width:100%;padding:8px;border:1px solid #ccc;border-radius:4px;box-sizing:border-box;"></div>
          <div style="margin-bottom:12px;"><input id="login-pass" type="password" placeholder="Contraseña" required style="width:100%;padding:8px;border:1px solid #ccc;border-radius:4px;box-sizing:border-box;"></div>
          <div style="margin-top:16px;display:flex;gap:8px;justify-content:flex-end;">
            <button type="submit" style="padding:8px 16px;background:#0060df;color:#fff;border:none;border-radius:4px;cursor:pointer;">Enviar</button>
            <button type="button" onclick="document.getElementById('${loginModalId}').style.display='none'" style="padding:8px 16px;background:#f0f0f0;border:1px solid #ccc;border-radius:4px;cursor:pointer;">Cancelar</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(div);
  }

  function initAuth() {
    // If FIREBASE_CONFIG is available, use Firebase auth, otherwise fall back to local IndexedDB Persist
    ensureLoginModal();
    
    const btnLogin = document.getElementById(loginBtnId);
    const userDisplay = document.getElementById(userDisplayId);
    const modal = document.getElementById(loginModalId);

    function showModal() { if (modal) modal.style.display = 'block'; }
    function hideModal() { if (modal) modal.style.display = 'none'; }

    if (btnLogin) btnLogin.addEventListener('click', showModal);

    const form = document.getElementById('login-form');
    const signoutBtn = document.getElementById('btn-signout');

    if (window.FIREBASE_CONFIG && window.firebase && window.firebase.auth) {
      try { firebase.initializeApp(window.FIREBASE_CONFIG); } catch (e) {}
      const auth = firebase.auth();

      if (form) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const email = document.getElementById('login-email').value.trim();
          const pass = document.getElementById('login-pass').value;
          const mode = document.querySelector('input[name="login-mode"]:checked').value;
          if (mode === 'signup') {
            auth.createUserWithEmailAndPassword(email, pass)
              .then(() => { hideModal(); })
              .catch(err => alert('Signup error: ' + err.message));
          } else {
            auth.signInWithEmailAndPassword(email, pass)
              .then(() => { hideModal(); })
              .catch(err => alert('Signin error: ' + err.message));
          }
        });
      }

      if (signoutBtn) signoutBtn.addEventListener('click', () => auth.signOut());

      auth.onAuthStateChanged(user => {
        if (user) {
          if (userDisplay) userDisplay.textContent = user.email || user.displayName || 'Usuario';
          if (btnLogin) btnLogin.style.display = 'none';
          if (signoutBtn) signoutBtn.style.display = 'inline-block';
          window.currentUser = { id: user.uid || ('fb_' + (user.email||'').replace(/[^a-z0-9]/gi,'')), email: user.email };
          if (typeof window.loadUserStateFromStorage === 'function') window.loadUserStateFromStorage(window.currentUser.id);
        } else {
          if (userDisplay) userDisplay.textContent = '';
          if (btnLogin) btnLogin.style.display = 'inline-block';
          if (signoutBtn) signoutBtn.style.display = 'none';
          window.currentUser = null;
        }
      });

    } else {
      // Local fallback using Persist (IndexedDB)
      function setupLocalAuth() {
        if (typeof Persist === 'undefined') {
          setTimeout(setupLocalAuth, 100);
          return;
        }
        Persist.init().then(() => {
        if (form) {
          form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value.trim();
            const pass = document.getElementById('login-pass').value;
            const mode = document.querySelector('input[name="login-mode"]:checked').value;
            try {
              let u;
              if (mode === 'signup') {
                u = await Persist.createUser(email, pass);
              } else {
                u = await Persist.signIn(email, pass);
              }
              window.currentUser = { id: u.id, email: u.email };
              if (userDisplay) userDisplay.textContent = u.email;
              if (btnLogin) btnLogin.style.display = 'none';
              if (signoutBtn) signoutBtn.style.display = 'inline-block';
              hideModal();
              if (typeof window.loadUserStateFromStorage === 'function') await window.loadUserStateFromStorage(u.id);
            } catch (err) {
              alert('Auth error: ' + (err && err.message ? err.message : err));
            }
          });
        }

        if (signoutBtn) signoutBtn.addEventListener('click', async () => {
          window.currentUser = null;
          if (userDisplay) userDisplay.textContent = '';
          if (btnLogin) btnLogin.style.display = 'inline-block';
          if (signoutBtn) signoutBtn.style.display = 'none';
          // Optionally reload the app state to local default
          if (typeof window.loadState === 'function') window.loadState();
        });
      }).catch(e => console.warn('Persist init failed', e));
      }
      setupLocalAuth();
    }
  }

  // Init when DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    loadFirebase(() => {
      initAuth();
    });
  });
})();
