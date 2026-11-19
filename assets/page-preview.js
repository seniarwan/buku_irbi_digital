(function(){
  'use strict';
  let frame, timer, active=false;
  function expandSelector(selector) {
    const match=selector.match(/:(?:is|where)\(([^()]*)\)/);
    if(!match) return [selector];
    return match[1].split(',').flatMap(part=>expandSelector(selector.replace(match[0],part.trim())));
  }
  function cssText(rules) {
    return [...rules].map(rule=>{
      if (rule.type===CSSRule.MEDIA_RULE) {
        if (/print|all/.test(rule.conditionText)) return cssText(rule.cssRules);
        return '';
      }
      if(rule.type===CSSRule.STYLE_RULE) return rule.selectorText.split(/,(?![^()]*\))/).flatMap(expandSelector).join(',')+'{'+rule.style.cssText+'}';
      return rule.cssText;
    }).join('\n');
  }
  function setPages(value) {
    if (frame?.contentWindow?.setBookPages) frame.contentWindow.setBookPages(value);
  }
  function rebuild() {
    if (!active) return;
    const original=document.getElementById('printBook');
    const clone=original.cloneNode(true);
    clone.querySelectorAll('details').forEach(detail=>{
      const section=document.createElement('section');
      section.className=detail.className;
      for(const child of [...detail.childNodes]) {
        if(child.nodeName==='SUMMARY') {
          const heading=document.createElement('h3');
          heading.className='preview-subsection-title';
          heading.innerHTML=child.innerHTML;
          section.append(heading);
        } else section.append(child);
      }
      detail.replaceWith(section);
    });
    clone.querySelectorAll('.table-scroll').forEach(table=>{
      table.style.setProperty('overflow','visible','important');
      table.style.setProperty('max-height','none','important');
      table.style.setProperty('height','auto','important');
      table.removeAttribute('tabindex');
    });
    const sourceCanvases=original.querySelectorAll('canvas');
    clone.querySelectorAll('canvas').forEach((canvas,index)=>{
      const image=document.createElement('img');
      for(const attr of canvas.attributes) image.setAttribute(attr.name,attr.value);
      image.src=sourceCanvases[index].toDataURL('image/png');
      image.removeAttribute('width');image.removeAttribute('height');
      canvas.replaceWith(image);
    });
    const css=[...document.styleSheets].map(sheet=>{
      try{return cssText(sheet.cssRules).replace(/url\((['"]?)(.*?)\1\)/g,(_,quote,path)=>'url("'+new URL(path,sheet.href||location.href).href+'")')}catch(_){return ''}
    }).join('\n');
    frame?.remove();
    frame=document.createElement('iframe');
    frame.id='bookPagePreview';frame.title='Pratinjau halaman buku';
    frame.style.cssText='display:block;width:100%;border:0;min-height:100vh';
    frame.style.setProperty('display','block','important');
    document.body.append(frame);
    const currentFrame=frame;
    const doc=frame.contentDocument;
    doc.open();doc.write('<!doctype html><html lang="id"><head><base href="'+location.href.replace(/[^/]*$/,'')+'"><meta charset="utf-8"></head><body><p id="paginationStatus" role="status">Menata halaman buku…</p><div id="pageOutput"></div></body></html>');doc.close();
    for (const attr of document.documentElement.attributes) if(attr.name!=='id') doc.documentElement.setAttribute(attr.name,attr.value);
    const style=doc.createElement('style');style.textContent=css;doc.head.append(style);
    const display=doc.createElement('style');
    display.textContent='html,body{margin:0!important;padding:0!important;background:#dce2e6!important;} #paginationStatus{padding:1rem;font:14px Arial;} .pagedjs_pages{display:grid;grid-template-columns:repeat(2,max-content);gap:16px 0;width:max-content;margin:16px auto;} .pagedjs_page{margin:0!important;background:white;box-shadow:0 1px 5px #0002;} html[data-preview-pages="2"] .pagedjs_page:first-child{grid-column:2;} html[data-preview-pages="1"] .pagedjs_pages{grid-template-columns:max-content;gap:16px;}';
    doc.head.append(display);
    const script=doc.createElement('script');script.src=new URL('assets/paged.js',location.href).href;
    script.onload=async()=>{
      if(frame!==currentFrame) return;
      try {
        const win=frame.contentWindow;
        const preview=new win.Paged.Previewer();
        let count=0;
        preview.on('renderedPage',()=>{count++;doc.getElementById('paginationStatus').textContent='Menata halaman buku… '+count+' halaman';});
        const url=URL.createObjectURL(new Blob([css],{type:'text/css'}));
        await preview.preview(clone.outerHTML,[url],doc.getElementById('pageOutput'));
        URL.revokeObjectURL(url);
        if(frame!==currentFrame) return;
        // Give artwork its own full-page box instead of the normal text area.
        for(const cover of doc.querySelectorAll('.pagedjs_page .cover-artwork')) {
          const sheet=cover.closest('.pagedjs_page');
          const box=sheet.querySelector('.pagedjs_pagebox');
          for(const side of ['top','right','bottom','left']) box.style.setProperty('--pagedjs-margin-'+side,'0px');
          const content=sheet.querySelector('.pagedjs_page_content');
          content.style.setProperty('width','100%','important');
          content.style.setProperty('height','100%','important');
          content.style.setProperty('column-width','auto','important');
          content.style.setProperty('overflow','hidden','important');
          const artwork=cover.cloneNode(true);
          artwork.style.cssText='position:absolute!important;inset:0!important;display:block!important;width:100%!important;height:100%!important;min-height:0!important;margin:0!important;padding:0!important;border:0!important;background:#082b4a!important;';
          artwork.querySelector('img').style.cssText='display:block!important;width:100%!important;height:100%!important;max-width:100%!important;max-height:100%!important;margin:0!important;padding:0!important;border:0!important;object-fit:contain!important;object-position:center!important;';
          content.replaceChildren(artwork);
        }
        doc.getElementById('paginationStatus').remove();
        // The display sheet must follow the styles generated by the pagination engine.
        doc.head.append(display);
        win.setBookPages=value=>{
          doc.documentElement.dataset.previewPages=value==='1'?'1':'2';
          const pages=doc.querySelector('.pagedjs_pages');
          if (!pages) return;
          pages.style.zoom='1';
          const width=pages.getBoundingClientRect().width;
          pages.style.zoom=String(Math.min(1,(frame.clientWidth-24)/width));
          frame.style.height='1px';
          frame.style.height=Math.ceil(doc.documentElement.scrollHeight+24)+'px';
        };
        setPages(document.documentElement.dataset.previewPages);
        frame.dataset.ready='true';
      } catch(error) {
        doc.getElementById('paginationStatus').textContent='Pratinjau halaman belum dapat disusun. '+error.message;
        console.error(error);
      }
    };
    doc.head.append(script);
  }
  function schedule(){if(active){clearTimeout(timer);timer=setTimeout(rebuild,700)}}
  window.addEventListener('irbi-layout',schedule);
  window.addEventListener('irbi-photos',schedule);
  window.addEventListener('resize',()=>setPages(document.documentElement.dataset.previewPages));
  window.addEventListener('beforeprint',()=>frame?.style.setProperty('display','none','important'));
  window.addEventListener('afterprint',()=>frame?.style.setProperty('display','block','important'));
  window.IRBI_PAGE_PREVIEW={prepare(){active=true;rebuild()},setPages};
})();
