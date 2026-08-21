/* SINE.SHOP — plateforme transversale
 * Règles de rôle, en-tête vitrine, vidéos de cartes, annonce vidéo,
 * notation, voix d'accueil et ouverture future de l'application native.
 */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const user = () => { try { return JSON.parse(localStorage.getItem('sineUser') || 'null'); } catch { return null; } };
  const role = () => user()?.role || 'client';

  const restrictedByRole = new Set([
    'collections.html','search.html','panier.html','commande.html','confirmation.html',
    'paiement.html','payment.html','reservation.html','sinepay.html','suivi.html',
    'vetements.html','chaussures.html','montres.html','sport.html','maison.html',
    'electronique.html','beaute.html','alimentation.html','auto.html','livres.html','jeux.html'
  ]);
  function guardRole() {
    const r = role();
    if (!['seller','livreur','affiliate'].includes(r)) return;
    const page = location.pathname.split('/').pop().toLowerCase();
    if (!restrictedByRole.has(page)) return;
    const destinations = { seller:'vendeur.html', livreur:'livreur.html', affiliate:'sineshopaffiliation.html' };
    const target = destinations[r];
    if (target && !page.startsWith(target.replace('.html',''))) location.replace(`../html/${target}`);
  }

  function applyVitrineHeader() {
    const commercePages = new Set(['panier.html','commande.html','confirmation.html','search.html','paiement.html','payment.html','reservation.html','sinepay.html','suivi.html']);
    const page = location.pathname.split('/').pop().toLowerCase();
    document.querySelectorAll('header').forEach(h => h.classList.add('sine-theme-header'));
    if (commercePages.has(page)) document.querySelectorAll('header').forEach(h => h.classList.add('sine-platform-sky-header'));
  }

  function enhanceProductVideos() {
    const videos = [...document.querySelectorAll('.media-scroll video, .product-media video, .product-card video')];
    if (!videos.length) return;
    videos.forEach(v => {
      v.muted = true; v.playsInline = true; v.preload = 'metadata';
      v.setAttribute('playsinline',''); v.setAttribute('webkit-playsinline','');
      v.addEventListener('click', e => { e.stopPropagation(); if (v.paused) v.play().catch(()=>{}); });
      v.addEventListener('error', () => v.closest('.media-scroll')?.classList.add('has-broken-media'));
    });
    if (!('IntersectionObserver' in window)) { videos.forEach(v=>v.play().catch(()=>{})); return; }
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting && e.intersectionRatio >= .55) e.target.play().catch(()=>{}); else e.target.pause();
    }), { threshold:[.15,.55,.85] });
    videos.forEach(v => io.observe(v));
  }

  function openMediaLightbox(src, type) {
    let box = $('#sineMediaLightbox');
    if (!box) {
      box = document.createElement('div'); box.id='sineMediaLightbox'; box.className='sine-media-lightbox';
      box.innerHTML='<button class="sine-lightbox-close" aria-label="Fermer">×</button><div class="sine-lightbox-content"></div>';
      document.body.appendChild(box); box.addEventListener('click',e=>{if(e.target===box||e.target.classList.contains('sine-lightbox-close')) box.classList.remove('open');});
    }
    const c=$('.sine-lightbox-content',box); c.innerHTML=type==='video'?`<video src="${src}" controls autoplay playsinline></video>`:`<img src="${src}" alt="Image" />`; box.classList.add('open');
  }
  function enhanceChatMedia() {
    document.addEventListener('click', e => {
      const img=e.target.closest('.chat-media'); if(img && img.tagName==='IMG'){ e.preventDefault(); e.stopPropagation(); openMediaLightbox(img.currentSrc||img.src,'image'); }
    }, true);
  }

  async function announcement() {
    if (!window.SineAPI || !user()) return;
    try {
      const result=await window.SineAPI.getActiveAnnouncement(); const a=result?.announcement || result?.data || result;
      if(!a?.videoUrl) return;
      const key=`sineAnnouncementSeen:${user().id||user()._id}:${a._id}`;
      if(localStorage.getItem(key)) return;
      let modal=$('#sineAnnouncementModal');
      if(!modal){
        modal=document.createElement('div'); modal.id='sineAnnouncementModal'; modal.className='sine-announcement-modal';
        modal.innerHTML=`<div class="sine-announcement-card"><button class="sine-announcement-close" aria-label="Fermer">×</button><div class="sine-announcement-head"><span>SINE.SHOP</span><small>Présentation</small></div><video id="sineAnnouncementVideo" controls playsinline preload="metadata"></video><h2 id="sineAnnouncementTitle"></h2><p id="sineAnnouncementDesc"></p></div>`; document.body.appendChild(modal);
      }
      $('#sineAnnouncementVideo').src=a.videoUrl; $('#sineAnnouncementTitle').textContent=a.title||'Bienvenue sur SINE.SHOP'; $('#sineAnnouncementDesc').textContent=a.description||''; modal.classList.add('open');
      const close=()=>{localStorage.setItem(key,'1'); modal.classList.remove('open'); $('#sineAnnouncementVideo').pause();};
      $('.sine-announcement-close',modal).onclick=close;
    }catch(e){}
  }

  function welcomeVoice() {
    const params=new URLSearchParams(location.search); if(params.get('welcome')!=='1'||location.pathname.split('/').pop()!=='index.html') return;
    const key='sineWelcomeVoicePlayed'; if(sessionStorage.getItem(key)) return; sessionStorage.setItem(key,'1');
    const u=user(); if(!u) return;
    const lang=(u.preferredLanguage||document.documentElement.lang||'fr').slice(0,2);
    const text={fr:'Bienvenue sur SINE.SHOP',en:'Welcome to SINE.SHOP',es:'Bienvenido a SINE.SHOP',ar:'مرحباً بك في SINE.SHOP'}[lang]||'Bienvenue sur SINE.SHOP';
    const speak=()=>{if(!('speechSynthesis' in window))return;const voices=speechSynthesis.getVoices();const v=voices.find(x=>x.lang.toLowerCase().startsWith(lang)&&/female|femme|samantha|zira|google français|google español/i.test(x.name))||voices.find(x=>x.lang.toLowerCase().startsWith(lang));const utter=new SpeechSynthesisUtterance(text);utter.lang=lang==='ar'?'ar-SA':lang==='en'?'en-US':lang==='es'?'es-ES':'fr-FR';utter.voice=v||null;utter.rate=.95;utter.pitch=1.05;speechSynthesis.cancel();speechSynthesis.speak(utter);};
    if(speechSynthesis.getVoices().length) speak(); else speechSynthesis.onvoiceschanged=speak;
  }

  async function installProfileVisibilityControls(){
    const page=location.pathname.split('/').pop().toLowerCase(); if(!['client.html','vendeur.html','livreur.html','sineshopaffiliation.html'].includes(page)||!user()||!window.SineAPI)return;
    if($('#sineProfileVisibility'))return;
    const u=user(), sellerOrDriver=['seller','livreur'].includes(u.role), v=u.profileVisibility||{};
    const box=document.createElement('section'); box.id='sineProfileVisibility'; box.className='sine-profile-visibility';
    box.innerHTML=`<div><h3>👁️ Visibilité de mon profil</h3><p>Choisissez ce que les autres peuvent voir. ${sellerOrDriver?'Certaines informations professionnelles restent publiques pour inspirer confiance.':''}</p><div class="sine-visibility-grid"><label><input type="checkbox" data-v="name" ${v.name!==false?'checked':''}> Nom / prénom</label><label><input type="checkbox" data-v="bio" ${v.bio!==false?'checked':''}> Bio</label><label><input type="checkbox" data-v="email" ${sellerOrDriver||v.email?'checked':''} ${sellerOrDriver?'disabled':''}> Email</label><label><input type="checkbox" data-v="phone" ${sellerOrDriver||v.phone?'checked':''} ${sellerOrDriver?'disabled':''}> Téléphone</label><label><input type="checkbox" data-v="address" ${sellerOrDriver||v.address?'checked':''} ${sellerOrDriver?'disabled':''}> Adresse / lieu</label><label><input type="checkbox" data-v="socialLinks" ${v.socialLinks?'checked':''}> Réseaux sociaux</label></div><button id="btnSaveProfileVisibility">Enregistrer</button></div>`;
    const target=document.querySelector('main')||document.body; target.appendChild(box);
    $('#btnSaveProfileVisibility',box).onclick=async()=>{const payload={profileVisibility:{}};box.querySelectorAll('[data-v]').forEach(x=>payload.profileVisibility[x.dataset.v]=x.checked);try{const updated=await window.SineAPI.updateProfile(payload);localStorage.setItem('sineUser',JSON.stringify(updated));box.querySelector('button').textContent='✓ Enregistré';setTimeout(()=>box.querySelector('button').textContent='Enregistrer',1500);}catch(e){box.querySelector('button').textContent='Erreur';}};
  }

  function appRating() {
    const u=user(); if(!u||!window.SineAPI) return;
    const visits=Number(localStorage.getItem('sineVisits')||0)+1; localStorage.setItem('sineVisits',String(visits));
    if(visits<5||localStorage.getItem('sineAppReviewDone')) return;
    setTimeout(()=>{
      if($('#sineRatingModal')) return;
      const m=document.createElement('div');m.id='sineRatingModal';m.className='sine-rating-modal';m.innerHTML='<div class="sine-rating-card"><button class="sine-rating-close">×</button><div class="sine-rating-logo">SINE.SH♡P</div><h2>Votre avis compte</h2><p>Notez votre expérience et aidez-nous à améliorer SINE.SHOP.</p><div class="sine-stars" role="radiogroup">'+[1,2,3,4,5].map(n=>`<button data-rating="${n}" aria-label="${n} étoile${n>1?'s':''}">★</button>`).join('')+'</div><textarea id="sineReviewComment" maxlength="1000" placeholder="Votre avis (facultatif)"></textarea><button id="sineReviewSend">Envoyer mon avis</button></div>';document.body.appendChild(m);m.classList.add('open');
      let rating=0;m.querySelectorAll('[data-rating]').forEach(b=>b.onclick=()=>{rating=Number(b.dataset.rating);m.querySelectorAll('[data-rating]').forEach(x=>x.classList.toggle('selected',Number(x.dataset.rating)<=rating));});
      m.querySelector('.sine-rating-close').onclick=()=>m.remove();m.querySelector('#sineReviewSend').onclick=async()=>{if(!rating)return;try{await window.SineAPI.submitAppReview({rating,comment:$('#sineReviewComment',m).value,platform:/iphone|ipad/i.test(navigator.userAgent)?'ios':/android/i.test(navigator.userAgent)?'android':'web'});localStorage.setItem('sineAppReviewDone','1');m.remove();}catch(e){}};
    },1200);
  }

  // Configuration future app native : renseigner les deux URLs quand les stores
  // et les Universal/App Links seront publiés. Le web reste fonctionnel sans elles.
  window.SINE_APP_LINKS=window.SINE_APP_LINKS||(window.SINE?.config?.APP_LINKS||{enabled:false,scheme:'sineshop://',androidStore:'',iosStore:''});
  window.openSineApp=function(){const c=window.SINE_APP_LINKS;if(!c.enabled)return false;const fallback=/android/i.test(navigator.userAgent)?c.androidStore:c.iosStore;const t=Date.now();location.href=c.scheme;setTimeout(()=>{if(Date.now()-t<1800&&fallback)location.href=fallback;},900);return true;};
  function bindSmartAppLinks(){if(!window.SINE_APP_LINKS?.enabled)return;document.querySelectorAll('.sine-header-brand').forEach(a=>a.addEventListener('click',e=>{if(window.openSineApp())e.preventDefault();}));}

  document.addEventListener('DOMContentLoaded',()=>{guardRole();applyVitrineHeader();enhanceProductVideos();enhanceChatMedia();announcement();welcomeVoice();appRating();bindSmartAppLinks();installProfileVisibilityControls();});
  window.addEventListener('load',enhanceProductVideos);
})();
