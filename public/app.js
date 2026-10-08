document.querySelectorAll('[data-photo]').forEach(b=>b.addEventListener('click',()=>{document.querySelector('#main-photo').src=b.dataset.photo;}));
document.querySelectorAll('[data-confirm]').forEach(f=>f.addEventListener('submit',e=>{if(!confirm(f.dataset.confirm))e.preventDefault();}));
document.querySelectorAll('[data-delete]').forEach(b=>b.addEventListener('click',e=>{if(!confirm('Delete this listing permanently?'))e.preventDefault();}));
document.querySelector('[data-back]')?.addEventListener('click',()=>history.back());
document.querySelector('[data-share]')?.addEventListener('click',async e=>{try{if(navigator.share)await navigator.share({title:document.title,url:location.href});else{await navigator.clipboard.writeText(location.href);e.target.textContent='✓ Link copied';}}catch{e.target.textContent=location.href;}});
document.querySelectorAll('input[type=file]').forEach(input=>input.addEventListener('change',()=>{input.setCustomValidity(input.files.length>6?'Choose up to six images.':[...input.files].some(f=>f.size>5*1024*1024)?'Each image must be 5 MB or smaller.':'');input.reportValidity();}));
