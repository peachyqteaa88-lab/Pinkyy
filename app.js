/* =========================================================
   PINKYSTUDY - App JS
   Full interactive e-commerce + service + admin dashboard
   ========================================================= */

/* ---------------- STORAGE HELPERS ---------------- */
const DB = {
  get(key, fallback){
    try{ const v = localStorage.getItem('pinky_'+key); return v ? JSON.parse(v) : fallback; }
    catch(e){ return fallback; }
  },
  set(key, val){ localStorage.setItem('pinky_'+key, JSON.stringify(val)); }
};

/* ---------------- SEED DATA ---------------- */
const DEFAULT_PRODUCTS = [
  { id:'p1', name:'Bolpoin', price:3000, unit:'biji', category:'Alat Tulis', emoji:'🖊️',
    desc:'Bolpoin tinta hitam halus, nyaman untuk menulis catatan panjang. Cocok untuk sekolah & kuliah.' },
  { id:'p2', name:'Margin Biologi', price:13000, unit:'biji', category:'Perlengkapan Belajar', emoji:'📚',
    desc:'Margin bergaris siap pakai untuk laporan praktikum Biologi. Rapi dan hemat waktu.' },
  { id:'p3', name:'Kertas Fisika', price:3000, unit:'paket (10 lembar)', category:'Perlengkapan Belajar', emoji:'📄',
    desc:'Kertas bergaris khusus Fisika, dijual per paket isi 10 lembar.' },
  { id:'p4', name:'Jasa Pembuatan Daftar Pustaka', price:7000, unit:'paket (10 daftar pustaka)', category:'Jasa', emoji:'📑',
    desc:'Layanan penyusunan daftar pustaka otomatis dan rapi. Cukup upload file, kami susun daftar pustakanya.' }
];

if(!DB.get('products')) DB.set('products', DEFAULT_PRODUCTS);
if(!DB.get('users')) DB.set('users', [
  { id:'u_admin', name:'Admin PinkyStudy', email:'admin@pinkystudy.id', whatsapp:'6281234567890', password:'admin123', role:'admin' }
]);
if(!DB.get('orders')) DB.set('orders', []);
if(!DB.get('cart')) DB.set('cart', []);
if(!DB.get('notifications')) DB.set('notifications', []);
if(!DB.get('orderCounter')) DB.set('orderCounter', 0);
if(!DB.get('settings')) DB.set('settings', { waAdmin:'6281234567890', waMessage:'Halo Admin PinkyStudy, saya ingin bertanya mengenai pesanan.' });
if(!DB.get('session')) DB.set('session', null);

/* ---------------- STATE ---------------- */
const state = {
  currentPage: 'home',
  currentDetail: null,
  searchQuery: '',
  activeCategory: 'Semua',
  cartSelected: {},
  cartQty: {},           // qty per product in Jualan page
  checkoutData: null,
  quoteIndex: 0
};

const QUOTES = [
  'Sedikit demi sedikit, tugas selesai satu per satu.',
  'Tidak harus sempurna, yang penting mulai.',
  'Belajar hari ini untuk memudahkan hari esok.',
  'Satu tugas selesai, satu langkah lebih dekat.'
];

/* ---------------- HELPERS ---------------- */
const rp = n => 'Rp' + n.toLocaleString('id-ID');
const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

function getSession(){ return DB.get('session'); }
function getUser(){ const s = getSession(); if(!s) return null; return DB.get('users').find(u=>u.id===s.userId) || null; }
function isAdmin(){ const u = getUser(); return u && u.role==='admin'; }

function saveCart(cart){ DB.set('cart', cart); updateBadges(); }
function getCart(){ return DB.get('cart'); }

function updateBadges(){
  const cart = getCart();
  const count = cart.reduce((s,i)=>s+i.qty,0);
  ['cartBadgeTop','cartBadgeMobile'].forEach(id=>{
    const el = document.getElementById(id);
    if(!el) return;
    if(count>0){ el.textContent = count; el.classList.remove('hidden'); }
    else { el.textContent='0'; el.classList.add('hidden'); }
  });
}

function toast(msg, type='success'){
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(()=>{ t.style.opacity='0'; t.style.transition='opacity .3s'; setTimeout(()=>t.remove(),300); }, 2400);
}

function modal({title, text, confirmText='OK', cancelText='Batal', onConfirm, danger=false}){
  const cont = document.getElementById('modal-container');
  cont.innerHTML = `
    <div class="modal">
      <h3>${title}</h3>
      <p>${text}</p>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="modalCancel">${cancelText}</button>
        <button class="btn ${danger?'btn-danger':'btn-primary'}" id="modalConfirm">${confirmText}</button>
      </div>
    </div>`;
  cont.classList.add('show');
  const close = ()=>{ cont.classList.remove('show'); cont.innerHTML=''; };
  document.getElementById('modalCancel').onclick = close;
  document.getElementById('modalConfirm').onclick = ()=>{ close(); onConfirm && onConfirm(); };
}

function notify(userId, message){
  const notifs = DB.get('notifications');
  notifs.push({ id:'n'+Date.now()+Math.random(), userId, message, read:false, time:new Date().toISOString() });
  DB.set('notifications', notifs);
}

/* ---------------- ROUTER ---------------- */
function navigate(hash){ window.location.hash = hash; }

