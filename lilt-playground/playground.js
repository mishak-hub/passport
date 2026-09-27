document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-tab]').forEach(t=>t.classList.toggle('active',t===b));document.querySelectorAll('.pane').forEach(p=>p.hidden=p.id!==b.dataset.tab+'-pane');}));
let submissions=0;window.LiltDemo.submissions=()=>submissions;
function submit(e){e?.preventDefault();submissions++;document.getElementById('sent').textContent='Practice submission received. Nothing left this page.';}
document.getElementById('search-form').addEventListener('submit',submit);
document.getElementById('message').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey)submit(e);});
document.getElementById('send').addEventListener('click',submit);
