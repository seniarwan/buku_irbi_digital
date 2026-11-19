(function () {
  'use strict';
  const form=document.getElementById('photoForm');
  const preview=document.getElementById('stylePreview');
  const previewPage=document.getElementById('previewPage');
  const choice=document.getElementById('photoChoice');
  const status=document.getElementById('photoStatus');
  const file=document.getElementById('photoFile');
  const position=document.getElementById('photoPosition');
  const width=document.getElementById('photoWidth');
  const align=document.getElementById('photoAlign');
  const crop=document.getElementById('photoCrop');
  const caption=document.getElementById('photoCaption');
  const spread=document.getElementById('photoSpread');
  let draft={};
  let dirty=false;
  const state=()=>draft[choice.value] || IRBI_PHOTOS.defaultPhoto();

  for (const [name,photo] of IRBI_PHOTOS.catalog) {
    const title=IRBI_DATA.pages[photo.id].title;
    choice.add(new Option(photo.cover?(photo.id==='sampul-belakang'?'Sampul belakang':'Sampul depan'):title+' · '+photo.keterangan,name));
  }
  choice.value='pendahuluan.jpg';

  function fill() {
    const settings=state();
    position.value=settings.position;
    width.value=settings.width;
    align.value=settings.align;
    crop.value=settings.crop;
    caption.value=settings.caption;
    spread.value=settings.spread;
    const cover=IRBI_PHOTOS.catalog.get(choice.value).cover;
    position.disabled=cover;
    caption.disabled=cover;
    document.getElementById("photoCaptionLabel").hidden=cover;
    document.getElementById('photoPlaceLabel').hidden=cover;
    document.getElementById('photoSpreadLabel').hidden=cover;
    spread.disabled=cover;
    file.value='';
  }

  function send() {
    preview.contentWindow?.postMessage({type:'irbi-pratinjau-foto',settings:draft},
      location.protocol==='file:'?'*':location.origin);
  }

  function focusPhotoPage() {
    const {id}=IRBI_PHOTOS.catalog.get(choice.value);
    if (previewPage.value===id) return;
    if (![...previewPage.options].some(option=>option.value===id)) {
      previewPage.add(new Option(IRBI_DATA.pages[id].title,id));
    }
    previewPage.value=id;
    previewPage.dispatchEvent(new Event('change'));
  }

  function changed(message) {
    dirty=true;
    status.textContent=message+' Belum disimpan.';
    focusPhotoPage();
    send();
  }

  const ready=IRBI_PHOTOS.read().then(settings=>{
    draft=IRBI_PHOTOS.normalize(settings);
    fill();
    send();
  }).catch(()=>{ status.textContent='Peramban tidak dapat membaca penyimpanan foto.'; });
  fill();
  preview.addEventListener('load',send);
  choice.addEventListener('change',()=>{
    fill();
    const replacement=state().file;
    status.textContent=replacement ? 'Foto pengganti: '+replacement.name : '';
    focusPhotoPage();
    send();
  });
  form.addEventListener('input',event=>{
    if (![position,width,align,crop,caption,spread].includes(event.target) || !form.checkValidity()) return;
    draft[choice.value]={...state(),position:position.value,width:Number(width.value),align:align.value,crop:crop.value,caption:caption.value,spread:spread.value};
    changed('Tata letak foto diperbarui.');
  });
  file.addEventListener('change',async()=>{
    const image=file.files[0];
    if (!image) return;
    if (!IRBI_PHOTOS.accepted.test(image.type) || image.size>6e6) {
      status.textContent='Pilih JPG, PNG, atau WebP dengan ukuran maksimal 6 MB.';
      file.value='';
      return;
    }
    const name=choice.value;
    const url=URL.createObjectURL(image);
    try {
      const check=new Image();
      check.src=url;
      await check.decode();
      draft[name]={...(draft[name] || IRBI_PHOTOS.defaultPhoto()),file:image};
      changed('Foto pengganti: '+image.name+'.');
    } catch (_) {
      status.textContent='Berkas ini tidak dapat dibaca sebagai gambar.';
      file.value='';
    } finally {
      URL.revokeObjectURL(url);
    }
  });
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    await ready;
    try {
      await IRBI_PHOTOS.save(draft);
      dirty=false;
      status.textContent='Foto dan penempatannya tersimpan di peramban ini.';
      try { localStorage.setItem('irbi-foto-updated',String(Date.now())); } catch (_) {}
      send();
    } catch (_) {
      status.textContent='Perubahan foto tidak dapat disimpan oleh peramban.';
    }
  });
  document.getElementById('photoReset').addEventListener('click',()=>{
    delete draft[choice.value];
    fill();
    changed('Foto dan posisi bawaan dipulihkan dalam pratinjau.');
  });
  window.addEventListener('beforeunload',event=>{
    if (!dirty) return;
    event.preventDefault();
    event.returnValue='';
  });
})();