function parseHash(){
  const h = window.location.hash.replace(/^#/,'') || '/';
  return h;
}

function route(){
  const path = parseHash();
  // path: / , /jualan , /keranjang , /pesanan , /profil , /bantuan , /admin ,
  //       /detail/p1 , /jasa , /checkout , /pembayaran , /pesanan/PS-00001 , /login , /daftar , /editprofil
  const parts = path.split('/').filter(Boolean);
  const root = parts[0] || 'home';

  // auth guards
  if(['admin'].includes(root) && !isAdmin()){ toast('Hanya admin yang dapat mengakses 💗','error'); navigate('#/'); return; }

  state.currentPage = root;

  switch(root){
    case 'home': renderHome(); break;
    case 'jualan': renderJualan(); break;
    case 'keranjang': renderKeranjang(); break;
    case 'pesanan': parts[1] ? renderDetailPesanan(parts[1]) : renderPesanan(); break;
    case 'profil': renderProfil(); break;
    case 'bantuan': renderBantuan(); break;
    case 'admin': parts[1] ? renderAdminDetail(parts[1]) : renderAdmin(); break;
    case 'detail': renderDetailProduk(parts[1]); break;
    case 'jasa': renderJasa(); break;
    case 'checkout': renderCheckout(); break;
    case 'pembayaran': renderPembayaran(); break;
    case 'login': renderLogin(); break;
    case 'daftar': renderDaftar(); break;
    case 'editprofil': renderEditProfil(); break;
    default: renderHome();
  }
  window.scrollTo({top:0,behavior:'smooth'});
}

window.addEventListener('hashchange', route);

/* ---------------- NAV ACTIVE STATE ---------------- */
function updateNav(){
  const current = state.currentPage;
  document.querySelectorAll('.nav-item, .bnav-item').forEach(el=>{
    el.classList.toggle('active', el.dataset.page === current);
  });
  document.getElementById('adminNav').classList.toggle('show', isAdmin());
}

/* =========================================================
   PAGE RENDERERS
   ========================================================= */

/* ---------------- HOME ---------------- */
function renderHome(){
  const products = DB.get('products');
  const quick = ['p1','p2','p3','p4'].map(id=>products.find(p=>p.id===id)).filter(Boolean);
  const app = document.getElementById('app');
  app.innerHTML = `
    <section class="hero">
      <h1>Selamat Datang di PinkyStudy 💗</h1>
      <p>Teman belajar untuk kebutuhan tugas dan perlengkapan sekolahmu.</p>
      <div class="hero-actions">
        <button class="btn btn-primary" id="goJualan">🛍️ Lihat Jualan</button>
        <button class="btn btn-soft" id="goJasa">📚 Pesan Jasa Daftar Pustaka</button>
      </div>
    </section>

    <div class="quote-box">
      <div class="quote-text" id="quoteText">“${QUOTES[state.quoteIndex]}”</div>
      <div class="quote-nav">
        <button id="quotePrev">‹</button>
        <button id="quoteNext">›</button>
      </div>
    </div>

    <h2 class="section-title">✨ Quick Menu</h2>
    <div class="grid grid-4">
      ${quick.map(p=>`
        <div class="product-card" data-quick="${p.id}">
          <div class="product-img">${p.emoji}</div>
          <div class="product-name">${p.name}</div>
          <div class="product-price">${rp(p.price)}<span class="product-unit"> / ${p.unit}</span></div>
        </div>
      `).join('')}
    </div>

    <h2 class="section-title">📖 Informasi Toko</h2>
    <div class="card">
      <ul style="list-style:none;display:flex;flex-direction:column;gap:10px;font-size:.92rem;">
        <li>💗 Harga produk berlaku berdasarkan kelipatan.</li>
        <li>📚 Jasa daftar pustaka dihitung setiap 10 daftar pustaka.</li>
        <li>📎 File jasa wajib diunggah saat melakukan pemesanan.</li>
        <li>⏰ Jasa daftar pustaka maksimal dipesan H-1.</li>
        <li>📦 Pesanan dapat dipantau melalui menu Pesanan.</li>
        <li>💌 Hasil jasa dikirim melalui email.</li>
        <li>📱 Bantuan dapat dilakukan melalui WhatsApp Admin.</li>
      </ul>
      <div class="mt-16 text-center">
        <button class="btn btn-primary" id="homeWA">💬 Chat Admin via WhatsApp</button>
      </div>
    </div>
  `;
  document.getElementById('goJualan').onclick = ()=>navigate('#/jualan');
  document.getElementById('goJasa').onclick = ()=>navigate('#/jasa');
  document.getElementById('homeWA').onclick = openWA;
  document.getElementById('quotePrev').onclick = ()=>{ state.quoteIndex = (state.quoteIndex-1+QUOTES.length)%QUOTES.length; document.getElementById('quoteText').textContent = '“'+QUOTES[state.quoteIndex]+'”'; };
  document.getElementById('quoteNext').onclick = ()=>{ state.quoteIndex = (state.quoteIndex+1)%QUOTES.length; document.getElementById('quoteText').textContent = '“'+QUOTES[state.quoteIndex]+'”'; };
  app.querySelectorAll('[data-quick]').forEach(el=>{
    el.onclick = ()=>{
      const id = el.dataset.quick;
      if(id==='p4') navigate('#/jasa'); else navigate('#/detail/'+id);
    };
  });
  updateNav();
}

/* ---------------- JUALAN ---------------- */
function renderJualan(){
  const products = DB.get('products');
  const cats = ['Semua','Alat Tulis','Perlengkapan Belajar','Jasa'];
  const app = document.getElementById('app');
  const filtered = products.filter(p=>{
    const okCat = state.activeCategory==='Semua' || p.category===state.activeCategory;
    const okQ = !state.searchQuery || p.name.toLowerCase().includes(state.searchQuery.toLowerCase());
    return okCat && okQ;
  });

  app.innerHTML = `
    <h2 class="section-title">🛍️ Jualan PinkyStudy</h2>
    <div class="search-bar">
      <span>🔍</span>
      <input id="searchInput" type="text" placeholder="Cari produk... (contoh: Bolpoin)" value="${state.searchQuery}">
      <button class="btn btn-primary btn-sm" id="searchBtn">Cari</button>
    </div>
    <div class="chips" id="chips">
      ${cats.map(c=>`<button class="chip ${state.activeCategory===c?'active':''}" data-cat="${c}">${c}</button>`).join('')}
    </div>
    ${filtered.length===0 ? `<div class="empty"><div class="empty-icon">🌸</div><h3>Produk tidak ditemukan</h3><p>Coba kata kunci lain ya 💗</p></div>` : `
      <div class="grid grid-2">
        ${filtered.map(p=>renderProductCardHTML(p)).join('')}
      </div>`}
  `;

  document.getElementById('searchInput').oninput = e=>{ state.searchQuery = e.target.value; renderJualan(); document.getElementById('searchInput').focus(); };
  document.getElementById('searchBtn').onclick = ()=>{ renderJualan(); };
  document.querySelectorAll('[data-cat]').forEach(el=>{
    el.onclick = ()=>{ state.activeCategory = el.dataset.cat; renderJualan(); };
  });
  bindProductCards(filtered);
  updateNav();
}

function renderProductCardHTML(p){
  const qty = state.cartQty[p.id] || 1;
  const isJasa = p.category==='Jasa';
  return `
    <div class="product-card" data-card="${p.id}">
      <div class="product-img" data-img="${p.id}">${p.emoji}</div>
      <div class="product-name">${p.name}</div>
      <div class="product-price">${rp(p.price)}<span class="product-unit"> / ${p.unit}</span></div>
      <div class="product-unit">⭐ 4.9 · ${p.category}</div>
      <div class="qty-control" data-qty="${p.id}">
        <button class="qty-btn" data-minus="${p.id}">−</button>
        <span class="qty-val" id="qty-${p.id}">${qty}</span>
        <button class="qty-btn" data-plus="${p.id}">+</button>
      </div>
      <div class="product-price text-center" id="subtotal-${p.id}">= ${rp(p.price*qty)}</div>
      ${isJasa ? `
        <button class="btn btn-primary btn-block btn-sm" data-jasa="${p.id}">📎 Pesan Jasa</button>
      ` : `
        <button class="btn btn-primary btn-block btn-sm" data-add="${p.id}">🛒 Tambah Keranjang</button>
      `}
      <button class="btn btn-ghost btn-block btn-sm" data-detail="${p.id}">Lihat Detail →</button>
    </div>
  `;
}

function bindProductCards(products){
  products.forEach(p=>{
    const card = document.querySelector(`[data-card="${p.id}"]`);
    if(!card) return;
    card.querySelector(`[data-img="${p.id}"]`).onclick = ()=>navigate('#/detail/'+p.id);
    card.querySelector(`[data-detail="${p.id}"]`).onclick = (e)=>{ e.stopPropagation(); navigate('#/detail/'+p.id); };
    const plus = card.querySelector(`[data-plus="${p.id}"]`);
    const minus = card.querySelector(`[data-minus="${p.id}"]`);
    if(plus) plus.onclick = (e)=>{ e.stopPropagation(); state.cartQty[p.id]=(state.cartQty[p.id]||1)+1; updateQtyUI(p.id, p.price); };
    if(minus) minus.onclick = (e)=>{ e.stopPropagation(); if((state.cartQty[p.id]||1)>1){ state.cartQty[p.id]--; updateQtyUI(p.id, p.price);} };
    const addBtn = card.querySelector(`[data-add="${p.id}"]`);
    if(addBtn) addBtn.onclick = (e)=>{ e.stopPropagation(); addToCart(p.id, state.cartQty[p.id]||1); };
    const jasaBtn = card.querySelector(`[data-jasa="${p.id}"]`);
    if(jasaBtn) jasaBtn.onclick = (e)=>{ e.stopPropagation(); navigate('#/jasa'); };
  });
}

function updateQtyUI(id, price){
  const q = state.cartQty[id] || 1;
  const qEl = document.getElementById('qty-'+id);
  const sEl = document.getElementById('subtotal-'+id);
  if(qEl) qEl.textContent = q;
  if(sEl) sEl.textContent = '= ' + rp(price*q);
}

/* ---------------- DETAIL PRODUK ---------------- */
function renderDetailProduk(id){
  const p = DB.get('products').find(x=>x.id===id);
  if(!p){ navigate('#/jualan'); return; }
  state.cartQty[id] = state.cartQty[id] || 1;
  const q = state.cartQty[id];
  const app = document.getElementById('app');
  app.innerHTML = `
    <button class="btn btn-ghost btn-sm mb-16" id="backBtn">← Kembali</button>
    <div class="card">
      <div class="product-img" style="font-size:6rem;aspect-ratio:1/1;margin-bottom:16px;">${p.emoji}</div>
      <h2 style="color:var(--pink-600);margin-bottom:6px;">${p.name}</h2>
      <div class="product-price" style="font-size:1.4rem;">${rp(p.price)}<span class="product-unit"> / ${p.unit}</span></div>
      <div class="product-unit mb-16">⭐ 4.9 · ${p.category}</div>
      <p style="color:var(--text-soft);margin-bottom:16px;">${p.desc}</p>
      <div class="qty-control mb-10">
        <button class="qty-btn" id="dMinus">−</button>
        <span class="qty-val" id="dQty">${q}</span>
        <button class="qty-btn" id="dPlus">+</button>
      </div>
      <div class="summary-row"><span>Total harga</span><strong id="dTotal" style="color:var(--pink-600);">${rp(p.price*q)}</strong></div>
      <div class="row mt-16">
        <button class="btn btn-soft flex-1" id="dAddCart">🛒 Tambah Keranjang</button>
        <button class="btn btn-primary flex-1" id="dBuyNow">Beli Sekarang</button>
      </div>
      ${p.category==='Jasa'?`<button class="btn btn-primary btn-block mt-10" id="dJasa">📎 Pesan Jasa Sekarang</button>`:''}
    </div>
  `;
  document.getElementById('backBtn').onclick = ()=>history.back();
  const upd = ()=>{ document.getElementById('dQty').textContent = state.cartQty[id]; document.getElementById('dTotal').textContent = rp(p.price*state.cartQty[id]); };
  document.getElementById('dPlus').onclick = ()=>{ state.cartQty[id]++; upd(); };
  document.getElementById('dMinus').onclick = ()=>{ if(state.cartQty[id]>1){ state.cartQty[id]--; upd(); } };
  document.getElementById('dAddCart').onclick = ()=>addToCart(p.id, state.cartQty[id]);
  document.getElementById('dBuyNow').onclick = ()=>{ addToCart(p.id, state.cartQty[id], true); navigate('#/checkout'); };
  const jbtn = document.getElementById('dJasa');
  if(jbtn) jbtn.onclick = ()=>navigate('#/jasa');
  updateNav();
}

/* ---------------- CART ---------------- */
function addToCart(id, qty, silent=false){
  const cart = getCart();
  const p = DB.get('products').find(x=>x.id===id);
  const existing = cart.find(i=>i.id===id);
  if(existing) existing.qty += qty;
  else cart.push({ id, qty });
  saveCart(cart);
  state.cartSelected[id] = true;
  if(!silent) toast(`${p.name} berhasil ditambahkan ke keranjang 💗`);
}

function renderKeranjang(){
  const cart = getCart();
  const products = DB.get('products');
  const app = document.getElementById('app');

  if(cart.length===0){
    app.innerHTML = `
      <h2 class="section-title">🛒 Keranjang</h2>
      <div class="empty">
        <div class="empty-icon">🌸</div>
        <h3>Keranjangmu masih kosong 💗</h3>
        <p>Yuk cari perlengkapan belajar!</p>
        <button class="btn btn-primary" id="startShop">🛍️ Mulai Belanja</button>
      </div>`;
    document.getElementById('startShop').onclick = ()=>navigate('#/jualan');
    updateNav();
    return;
  }

  const items = cart.map(i=>{
    const p = products.find(x=>x.id===i.id);
    return { ...i, p };
  }).filter(x=>x.p);

  if(!Object.keys(state.cartSelected).length) items.forEach(i=>state.cartSelected[i.id]=true);

  const selectedItems = items.filter(i=>state.cartSelected[i.id]);
  const subtotal = selectedItems.reduce((s,i)=>s+i.p.price*i.qty,0);

  app.innerHTML = `
    <div class="row-between mb-10">
      <h2 class="section-title" style="margin:0;">🛒 Keranjang</h2>
      <button class="btn btn-ghost btn-sm" id="selectAll">${selectedItems.length===items.length?'Batal Pilih Semua':'Pilih Semua'}</button>
    </div>
    ${items.map(i=>`
      <div class="cart-item">
        <div class="checkbox ${state.cartSelected[i.id]?'checked':''}" data-check="${i.id}"></div>
        <div class="cart-item-img" data-detail-cart="${i.p.id}">${i.p.emoji}</div>
        <div class="cart-item-info">
          <h4>${i.p.name}</h4>
          <div class="price">${rp(i.p.price)} × ${i.qty}</div>
          <div class="qty-control" style="margin-top:8px;">
            <button class="qty-btn" data-cminus="${i.id}">−</button>
            <span class="qty-val">${i.qty}</span>
            <button class="qty-btn" data-cplus="${i.id}">+</button>
          </div>
        </div>
        <div style="text-align:right;">
          <div class="product-price">${rp(i.p.price*i.qty)}</div>
          <button class="btn btn-danger btn-sm mt-10" data-del="${i.id}">🗑️</button>
        </div>
      </div>
    `).join('')}
    <div class="cart-summary">
      <div class="summary-row"><span>Item dipilih</span><span>${selectedItems.length} dari ${items.length}</span></div>
      <div class="summary-total"><span>Total</span><span>${rp(subtotal)}</span></div>
      <button class="btn btn-primary btn-block mt-10" id="goCheckout" ${selectedItems.length===0?'disabled':''}>Checkout 💗</button>
    </div>
  `;

  app.querySelectorAll('[data-check]').forEach(el=>{
    el.onclick = ()=>{ state.cartSelected[el.dataset.check] = !state.cartSelected[el.dataset.check]; renderKeranjang(); };
  });
  app.querySelectorAll('[data-cplus]').forEach(el=>{
    el.onclick = ()=>{ const c = getCart(); const it = c.find(x=>x.id===el.dataset.cplus); it.qty++; saveCart(c); renderKeranjang(); };
  });
  app.querySelectorAll('[data-cminus]').forEach(el=>{
    el.onclick = ()=>{ const c = getCart(); const it = c.find(x=>x.id===el.dataset.cminus); if(it.qty>1){ it.qty--; saveCart(c); renderKeranjang(); } else { confirmDel(it.id); } };
  });
  app.querySelectorAll('[data-del]').forEach(el=>{
    el.onclick = ()=>confirmDel(el.dataset.del);
  });
  app.querySelectorAll('[data-detail-cart]').forEach(el=>{
    el.onclick = ()=>navigate('#/detail/'+el.dataset.detailCart);
  });
  document.getElementById('selectAll').onclick = ()=>{
    const allSel = selectedItems.length === items.length;
    items.forEach(i=> state.cartSelected[i.id] = !allSel);
    renderKeranjang();
  };
  const gc = document.getElementById('goCheckout');
  if(gc) gc.onclick = ()=>{
    const chosen = getCart().filter(i=>state.cartSelected[i.id]);
    if(chosen.length===0) return toast('Pilih minimal 1 produk dulu ya 💗','error');
    state.checkoutData = { items: chosen, type:'barang' };
    navigate('#/checkout');
  };
  updateNav();
}

function confirmDel(id){
  const p = DB.get('products').find(x=>x.id===id);
  modal({
    title:'Hapus produk ini dari keranjang?',
    text: `Hapus "${p.name}" dari keranjangmu?`,
    confirmText:'Hapus', danger:true,
    onConfirm: ()=>{
      let c = getCart().filter(i=>i.id!==id);
      saveCart(c);
      delete state.cartSelected[id];
      renderKeranjang();
      toast('Produk dihapus dari keranjang','info');
    }
  });
}

/* ---------------- CHECKOUT ---------------- */
function renderCheckout(){
  if(!state.checkoutData){ navigate('#/keranjang'); return; }
  const u = getUser();
  const products = DB.get('products');
  const items = state.checkoutData.items.map(i=>{
    const p = products.find(x=>x.id===i.id);
    return { ...i, p };
  });
  const subtotal = items.reduce((s,i)=>s+i.p.price*i.qty,0);
  const app = document.getElementById('app');

  app.innerHTML = `
    <button class="btn btn-ghost btn-sm mb-16" id="backBtn">← Kembali</button>
    <h2 class="section-title">📝 Checkout</h2>
    <div class="card mb-16">
      <h3 style="margin-bottom:12px;color:var(--pink-600);">Data Pemesan</h3>
      <div class="form-group">
        <label>Nama <span style="color:#d6336c">*</span></label>
        <input class="form-input" id="cName" value="${u?.name||''}" placeholder="Nama lengkap">
        <div class="form-error" id="errName">Nama wajib diisi.</div>
      </div>
      <div class="form-group">
        <label>Email <span style="color:#d6336c">*</span></label>
        <input class="form-input" id="cEmail" type="email" value="${u?.email||''}" placeholder="nama@email.com">
        <div class="form-error" id="errEmail">Email wajib diisi.</div>
      </div>
      <div class="form-group">
        <label>Nomor WhatsApp <span style="color:#d6336c">*</span></label>
        <input class="form-input" id="cWa" value="${u?.whatsapp||''}" placeholder="08xxxxxxxxxx">
        <div class="form-error" id="errWa">Nomor WhatsApp wajib diisi.</div>
      </div>
      <div class="form-group">
        <label>Catatan</label>
        <textarea class="form-textarea" id="cNote" placeholder="Catatan tambahan (opsional)"></textarea>
      </div>
    </div>

    <div class="card mb-16">
      <h3 style="margin-bottom:12px;color:var(--pink-600);">Ringkasan Pesanan</h3>
      ${items.map(i=>`
        <div class="summary-row"><span>${i.p.emoji} ${i.p.name} × ${i.qty}</span><span>${rp(i.p.price*i.qty)}</span></div>
      `).join('')}
      <div class="summary-total"><span>Total</span><span>${rp(subtotal)}</span></div>
    </div>

    <button class="btn btn-primary btn-block" id="toPayment">Lanjut ke Pembayaran 💳</button>
  `;

  document.getElementById('backBtn').onclick = ()=>history.back();
  document.getElementById('toPayment').onclick = ()=>{
    const name = document.getElementById('cName').value.trim();
    const email = document.getElementById('cEmail').value.trim();
    const wa = document.getElementById('cWa').value.trim();
    const note = document.getElementById('cNote').value.trim();
    let valid = true;
    ['errName','errEmail','errWa'].forEach(id=>document.getElementById(id).classList.remove('show'));
    if(!name){ document.getElementById('errName').classList.add('show'); valid=false; }
    if(!email){ document.getElementById('errEmail').classList.add('show'); valid=false; }
    if(!wa){ document.getElementById('errWa').classList.add('show'); valid=false; }
    if(!valid){ toast('Lengkapi data wajib dulu ya 💗','error'); return; }
    state.checkoutData.customer = { name, email, wa, note };
    state.checkoutData.subtotal = subtotal;
    navigate('#/pembayaran');
  };
  updateNav();
}

/* ---------------- JASA ---------------- */
function renderJasa(){
  const p = DB.get('products').find(x=>x.id==='p4');
  const app = document.getElementById('app');
  const today = new Date(); today.setHours(0,0,0,0);
  const minDate = new Date(today.getTime() + 24*3600*1000);
  const minStr = minDate.toISOString().slice(0,10);
  const tomorrow = minStr;

  app.innerHTML = `
    <button class="btn btn-ghost btn-sm mb-16" id="backBtn">← Kembali</button>
    <div class="card mb-16">
      <div class="product-img" style="font-size:5rem;aspect-ratio:1/1;margin-bottom:14px;">${p.emoji}</div>
      <h2 style="color:var(--pink-600);">${p.name}</h2>
      <div class="product-price" style="font-size:1.3rem;">${rp(p.price)}<span class="product-unit"> / ${p.unit}</span></div>
      <p class="mt-10" style="color:var(--text-soft);">${p.desc}</p>
    </div>

    <div class="card mb-16">
      <h3 style="margin-bottom:12px;color:var(--pink-600);">Jumlah Paket</h3>
      <p style="color:var(--text-soft);margin-bottom:10px;">1 paket = 10 daftar pustaka</p>
      <div class="qty-control mb-10">
        <button class="qty-btn" id="jMinus">−</button>
        <span class="qty-val" id="jQty">1</span>
        <button class="qty-btn" id="jPlus">+</button>
      </div>
      <div class="summary-row"><span id="jInfo">10 daftar pustaka</span><strong id="jTotal" style="color:var(--pink-600);">${rp(p.price)}</strong></div>
    </div>

    <div class="card mb-16">
      <h3 style="margin-bottom:12px;color:var(--pink-600);">📎 Upload File</h3>
      <p style="color:var(--text-soft);font-size:.88rem;margin-bottom:10px;">Upload file yang ingin dibuatkan daftar pustakanya. Format: PDF, DOC, DOCX, JPG, PNG.</p>
      <input type="file" id="jFile" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" style="display:none;">
      <button class="btn btn-soft btn-block" id="jUploadBtn">📎 Pilih File</button>
      <div id="jFileName" class="mt-10" style="font-size:.85rem;color:var(--text-soft);">Belum ada file dipilih.</div>
      <div class="form-error" id="errFile">Silakan upload file terlebih dahulu.</div>
    </div>

    <div class="card mb-16">
      <h3 style="margin-bottom:12px;color:var(--pink-600);">Permintaan Selesai</h3>
      <div class="form-group">
        <label>Tanggal selesai (minimal H-1) <span style="color:#d6336c">*</span></label>
        <input type="date" class="form-input" id="jDate" min="${minStr}" value="${tomorrow}">
        <div class="form-error" id="errDate">⏰ Pemesanan jasa daftar pustaka maksimal dilakukan H-1. Silakan pilih tanggal penyelesaian yang sesuai.</div>
      </div>
      <div class="form-group">
        <label>Jam selesai</label>
        <input type="time" class="form-input" id="jTime" value="17:00">
      </div>
      <div class="form-group">
        <label>Catatan tambahan</label>
        <textarea class="form-textarea" id="jNote" placeholder="Contoh: format APA, sitasi ilmiah, dsb."></textarea>
      </div>
    </div>

    <button class="btn btn-primary btn-block" id="jSubmit">Lanjut Checkout 💗</button>
  `;

  document.getElementById('backBtn').onclick = ()=>history.back();
  let qty = 1;
  const upd = ()=>{ document.getElementById('jQty').textContent = qty; document.getElementById('jInfo').textContent = (qty*10)+' daftar pustaka'; document.getElementById('jTotal').textContent = rp(p.price*qty); };
  document.getElementById('jPlus').onclick = ()=>{ qty++; upd(); };
  document.getElementById('jMinus').onclick = ()=>{ if(qty>1){ qty--; upd(); } };
  let fileObj = null;
  document.getElementById('jUploadBtn').onclick = ()=>document.getElementById('jFile').click();
  document.getElementById('jFile').onchange = (e)=>{
    const f = e.target.files[0];
    if(!f) return;
    fileObj = { name:f.name, size:f.size, type:f.type };
    document.getElementById('jFileName').innerHTML = `✅ File berhasil diunggah: <strong>${f.name}</strong> (${(f.size/1024).toFixed(1)} KB)`;
    document.getElementById('errFile').classList.remove('show');
  };
  document.getElementById('jSubmit').onclick = ()=>{
    const date = document.getElementById('jDate').value;
    const time = document.getElementById('jTime').value;
    const note = document.getElementById('jNote').value.trim();
    let ok = true;
    document.getElementById('errFile').classList.remove('show');
    document.getElementById('errDate').classList.remove('show');

    if(!fileObj){ document.getElementById('errFile').classList.add('show'); ok=false; }
    if(!date){ document.getElementById('errDate').classList.add('show'); ok=false; }
    else {
      const chosen = new Date(date+'T00:00:00');
      const today2 = new Date(); today2.setHours(0,0,0,0);
      if(chosen.getTime() <= today2.getTime()){ document.getElementById('errDate').classList.add('show'); ok=false; }
    }
    if(!ok) return toast('Periksa kembali data jasa kamu 💗','error');

    state.checkoutData = {
      items: [{ id:p.id, qty }],
      type:'jasa',
      file: fileObj,
      deadlineDate: date,
      deadlineTime: time,
      note
    };
    // prefill customer
    const u = getUser();
    state.checkoutData.customer = u ? { name:u.name, email:u.email, wa:u.whatsapp, note:'' } : null;
    navigate('#/checkout');
  };
  updateNav();
}

/* ---------------- PEMBAYARAN ---------------- */
function renderPembayaran(){
  if(!state.checkoutData){ navigate('#/keranjang'); return; }
  const products = DB.get('products');
  const items = state.checkoutData.items.map(i=>{
    const p = products.find(x=>x.id===i.id);
    return { ...i, p };
  });
  const subtotal = items.reduce((s,i)=>s+i.p.price*i.qty,0);
  const methods = [
    {id:'bank',name:'Transfer Bank',icon:'🏦'},
    {id:'va',name:'Virtual Account',icon:'💳'},
    {id:'qris',name:'QRIS',icon:'📱'},
    {id:'gopay',name:'GoPay',icon:'💚'},
    {id:'ovo',name:'OVO',icon:'💜'},
    {id:'dana',name:'DANA',icon:'💙'},
    {id:'shopeepay',name:'ShopeePay',icon:'🧡'},
    {id:'linkaja',name:'LinkAja',icon:'❤️'},
    {id:'mbanking',name:'Mobile Banking',icon:'📲'},
    {id:'other',name:'Bank Lainnya',icon:'🏧'}
  ];
  const app = document.getElementById('app');
  app.innerHTML = `
    <button class="btn btn-ghost btn-sm mb-16" id="backBtn">← Kembali</button>
    <h2 class="section-title">💳 Pembayaran</h2>
    <div class="card mb-16">
      <div class="summary-row"><span>Subtotal</span><strong>${rp(subtotal)}</strong></div>
      <div class="summary-total"><span>Total bayar</span><span>${rp(subtotal)}</span></div>
    </div>
    <h3 style="margin:12px 0 10px;color:var(--pink-600);">Pilih Metode Pembayaran</h3>
    <div class="pay-grid mb-16" id="payGrid">
      ${methods.map(m=>`
        <div class="pay-card" data-pay="${m.id}">
          <span class="pay-icon">${m.icon}</span>
          ${m.name}
        </div>
      `).join('')}
    </div>
    <div id="payDetail" class="card hide"></div>
    <button class="btn btn-primary btn-block mt-16" id="payConfirm" disabled>Konfirmasi Pembayaran 💗</button>
  `;

  document.getElementById('backBtn').onclick = ()=>history.back();
  let chosen = null;
  document.querySelectorAll('[data-pay]').forEach(el=>{
    el.onclick = ()=>{
      document.querySelectorAll('[data-pay]').forEach(x=>x.classList.remove('selected'));
      el.classList.add('selected');
      chosen = methods.find(m=>m.id===el.dataset.pay);
      const detail = document.getElementById('payDetail');
      detail.classList.remove('hide');
      detail.innerHTML = `
        <h3 style="color:var(--pink-600);margin-bottom:10px;">${chosen.icon} ${chosen.name}</h3>
        <p style="color:var(--text-soft);font-size:.9rem;margin-bottom:8px;">
          Silakan lakukan pembayaran sebesar <strong style="color:var(--pink-600);">${rp(subtotal)}</strong>.
        </p>
        <div style="background:var(--pink-50);padding:12px;border-radius:12px;font-size:.85rem;">
          ${chosen.id==='qris' ? 'Scan QRIS di aplikasi e-wallet kamu.' :
            chosen.id==='va' ? 'Nomor VA: <strong>8808 1234 5678 9012</strong>' :
            chosen.id==='bank' ? 'BCA: <strong>1234567890</strong> a/n PinkyStudy' :
            `Bayar melalui aplikasi ${chosen.name}.`}
        </div>
      `;
      document.getElementById('payConfirm').disabled = false;
    };
  });

  document.getElementById('payConfirm').onclick = ()=>{
    if(!chosen) return;
    const counter = DB.get('orderCounter') + 1;
    DB.set('orderCounter', counter);
    const orderId = 'PS-' + String(counter).padStart(5,'0');
    const antrian = String(counter).padStart(2,'0');
    const orders = DB.get('orders');
    const u = getUser();
    const customer = state.checkoutData.customer || { name:'Guest', email:'-', wa:'-', note:'' };
    const order = {
      id: orderId,
      userId: u ? u.id : 'guest',
      customer,
      items: state.checkoutData.items.map(i=>{
        const p = products.find(x=>x.id===i.id);
        return { id:i.id, name:p.name, emoji:p.emoji, price:p.price, unit:p.unit, qty:i.qty };
      }),
      type: state.checkoutData.type,
      subtotal,
      payment: chosen.name,
      paymentStatus: 'Pembayaran Diterima',
      status: 'Menunggu Diproses',
      antrian: antrian,
      deadlineDate: state.checkoutData.deadlineDate || null,
      deadlineTime: state.checkoutData.deadlineTime || null,
      note: state.checkoutData.note || customer.note || '',
      file: state.checkoutData.file || null,
      resultFile: null,
      createdAt: new Date().toISOString()
    };
    orders.push(order);
    DB.set('orders', orders);

    // remove items from cart
    const cart = getCart().filter(i=> !state.checkoutData.items.find(x=>x.id===i.id));
    saveCart(cart);

    if(u) notify(u.id, `Pesanan ${orderId} berhasil dibuat 💗 Menunggu diproses.`);
    notify('u_admin', `Pesanan baru masuk: ${orderId} 🎀`);

    state.checkoutData = null;
    toast('Pembayaran berhasil diterima 💗');
    setTimeout(()=>navigate('#/pesanan/'+orderId), 600);
  };
  updateNav();
}

/* ---------------- PESANAN ---------------- */
function renderPesanan(){
  const u = getUser();
  const app = document.getElementById('app');
  if(!u){
    app.innerHTML = `
      <h2 class="section-title">📦 Pesanan</h2>
      <div class="empty">
        <div class="empty-icon">🔒</div>
        <h3>Silakan login untuk melihat pesananmu 💗</h3>
        <div class="row" style="justify-content:center;gap:10px;">
          <button class="btn btn-primary" id="toLogin">Login</button>
          <button class="btn btn-soft" id="toDaftar">Daftar</button>
        </div>
      </div>`;
    document.getElementById('toLogin').onclick = ()=>navigate('#/login');
    document.getElementById('toDaftar').onclick = ()=>navigate('#/daftar');
    updateNav();
    return;
  }

  const orders = DB.get('orders').filter(o=>o.userId===u.id).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  const tabs = [
    {id:'all', label:'Semua'},
    {id:'Menunggu Pembayaran', label:'Menunggu Pembayaran'},
    {id:'Diproses', label:'Diproses'},
    {id:'Selesai', label:'Selesai'}
  ];
  state.orderTab = state.orderTab || 'all';
  let filtered = orders;
  if(state.orderTab==='Menunggu Pembayaran') filtered = orders.filter(o=>o.status==='Menunggu Pembayaran');
  else if(state.orderTab==='Diproses') filtered = orders.filter(o=>['Pembayaran Diterima','Menunggu Diproses','Proses'].includes(o.status));
  else if(state.orderTab==='Selesai') filtered = orders.filter(o=>o.status==='Selesai');

  app.innerHTML = `
    <h2 class="section-title">📦 Pesananku</h2>
    <div class="tabs">
      ${tabs.map(t=>`<button class="tab ${state.orderTab===t.id?'active':''}" data-tab="${t.id}">${t.label}</button>`).join('')}
    </div>
    ${filtered.length===0 ? `
      <div class="empty">
        <div class="empty-icon">💗</div>
        <h3>Belum ada pesanan</h3>
        <p>Yuk mulai belanja!</p>
        <button class="btn btn-primary" id="startShop2">🛍️ Mulai Belanja</button>
      </div>
    ` : filtered.map(o=>`
      <div class="order-card" data-order="${o.id}">
        <div class="order-head">
          <span class="order-id">Order #${o.id}</span>
          <span class="status-pill ${statusClass(o.status)}">${o.status}</span>
        </div>
        <div style="font-size:.85rem;color:var(--text-soft);">
          ${o.items.map(i=>`${i.emoji} ${i.name} × ${i.qty}`).join(' · ')}
        </div>
        <div class="row-between mt-10">
          <span style="font-weight:700;color:var(--pink-600);">${rp(o.subtotal)}</span>
          <span style="font-size:.8rem;color:var(--text-soft);">Antrian #${o.antrian}</span>
        </div>
      </div>
    `).join('')}
  `;

  document.querySelectorAll('[data-tab]').forEach(el=>{
    el.onclick = ()=>{ state.orderTab = el.dataset.tab; renderPesanan(); };
  });
  document.querySelectorAll('[data-order]').forEach(el=>{
    el.onclick = ()=>navigate('#/pesanan/'+el.dataset.order);
  });
  const s2 = document.getElementById('startShop2');
  if(s2) s2.onclick = ()=>navigate('#/jualan');
  updateNav();
}

function statusClass(s){
  if(s==='Menunggu Pembayaran') return 'status-menunggu';
  if(s==='Pembayaran Diterima') return 'status-diterima';
  if(s==='Menunggu Diproses') return 'status-menunggu-diproses';
  if(s==='Proses') return 'status-proses';
  if(s==='Selesai') return 'status-selesai';
  return 'status-menunggu';
}

function renderDetailPesanan(id){
  const u = getUser();
  const order = DB.get('orders').find(o=>o.id===id);
  const app = document.getElementById('app');
  if(!order){ navigate('#/pesanan'); return; }
  if(!u || (u.role!=='admin' && order.userId!==u.id)){ toast('Kamu tidak berhak melihat pesanan ini','error'); navigate('#/pesanan'); return; }

  const steps = ['Menunggu Pembayaran','Pembayaran Diterima','Menunggu Diproses','Proses','Selesai'];
  const curIdx = steps.indexOf(order.status);

  app.innerHTML = `
    <button class="btn btn-ghost btn-sm mb-16" id="backBtn">← Kembali</button>
    <div class="card mb-16">
      <div class="row-between">
        <h2 style="color:var(--pink-600);font-size:1.1rem;">Order #${order.id}</h2>
        <span class="status-pill ${statusClass(order.status)}">${order.status}</span>
      </div>
      <div style="font-size:.85rem;color:var(--text-soft);margin-top:6px;">
        Dibuat: ${new Date(order.createdAt).toLocaleString('id-ID')}
      </div>
      <div class="mt-16" style="background:var(--pink-50);padding:12px;border-radius:12px;font-weight:700;color:var(--pink-600);text-align:center;">
        🎀 Antrian kamu: #${order.antrian} — Saat ini kamu berada di antrian ke-${parseInt(order.antrian)} 💗
      </div>
    </div>

    <div class="card mb-16">
      <h3 style="margin-bottom:14px;color:var(--pink-600);">Status Pesanan</h3>
      <div class="tracker">
        ${steps.map((s,i)=>`
          <div class="tracker-step ${i<curIdx?'done':''} ${i===curIdx?'current':''}">
            <div class="tracker-dot">${i<curIdx?'✓':i+1}</div>
            <div class="tracker-label">${s}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="card mb-16">
      <h3 style="margin-bottom:10px;color:var(--pink-600);">Detail Item</h3>
      ${order.items.map(i=>`
        <div class="summary-row"><span>${i.emoji} ${i.name} × ${i.qty} (${i.unit})</span><span>${rp(i.price*i.qty)}</span></div>
      `).join('')}
      <div class="summary-total"><span>Total</span><span>${rp(order.subtotal)}</span></div>
      <div class="summary-row"><span>Pembayaran</span><strong>${order.payment}</strong></div>
      <div class="summary-row"><span>Status Pembayaran</span><strong style="color:#0c5460;">${order.paymentStatus}</strong></div>
    </div>

    <div class="card mb-16">
      <h3 style="margin-bottom:10px;color:var(--pink-600);">Data Pemesan</h3>
      <div class="summary-row"><span>Nama</span><span>${order.customer.name}</span></div>
      <div class="summary-row"><span>Email</span><span>${order.customer.email}</span></div>
      <div class="summary-row"><span>WhatsApp</span><span>${order.customer.wa}</span></div>
      ${order.note?`<div class="summary-row"><span>Catatan</span><span>${order.note}</span></div>`:''}
      ${order.deadlineDate?`<div class="summary-row"><span>Deadline</span><span>${order.deadlineDate} ${order.deadlineTime||''}</span></div>`:''}
    </div>

    ${order.file?`
      <div class="card mb-16">
        <h3 style="margin-bottom:10px;color:var(--pink-600);">File Pesanan</h3>
        <div class="summary-row"><span>📎 ${order.file.name}</span><span>${(order.file.size/1024).toFixed(1)} KB</span></div>
      </div>
    `:''}

    ${order.resultFile?`
      <div class="card mb-16" style="background:linear-gradient(135deg,var(--pink-100),var(--lavender));">
        <h3 style="margin-bottom:10px;color:var(--pink-600);">✨ Hasil Daftar Pustaka</h3>
        <p style="font-size:.9rem;color:var(--text-soft);margin-bottom:12px;">Pesanan daftar pustaka kamu sudah selesai 💗 Hasil telah dikirim ke email.</p>
        <button class="btn btn-primary btn-block" id="dlResult">📥 Lihat / Download Hasil</button>
      </div>
    `:''}

    <button class="btn btn-soft btn-block mt-10" id="chatAdmin">💬 Chat Admin via WhatsApp</button>
  `;

  document.getElementById('backBtn').onclick = ()=>history.back();
  document.getElementById('chatAdmin').onclick = ()=>openWA(`Halo Admin PinkyStudy, saya ingin bertanya mengenai pesanan #${order.id}.`);
  const dl = document.getElementById('dlResult');
  if(dl) dl.onclick = ()=>{
    const content = `HASIL DAFTAR PUSTAKA - Order #${order.id}\nCustomer: ${order.customer.name}\nDibuat: ${new Date().toLocaleString('id-ID')}\n\n[Dokumen hasil daftar pustaka]`;
    const blob = new Blob([content], {type:'text/plain'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `hasil-${order.id}.txt`; a.click();
    URL.revokeObjectURL(url);
    toast('Hasil berhasil diunduh 💗');
  };
  updateNav();
}

/* ---------------- PROFIL ---------------- */
function renderProfil(){
  const u = getUser();
  const app = document.getElementById('app');
  if(!u){
    app.innerHTML = `
      <h2 class="section-title">👤 Profil</h2>
      <div class="empty">
        <div class="empty-icon">🔒</div>
        <h3>Silakan login untuk melihat pesananmu 💗</h3>
        <div class="row" style="justify-content:center;gap:10px;">
          <button class="btn btn-primary" id="toLogin">Login</button>
          <button class="btn btn-soft" id="toDaftar">Daftar</button>
        </div>
      </div>`;
    document.getElementById('toLogin').onclick = ()=>navigate('#/login');
    document.getElementById('toDaftar').onclick = ()=>navigate('#/daftar');
    updateNav();
    return;
  }
  const orders = DB.get('orders').filter(o=>o.userId===u.id);
  const active = orders.filter(o=>o.status!=='Selesai').length;
  const done = orders.filter(o=>o.status==='Selesai').length;

  app.innerHTML = `
    <div class="profile-head">
      <div class="avatar">👤</div>
      <div class="profile-info">
        <h2>${u.name}</h2>
        <p>${u.email}</p>
        <p>📱 ${u.whatsapp}</p>
        <p style="margin-top:4px;font-size:.75rem;background:white;padding:2px 10px;border-radius:999px;display:inline-block;font-weight:700;color:var(--pink-600);">${u.role.toUpperCase()}</p>
      </div>
    </div>
    <div class="admin-stats">
      <div class="stat-card"><div class="num">${orders.length}</div><div class="lbl">Total Pesanan</div></div>
      <div class="stat-card"><div class="num">${active}</div><div class="lbl">Aktif</div></div>
      <div class="stat-card"><div class="num">${done}</div><div class="lbl">Selesai</div></div>
    </div>
    <div class="menu-list">
      <div class="menu-item" id="mEdit"><span>✏️ Edit Profil</span><span>›</span></div>
      <div class="menu-item" id="mOrder"><span>📦 Riwayat Pesanan</span><span>›</span></div>
      <div class="menu-item" id="mChat"><span>💬 Bantuan / WhatsApp Admin</span><span>›</span></div>
      ${u.role==='admin'?`<div class="menu-item" id="mAdmin"><span>🛡️ Admin Dashboard</span><span>›</span></div>`:''}
      <div class="menu-item" id="mLogout" style="color:#d6336c;"><span>🚪 Logout</span><span>›</span></div>
    </div>
  `;
  document.getElementById('mEdit').onclick = ()=>navigate('#/editprofil');
  document.getElementById('mOrder').onclick = ()=>navigate('#/pesanan');
  document.getElementById('mChat').onclick = ()=>openWA();
  const ma = document.getElementById('mAdmin');
  if(ma) ma.onclick = ()=>navigate('#/admin');
  document.getElementById('mLogout').onclick = ()=>{
    modal({
      title:'Logout?', text:'Yakin ingin keluar dari akunmu?',
      confirmText:'Logout', danger:true,
      onConfirm: ()=>{ DB.set('session', null); toast('Berhasil logout 💗','info'); navigate('#/'); }
    });
  };
  updateNav();
}

function renderEditProfil(){
  const u = getUser();
  if(!u){ navigate('#/login'); return; }
  const app = document.getElementById('app');
  app.innerHTML = `
    <button class="btn btn-ghost btn-sm mb-16" id="backBtn">← Kembali</button>
    <h2 class="section-title">✏️ Edit Profil</h2>
    <div class="card">
      <div class="form-group"><label>Nama</label><input class="form-input" id="eName" value="${u.name}"></div>
      <div class="form-group"><label>Email</label><input class="form-input" id="eEmail" value="${u.email}"></div>
      <div class="form-group"><label>WhatsApp</label><input class="form-input" id="eWa" value="${u.whatsapp}"></div>
      <button class="btn btn-primary btn-block mt-10" id="saveProfile">Simpan 💗</button>
    </div>
  `;
  document.getElementById('backBtn').onclick = ()=>history.back();
  document.getElementById('saveProfile').onclick = ()=>{
    const name = document.getElementById('eName').value.trim();
    const email = document.getElementById('eEmail').value.trim();
    const wa = document.getElementById('eWa').value.trim();
    if(!name || !email || !wa) return toast('Semua field wajib diisi','error');
    const users = DB.get('users');
    const idx = users.findIndex(x=>x.id===u.id);
    users[idx] = { ...users[idx], name, email, whatsapp:wa };
    DB.set('users', users);
    toast('Profil berhasil diubah 💗');
    navigate('#/profil');
  };
  updateNav();
}

/* ---------------- BANTUAN ---------------- */
function renderBantuan(){
  const app = document.getElementById('app');
  app.innerHTML = `
    <h2 class="section-title">💬 Bantuan / Admin</h2>
    <div class="card mb-16">
      <h3 style="color:var(--pink-600);margin-bottom:10px;">Butuh bantuan?</h3>
      <p style="color:var(--text-soft);margin-bottom:16px;">Hubungi Admin PinkyStudy langsung via WhatsApp. Kami siap membantu 💗</p>
      <button class="btn btn-primary btn-block" id="waBtn">💬 Chat Admin via WhatsApp</button>
    </div>
    <div class="card mb-16">
      <h3 style="color:var(--pink-600);margin-bottom:10px;">❓ FAQ</h3>
      <div style="display:flex;flex-direction:column;gap:12px;font-size:.9rem;">
        <div><strong>Bagaimana cara pesan jasa daftar pustaka?</strong><br><span style="color:var(--text-soft);">Buka menu Jualan → Jasa, pilih jumlah paket, upload file, lalu checkout.</span></div>
        <div><strong>Apakah bisa pesan untuk hari ini?</strong><br><span style="color:var(--text-soft);">Tidak. Pemesanan jasa minimal H-1.</span></div>
        <div><strong>Bagaimana cara pantau pesanan?</strong><br><span style="color:var(--text-soft);">Buka menu Pesanan dan lihat nomor antrian kamu.</span></div>
        <div><strong>Kapan hasil dikirim?</strong><br><span style="color:var(--text-soft);">Setelah admin selesai, hasil akan dikirim ke emailmu.</span></div>
      </div>
    </div>
  `;
  document.getElementById('waBtn').onclick = ()=>openWA();
  updateNav();
}

/* ---------------- LOGIN / DAFTAR ---------------- */
function renderLogin(){
  const app = document.getElementById('app');
  app.innerHTML = `
    <h2 class="section-title">🔐 Login PinkyStudy</h2>
    <div class="card" style="max-width:420px;margin:0 auto;">
      <div class="form-group"><label>Email</label><input class="form-input" id="lEmail" type="email" placeholder="nama@email.com"></div>
      <div class="form-group"><label>Password</label><input class="form-input" id="lPass" type="password" placeholder="••••••"></div>
      <div class="form-error mb-10" id="lErr">Email atau password salah.</div>
      <button class="btn btn-primary btn-block" id="loginBtn">Login 💗</button>
      <p class="text-center mt-16" style="font-size:.9rem;color:var(--text-soft);">Belum punya akun? <a href="#/daftar" data-link style="color:var(--pink-600);font-weight:700;">Daftar</a></p>
      <p class="text-center mt-10" style="font-size:.8rem;color:var(--text-soft);">Demo admin: admin@pinkystudy.id / admin123</p>
    </div>
  `;
  document.getElementById('loginBtn').onclick = ()=>{
    const email = document.getElementById('lEmail').value.trim().toLowerCase();
    const pass = document.getElementById('lPass').value;
    const u = DB.get('users').find(x=>x.email.toLowerCase()===email && x.password===pass);
    if(!u){ document.getElementById('lErr').classList.add('show'); return; }
    DB.set('session', { userId:u.id });
    toast(`Halo ${u.name} 💗`);
    navigate(u.role==='admin' ? '#/admin' : '#/');
  };
  updateNav();
}

function renderDaftar(){
  const app = document.getElementById('app');
  app.innerHTML = `
    <h2 class="section-title">✨ Daftar Akun</h2>
    <div class="card" style="max-width:420px;margin:0 auto;">
      <div class="form-group"><label>Nama</label><input class="form-input" id="rName"></div>
      <div class="form-group"><label>Email</label><input class="form-input" id="rEmail" type="email"></div>
      <div class="form-group"><label>WhatsApp</label><input class="form-input" id="rWa"></div>
      <div class="form-group"><label>Password</label><input class="form-input" id="rPass" type="password"></div>
      <div class="form-error mb-10" id="rErr">Lengkapi semua data.</div>
      <button class="btn btn-primary btn-block" id="regBtn">Daftar 💗</button>
      <p class="text-center mt-16" style="font-size:.9rem;color:var(--text-soft);">Sudah punya akun? <a href="#/login" data-link style="color:var(--pink-600);font-weight:700;">Login</a></p>
    </div>
  `;
  document.getElementById('regBtn').onclick = ()=>{
    const name = document.getElementById('rName').value.trim();
    const email = document.getElementById('rEmail').value.trim().toLowerCase();
    const wa = document.getElementById('rWa').value.trim();
    const pass = document.getElementById('rPass').value;
    if(!name||!email||!wa||!pass){ document.getElementById('rErr').classList.add('show'); return; }
    const users = DB.get('users');
    if(users.find(x=>x.email.toLowerCase()===email)){ toast('Email sudah terdaftar','error'); return; }
    const id = 'u_'+Date.now();
    users.push({ id, name, email, whatsapp:wa, password:pass, role:'user' });
    DB.set('users', users);
    DB.set('session', { userId:id });
    toast('Akun berhasil dibuat 💗');
    navigate('#/');
  };
  updateNav();
}

/* =========================================================
   ADMIN DASHBOARD
   ========================================================= */
function renderAdmin(){
  if(!isAdmin()){ navigate('#/'); return; }
  const orders = DB.get('orders').sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  const stats = {
    total: orders.length,
    baru: orders.filter(o=>o.status==='Menunggu Pembayaran').length,
    menunggu: orders.filter(o=>o.status==='Pembayaran Diterima'||o.status==='Menunggu Diproses').length,
    proses: orders.filter(o=>o.status==='Proses').length,
    selesai: orders.filter(o=>o.status==='Selesai').length
  };
  const app = document.getElementById('app');
  app.innerHTML = `
    <h2 class="section-title">🛡️ Admin Dashboard</h2>
    <div class="admin-stats">
      <div class="stat-card"><div class="num">${stats.total}</div><div class="lbl">Total Pesanan</div></div>
      <div class="stat-card"><div class="num">${stats.baru}</div><div class="lbl">Baru</div></div>
      <div class="stat-card"><div class="num">${stats.menunggu}</div><div class="lbl">Menunggu</div></div>
      <div class="stat-card"><div class="num">${stats.proses}</div><div class="lbl">Diproses</div></div>
      <div class="stat-card"><div class="num">${stats.selesai}</div><div class="lbl">Selesai</div></div>
    </div>

    <div class="row-between mb-10">
      <h3 style="color:var(--pink-600);">Daftar Pesanan</h3>
      <div class="row">
        <button class="btn btn-soft btn-sm" id="adminSettings">⚙️ Pengaturan</button>
        <button class="btn btn-primary btn-sm" id="adminProducts">📦 Kelola Produk</button>
      </div>
    </div>

    ${orders.length===0 ? `<div class="empty"><div class="empty-icon">📭</div><h3>Belum ada pesanan</h3></div>` : `
      <div style="overflow-x:auto;">
        <table class="admin-table">
          <thead>
            <tr>
              <th>ID</th><th>Nama</th><th>Produk</th><th>Total</th>
              <th>Bayar</th><th>Status</th><th>Antrian</th><th>Deadline</th>
            </tr>
          </thead>
          <tbody>
            ${orders.map(o=>`
              <tr data-admin-order="${o.id}">
                <td><strong>#${o.id}</strong></td>
                <td>${o.customer.name}</td>
                <td>${o.items.map(i=>i.name+'×'+i.qty).join(', ')}</td>
                <td>${rp(o.subtotal)}</td>
                <td>${o.paymentStatus}</td>
                <td><span class="status-pill ${statusClass(o.status)}">${o.status}</span></td>
                <td>#${o.antrian}</td>
                <td>${o.deadlineDate || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `}
  `;
  document.getElementById('adminSettings').onclick = renderAdminSettings;
  document.getElementById('adminProducts').onclick = renderAdminProducts;
  document.querySelectorAll('[data-admin-order]').forEach(el=>{
    el.onclick = ()=>navigate('#/admin/'+el.dataset.adminOrder);
  });
  updateNav();
}

function renderAdminDetail(id){
  if(!isAdmin()){ navigate('#/'); return; }
  const order = DB.get('orders').find(o=>o.id===id);
  if(!order){ navigate('#/admin'); return; }
  const app = document.getElementById('app');
  const statusOptions = ['Menunggu Pembayaran','Pembayaran Diterima','Menunggu Diproses','Proses','Selesai'];
  app.innerHTML = `
    <button class="btn btn-ghost btn-sm mb-16" id="backBtn">← Kembali</button>
    <h2 class="section-title">🛡️ Detail Order #${order.id}</h2>
    <div class="card mb-16">
      <div class="summary-row"><span>Customer</span><strong>${order.customer.name}</strong></div>
      <div class="summary-row"><span>Email</span><span>${order.customer.email}</span></div>
      <div class="summary-row"><span>WhatsApp</span><span>${order.customer.wa}</span></div>
      <div class="summary-row"><span>Total</span><strong style="color:var(--pink-600);">${rp(order.subtotal)}</strong></div>
      <div class="summary-row"><span>Metode</span><span>${order.payment}</span></div>
      ${order.deadlineDate?`<div class="summary-row"><span>Deadline</span><span>${order.deadlineDate} ${order.deadlineTime||''}</span></div>`:''}
      ${order.note?`<div class="summary-row"><span>Catatan</span><span>${order.note}</span></div>`:''}
    </div>

    <div class="card mb-16">
      <h3 style="color:var(--pink-600);margin-bottom:12px;">⚙️ Kelola Pesanan</h3>
      <div class="form-group">
        <label>Ubah Status</label>
        <select class="form-select" id="aStatus">
          ${statusOptions.map(s=>`<option ${order.status===s?'selected':''}>${s}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Ubah Nomor Antrian</label>
        <input class="form-input" id="aAntrian" value="${order.antrian}">
      </div>
      <button class="btn btn-primary btn-block mb-10" id="aSave">💗 Simpan Perubahan</button>

      ${order.file?`
        <div class="mb-10" style="background:var(--pink-50);padding:12px;border-radius:12px;">
          <strong>📎 File pelanggan:</strong> ${order.file.name}
          <button class="btn btn-soft btn-sm" id="aDlFile" style="margin-left:8px;">⬇️ Download</button>
        </div>
      `:''}

      ${order.type==='jasa' && order.status!=='Selesai' ? `
        <div class="mb-10" style="background:var(--cream);padding:12px;border-radius:12px;">
          <strong>📤 Upload Hasil Daftar Pustaka</strong>
          <input type="file" id="aHasil" style="display:block;margin-top:8px;">
          <button class="btn btn-primary btn-sm mt-10" id="aSendResult">Kirim Hasil ke Email 💌</button>
        </div>
      `:''}
    </div>
  `;
  document.getElementById('backBtn').onclick = ()=>history.back();

  document.getElementById('aSave').onclick = ()=>{
    const newStatus = document.getElementById('aStatus').value;
    const newAntrian = document.getElementById('aAntrian').value.trim();
    const orders = DB.get('orders');
    const idx = orders.findIndex(o=>o.id===order.id);
    orders[idx].status = newStatus;
    orders[idx].antrian = newAntrian;
    if(newStatus==='Pembayaran Diterima') orders[idx].paymentStatus = 'Pembayaran Diterima';
    DB.set('orders', orders);
    if(orders[idx].userId && orders[idx].userId!=='guest'){
      notify(orders[idx].userId, `Status pesanan #${order.id} diperbarui menjadi "${newStatus}" 💗`);
    }
    toast('Perubahan berhasil disimpan 💗');
    renderAdminDetail(order.id);
  };

  const dlf = document.getElementById('aDlFile');
  if(dlf) dlf.onclick = ()=>{
    const c = `File pelanggan: ${order.file.name}\nOrder: ${order.id}`;
    const b = new Blob([c],{type:'text/plain'});
    const url = URL.createObjectURL(b); const a = document.createElement('a');
    a.href=url; a.download=order.file.name; a.click(); URL.revokeObjectURL(url);
  };

  const sendResult = document.getElementById('aSendResult');
  if(sendResult) sendResult.onclick = ()=>{
    const fileInput = document.getElementById('aHasil');
    if(!fileInput.files[0]) return toast('Pilih file hasil dulu ya','error');
    const f = fileInput.files[0];
    const orders = DB.get('orders');
    const idx = orders.findIndex(o=>o.id===order.id);
    orders[idx].resultFile = { name:f.name, size:f.size };
    orders[idx].status = 'Selesai';
    DB.set('orders', orders);
    if(orders[idx].userId && orders[idx].userId!=='guest'){
      notify(orders[idx].userId, `Pesanan daftar pustaka ${order.id} sudah selesai 💗 Hasil telah dikirim ke email.`);
    }
    toast('Hasil berhasil dikirim 💌');
    renderAdminDetail(order.id);
  };
  updateNav();
}

function renderAdminProducts(){
  if(!isAdmin()){ navigate('#/'); return; }
  const products = DB.get('products');
  const app = document.getElementById('app');
  app.innerHTML = `
    <button class="btn btn-ghost btn-sm mb-16" id="backBtn">← Kembali</button>
    <div class="row-between mb-10">
      <h2 class="section-title" style="margin:0;">📦 Kelola Produk</h2>
      <button class="btn btn-primary btn-sm" id="addProd">+ Tambah Produk</button>
    </div>
    <div class="grid grid-2">
      ${products.map(p=>`
        <div class="card">
          <div class="product-img" style="aspect-ratio:2/1;font-size:2.5rem;">${p.emoji}</div>
          <h4 style="margin-top:8px;">${p.name}</h4>
          <p style="font-size:.85rem;color:var(--text-soft);">${rp(p.price)} / ${p.unit}</p>
          <p style="font-size:.78rem;color:var(--text-soft);">${p.category}</p>
          <div class="row mt-10">
            <button class="btn btn-soft btn-sm flex-1" data-edit="${p.id}">✏️ Edit</button>
            <button class="btn btn-danger btn-sm flex-1" data-delp="${p.id}">🗑️ Hapus</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
  document.getElementById('backBtn').onclick = ()=>navigate('#/admin');
  document.getElementById('addProd').onclick = ()=>editProduct(null);
  document.querySelectorAll('[data-edit]').forEach(el=> el.onclick = ()=>editProduct(el.dataset.edit));
  document.querySelectorAll('[data-delp]').forEach(el=> el.onclick = ()=>{
    const p = DB.get('products').find(x=>x.id===el.dataset.delp);
    modal({
      title:'Hapus produk?', text:`Hapus "${p.name}" dari daftar produk?`,
      confirmText:'Hapus', danger:true,
      onConfirm: ()=>{
        const prods = DB.get('products').filter(x=>x.id!==p.id);
        DB.set('products', prods);
        toast('Produk dihapus','info');
        renderAdminProducts();
      }
    });
  });
  updateNav();
}

function editProduct(id){
  const isNew = !id;
  const p = isNew ? { name:'', price:0, unit:'biji', category:'Alat Tulis', emoji:'📘', desc:'' } : DB.get('products').find(x=>x.id===id);
  const app = document.getElementById('app');
  app.innerHTML = `
    <button class="btn btn-ghost btn-sm mb-16" id="backBtn">← Kembali</button>
    <h2 class="section-title">${isNew?'➕ Tambah':'✏️ Edit'} Produk</h2>
    <div class="card">
      <div class="form-group"><label>Nama</label><input class="form-input" id="pName" value="${p.name}"></div>
      <div class="form-group"><label>Harga</label><input class="form-input" id="pPrice" type="number" value="${p.price}"></div>
      <div class="form-group"><label>Satuan</label><input class="form-input" id="pUnit" value="${p.unit}"></div>
      <div class="form-group"><label>Kategori</label>
        <select class="form-select" id="pCat">
          ${['Alat Tulis','Perlengkapan Belajar','Jasa'].map(c=>`<option ${p.category===c?'selected':''}>${c}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>Emoji (foto)</label><input class="form-input" id="pEmoji" value="${p.emoji}" maxlength="4"></div>
      <div class="form-group"><label>Deskripsi</label><textarea class="form-textarea" id="pDesc">${p.desc}</textarea></div>
      <button class="btn btn-primary btn-block" id="saveProd">💗 Simpan</button>
    </div>
  `;
  document.getElementById('backBtn').onclick = ()=>renderAdminProducts();
  document.getElementById('saveProd').onclick = ()=>{
    const name = document.getElementById('pName').value.trim();
    const price = parseInt(document.getElementById('pPrice').value) || 0;
    const unit = document.getElementById('pUnit').value.trim();
    const category = document.getElementById('pCat').value;
    const emoji = document.getElementById('pEmoji').value.trim() || '📘';
    const desc = document.getElementById('pDesc').value.trim();
    if(!name || price<=0 || !unit) return toast('Nama, harga, dan satuan wajib diisi','error');
    const products = DB.get('products');
    if(isNew){
      products.push({ id:'p'+Date.now(), name, price, unit, category, emoji, desc });
    } else {
      const idx = products.findIndex(x=>x.id===id);
      products[idx] = { ...products[idx], name, price, unit, category, emoji, desc };
    }
    DB.set('products', products);
    toast('Produk berhasil disimpan 💗');
    renderAdminProducts();
  };
  updateNav();
}

function renderAdminSettings(){
  if(!isAdmin()){ navigate('#/'); return; }
  const s = DB.get('settings');
  const app = document.getElementById('app');
  app.innerHTML = `
    <button class="btn btn-ghost btn-sm mb-16" id="backBtn">← Kembali</button>
    <h2 class="section-title">⚙️ Pengaturan Admin</h2>
    <div class="card">
      <div class="form-group"><label>Nomor WhatsApp Admin</label><input class="form-input" id="sWa" value="${s.waAdmin}"></div>
      <div class="form-group"><label>Pesan Otomatis WhatsApp</label><textarea class="form-textarea" id="sMsg">${s.waMessage}</textarea></div>
      <button class="btn btn-primary btn-block" id="saveSet">💗 Simpan</button>
    </div>
  `;
  document.getElementById('backBtn').onclick = ()=>navigate('#/admin');
  document.getElementById('saveSet').onclick = ()=>{
    const waAdmin = document.getElementById('sWa').value.trim();
    const waMessage = document.getElementById('sMsg').value.trim();
    DB.set('settings', { waAdmin, waMessage });
    toast('Pengaturan disimpan 💗');
    navigate('#/admin');
  };
  updateNav();
}

/* ---------------- WA ---------------- */
function openWA(customMsg){
  const s = DB.get('settings');
  const msg = encodeURIComponent(customMsg || s.waMessage);
  window.open(`https://wa.me/${s.waAdmin}?text=${msg}`, '_blank');
}

/* =========================================================
   INIT
   ========================================================= */
document.addEventListener('DOMContentLoaded', ()=>{
  // handle all data-link
  document.body.addEventListener('click', e=>{
    const a = e.target.closest('[data-link]');
    if(a){
      e.preventDefault();
      navigate(a.getAttribute('href'));
    }
  });
  document.getElementById('footerWA').onclick = e=>{ e.preventDefault(); openWA(); };
  updateBadges();
  route();
});
