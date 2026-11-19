(function () {
  'use strict';
  const catalog = new Map();
  for (const [id,page] of Object.entries(IRBI_DATA.pages)) {
    for (const part of [page,...page.bagian]) {
      if (part.foto) catalog.set(part.foto.nama,{id,...part.foto,cover:id==='beranda',opener:id==='pendahuluan'&&part===page});
    }
  }
  catalog.set('sampul_belakang.png',{id:'sampul-belakang',nama:'sampul_belakang.png',keterangan:'Sampul belakang',cover:true});
  const store='photos';
  let pending;
  function database() {
    if (!pending) pending=new Promise((resolve,reject)=>{
      const request=indexedDB.open('irbi-daftar-foto-v1',1);
      request.onupgradeneeded=()=>request.result.createObjectStore(store);
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });
    return pending;
  }
  async function read() {
    const db=await database();
    return new Promise((resolve,reject)=>{
      const request=db.transaction(store).objectStore(store).get('settings');
      request.onsuccess=()=>resolve(request.result || {});
      request.onerror=()=>reject(request.error);
    });
  }
  async function save(settings) {
    const db=await database();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(store,'readwrite');
      tx.objectStore(store).put(settings,'settings');
      tx.oncomplete=resolve;
      tx.onerror=()=>reject(tx.error);
      tx.onabort=()=>reject(tx.error);
    });
  }

  const positions=['original','after-title','end'];
  const aligns=['center','left','right'];
  const crops=['center','top','bottom','left','right'];
  const defaultPhoto=()=>({position:'original',width:100,align:'center',crop:'center',caption:'',file:null,spread:'single'});
  const accepted=/^image\/(jpeg|png|webp)$/;
  function normalize(settings) {
    return Object.fromEntries(Object.entries(settings || {}).filter(([name])=>catalog.has(name)).map(([name,entry])=>{
      const base=defaultPhoto();
      const photo=catalog.get(name);
      if (!photo.cover && positions.includes(entry?.position)) base.position=entry.position;
      if (!photo.cover && entry?.spread==='double') base.spread='double';
      if (Number.isFinite(entry?.width)) base.width=Math.max(40,Math.min(100,Math.round(entry.width)));
      if (aligns.includes(entry?.align)) base.align=entry.align;
      if (crops.includes(entry?.crop)) base.crop=entry.crop;
      if (typeof entry?.caption === "string") base.caption=entry.caption.trim().slice(0,240);
      if (entry?.file instanceof Blob && accepted.test(entry.file.type) && entry.file.size<=6e6) base.file=entry.file;
      return [name,base];
    }));
  }

  let active={};
  let previewReceived=false;
  const placeholders=new WeakMap();
  const originals=new WeakMap();
  const urls=new Map();
  function originalPosition(figure) {
    let marker=placeholders.get(figure);
    if (!marker) {
      marker=document.createComment('Posisi asli foto');
      figure.before(marker);
      placeholders.set(figure,marker);
    }
    return marker;
  }

  function sync(root=document) {
    for (const element of root.querySelectorAll('[data-book-photo]')) {
      const name=element.dataset.bookPhoto;
      const settings=active[name];
      element.dataset.photoSpread=settings?.spread || 'single';
      const url=urls.get(name);
      if (element.matches('.book-hero')) {
        element.classList.toggle('photo-custom-cover',Boolean(settings));
        element.style.setProperty('--photo-cover-image','url("'+(url || new URL('assets/foto/'+name,document.baseURI).href)+'")');
        element.style.setProperty('--photo-crop',settings?.crop || 'center');
        continue;
      }
      const image=element.matches('img')?element:element.querySelector('img');
      if (!image) continue;
      const original=element.dataset.coverOriginal || 'assets/foto/'+name;
      const caption=element.querySelector('figcaption');
      if (!originals.has(element)) originals.set(element,{alt:image.alt,caption:caption?.textContent});
      const metadata=originals.get(element);
      image.alt=settings?.caption || (url ? 'Foto pengganti' : metadata.alt);
      if (caption) {
        caption.textContent=settings?.caption || (url ? '' : metadata.caption);
        caption.hidden=!caption.textContent;
      }
      if (url) image.loading='eager';
      if (image.getAttribute('src')!==(url || original)) image.src=url || original;
      if (element.matches('figure') && (settings || placeholders.has(element))) {
        const marker=originalPosition(element);
        const chapter=marker.parentElement.closest('.report-spread');
        const position=settings?.position || 'original';
        if (position==='after-title' && chapter) {
          const title=chapter.querySelector('.chapter-title,.introduction-opener');
          if (title && !title.contains(element) && title.nextElementSibling!==element) title.after(element);
        } else if (position==='end' && chapter) {
          const footer=chapter.querySelector('.report-credit');
          if (footer && element.nextElementSibling!==footer) footer.before(element);
        } else if (marker.nextSibling!==element) marker.after(element);
      }
      const styled=!element.dataset.coverOriginal && settings && (settings.width!==100 || settings.align!=='center' || settings.crop!=='center');
      element.classList.toggle('photo-custom-size',Boolean(styled));
      if (styled) {
        element.dataset.photoAlign=settings.align;
        element.style.setProperty('--photo-width',settings.width+'%');
        element.style.setProperty('--photo-crop',settings.crop);
      }
    }
  }

  function apply(settings) {
    active=normalize(settings);
    for (const url of urls.values()) URL.revokeObjectURL(url);
    urls.clear();
    for (const [name,entry] of Object.entries(active)) {
      if (entry.file) urls.set(name,URL.createObjectURL(entry.file));
    }
    sync();
    window.dispatchEvent(new Event('irbi-photos'));
  }

  const editor=document.documentElement.hasAttribute('data-photo-editor');
  const ready=editor ? Promise.resolve() : read().then(settings=>{if (!previewReceived) apply(settings);}).catch(()=>{});
  if (!editor) {
    window.addEventListener('storage',event=>{
      if(event.key==='irbi-foto-updated') read().then(apply).catch(()=>{});
    });
    if (window.parent!==window && new URLSearchParams(location.search).has('pratinjau-gaya')) {
      window.addEventListener('message',event=>{
        if (event.source!==window.parent || (location.protocol!=='file:' && event.origin!==location.origin)) return;
        if (event.data?.type==='irbi-pratinjau-foto') {
          previewReceived=true;
          apply(event.data.settings);
        }
      });
    }
  }
  window.IRBI_PHOTOS={catalog,defaultPhoto,accepted,read,save,normalize,sync,ready};
})();


