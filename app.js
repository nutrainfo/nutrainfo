const PAGES=['home','food','cookedfood','supplements','meals','calculators','about','install'];
function go(id){
  PAGES.forEach(p=>{
    document.getElementById('page-'+p).classList.remove('active');
    const nl=document.getElementById('nl-'+p);
    if(nl) nl.classList.remove('active');
  });
  document.getElementById('page-'+id).classList.add('active');
  const nl=document.getElementById('nl-'+id);
  if(nl) nl.classList.add('active');
  window.scrollTo({top:0,behavior:'instant'});
  initReveal();
  if(id==='food') renderFoods();
  if(id==='cookedfood') renderCookedFoods();
  if(id==='research'){ renderResearch(); }
  if(id==='calculators'){
    setTimeout(()=>{
      try{
        document.querySelectorAll('#calc-tdee input[type=range]').forEach(el=>{
          const mn=+el.min||0,mx=+el.max||100,v=+el.value;
          const p=((v-mn)/(mx-mn))*100;
          el.style.background=`linear-gradient(90deg,var(--mint) ${p}%,var(--border) ${p}%)`;
        });
        calcTDEE();calcProtein();calcBMI();
        if(typeof calcBodyFat==='function') calcBodyFat();
        if(typeof calcWater==='function') calcWater();
        if(typeof calcMacro==='function') calcMacro();
        if(typeof calcIBW==='function') calcIBW();
      }catch(e){console.warn('Calc init error:',e);}
    },100);
  }
}
function toggleMob(){document.getElementById('mob').classList.toggle('open');}
window.addEventListener('scroll',()=>{
  const s=document.documentElement.scrollTop;
  const h=document.documentElement.scrollHeight-window.innerHeight;
  document.getElementById('pbar').style.width=(h>0?(s/h)*100:0)+'%';
});
function showToast(m, duration, onClick){
  const t=document.getElementById('toast');
  t.textContent=m;
  t.classList.add('show');
  t.style.cursor=onClick?'pointer':'default';
  t.onclick=onClick||null;
  setTimeout(()=>{t.classList.remove('show');t.onclick=null;}, duration||3200);
}
function subNewsletter(){
  const e=document.getElementById('nl-e').value.trim();
  if(!e||!e.includes('@')){showToast('Please enter a valid email ✉️');return;}
  document.getElementById('nl-e').value='';
  showToast('🌿 Subscribed! First drop arrives this Sunday.');
}
function initReveal(){
  setTimeout(()=>{
    const obs=new IntersectionObserver(entries=>{
      entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('vis');obs.unobserve(e.target);}});
    },{threshold:.1});
    document.querySelectorAll('.page.active .reveal').forEach(el=>obs.observe(el));
  },60);
}

let ALL_FOODS=[];
let ORBITAL_FOODS=[];

let RAW_FOODS=[];
let COOKED_FOODS=[];

function loadFoods(){
  fetch('./foods.json')
    .then(r=>r.json())
    .then(data=>{
      ALL_FOODS=data.foods||[];
      // Raw database (and hero orbital search) only ever shows raw sections — cooked dishes are intentionally excluded
      RAW_FOODS=ALL_FOODS.filter(f=>f.section==='vegRaw'||f.section==='dairy'||f.section==='nonVegRaw');
      COOKED_FOODS=ALL_FOODS.filter(f=>f.section==='vegCooked'||f.section==='nonVegCooked');
      ORBITAL_FOODS=RAW_FOODS;
      if(ORBITAL_FOODS.length>0) orbitalDisplay(ORBITAL_FOODS[0]);
      updateSectionCounts();
      renderFoodCats();
      renderFoods();
      updateCookedSectionCounts();
      renderCookedFoodCats();
    })
    .catch(err=>{
      console.error('Error loading foods:',err);
      ALL_FOODS=[];
      RAW_FOODS=[];
      COOKED_FOODS=[];
      ORBITAL_FOODS=[];
    });
}

function setArc(id,value,max){
  const arc=document.getElementById(id);
  if(!arc)return;
  const circumference=264;
  const pct=Math.min(value/max,1);
  const offset=circumference-(pct*circumference);
  arc.style.strokeDashoffset=offset;
}

function orbitalDisplay(food){
  if(!food)return;
  if(food.emoji&&food.emoji.trim()){
    document.getElementById('ofdEmoji').textContent=food.emoji;
  }
  document.getElementById('ofdName').textContent=food.name;
  document.getElementById('ofdLocal').textContent=food.local;
  document.getElementById('ofdCal').textContent=food.cal;
  document.getElementById('proteinVal').textContent=food.pro;
  document.getElementById('carbsVal').textContent=food.carb;
  document.getElementById('fatVal').textContent=food.fat;
  document.getElementById('fiberVal').textContent=food.fiber > 0 ? food.fiber + 'g' : '~';
  document.getElementById('ofdGi').textContent=food.gi;
  document.getElementById('ofdBio').textContent=food.bio;
  document.getElementById('ofdCat').textContent=food.cat;
  setArc('proteinArc',food.pro,60);
  setArc('carbsArc',food.carb,80);
  setArc('fatArc',food.fat,60);
  setArc('fiberArc',food.fiber||0,30);
  const total=food.pro+food.carb+food.fat+0.1;
  document.getElementById('proteinBar').style.width=Math.min((food.pro/total)*100,100)+'%';
  document.getElementById('carbsBar').style.width=Math.min((food.carb/total)*100,100)+'%';
  document.getElementById('fatBar').style.width=Math.min((food.fat/total)*100,100)+'%';
}

function orbitalSearch(){
  const input=document.getElementById('orbitalSearch');
  const query=input.value.toLowerCase().trim();
  const suggestions=document.getElementById('orbitalSuggestions');
  if(query.length<1){suggestions.classList.remove('active');return;}
  const matches=ORBITAL_FOODS.filter(f=>
    f.name.toLowerCase().includes(query)||
    f.local.includes(query)||
    f.cat.toLowerCase().includes(query)
  ).slice(0,5);
  if(matches.length===0){
    suggestions.innerHTML='<div class="os-item" style="padding:16px;text-align:center;color:var(--mid);"><span>No foods found</span></div>';
    suggestions.classList.add('active');
    return;
  }
  suggestions.innerHTML=matches.map(f=>`
    <div class="os-item" data-name="${f.name}">
      <span class="os-emoji">${f.emoji}</span>
      <div class="os-info">
        <div class="os-name">${f.name}</div>
        <div class="os-local">${f.local}</div>
      </div>
      <span class="os-cat">${f.cat}</span>
    </div>
  `).join('');
  suggestions.classList.add('active');
  document.querySelectorAll('.os-item').forEach(item=>{
    item.addEventListener('click',function(){
      const name=this.getAttribute('data-name');
      const food=ORBITAL_FOODS.find(f=>f.name===name);
      if(food){orbitalDisplay(food);input.value='';suggestions.classList.remove('active');}
    });
  });
}

document.addEventListener('click',function(e){
  if(!e.target.closest('.orbital-hub')){
    document.getElementById('orbitalSuggestions').classList.remove('active');
  }
});

document.getElementById('orbitalSearch').addEventListener('keydown',function(e){
  if(e.key==='Enter'){
    const query=this.value.toLowerCase().trim();
    const food=ORBITAL_FOODS.find(f=>f.name.toLowerCase()===query);
    if(food){orbitalDisplay(food);this.value='';document.getElementById('orbitalSuggestions').classList.remove('active');}
  }
});

const SECTION_LABELS={
  vegRaw:{icon:'🌱',name:'Veg Raw',desc:'Whole, unprocessed vegetarian foods — grains, pulses, nuts, seeds, spices and soy, measured raw.'},
  dairy:{icon:'🥛',name:'Dairy',desc:'Milk, paneer, curd, cheese and dairy-based foods.'},
  nonVegRaw:{icon:'🍗',name:'Non-Veg Raw',desc:'Raw cuts of poultry, mutton, pork, fish, shellfish and eggs — measured uncooked per 100g.'},
  vegCooked:{icon:'🍲',name:'Veg Cooked',desc:'Prepared Indian vegetarian dishes — sabzis, dals, curries, rice, flatbreads and snacks from every region. Values are estimates per 100g of the finished dish.'},
  nonVegCooked:{icon:'🍛',name:'Non-Veg Cooked',desc:'Prepared Indian and global non-veg dishes — curries, marinades, biryanis and more. Values are estimates per 100g of the finished dish.'}
};
let activeFoodSection='vegRaw';
let activeFoodCat='all';
let foodSearch='';
const FOOD_PAGE_SIZE=48;
let foodRenderLimit=FOOD_PAGE_SIZE;

function updateSectionCounts(){
  const counts={};
  RAW_FOODS.forEach(f=>{counts[f.section]=(counts[f.section]||0)+1;});
  ['vegRaw','dairy','nonVegRaw'].forEach(s=>{
    const el=document.getElementById('cnt-'+s);
    if(el) el.textContent=(counts[s]||0).toLocaleString()+' foods';
  });
}

function setFoodSection(section,btn){
  activeFoodSection=section;
  activeFoodCat='all';
  foodRenderLimit=FOOD_PAGE_SIZE;
  document.querySelectorAll('#fdb-sections .fdb-sec-btn').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  document.getElementById('food-search').value='';
  foodSearch='';
  renderFoodCats();
  renderFoods();
}

function renderFoodCats(){
  const wrap=document.getElementById('food-cats');
  if(!wrap)return;
  if(foodSearch){
    wrap.innerHTML='';
    return;
  }
  const inSection=RAW_FOODS.filter(f=>f.section===activeFoodSection);
  const cats=[...new Set(inSection.map(f=>f.cat))].sort();
  let html=`<button class="food-cat-btn ${activeFoodCat==='all'?'active':''}" onclick="setFoodCat('all',this)">All ${SECTION_LABELS[activeFoodSection].name}</button>`;
  html+=cats.map(c=>`<button class="food-cat-btn ${activeFoodCat===c?'active':''}" onclick="setFoodCat('${c.replace(/'/g,"\\'")}',this)">${c}</button>`).join('');
  wrap.innerHTML=html;
}

function setFoodCat(cat,btn){
  activeFoodCat=cat;
  foodRenderLimit=FOOD_PAGE_SIZE;
  document.querySelectorAll('#food-cats .food-cat-btn').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  renderFoods();
}

function filterFoods(){
  foodSearch=document.getElementById('food-search').value.toLowerCase().trim();
  foodRenderLimit=FOOD_PAGE_SIZE;
  renderFoodCats();
  renderFoods();
}

function getFilteredFoods(){
  if(foodSearch){
    // search spans only the 3 raw sections — cooked dishes never appear here
    return RAW_FOODS.filter(f=>
      f.name.toLowerCase().includes(foodSearch)||
      (f.local&&f.local.toLowerCase().includes(foodSearch))||
      f.cat.toLowerCase().includes(foodSearch)
    );
  }
  return RAW_FOODS.filter(f=>{
    const matchSection=f.section===activeFoodSection;
    const matchCat=activeFoodCat==='all'||f.cat===activeFoodCat;
    return matchSection&&matchCat;
  });
}

function foodCardHTML(f){
  const sectionTag=foodSearch?`<span class="ft-badge">${SECTION_LABELS[f.section]?SECTION_LABELS[f.section].icon:''} ${SECTION_LABELS[f.section]?SECTION_LABELS[f.section].name:''}</span>`:'';
  return `
    <div class="food-card" onclick="openFood(${f.id})">
      <div class="food-thumb" style="background:${f.bg};display:flex;align-items:center;justify-content:center;font-family:var(--ff-serif);font-size:0.85rem;color:var(--forest);font-weight:500;text-align:center;padding:8px;overflow:hidden;">${sectionTag}${f.name}</div>
      <div class="food-body">
        <h3>${f.name}</h3>
        <div class="food-local">${f.local||''}</div>
        <div class="food-macros">
          <div class="fm-item"><div class="fm-val">${f.cal}</div><div class="fm-lbl">kcal</div></div>
          <div class="fm-item"><div class="fm-val">${f.pro}g</div><div class="fm-lbl">Protein</div></div>
          <div class="fm-item"><div class="fm-val">${f.carb}g</div><div class="fm-lbl">Carbs</div></div>
          <div class="fm-item"><div class="fm-val">${f.fiber > 0 ? f.fiber + 'g' : '~'}</div><div class="fm-lbl">Fiber</div></div>
        </div>
      </div>
    </div>
  `;
}

function renderFoods(){
  const grid=document.getElementById('food-grid');
  const loadMoreWrap=document.getElementById('fdb-loadmore');
  const info=document.getElementById('fdb-toolbar-info');
  if(!grid)return;
  const filtered=getFilteredFoods();

  if(info){
    if(foodSearch){
      info.innerHTML=`<strong>${filtered.length.toLocaleString()}</strong> raw food results for "${foodSearch}"`;
    }else{
      const label=SECTION_LABELS[activeFoodSection];
      info.innerHTML=`<strong>${filtered.length.toLocaleString()}</strong> foods in ${activeFoodCat==='all'?label.name:activeFoodCat} — ${label.desc}`;
    }
  }

  if(!filtered.length){
    grid.innerHTML=`<div class="fdb-empty" style="grid-column:1/-1;"><div class="fdb-empty-icon">🔍</div>No foods found. Try a different search term.</div>`;
    if(loadMoreWrap) loadMoreWrap.style.display='none';
    return;
  }

  const visible=filtered.slice(0,foodRenderLimit);
  grid.innerHTML=visible.map(foodCardHTML).join('');

  if(loadMoreWrap){
    loadMoreWrap.style.display=filtered.length>foodRenderLimit?'flex':'none';
  }
}

function loadMoreFoods(){
  foodRenderLimit+=FOOD_PAGE_SIZE;
  renderFoods();
}

/* ════════════════════════════════════
   COOKED FOOD DATABASE — separate state, separate dataset (COOKED_FOODS only)
   ════════════════════════════════════ */
let activeCookedSection='vegCooked';
let activeCookedCat='all';
let cookedFoodSearch='';
const COOKED_PAGE_SIZE=48;
let cookedRenderLimit=COOKED_PAGE_SIZE;

function updateCookedSectionCounts(){
  const counts={};
  COOKED_FOODS.forEach(f=>{counts[f.section]=(counts[f.section]||0)+1;});
  const vegEl=document.getElementById('cnt-cooked-vegCooked');
  if(vegEl) vegEl.textContent=counts.vegCooked?counts.vegCooked.toLocaleString()+' foods':'Coming soon';
  const nvEl=document.getElementById('cnt-cooked-nonVegCooked');
  if(nvEl) nvEl.textContent=(counts.nonVegCooked||0).toLocaleString()+' foods';
}

function setCookedFoodSection(section,btn){
  if(section==='vegCooked'&&!COOKED_FOODS.some(f=>f.section==='vegCooked')){
    showToast('🍲 Veg Cooked dishes are coming soon!');
    return;
  }
  activeCookedSection=section;
  activeCookedCat='all';
  cookedRenderLimit=COOKED_PAGE_SIZE;
  document.querySelectorAll('#fdb-cooked-sections .fdb-sec-btn').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  document.getElementById('cooked-food-search').value='';
  cookedFoodSearch='';
  renderCookedFoodCats();
  renderCookedFoods();
}

function renderCookedFoodCats(){
  const wrap=document.getElementById('cooked-food-cats');
  if(!wrap)return;
  if(cookedFoodSearch){
    wrap.innerHTML='';
    return;
  }
  const inSection=COOKED_FOODS.filter(f=>f.section===activeCookedSection);
  const cats=[...new Set(inSection.map(f=>f.cat))].sort();
  let html=`<button class="food-cat-btn ${activeCookedCat==='all'?'active':''}" onclick="setCookedFoodCat('all',this)">All ${SECTION_LABELS[activeCookedSection].name}</button>`;
  html+=cats.map(c=>`<button class="food-cat-btn ${activeCookedCat===c?'active':''}" onclick="setCookedFoodCat('${c.replace(/'/g,"\\'")}',this)">${c}</button>`).join('');
  wrap.innerHTML=html;
}

function setCookedFoodCat(cat,btn){
  activeCookedCat=cat;
  cookedRenderLimit=COOKED_PAGE_SIZE;
  document.querySelectorAll('#cooked-food-cats .food-cat-btn').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  renderCookedFoods();
}

function filterCookedFoods(){
  cookedFoodSearch=document.getElementById('cooked-food-search').value.toLowerCase().trim();
  cookedRenderLimit=COOKED_PAGE_SIZE;
  renderCookedFoodCats();
  renderCookedFoods();
}

function getFilteredCookedFoods(){
  if(cookedFoodSearch){
    // search spans only the cooked sections — raw foods never appear here
    return COOKED_FOODS.filter(f=>
      f.name.toLowerCase().includes(cookedFoodSearch)||
      (f.local&&f.local.toLowerCase().includes(cookedFoodSearch))||
      f.cat.toLowerCase().includes(cookedFoodSearch)
    );
  }
  return COOKED_FOODS.filter(f=>{
    const matchSection=f.section===activeCookedSection;
    const matchCat=activeCookedCat==='all'||f.cat===activeCookedCat;
    return matchSection&&matchCat;
  });
}

function cookedFoodCardHTML(f){
  const sectionTag=cookedFoodSearch?`<span class="ft-badge">${SECTION_LABELS[f.section]?SECTION_LABELS[f.section].icon:''} ${SECTION_LABELS[f.section]?SECTION_LABELS[f.section].name:''}</span>`:'';
  return `
    <div class="food-card" onclick="openFood(${f.id})">
      <div class="food-thumb" style="background:${f.bg};display:flex;align-items:center;justify-content:center;font-family:var(--ff-serif);font-size:0.85rem;color:var(--forest);font-weight:500;text-align:center;padding:8px;overflow:hidden;">${sectionTag}${f.name}</div>
      <div class="food-body">
        <h3>${f.name}</h3>
        <div class="food-local">${f.local||''}</div>
        <div class="food-macros">
          <div class="fm-item"><div class="fm-val">${f.cal}</div><div class="fm-lbl">kcal</div></div>
          <div class="fm-item"><div class="fm-val">${f.pro}g</div><div class="fm-lbl">Protein</div></div>
          <div class="fm-item"><div class="fm-val">${f.carb}g</div><div class="fm-lbl">Carbs</div></div>
          <div class="fm-item"><div class="fm-val">${f.fiber > 0 ? f.fiber + 'g' : '~'}</div><div class="fm-lbl">Fiber</div></div>
        </div>
      </div>
    </div>
  `;
}

function renderCookedFoods(){
  const grid=document.getElementById('cooked-food-grid');
  const loadMoreWrap=document.getElementById('fdb-cooked-loadmore');
  const info=document.getElementById('fdb-cooked-toolbar-info');
  if(!grid)return;
  const filtered=getFilteredCookedFoods();

  if(info){
    if(cookedFoodSearch){
      info.innerHTML=`<strong>${filtered.length.toLocaleString()}</strong> cooked dish results for "${cookedFoodSearch}"`;
    }else{
      const label=SECTION_LABELS[activeCookedSection];
      info.innerHTML=`<strong>${filtered.length.toLocaleString()}</strong> dishes in ${activeCookedCat==='all'?label.name:activeCookedCat} — ${label.desc}`;
    }
  }

  if(!filtered.length){
    grid.innerHTML=`<div class="fdb-empty" style="grid-column:1/-1;"><div class="fdb-empty-icon">🍲</div>No dishes found. Try a different search term or category.</div>`;
    if(loadMoreWrap) loadMoreWrap.style.display='none';
    return;
  }

  const visible=filtered.slice(0,cookedRenderLimit);
  grid.innerHTML=visible.map(cookedFoodCardHTML).join('');

  if(loadMoreWrap){
    loadMoreWrap.style.display=filtered.length>cookedRenderLimit?'flex':'none';
  }
}

function loadMoreCookedFoods(){
  cookedRenderLimit+=COOKED_PAGE_SIZE;
  renderCookedFoods();
}

function openFood(id){
  const f=ALL_FOODS.find(x=>x.id===id);
  if(!f){
    console.error('Food not found:',id);
    return;
  }
  document.getElementById('md-name').textContent=f.name;
  document.getElementById('md-local').textContent=f.local+' · GI: '+(f.gi||'N/A');
  document.getElementById('md-bio').textContent=f.bio||'Bioavailability information coming soon.';
  document.getElementById('md-macros').innerHTML=
    `<div class="fm-item" style="background:var(--paper);border-radius:12px;padding:14px;text-align:center;">
       <div style="font-family:var(--ff-serif);font-size:1.4rem;color:var(--forest);">${f.cal}</div>
       <div style="font-size:.7rem;color:var(--light);text-transform:uppercase;letter-spacing:.5px;margin-top:3px;">kcal</div>
     </div>
     <div class="fm-item" style="background:rgba(45,106,79,.1);border-radius:12px;padding:14px;text-align:center;">
       <div style="font-family:var(--ff-serif);font-size:1.4rem;color:var(--forest);">${f.pro}g</div>
       <div style="font-size:.7rem;color:var(--light);text-transform:uppercase;letter-spacing:.5px;margin-top:3px;">Protein</div>
     </div>
     <div class="fm-item" style="background:rgba(233,196,106,.15);border-radius:12px;padding:14px;text-align:center;">
       <div style="font-family:var(--ff-serif);font-size:1.4rem;color:var(--forest);">${f.carb}g</div>
       <div style="font-size:.7rem;color:var(--light);text-transform:uppercase;letter-spacing:.5px;margin-top:3px;">Carbs</div>
     </div>
     <div class="fm-item" style="background:rgba(244,162,97,.12);border-radius:12px;padding:14px;text-align:center;">
       <div style="font-family:var(--ff-serif);font-size:1.4rem;color:var(--forest);">${f.fat}g</div>
       <div style="font-size:.7rem;color:var(--light);text-transform:uppercase;letter-spacing:.5px;margin-top:3px;">Fat</div>
     </div>`;
  const nutrients={
    'Protein':f.pro+'g',
    'Carbohydrates':f.carb+'g',
    'Total Fat':f.fat+'g',
    'Fiber':(f.fiber > 0 ? f.fiber + 'g' : '~'),
    'Calories':f.cal+' kcal'
  };
  const tbody=document.querySelector('#md-table tbody');
  if(tbody){
    tbody.innerHTML=Object.entries(nutrients).map(([k,v])=>{
      return`<tr><td>${k}</td><td><strong>${v}</strong></td><td>—</td><td><div class="nt-bar"><div class="nt-fill" style="width:0%"></div></div></td></tr>`;
    }).join('');
  }
  document.getElementById('food-modal').classList.add('open');
  document.body.style.overflow='hidden';
}

function closeModal(e){
  if(!e||e.target===document.getElementById('food-modal')||e===undefined){
    document.getElementById('food-modal').classList.remove('open');
    document.body.style.overflow='';
  }
}

const SUPPS=[
  {name:'Whey Protein Concentrate',icon:'<i class="ti ti-barbell"></i>',desc:'Most popular protein supplement. Fast-absorbing complete protein.',ratings:{Quality:88,Transparency:72,Purity:80,Safety:96,Evidence:92,'Value for Money':85,Taste:82,Digestibility:78}},
  {name:'Creatine Monohydrate',icon:'<i class="ti ti-bolt"></i>',desc:'Most researched supplement in sports nutrition. Improves strength and power output.',ratings:{Quality:95,Transparency:90,Purity:88,Safety:99,Evidence:99,'Value for Money':95,Taste:75,Digestibility:90}},
  {name:'Vitamin D3',icon:'<i class="ti ti-sun"></i>',desc:'Critical for Indians — most are deficient. Supports immunity, bone health, mood.',ratings:{Quality:90,Transparency:82,Purity:86,Safety:94,Evidence:92,'Value for Money':92,Taste:88,Digestibility:95}},
  {name:'Fish Oil (Omega-3)',icon:'<i class="ti ti-fish"></i>',desc:'EPA + DHA for heart, brain and joint health. Critical for vegetarians who avoid fish.',ratings:{Quality:82,Transparency:70,Purity:75,Safety:90,Evidence:88,'Value for Money':78,Taste:62,Digestibility:76}},
  {name:'Magnesium Glycinate',icon:'<i class="ti ti-moon"></i>',desc:'Most bioavailable form. Supports sleep, stress, muscle function and 300+ enzymes.',ratings:{Quality:88,Transparency:84,Purity:86,Safety:95,Evidence:86,'Value for Money':80,Taste:72,Digestibility:92}},
  {name:'Plant Protein (Pea + Rice)',icon:'<i class="ti ti-plant-2"></i>',desc:'Best vegan protein blend. Pea+rice combination gives complete amino acid profile.',ratings:{Quality:80,Transparency:75,Purity:82,Safety:96,Evidence:78,'Value for Money':72,Taste:68,Digestibility:80}},
];
function renderSupplements(){
  const g=document.getElementById('supp-grid');if(!g)return;
  g.innerHTML=SUPPS.map(s=>`
    <div class="supp-card" onclick="showToast('Full review for ${s.name} — coming soon!')">
      <div class="supp-header">
        <div class="supp-icon">${s.icon}</div>
        <div><h3>${s.name}</h3><p>${s.desc}</p></div>
      </div>
      <div class="rating-rows">
        ${Object.entries(s.ratings).map(([k,v])=>`
          <div class="rating-row">
            <span class="rl">${k}</span>
            <div class="rating-bar-bg"><div class="rating-fill" style="width:${v}%"></div></div>
            <span class="rv">${v}</span>
          </div>`).join('')}
      </div>
    </div>
  `).join('');
}

const MEALS=[
  {icon:'<i class="ti ti-leaf"></i>',name:'Indian Vegetarian High Protein',desc:'Dal, paneer, soya, sprouts — hitting 100g+ protein daily.',cal:'1,800',pro:'105g',carbs:'200g',fat:'55g',cost:'₹250/day'},
  {icon:'<i class="ti ti-plant-2"></i>',name:'Indian Vegan Plan',desc:'100% plant-based. B12 and omega-3 supplementation built in.',cal:'1,700',pro:'85g',carbs:'220g',fat:'48g',cost:'₹200/day'},
  {icon:'<i class="ti ti-flame"></i>',name:'Weight Loss Plan',desc:'Calorie deficit with high satiety foods. No crash dieting.',cal:'1,400',pro:'110g',carbs:'140g',fat:'45g',cost:'₹220/day'},
  {icon:'<i class="ti ti-barbell"></i>',name:'Muscle Gain Plan',desc:'Calorie surplus with anabolic meal timing and protein loading.',cal:'2,800',pro:'150g',carbs:'330g',fat:'80g',cost:'₹350/day'},
  {icon:'<i class="ti ti-stethoscope"></i>',name:'Diabetes-Friendly Indian',desc:'Low GI foods, controlled carbs, balanced meals every 3 hours.',cal:'1,600',pro:'90g',carbs:'160g',fat:'55g',cost:'₹240/day'},
  {icon:'<i class="ti ti-coin-rupee"></i>',name:'Student Budget Plan',desc:'Under ₹150/day. Dal, eggs, curd, oats. Maximise nutrition per rupee.',cal:'1,800',pro:'80g',carbs:'220g',fat:'55g',cost:'₹140/day'},
  {icon:'<i class="ti ti-heart"></i>',name:'Heart Healthy Plan',desc:'Low saturated fat, high fibre, omega-3 rich. DASH diet adapted for India.',cal:'1,900',pro:'88g',carbs:'250g',fat:'58g',cost:'₹280/day'},
  {icon:'<i class="ti ti-user"></i>',name:'Senior Citizen Plan',desc:'Easy to digest, high calcium, vitamin D, B12. Joint-friendly.',cal:'1,600',pro:'90g',carbs:'190g',fat:'52g',cost:'₹260/day'},
];
function renderMeals(){
  const g=document.getElementById('meal-grid');if(!g)return;
  g.innerHTML=MEALS.map(m=>`
    <div class="mp-card" onclick="showToast('Full ${m.name} plan with shopping list — coming soon!')">
      <div class="mp-header">
        <div class="mp-icon">${m.icon}</div>
        <div><h3>${m.name}</h3><p>${m.desc}</p></div>
      </div>
      <div class="mp-stats">
        <div class="mp-stat"><div class="msv">${m.cal}</div><div class="msl">Calories</div></div>
        <div class="mp-stat"><div class="msv">${m.pro}</div><div class="msl">Protein</div></div>
        <div class="mp-stat"><div class="msv">${m.carbs}</div><div class="msl">Carbs</div></div>
        <div class="mp-stat"><div class="msv">${m.cost}</div><div class="msl">Est. Cost</div></div>
      </div>
    </div>
  `).join('');
}

function fmt(n){return Math.round(n).toLocaleString('en-IN');}
document.addEventListener('input',e=>{if(e.target&&e.target.type==='range') updateSliderGradient(e.target);});

// ── TDEE Calculator (Mifflin-St Jeor + Katch-McArdle) ────────────────────
function calcTDEE(){
  const age=+document.getElementById('tdee-age').value;
  const wt=+document.getElementById('tdee-wt').value;
  const ht=+document.getElementById('tdee-ht').value;
  const act=+document.getElementById('tdee-act').value;
  const goal=document.getElementById('tdee-goal').value;
  const formula=document.querySelector('input[name="tdee-formula"]:checked').value;
  const sex=document.querySelector('input[name="tdee-sex"]:checked').value;
  const bf=+document.getElementById('tdee-bf').value;

  document.getElementById('tdee-age-v').textContent=age+' yrs';
  document.getElementById('tdee-wt-v').textContent=wt+' kg';
  document.getElementById('tdee-ht-v').textContent=ht+' cm';
  document.getElementById('tdee-bf-v').textContent=bf+'%';

  // Toggle row visibility
  const isMiff=formula==='mifflin';
  document.getElementById('tdee-sex-row').style.display=isMiff?'':'none';
  document.getElementById('tdee-ht-row').style.display=isMiff?'':'none';
  document.getElementById('tdee-bf-row').style.display=isMiff?'none':'';

  let bmr;
  if(formula==='mifflin'){
    // Mifflin-St Jeor 1990: most accurate for general population (±10% for 82% of adults)
    bmr=sex==='m'?(10*wt)+(6.25*ht)-(5*age)+5:(10*wt)+(6.25*ht)-(5*age)-161;
    document.getElementById('tdee-formula-note').textContent=
      'Mifflin-St Jeor (1990): validated as most accurate for general adults (±10% for 82%). Endorsed by AND 2005 meta-analysis.';
  } else {
    // Katch-McArdle: uses lean body mass — more accurate for athletes
    const lbm=wt*(1-bf/100);
    bmr=370+(21.6*lbm);
    document.getElementById('tdee-formula-note').textContent=
      'Katch-McArdle (1996): uses lean body mass — most accurate for athletes and trained individuals. LBM = '+lbm.toFixed(1)+'kg.';
  }

  const tdee=Math.round(bmr*act);
  const goalOffsets={maint:0,loss_mild:-250,loss:-500,loss_aggr:-750,gain:200,gain_aggr:400};
  const goalLabels={maint:'Maintenance',loss_mild:'Mild Loss (−250)',loss:'Weight Loss (−500)',loss_aggr:'Aggressive Loss (−750)',gain:'Lean Bulk (+200)',gain_aggr:'Bulk (+400)'};
  const targetCal=tdee+(goalOffsets[goal]||0);
  const weeklyDelta=((goalOffsets[goal]||0)*7)/7700; // kg per week (7700 kcal = 1 kg fat)

  setNum('tdee-result', fmt(targetCal));
  document.getElementById('tdee-goal-label').textContent=goalLabels[goal];
  setNum('bmr-r', fmt(Math.round(bmr))+' kcal');
  setNum('tdee-maint-r', fmt(tdee)+' kcal');
  setNum('tdee-pro-r', Math.round(wt*2)+'g / day');
  setNum('tdee-wk-r', weeklyDelta===0?'0 kg (maintenance)':(weeklyDelta>0?'+':'')+weeklyDelta.toFixed(2)+' kg / week');
  const weeks5kg=weeklyDelta!==0?Math.abs(5/weeklyDelta).toFixed(0):null;
  setNum('tdee-time-r', weeks5kg?`~${weeks5kg} weeks for 5 kg`:'N/A (maintenance)');
}

// ── Protein Calculator (ISSN 2017) ────────────────────────────────────────
function calcProtein(){
  const wt=+document.getElementById('pro-wt').value;
  const goal=+document.getElementById('pro-goal').value;
  const diet=+document.getElementById('pro-diet').value;
  const training=+document.getElementById('pro-training').value;
  const meals=+document.querySelector('input[name="pro-meals"]:checked').value;
  document.getElementById('pro-wt-v').textContent=wt+' kg';

  // ISSN 2017: adjusted by training status (beginners need slightly more %)
  // Diet correction accounts for DIAAS/PDCAAS difference
  const pro=Math.round(wt*goal*diet*training);
  const perMeal=Math.round(pro/meals); // leucine threshold: ~0.4g/kg per meal
  const leucineCheck=(wt*0.4).toFixed(0);
  const fromFood=Math.round(pro*0.7);
  const suppGap=pro-fromFood;

  setNum('pro-result', pro);
  document.getElementById('pro-gkg').textContent=(pro/wt).toFixed(1)+' g/kg';
  document.getElementById('pro-meal').textContent='~'+perMeal+'g (leucine min ~'+leucineCheck+'g)';
  document.getElementById('pro-food').textContent='~'+fromFood+'g';
  document.getElementById('pro-supp').textContent=suppGap>0?'~'+suppGap+'g':'None needed';
  document.getElementById('pro-paneer').textContent='~'+Math.round((pro/18.3)*100)+'g paneer';
  document.getElementById('pro-eggs').textContent='~'+Math.round(pro/6.3)+' whole eggs';

  const notes={
    0.8:'WHO RDA (0.8g/kg): minimum to prevent deficiency. Not adequate for active individuals or muscle retention during weight loss.',
    1.2:'1.2–1.6 g/kg: ISSN recommendation for weight loss with muscle preservation. Helps minimise lean mass catabolism in hypocaloric state.',
    1.6:'1.6–2.2 g/kg: ISSN 2017 optimal range for muscle hypertrophy. Beyond 2.2g/kg shows minimal additional MPS benefit.',
    2.0:'2.0–2.4 g/kg: Upper ISSN evidence range. Useful during cutting phases or for advanced athletes with heavy training loads.',
    2.4:'2.4 g/kg: Highest evidence-supported intake. A 2018 meta-analysis (Morton et al.) found no significant benefit beyond this level.'
  };
  document.getElementById('pro-science-note').textContent=notes[goal]||'ISSN 2017 Position Stand.';
}

// ── BMI Calculator (Asian cutoffs + WHtR) ────────────────────────────────
function calcBMI(){
  const wt=+document.getElementById('bmi-wt').value;
  const ht=+document.getElementById('bmi-ht').value;
  const waist=+document.getElementById('bmi-waist').value;
  const sex=document.querySelector('input[name="bmi-sex"]:checked').value;
  const eth=document.querySelector('input[name="bmi-eth"]:checked').value;

  document.getElementById('bmi-wt-v').textContent=wt+' kg';
  document.getElementById('bmi-ht-v').textContent=ht+' cm';
  document.getElementById('bmi-waist-v').textContent=waist+' cm';

  const htM=ht/100;
  const bmi=wt/(htM*htM);
  setNum('bmi-result', bmi.toFixed(1));

  // Standard WHO categories
  let cat,catColor;
  if(bmi<18.5){cat='Underweight';catColor='#3B9EE8';}
  else if(bmi<25){cat='Normal weight';catColor='#52B788';}
  else if(bmi<30){cat='Overweight';catColor='#C8973A';}
  else{cat='Obese';catColor='#E06C5A';}
  document.getElementById('bmi-cat').textContent=cat;
  document.getElementById('bmi-cat').style.color=catColor;

  // Asian-adjusted categories (WHO 2004 expert consultation)
  let asianCat,asianColor;
  if(bmi<18.5){asianCat='Underweight';asianColor='#3B9EE8';}
  else if(bmi<23){asianCat='Normal (Asian)';asianColor='#52B788';}
  else if(bmi<27.5){asianCat='Overweight (Asian) — increased metabolic risk';asianColor='#C8973A';}
  else{asianCat='Obese (Asian) — high metabolic risk';asianColor='#E06C5A';}
  document.getElementById('bmi-asian-cat').textContent=eth==='asian'?asianCat:cat;
  document.getElementById('bmi-asian-cat').style.color=eth==='asian'?asianColor:catColor;

  // Ideal weight range (BMI 18.5–23 for Asian, 18.5–25 general)
  const upperBMI=eth==='asian'?23:25;
  const idealLow=(18.5*htM*htM).toFixed(1);
  const idealHigh=(upperBMI*htM*htM).toFixed(1);
  document.getElementById('bmi-ideal').textContent=idealLow+'–'+idealHigh+' kg';

  // Waist-to-Height ratio (WHtR) — better cardiometabolic predictor
  const whr=(waist/ht).toFixed(2);
  document.getElementById('bmi-whr').textContent=whr;
  let whrCat;
  if(whr<0.4) whrCat='Extremely lean';
  else if(whr<0.5) whrCat='Healthy ✓';
  else if(whr<0.55) whrCat='Overweight — increased risk';
  else if(whr<0.6) whrCat='Obese — high risk';
  else whrCat='Very obese — very high risk';
  document.getElementById('bmi-whr-cat').textContent=whrCat;

  // Rough body fat estimate (Deurenberg equation 1991)
  const bfEst=((1.2*bmi)+(0.23*(sex==='m'?0:1)*10)-(0.23*(sex==='m'?1:0)*10)-(10.8*(sex==='m'?1:0))-5.4).toFixed(1);
  const bfEstClean=sex==='m'?(1.20*bmi+0.23*0-10.8*1-5.4).toFixed(1):(1.20*bmi+0.23*1-10.8*0-5.4).toFixed(1);
  document.getElementById('bmi-bf-est').textContent='~'+bfEstClean+'% (Deurenberg 1991)';

  // BMI gauge needle (0–35+ range mapped to 0–100%)
  const needlePct=Math.min(Math.max(((bmi-14)/(36-14))*100,2),98);
  document.getElementById('bmi-needle').style.left=needlePct+'%';
}

// ── Body Fat Calculator (US Navy Method) ─────────────────────────────────
function calcBodyFat(){
  const sex=document.querySelector('input[name="bf-sex"]:checked').value;
  const ht=+document.getElementById('bf-ht').value;
  const neck=+document.getElementById('bf-neck').value;
  const waist=+document.getElementById('bf-waist').value;
  const hip=+document.getElementById('bf-hip').value;
  const wt=+document.getElementById('bf-wt').value;

  document.getElementById('bf-ht-v').textContent=ht+' cm';
  document.getElementById('bf-neck-v').textContent=neck+' cm';
  document.getElementById('bf-waist-v').textContent=waist+' cm';
  document.getElementById('bf-hip-v').textContent=hip+' cm';
  document.getElementById('bf-wt-v').textContent=wt+' kg';

  // Show/hide hip row for females
  document.getElementById('bf-hip-row').style.display=sex==='f'?'':'none';

  let bf;
  if(sex==='m'){
    // US Navy male formula
    if(waist<=neck) return;
    bf=495/(1.0324-0.19077*Math.log10(waist-neck)+0.15456*Math.log10(ht))-450;
  } else {
    // US Navy female formula (requires hip)
    if(waist+hip<=neck) return;
    bf=495/(1.29579-0.35004*Math.log10(waist+hip-neck)+0.22100*Math.log10(ht))-450;
  }

  bf=Math.max(3,Math.min(bf,50));
  setNum('bf-result', bf.toFixed(1));

  // ACSM body fat categories
  let cat,catColor;
  if(sex==='m'){
    if(bf<6){cat='Essential fat';catColor='#3B9EE8';}
    else if(bf<14){cat='Athletic';catColor='#52B788';}
    else if(bf<18){cat='Fitness';catColor='#52B788';}
    else if(bf<25){cat='Average';catColor='#C8973A';}
    else{cat='Obese';catColor='#E06C5A';}
  } else {
    if(bf<14){cat='Essential fat';catColor='#3B9EE8';}
    else if(bf<21){cat='Athletic';catColor='#52B788';}
    else if(bf<25){cat='Fitness';catColor='#52B788';}
    else if(bf<32){cat='Average';catColor='#C8973A';}
    else{cat='Obese';catColor='#E06C5A';}
  }
  document.getElementById('bf-cat').textContent=cat+' ('+(sex==='m'?'Male':'Female')+' · ACSM)';
  document.getElementById('bf-acsmcat').textContent=cat;
  document.getElementById('bf-acsmcat').style.color=catColor;

  const fatMass=(wt*bf/100).toFixed(1);
  const leanMass=(wt-fatMass).toFixed(1);
  document.getElementById('bf-fatmass').textContent=fatMass+' kg';
  document.getElementById('bf-leanmass').textContent=leanMass+' kg';
  // Protein based on lean mass (ISSN recommends 2.3–3.1g/kg LBM for cutting)
  document.getElementById('bf-protein').textContent='~'+Math.round(leanMass*2.3)+'–'+Math.round(leanMass*3.1)+' g/day (lean mass)';
  document.getElementById('bf-essential').textContent=sex==='m'?'3–5% body fat':'10–13% body fat';
}

// ── Water / Hydration Calculator (IOM 2004) ───────────────────────────────
function calcWater(){
  const sex=document.querySelector('input[name="wat-sex"]:checked').value;
  const wt=+document.getElementById('wat-wt').value;
  const actAdd=+document.getElementById('wat-act').value;  // extra L per hour of exercise
  const climAdd=+document.getElementById('wat-clim').value; // extra L for heat
  const caffMult=+document.querySelector('input[name="wat-caff"]:checked').value;

  document.getElementById('wat-wt-v').textContent=wt+' kg';

  // IOM 2004 base (total water from all sources)
  const iomBase=sex==='m'?3.7:2.7;
  // Body weight adjustment: +0.035L per kg above 70kg base, or −0.03 below
  const wtAdjust=(wt-70)*0.03;
  let total=iomBase+wtAdjust+actAdd+climAdd;
  // Caffeine adds ~150ml extra per serving (mild diuretic — net slightly negative)
  const caffExtra=caffMult;
  total+=caffExtra;
  total=Math.max(1.5,total);

  const drinkable=total*0.8; // ~20% from food
  const fromFood=total*0.2;

  setNum('wat-result', total.toFixed(1));
  document.getElementById('wat-bar-label').textContent=total.toFixed(1)+' / 5.0 L';
  const barPct=Math.min((total/5.0)*100,100);
  document.getElementById('wat-bar').style.width=barPct+'%';
  document.getElementById('wat-glass').textContent='~'+Math.round(drinkable/0.25)+' glasses (250ml)';
  document.getElementById('wat-bottles').textContent='~'+Math.ceil(drinkable)+' × 1L bottles';
  document.getElementById('wat-food').textContent='~'+fromFood.toFixed(1)+' L (fruits/veg)';
  document.getElementById('wat-drinks').textContent='~'+drinkable.toFixed(1)+' L pure water/beverages';
  document.getElementById('wat-caff-extra').textContent=caffMult>0?'+'+Math.round(caffMult*1000)+' ml':'None';
}

// ── Macro Split Calculator (AMDR + Donut chart) ───────────────────────────
function calcMacro(){
  const cal=+document.getElementById('mac-cal').value;
  const type=document.getElementById('mac-type').value;
  const wt=+document.getElementById('mac-wt').value;

  document.getElementById('mac-cal-v').textContent=cal.toLocaleString('en-IN')+' kcal';
  document.getElementById('mac-wt-v').textContent=wt+' kg';

  // AMDR-based splits [protein%, carb%, fat%]
  const splits={
    balanced:[.30,.40,.30],
    highpro:[.35,.35,.30],
    lowcarb:[.30,.25,.45],
    keto:[.25,.05,.70],
    veg:[.22,.55,.23],
    if:[.30,.40,.30]
  };
  const notes={
    balanced:'AMDR 2005: 10–35% protein, 45–65% carbs, 20–35% fat. This split sits well within all three ranges.',
    highpro:'High protein supports greater MPS. AMDR upper: 35% protein. Useful for body recomposition and caloric deficits.',
    lowcarb:'Low carb (not ketogenic). 25% carbs = ~125g at 2000kcal. Within AMDR but at lower end. May improve insulin sensitivity.',
    keto:'Ketogenic is outside AMDR carb range (<5%). Used clinically for epilepsy, PCOS, metabolic syndrome. Requires medical supervision for long-term.',
    veg:'Vegetarian Indian diets are naturally higher carb. 22% protein still adequate if bioavailability-adjusted (legumes, dairy, soy). Prioritise complete amino acid sources.',
    if:'Same macros as balanced — intermittent fasting affects timing, not totals. Compress same intake into 8-hour eating window.'
  };

  const [pp,cp,fp]=splits[type]||splits['balanced'];
  const pro=Math.round((cal*pp)/4);
  const carb=Math.round((cal*cp)/4);
  const fat=Math.round((cal*fp)/9);
  const fibre=Math.round((cal/1000)*14); // DG2020: 14g per 1000kcal

  // AMDR compliance check
  const amdrOk=pp>=0.10&&pp<=0.35&&cp>=0.45&&cp<=0.65&&fp>=0.20&&fp<=0.35;
  const amdrNote=amdrOk?'✓ Within AMDR range':'⚠ Outside AMDR (clinically intentional)';

  document.getElementById('mac-summary').textContent=pro+'g P · '+carb+'g C · '+fat+'g F';
  document.getElementById('mac-pro').textContent=pro+'g ('+Math.round(pp*100)+'%)';
  document.getElementById('mac-carb').textContent=carb+'g ('+Math.round(cp*100)+'%)';
  document.getElementById('mac-fat').textContent=fat+'g ('+Math.round(fp*100)+'%)';
  document.getElementById('mac-fibre').textContent='~'+fibre+'g (14g/1000kcal standard)';
  document.getElementById('mac-prokg').textContent=(pro/wt).toFixed(1)+' g/kg';
  document.getElementById('mac-amdr').textContent=amdrNote;
  document.getElementById('mac-science-note').textContent=notes[type]||'';

  // Draw donut chart
  drawMacroDonut(pp,cp,fp);
}

function drawMacroDonut(pp,cp,fp){
  const canvas=document.getElementById('macro-donut');
  if(!canvas) return;
  const ctx=canvas.getContext('2d');
  const cx=50,cy=50,r=38,lw=12;
  ctx.clearRect(0,0,100,100);
  const segments=[[pp,'#52B788'],[cp,'#C8973A'],[fp,'#3B9EE8']];
  let start=-Math.PI/2;
  segments.forEach(([pct,color])=>{
    const angle=pct*2*Math.PI;
    ctx.beginPath();
    ctx.arc(cx,cy,r,start,start+angle);
    ctx.strokeStyle=color;
    ctx.lineWidth=lw;
    ctx.stroke();
    start+=angle+0.02;
  });
  // Center text
  ctx.fillStyle='#fff';
  ctx.font='bold 11px Inter,sans-serif';
  ctx.textAlign='center';
  ctx.fillText('MACROS',cx,cy+4);
}

// ── Ideal Body Weight (Devine, Robinson, Miller, Hamwi) ───────────────────
function calcIBW(){
  const sex=document.querySelector('input[name="ibw-sex"]:checked').value;
  const ht=+document.getElementById('ibw-ht').value;
  const wt=+document.getElementById('ibw-wt').value;
  const targetBF=+document.getElementById('ibw-bf').value;
  const currentBF=+document.getElementById('ibw-cbf').value;

  document.getElementById('ibw-ht-v').textContent=ht+' cm';
  document.getElementById('ibw-wt-v').textContent=wt+' kg';
  document.getElementById('ibw-bf-v').textContent=targetBF+'%';
  document.getElementById('ibw-cbf-v').textContent=currentBF+'%';

  const htIn=(ht-152.4)/2.54; // height above 5ft in inches

  // Devine formula (1974) — used for drug dosing
  const devine=sex==='m'?50+(2.3*htIn):45.5+(2.3*htIn);
  // Robinson formula (1983)
  const robinson=sex==='m'?52+(1.9*htIn):49+(1.7*htIn);
  // Miller formula (1983)
  const miller=sex==='m'?56.2+(1.41*htIn):53.1+(1.36*htIn);
  // Hamwi formula (1964)
  const hamwi=sex==='m'?48+(2.7*htIn*0.9):45+(2.2*htIn*0.9);

  const avgIBW=Math.round((devine+robinson+miller+hamwi)/4);
  setNum('ibw-result', Math.max(40,devine).toFixed(1));

  const fmt1=v=>(Math.max(40,v).toFixed(1)+' kg');
  document.getElementById('ibw-devine').textContent=fmt1(devine)+' (clinical pharmacology)';
  document.getElementById('ibw-robinson').textContent=fmt1(robinson);
  document.getElementById('ibw-miller').textContent=fmt1(miller);
  document.getElementById('ibw-hamwi').textContent=fmt1(hamwi);

  // Goal weight at target body fat %
  const leanMass=wt*(1-currentBF/100);
  const goalWt=leanMass/(1-targetBF/100);
  document.getElementById('ibw-goalbf').textContent=goalWt.toFixed(1)+' kg (at '+targetBF+'% BF)';

  const diff=goalWt-wt;
  const diffStr=(diff>=0?'+':'')+diff.toFixed(1)+' kg ('+Math.abs(diff/0.5).toFixed(0)+' weeks at 0.5kg/wk)';
  document.getElementById('ibw-diff').textContent=diffStr;
}

// ── Helper: animate number ───────────────────────────────────────────────
function setNum(id,val){
  const el=document.getElementById(id);
  if(el) el.textContent=val;
}

// ── showCalc ──────────────────────────────────────────────────────────────
function updateSliderGradient(el){
  if(!el||el.type!=='range') return;
  const min=+el.min||0,max=+el.max||100,val=+el.value;
  const pct=((val-min)/(max-min))*100;
  el.style.background='linear-gradient(90deg,var(--mint) '+pct+'%,var(--border) '+pct+'%)';
}
function showCalc(id,btn){
  document.querySelectorAll('.calc-panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.ctab').forEach(b=>b.classList.remove('active'));
  const panel=document.getElementById('calc-'+id);
  if(!panel) return;
  panel.classList.add('active');
  if(btn) btn.classList.add('active');
  setTimeout(()=>{
    panel.querySelectorAll('input[type=range]').forEach(updateSliderGradient);
    try{
      if(id==='tdee') calcTDEE();
      else if(id==='protein') calcProtein();
      else if(id==='bmi') calcBMI();
      else if(id==='bodyfat') calcBodyFat();
      else if(id==='water') calcWater();
      else if(id==='macro') calcMacro();
      else if(id==='ibw') calcIBW();
    }catch(e){console.warn('showCalc error:',e);}
  },50);
}

const SYMPTOMS=[
  {id:'fatigue',icon:'<i class="ti ti-battery-1"></i>',label:'Fatigue / Low Energy'},
  {id:'hairloss',icon:'<i class="ti ti-scissors"></i>',label:'Hair Loss / Thinning'},
  {id:'brainfog',icon:'<i class="ti ti-brain"></i>',label:'Brain Fog / Poor Focus'},
  {id:'immunity',icon:'<i class="ti ti-virus"></i>',label:'Frequent Infections'},
  {id:'weakness',icon:'<i class="ti ti-barbell"></i>',label:'Muscle Weakness'},
  {id:'cramps',icon:'<i class="ti ti-bolt"></i>',label:'Muscle Cramps'},
  {id:'recovery',icon:'<i class="ti ti-heart-rate-monitor"></i>',label:'Poor Recovery'},
  {id:'mood',icon:'<i class="ti ti-mood-sad"></i>',label:'Mood Changes / Low Mood'},
  {id:'sleep',icon:'<i class="ti ti-moon"></i>',label:'Poor Sleep Quality'},
  {id:'skin',icon:'<i class="ti ti-droplet-off"></i>',label:'Dry Skin / Rashes'},
  {id:'bone',icon:'<i class="ti ti-bone"></i>',label:'Bone Pain / Aches'},
  {id:'nails',icon:'<i class="ti ti-hand-finger"></i>',label:'Brittle Nails'},
];
const DEFICIENCY_MAP={
  fatigue:['Iron','Vitamin B12','Vitamin D','Magnesium'],
  hairloss:['Iron','Zinc','Biotin (B7)','Protein'],
  brainfog:['Vitamin B12','Iron','Omega-3','Vitamin D'],
  immunity:['Vitamin C','Zinc','Vitamin D','Selenium'],
  weakness:['Vitamin D','Magnesium','Iron','Protein'],
  cramps:['Magnesium','Potassium','Calcium','Sodium'],
  recovery:['Protein','Vitamin D','Zinc','Omega-3'],
  mood:['Vitamin D','Vitamin B12','Omega-3','Magnesium'],
  sleep:['Magnesium','Vitamin D','Tryptophan','Calcium'],
  skin:['Vitamin E','Zinc','Vitamin A','Biotin (B7)'],
  bone:['Vitamin D','Calcium','Magnesium','Vitamin K2'],
  nails:['Iron','Biotin (B7)','Zinc','Protein'],
};
const DEF_INFO={
  'Iron':{foods:['Toor Dal','Moong Dal','Spinach','Ragi','Dates'],test:'Serum Ferritin + CBC + Iron Panel',tip:'Pair iron-rich foods with vitamin C. Avoid tea/coffee with meals.'},
  'Vitamin B12':{foods:['Curd','Paneer','Eggs','Milk','Fortified foods'],test:'Serum Vitamin B12 (target >300 pg/mL)',tip:'Almost exclusively in animal products. Vegetarians need supplementation or fortified foods.'},
  'Vitamin D':{foods:['Sunlight (primary)','Fortified milk','Eggs','Fatty fish'],test:'25-OH Vitamin D (target 40–80 ng/mL)',tip:'Most Indians are severely deficient. Get 15–30 min sunlight daily. Supplement 1000–2000 IU/day.'},
  'Magnesium':{foods:['Almonds','Moong Dal','Spinach','Pumpkin Seeds','Dark Chocolate'],test:'Serum Magnesium (not very sensitive)',tip:'Whole foods diet usually sufficient. Stress, alcohol and excess coffee deplete magnesium.'},
  'Zinc':{foods:['Pumpkin Seeds','Sesame','Cashews','Dal','Rajma'],test:'Serum Zinc',tip:'Plant zinc is less bioavailable than animal sources. Soaking and sprouting legumes improves absorption.'},
  'Protein':{foods:['Dal','Paneer','Curd','Eggs','Soya','Chicken'],test:'Serum albumin (indirect marker)',tip:'Most Indians eat under 40g protein/day vs the 60–80g minimum recommended.'},
  'Calcium':{foods:['Milk','Paneer','Curd','Ragi','Sesame Seeds'],test:'Serum Calcium + PTH + Vitamin D',tip:'Absorption requires vitamin D. Spinach calcium is poorly absorbed due to oxalates.'},
  'Vitamin C':{foods:['Amla (highest!)','Guava','Lemon','Bell Peppers','Kiwi'],test:'Rarely tested — assess via diet',tip:'Destroyed by heat. Eat some raw fruits/vegetables daily. Enhances iron absorption significantly.'},
  'Omega-3':{foods:['Flaxseed','Chia Seeds','Walnuts','Fatty Fish'],test:'Omega-3 index (specialized)',tip:'ALA from plants converts poorly to EPA/DHA. Vegetarians may consider algae-based omega-3.'},
  'Vitamin E':{foods:['Almonds','Sunflower Seeds','Wheat Germ Oil','Spinach'],test:'Serum Vitamin E (alpha-tocopherol)',tip:'Fat-soluble — absorb better with fat in the meal. Deficiency rare in healthy adults.'},
  'Vitamin A':{foods:['Carrots','Sweet Potato','Mango','Papaya','Spinach'],test:'Serum Retinol',tip:'Beta-carotene from plants converts to vitamin A. Fat improves absorption.'},
  'Selenium':{foods:['Brazil Nuts (just 1–2!)','Sunflower Seeds','Chicken','Eggs'],test:'Serum Selenium',tip:'Brazil nuts are the richest source — just 1–2 daily meets needs. Indian soils are selenium-poor.'},
  'Potassium':{foods:['Banana','Coconut Water','Dal','Potato','Spinach'],test:'Serum Electrolytes panel',tip:'Rarely deficient in people eating whole foods. Excess sweat loss can reduce levels.'},
  'Biotin (B7)':{foods:['Eggs','Almonds','Peanuts','Curd'],test:'Serum Biotin',tip:'Raw egg whites block biotin absorption. Cooking eggs fixes this. True deficiency is rare.'},
  'Vitamin K2':{foods:['Natto (rare in India)','Hard cheese','Egg yolks','Some fermented foods'],test:'No standard clinical test',tip:'K2 directs calcium to bones. Under-researched in Indian context. May need supplementation if dairy-free.'},
  'Tryptophan':{foods:['Milk','Eggs','Soya','Dal','Almonds'],test:'Assess via diet history',tip:'Precursor to serotonin and melatonin. Carbohydrates improve tryptophan uptake in the brain.'},
  'Sodium':{foods:['Table salt','Pickle','Buttermilk','Papad'],test:'Serum Sodium / Electrolytes',tip:'Excess is more common than deficiency in India. Hyponatremia (low sodium) can occur with excessive water intake or excess sweating.'},
};

function renderSymptoms(){
  const g=document.getElementById('symptom-grid');if(!g)return;
  g.innerHTML=SYMPTOMS.map(s=>`
    <div class="sym-btn" id="sym-${s.id}" onclick="toggleSym('${s.id}')">
      <span class="si">${s.icon}</span>
      <span>${s.label}</span>
    </div>
  `).join('');
}
function toggleSym(id){
  document.getElementById('sym-'+id).classList.toggle('sel');
}
function checkDeficiency(){
  const selected=SYMPTOMS.filter(s=>document.getElementById('sym-'+s.id).classList.contains('sel')).map(s=>s.id);
  if(!selected.length){showToast('Please select at least one symptom');return;}
  const counts={};
  selected.forEach(sym=>{
    (DEFICIENCY_MAP[sym]||[]).forEach(def=>{counts[def]=(counts[def]||0)+1;});
  });
  const sorted=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const grid=document.getElementById('def-grid');
  grid.innerHTML=sorted.map(([def,score])=>{
    const info=DEF_INFO[def]||{foods:[],test:'Consult your doctor',tip:''};
    return`<div class="def-card">
      <h4>${def}</h4>
      <p style="margin-bottom:8px;font-size:.78rem;color:var(--mid);">Matched ${score} of your ${selected.length} symptom(s).</p>
      <p style="font-size:.8rem;color:var(--mid);margin-bottom:10px;"><strong>Suggested test:</strong> ${info.test}</p>
      <p style="font-size:.79rem;color:var(--mid);margin-bottom:10px;">💡 ${info.tip}</p>
      <div class="def-foods">${info.foods.map(f=>`<span class="def-food-tag">${f}</span>`).join('')}</div>
    </div>`;
  }).join('');
  document.getElementById('def-result').classList.add('show');
  document.getElementById('def-result').scrollIntoView({behavior:'smooth',block:'start'});
}

const BLOOD_TESTS=[
  {name:'Vitamin D (25-OH)',sub:'Bone, immunity, mood, hormones',low:'0',high:'150',normStart:33,normEnd:80,markerPct:40,unit:'ng/mL',why:'Over 70% of Indians are deficient. Impacts bones, immunity, mood, hormones and muscle function.',nutrition:'Supplement 1000–2000 IU/day if below 30. Fatty fish, egg yolks, fortified milk help but rarely sufficient alone.'},
  {name:'Vitamin B12',sub:'Nerve function, red blood cells, DNA',low:'0',high:'1000',normStart:25,normEnd:80,markerPct:30,unit:'pg/mL',why:'Deficiency extremely common in vegetarians. Causes irreversible nerve damage if untreated long-term.',nutrition:'Animal foods only (dairy, eggs, meat). Vegetarians: supplement methylcobalamin 500–1000 mcg daily.'},
  {name:'Ferritin (Iron Stores)',sub:'Iron storage, fatigue, hair health',low:'0',high:'300',normStart:15,normEnd:55,markerPct:22,unit:'ng/mL',why:'Low ferritin causes fatigue, brain fog and hair loss even before anaemia develops. Very common in Indian women.',nutrition:'Increase heme iron (meat) or non-heme + vitamin C (dal + lemon). Avoid tea/coffee with meals.'},
  {name:'HbA1c',sub:'Average blood sugar over 3 months',low:'4',high:'12',normStart:10,normEnd:40,markerPct:18,unit:'%',why:'India has the second-highest number of diabetics globally. Early detection is critical.',nutrition:'Reduce refined carbs, increase protein and fiber, time carbohydrate intake around activity.'},
  {name:'TSH (Thyroid)',sub:'Thyroid function — metabolism, energy',low:'0',high:'10',normStart:10,normEnd:45,markerPct:25,unit:'mIU/L',why:'Thyroid issues are very common in India, especially hypothyroidism in women. Impacts weight and energy.',nutrition:'Iodine (iodised salt), selenium (Brazil nuts, sunflower seeds). Avoid excess raw goitrogenic foods.'},
  {name:'Lipid Profile (Total Cholesterol)',sub:'Cardiovascular disease risk',low:'100',high:'350',normStart:20,normEnd:55,markerPct:35,unit:'mg/dL',why:'Cardiovascular disease is India\'s leading killer. Indians have unique lipid patterns with high triglycerides.',nutrition:'Reduce trans fats and refined carbs. Increase omega-3 (flaxseed, fish oil), fiber (oats), and plant sterols.'},
  {name:'CBC (Haemoglobin)',sub:'Anaemia, oxygen carrying capacity',low:'0',high:'20',normStart:35,normEnd:70,markerPct:45,unit:'g/dL',why:'India has the highest burden of anaemia globally. Affects energy, cognition and immunity.',nutrition:'Iron-rich foods with vitamin C. Folate and B12 also needed for red blood cell formation.'},
  {name:'Serum Magnesium',sub:'Muscle, nerve, enzyme function',low:'0',high:'4',normStart:25,normEnd:60,markerPct:35,unit:'mg/dL',why:'Most people eating processed foods are mildly deficient. Impacts sleep, stress response, and 300+ enzyme reactions.',nutrition:'Almonds, dark chocolate, spinach, moong dal, pumpkin seeds. Supplement magnesium glycinate if needed.'},
  {name:'Zinc',sub:'Immunity, wound healing, testosterone',low:'0',high:'150',normStart:25,normEnd:55,markerPct:38,unit:'μg/dL',why:'Commonly deficient in vegetarians. Critical for immunity, wound healing and reproductive health.',nutrition:'Pumpkin seeds, sesame, cashews, rajma. Phytates in plants reduce absorption — sprout/soak legumes.'},
  {name:'Vitamin B9 (Folate)',sub:'DNA synthesis, neural tube, red blood cells',low:'0',high:'25',normStart:30,normEnd:70,markerPct:20,unit:'ng/mL',why:'Critical for pregnant women. Also important for DNA synthesis and cardiovascular health.',nutrition:'Moong dal (richest Indian source!), leafy greens, legumes. Heat destroys folate — eat some raw greens.'},
  {name:'Liver Function (ALT)',sub:'Liver health and fat metabolism',low:'0',high:'100',normStart:10,normEnd:35,markerPct:20,unit:'U/L',why:'Non-alcoholic fatty liver disease is epidemic in India. Often silent until advanced.',nutrition:'Reduce refined carbs and sugar. Increase cruciferous vegetables. Limit alcohol. Curcumin shows promise.'},
  {name:'Kidney Function (Creatinine)',sub:'Kidney filtration efficiency',low:'0',high:'3',normStart:17,normEnd:50,markerPct:28,unit:'mg/dL',why:'Rising creatinine indicates decreasing kidney function. High protein diets are safe for healthy kidneys.',nutrition:'Stay well-hydrated. Reduce sodium. Potassium management important if kidneys are already stressed.'},
];
function renderBloodTests(){
  const g=document.getElementById('blood-grid');if(!g)return;
  g.innerHTML=BLOOD_TESTS.map(t=>`
    <div class="blood-card" onclick="showToast('${t.name}: ${t.nutrition}')">
      <h3>${t.name}</h3>
      <p class="bc-sub">${t.sub}</p>
      <div class="range-bar">
        <div class="range-normal" style="left:${t.normStart}%;width:${t.normEnd-t.normStart}%"></div>
        <div class="range-marker" style="left:${t.markerPct}%"></div>
      </div>
      <div class="range-labels"><span>Low</span><span>Normal range</span><span>High</span></div>
      <p style="font-size:.78rem;color:var(--mid);margin-top:12px;">${t.why}</p>
    </div>
  `).join('');
}

const RESEARCH=[
  {id:1,tag:'Weight Management',india:false,quality:'high',stars:'★★★',title:'Calorie Restriction with or without Time-Restricted Eating in Weight Loss',authors:'Liu D, Huang Y, Huang C, et al.',journal:'New England Journal of Medicine',year:'2022',doi:'10.1056/NEJMoa2114833',url:'https://www.nejm.org/doi/10.1056/NEJMoa2114833',design:'Randomized Controlled Trial',n:'139 adults with obesity',finding:'Time-restricted eating (8-hour window) combined with calorie restriction did not produce significantly more weight loss than calorie restriction alone over 12 months.',practical:'IF (intermittent fasting) works — but primarily because it helps reduce total calories. The window itself is not magic. Total energy intake remains the key driver.'},
  {id:2,tag:'Weight Management',india:false,quality:'high',stars:'★★★',title:'Effects of Low-Carbohydrate Diets Versus Low-Fat Diets on Metabolic Risk Factors',authors:'Mansoor N, Vinknes KJ, Veierød MB, Retterstøl K.',journal:'British Journal of Nutrition',year:'2016',doi:'10.1017/S0007114515004699',url:'https://doi.org/10.1017/S0007114515004699',design:'Meta-analysis of 23 RCTs',n:'2,788 participants',finding:'Low-carb diets produced greater short-term weight loss and improvements in triglycerides and HDL compared to low-fat diets, but differences diminished at 12+ months.',practical:'Low-carb can be effective short-term. Long-term, adherence matters more than diet type. Choose the approach you can sustain.'},
  {id:3,tag:'Weight Management',india:true,quality:'high',stars:'★★★',title:'Prevalence of Obesity and Overweight in Urban and Rural India: The ICMR-INDIAB Study',authors:'Pradeepa R, Anjana RM, Joshi SR, et al.',journal:'Diabetes Technology & Therapeutics',year:'2015',doi:'10.1089/dia.2014.0259',url:'https://doi.org/10.1089/dia.2014.0259',design:'Cross-sectional population study',n:'12,000+ individuals',finding:'Obesity and overweight rates in India are rapidly increasing across both urban and rural areas, with South Indian states showing higher prevalence. Abdominal obesity is disproportionately high.',practical:'Waist circumference is a critical metric for Indians — not just BMI. Target waist <90 cm (men) and <80 cm (women) per IDF Asian thresholds.'},
  {id:4,tag:'Weight Management',india:false,quality:'high',stars:'★★★',title:'Protein Leverage and Energy Intake: A Systematic Review',authors:'Gosby AK, Conigrave AD, Raubenheimer D, Simpson SJ.',journal:'Obesity Reviews',year:'2014',doi:'10.1111/obr.12131',url:'https://doi.org/10.1111/obr.12131',design:'Systematic review',n:'38 studies reviewed',finding:'Humans prioritise protein intake. When dietary protein % is low, total caloric intake increases to compensate — the \'protein leverage hypothesis.\' Diluting protein with ultra-processed food drives overconsumption.',practical:'Keep dietary protein above 15–20% of calories. Low-protein, highly processed diets drive passive overconsumption. Prioritise whole protein sources at every meal.'},
  {id:5,tag:'Weight Management',india:false,quality:'high',stars:'★★★',title:'Effects of High-Protein Diets on Body Weight and Composition: A Meta-Analysis',authors:'Wycherley TP, Moran LJ, Clifton PM, Noakes M, Brinkworth GD.',journal:'American Journal of Clinical Nutrition',year:'2012',doi:'10.3945/ajcn.112.044321',url:'https://doi.org/10.3945/ajcn.112.044321',design:'Meta-analysis of 24 RCTs',n:'1,063 participants',finding:'High-protein diets (>1.2g/kg) produced significantly greater weight loss, fat mass reduction, and preservation of lean mass compared to standard-protein diets during energy restriction.',practical:'During weight loss, increase protein to 1.2–1.6g/kg bodyweight to preserve muscle. This is especially important for vegetarians and vegans.'},
  {id:6,tag:'Weight Management',india:false,quality:'high',stars:'★★★',title:'Ultra-Processed Food Consumption and Obesity: A Systematic Review',authors:'Askari M, Heshmati J, Shahinfar H, Tripathi N, Daneshzad E.',journal:'Clinical Nutrition ESPEN',year:'2020',doi:'10.1016/j.clnesp.2020.07.044',url:'https://doi.org/10.1016/j.clnesp.2020.07.044',design:'Systematic review and meta-analysis',n:'Multiple cohorts',finding:'Higher ultra-processed food intake was consistently associated with greater risk of overweight and obesity across all age groups and populations studied.',practical:'Minimise packaged biscuits, instant noodles, chips, flavoured yogurts. Replace with whole foods — dal, rice, vegetables, curd — which are more satiating per calorie.'},
  {id:7,tag:'Weight Management',india:false,quality:'high',stars:'★★★',title:'Sleep Deprivation and Obesity: A Literature Review',authors:'Beccuti G, Pannain S.',journal:'Current Opinion in Clinical Nutrition & Metabolic Care',year:'2011',doi:'10.1097/MCO.0b013e3283479109',url:'https://doi.org/10.1097/MCO.0b013e3283479109',design:'Review of epidemiological and experimental studies',n:'Multiple populations',finding:'Short sleep duration (<6 hours) is consistently associated with increased BMI, higher ghrelin (hunger hormone), lower leptin (satiety hormone), and greater caloric intake.',practical:'7–9 hours of sleep is a non-negotiable weight management tool. Sleep deprivation directly increases hunger and cravings, particularly for high-carb, high-fat foods.'},
  {id:8,tag:'Weight Management',india:false,quality:'high',stars:'★★★',title:'Dietary Fibre and Body Weight: A Systematic Review',authors:'Miketinas DC, Bray GA, Beyl RA, et al.',journal:'Obesity (Silver Spring)',year:'2019',doi:'10.1002/oby.22428',url:'https://doi.org/10.1002/oby.22428',design:'Systematic review and meta-analysis',n:'Multiple RCTs',finding:'Dietary fibre intake was independently associated with weight loss and adherence to dietary interventions, regardless of macronutrient composition.',practical:'Each additional 10g of daily fibre is associated with ~100g less fat mass. Prioritise vegetables, legumes, oats and whole grains at every meal.'},
  {id:9,tag:'Weight Management',india:false,quality:'med',stars:'★★☆',title:'Gut Microbiome and Obesity: A Review of Association and Mechanisms',authors:'Fan Y, Pedersen O.',journal:'Nature Reviews Microbiology',year:'2021',doi:'10.1038/s41579-020-00445-7',url:'https://doi.org/10.1038/s41579-020-00445-7',design:'Review',n:'Multiple human and animal studies',finding:'The gut microbiome modulates energy harvest, fat storage, and appetite regulation. Dysbiosis (imbalanced microbiome) is associated with obesity, though causality in humans is still being established.',practical:'Eat a diverse plant-based diet (30+ plant foods/week), fermented foods (curd, kanji, idli), and limit antibiotics to preserve a healthy microbiome.'},
  {id:10,tag:'Weight Management',india:true,quality:'high',stars:'★★★',title:'Effect of Yoga on Obesity and Metabolic Syndrome: A Systematic Review',authors:'Rioux JG, Ritenbaugh C.',journal:'Alternative Therapies in Health and Medicine',year:'2013',doi:'',url:'https://pubmed.ncbi.nlm.nih.gov/24164053/',design:'Systematic review of 17 RCTs',n:'Multiple Indian and Western populations',finding:'Regular yoga practice (particularly Hatha and Ashtanga) is associated with significant reductions in BMI, waist circumference, and metabolic risk markers in overweight individuals.',practical:'30–60 minutes of yoga 5 days/week produces meaningful metabolic benefits. For Indians, this is culturally accessible and evidence-backed.'},
  {id:11,tag:'Weight Management',india:false,quality:'high',stars:'★★★',title:'Physical Activity and Adiposity: A Dose-Response Meta-Analysis',authors:'Swift DL, Johannsen NM, Lavie CJ, Earnest CP, Church TS.',journal:'Progress in Cardiovascular Diseases',year:'2014',doi:'10.1016/j.pcad.2013.09.002',url:'https://doi.org/10.1016/j.pcad.2013.09.002',design:'Meta-analysis of prospective studies',n:'Multiple cohorts',finding:'Moderate-to-vigorous physical activity has a clear dose-response relationship with fat mass reduction. Resistance training combined with aerobic exercise is most effective for body composition.',practical:'150 minutes/week of moderate exercise is the minimum for weight management. Add 2 resistance training sessions/week to preserve muscle and boost metabolic rate.'},
  {id:12,tag:'Weight Management',india:false,quality:'high',stars:'★★★',title:'Mindful Eating and Weight Management: A Review of the Evidence',authors:'Warren JM, Smith N, Ashwell M.',journal:'Nutrition Bulletin',year:'2017',doi:'10.1111/nbu.12279',url:'https://doi.org/10.1111/nbu.12279',design:'Systematic review',n:'Multiple RCTs',finding:'Mindful eating interventions reduce binge eating, emotional eating, and overall caloric intake. Effects on body weight are modest but consistent across studies.',practical:'Eat without screens, chew slowly, and stop at 80% fullness (Hara Hachi Bu). These simple practices reduce average intake by 150–300 kcal/day without counting calories.'},
  {id:13,tag:'Weight Management',india:true,quality:'high',stars:'★★★',title:'Rice Consumption and Obesity Risk in Asian Populations: A Meta-Analysis',authors:'Hu EA, Pan A, Malik V, Sun Q.',journal:'BMJ',year:'2012',doi:'10.1136/bmj.e7492',url:'https://doi.org/10.1136/bmj.e7492',design:'Meta-analysis of prospective cohort studies',n:'352,384 individuals',finding:'Higher white rice consumption was associated with increased risk of type 2 diabetes, particularly in Asian populations who consume it as a dietary staple.',practical:'Switching from white to brown rice or replacing 1–2 rice servings with millets (bajra, jowar, ragi) significantly reduces glycemic load. Cooling and reheating rice also lowers its glycemic impact.'},
  {id:14,tag:'Weight Management',india:false,quality:'high',stars:'★★★',title:'Resistance Training and Resting Metabolic Rate: A Meta-Analysis',authors:'Speakman JR, Selman C.',journal:'International Journal of Obesity',year:'2003',doi:'10.1038/sj.ijo.0802256',url:'https://doi.org/10.1038/sj.ijo.0802256',design:'Meta-analysis',n:'Multiple RCTs',finding:'Resistance training increases resting metabolic rate through increased muscle mass. Each kilogram of added muscle burns approximately 13 kcal/day at rest.',practical:'For long-term weight management, building muscle is more sustainable than just cutting calories. 2–3 strength training sessions/week prevent metabolic adaptation during weight loss.'},
  {id:15,tag:'Weight Management',india:false,quality:'high',stars:'★★★',title:'Added Sugar Intake and Obesity: A Systematic Review',authors:'Te Morenga L, Mallard S, Mann J.',journal:'BMJ',year:'2013',doi:'10.1136/bmj.e7492',url:'https://doi.org/10.1136/bmj.f6879',design:'Meta-analysis of 30 RCTs and 38 prospective studies',n:'Multiple',finding:'Reducing dietary sugars causes weight loss; increasing sugar causes weight gain. Liquid calories from sugar-sweetened beverages are particularly obesogenic.',practical:'Eliminate sugar-sweetened beverages (cold drinks, packaged juices, sweet chai). This single change can reduce intake by 150–300 kcal/day.'},
  {id:16,tag:'Weight Management',india:true,quality:'high',stars:'★★★',title:'BMI Cutoffs for South Asians: WHO Expert Consultation Report',authors:'WHO Expert Consultation.',journal:'The Lancet',year:'2004',doi:'10.1016/S0140-6736(03)15268-3',url:'https://doi.org/10.1016/S0140-6736(03)15268-3',design:'International expert consultation and population data analysis',n:'Multiple Asian cohorts',finding:'South Asians develop type 2 diabetes and cardiovascular disease at lower BMI than Europeans. Recommended cut-offs: 23 (overweight) and 27.5 (obese) for South Asian populations.',practical:'If you are Indian, your healthy BMI range is 18.5–23, not 18.5–25. Get health risk assessed at BMI 23+, not 25+.'},
  {id:17,tag:'Weight Management',india:false,quality:'high',stars:'★★★',title:'Protein Timing and Muscle Protein Synthesis: Systematic Review',authors:'Schoenfeld BJ, Aragon AA.',journal:'Journal of the International Society of Sports Nutrition',year:'2018',doi:'10.1186/s12970-018-0215-1',url:'https://doi.org/10.1186/s12970-018-0215-1',design:'Systematic review',n:'Multiple RCTs',finding:'The \'anabolic window\' immediately post-workout is less important than total daily protein intake. As long as protein is distributed across the day, timing has minimal additional effect.',practical:'Focus on hitting total daily protein targets (1.6g/kg). Distribution matters — spreading protein across 3–4 meals is better than concentrating it in one or two.'},
  {id:18,tag:'Weight Management',india:false,quality:'high',stars:'★★★',title:'Effect of Breakfast on Weight Management: A Systematic Review',authors:'Sievert K, Hussain SM, Page MJ, et al.',journal:'BMJ',year:'2019',doi:'10.1136/bmj.l42',url:'https://doi.org/10.1136/bmj.l42',design:'Systematic review and meta-analysis of RCTs',n:'13 RCTs, 525 participants',finding:'Eating breakfast was not associated with weight loss in RCTs. The belief that breakfast \'boosts metabolism\' is not supported by controlled trial evidence.',practical:'Skip or eat breakfast based on hunger and preference, not belief. Total daily calories and food quality matter more than meal timing for most people.'},
  {id:19,tag:'Weight Management',india:true,quality:'med',stars:'★★☆',title:'Ghee Consumption and Cardiovascular Risk in Indian Populations',authors:'Sharma H, Zhang X, Bharat C.',journal:'AYU (Journal of Research in Ayurveda)',year:'2010',doi:'10.4103/0974-8520.72361',url:'https://doi.org/10.4103/0974-8520.72361',design:'Review and observational data',n:'Multiple Indian cohorts',finding:'Pure desi ghee (clarified butter) in moderate amounts (1–2 tsp/day) does not appear to increase cardiovascular risk in otherwise healthy Indians consuming traditional diets. Excessive intake remains a concern.',practical:'1–2 teaspoons of desi ghee per day is reasonable in a balanced diet. It is not a health food at high doses, but moderate traditional use is not harmful for most people.'},
  {id:20,tag:'Weight Management',india:false,quality:'high',stars:'★★★',title:'Waist-to-Height Ratio as a Predictor of Cardiometabolic Risk: Systematic Review',authors:'Ashwell M, Gunn P, Gibson S.',journal:'Nutrition Research Reviews',year:'2012',doi:'10.1017/S0954422412000054',url:'https://doi.org/10.1017/S0954422412000054',design:'Systematic review of 78 studies',n:'Multiple large cohorts',finding:'Waist-to-height ratio (WHtR >0.5) is a better predictor of cardiometabolic risk than BMI alone, across ethnicities and both sexes.',practical:'\'Keep your waist less than half your height\' is a simple, evidence-backed rule. Measure waist at navel level monthly.'},
  {id:21,tag:'Food Nutrition',india:false,quality:'high',stars:'★★★',title:'Protein Intake and Muscle Mass in Older Adults: A Meta-Analysis',authors:'Morton RW, Murphy KT, McKellar SR, et al.',journal:'British Journal of Sports Medicine',year:'2018',doi:'10.1136/bjsports-2017-097608',url:'https://doi.org/10.1136/bjsports-2017-097608',design:'Meta-analysis of 49 RCTs',n:'1,863 participants',finding:'Dietary protein supplementation significantly increased muscle mass and strength during resistance training. The effect plateaued beyond 1.62g/kg/day. No benefit beyond 2.2g/kg.',practical:'1.6–2.0g protein per kg bodyweight per day maximises muscle gain. More than 2.2g/kg provides no additional benefit for most people.'},
  {id:22,tag:'Food Nutrition',india:true,quality:'high',stars:'★★★',title:'Nutritional Quality of Indian Diets: NNMB Nationwide Survey',authors:'National Nutrition Monitoring Bureau (NNMB), ICMR.',journal:'National Institute of Nutrition Report',year:'2012',doi:'',url:'https://www.nin.res.in/',design:'Nationwide dietary survey',n:'120,000+ households',finding:'Indian diets are severely deficient in protein, calcium, iron, vitamin B12, and vitamin D across most states. Cereals dominate energy intake (60–70%). Pulses consumption has halved since 1975.',practical:'Most Indians need to actively increase dal/legume intake, add a dairy serving daily, and consider B12 supplementation if vegetarian. Rice and roti alone cannot meet protein needs.'},
  {id:23,tag:'Food Nutrition',india:false,quality:'high',stars:'★★★',title:'Leucine and Muscle Protein Synthesis: Dose-Response Relationship',authors:'Norton LE, Layman DK.',journal:'Journal of Nutrition',year:'2006',doi:'10.1093/jn/136.2.533S',url:'https://doi.org/10.1093/jn/136.2.533S',design:'Controlled experimental study',n:'Multiple trials',finding:'Leucine (a branched-chain amino acid) acts as a metabolic signal for muscle protein synthesis. A minimum of 2–3g leucine per meal is required to maximally stimulate MPS.',practical:'Each meal should contain ~25–30g protein from quality sources to deliver the leucine threshold. Paneer (18g/100g), eggs (6g each), dal (9g/100g cooked) are good sources.'},
  {id:24,tag:'Food Nutrition',india:false,quality:'high',stars:'★★★',title:'Dietary Protein Quality Evaluation in Human Nutrition: FAO Report',authors:'FAO Expert Consultation.',journal:'FAO Food and Nutrition Paper',year:'2013',doi:'',url:'https://www.fao.org/ag/humannutrition/35978-02317b979a686a57aa4593304ffc17f86.pdf',design:'Expert review and evaluation',n:'—',finding:'DIAAS (Digestible Indispensable Amino Acid Score) is the recommended method for assessing protein quality. Animal proteins score highest; plant proteins generally score lower and benefit from combination.',practical:'Combine incomplete plant proteins: rice + dal provides a more complete amino acid profile than either alone. Soy, quinoa, and amaranth are complete plant proteins.'},
  {id:25,tag:'Food Nutrition',india:true,quality:'high',stars:'★★★',title:'Micronutrient Deficiencies in India: A Systematic Review',authors:'Rao S, Yajnik CS, Kanade A, et al.',journal:'Indian Journal of Medical Research',year:'2019',doi:'',url:'https://pubmed.ncbi.nlm.nih.gov/31417039/',design:'Systematic review of Indian population studies',n:'Multiple large cohorts',finding:'Iron deficiency anaemia affects 53% of women and 20% of men in India. Vitamin B12 deficiency is prevalent in 47% of vegetarians. Zinc deficiency affects 25% of children under 5.',practical:'Indians — especially vegetarian women — should test ferritin, B12, and zinc annually. Ragi and horse gram are among the richest plant sources of iron available in India.'},
  {id:26,tag:'Food Nutrition',india:false,quality:'high',stars:'★★★',title:'Omega-3 Fatty Acids and Cardiovascular Disease: Updated Evidence',authors:'Rimm EB, Appel LJ, Chiuve SE, et al. (AHA Science Advisory).',journal:'Circulation',year:'2018',doi:'10.1161/CIR.0000000000000574',url:'https://doi.org/10.1161/CIR.0000000000000574',design:'Systematic review and meta-analysis',n:'Multiple large RCTs',finding:'1–2 servings of oily fish per week reduces cardiovascular mortality by ~36%. EPA+DHA supplementation at 1g/day modestly reduces cardiovascular events in high-risk individuals.',practical:'Non-vegetarians: eat fatty fish (salmon, sardines, mackerel) 2x/week. Vegetarians: 250mg DHA from algae oil daily. Flaxseed ALA conversion to EPA/DHA is only ~5–10%.'},
  {id:27,tag:'Food Nutrition',india:true,quality:'high',stars:'★★★',title:'Glycemic Index of Indian Foods: Measurement and Application',authors:'Venn BJ, Green TJ.',journal:'European Journal of Clinical Nutrition',year:'2007',doi:'10.1038/sj.ejcn.1602942',url:'https://doi.org/10.1038/sj.ejcn.1602942',design:'Experimental and review',n:'Multiple food testing trials',finding:'GI varies significantly within food categories. Basmati rice (GI 56–69) is lower than regular white rice (GI 72–83). Roti has moderate GI (62). Millets consistently have low GI (25–55).',practical:'For blood sugar management: replace white rice with basmati or millets, add dal/vegetable alongside rice (lowers meal GI), and avoid eating carbohydrates alone.'},
  {id:28,tag:'Food Nutrition',india:false,quality:'high',stars:'★★★',title:'Eggs, Dietary Cholesterol and Cardiovascular Risk: Updated Meta-Analysis',authors:'Zhong VW, Van Horn L, Cornelis MC, et al.',journal:'JAMA',year:'2019',doi:'10.1001/jama.2019.1572',url:'https://doi.org/10.1001/jama.2019.1572',design:'Prospective cohort study pooled analysis',n:'29,615 US adults',finding:'Each additional 300mg dietary cholesterol/day (roughly 1.5 eggs) was associated with a 17% higher risk of cardiovascular disease. However, this effect is modified by overall diet quality.',practical:'For most healthy people, 1 whole egg/day is well-supported by evidence. In those with diabetes or hypercholesterolaemia, limit to 3–4 per week or use egg whites.'},
  {id:29,tag:'Food Nutrition',india:true,quality:'high',stars:'★★★',title:'Nutritional Composition of Indian Pulses and Legumes: Comprehensive Analysis',authors:'Boye J, Zare F, Pletch A.',journal:'Food Research International',year:'2010',doi:'10.1016/j.foodres.2010.05.003',url:'https://doi.org/10.1016/j.foodres.2010.05.003',design:'Nutritional analysis and review',n:'—',finding:'Indian pulses (moong, masoor, chana, urad, toor) are among the most nutritionally dense plant foods globally — 17–25% protein, rich in iron, zinc, folate, and resistant starch.',practical:'Two servings of dal per day (200g cooked) provides ~18g protein, 8mg iron, and half your daily folate needs. Dal is nutritionally comparable to or better than many expensive supplements.'},
  {id:30,tag:'Food Nutrition',india:false,quality:'high',stars:'★★★',title:'Dietary Fibre: Current Status and Future Prospects for Health',authors:'Deehan EC, Walter J.',journal:'Gut',year:'2016',doi:'10.1136/gutjnl-2015-309728',url:'https://doi.org/10.1136/gutjnl-2015-309728',design:'Review of mechanistic and epidemiological evidence',n:'Multiple large cohorts',finding:'Each 10g/day increase in dietary fibre reduces all-cause mortality by 11%, cardiovascular mortality by 17%, and colorectal cancer risk by 9%. The evidence is among the strongest in nutritional epidemiology.',practical:'Target 30–35g fibre daily. 1 cup cooked rajma = 15g fibre. 1 cup oats = 4g. 1 cup cooked broccoli = 5g. Most Indians consume only 15–20g/day.'},
  {id:31,tag:'Food Nutrition',india:true,quality:'high',stars:'★★★',title:'Iron Bioavailability from Indian Diets: Influence of Inhibitors and Enhancers',authors:'Hurrell R, Egli I.',journal:'American Journal of Clinical Nutrition',year:'2010',doi:'10.3945/ajcn.2010.28674F',url:'https://doi.org/10.3945/ajcn.2010.28674F',design:'Experimental and review',n:'Multiple controlled studies',finding:'Non-haem iron (plant sources) absorption is 2–20% vs 15–35% for haem iron (meat). Phytates in whole grains and tannins in tea inhibit iron absorption. Vitamin C enhances it significantly.',practical:'Eat vitamin C foods (lemon juice, amla, tomato) with dal. Avoid tea/coffee for 1 hour after iron-rich meals. Sprouting and fermenting dal increases iron absorption by 2–3x.'},
  {id:32,tag:'Food Nutrition',india:false,quality:'high',stars:'★★★',title:'Calcium Intake and Bone Health: A Systematic Review and Meta-Analysis',authors:'Tai V, Leung W, Grey A, Reid IR, Bolland MJ.',journal:'BMJ',year:'2015',doi:'10.1136/bmj.h4183',url:'https://doi.org/10.1136/bmj.h4183',design:'Meta-analysis of 59 RCTs',n:'13,790 participants',finding:'Calcium supplementation modestly increases bone mineral density but does not significantly reduce fracture risk in community-dwelling adults. Dietary calcium from food shows better outcomes than supplements.',practical:'Get calcium from food (dairy, ragi, sesame, green leafy vegetables) rather than supplements. Pair with vitamin D for maximum benefit. Indian adults need 1000mg/day.'},
  {id:33,tag:'Food Nutrition',india:false,quality:'high',stars:'★★★',title:'Antioxidants in Food and Prevention of Chronic Disease',authors:'Mursu J, Robien K, Harnack LJ, et al.',journal:'Archives of Internal Medicine',year:'2011',doi:'10.1001/archinternmed.2011.445',url:'https://doi.org/10.1001/archinternmed.2011.445',design:'Prospective cohort',n:'38,772 women followed 19 years',finding:'Several individual antioxidant supplements (beta-carotene, vitamin E, copper) were associated with slightly increased mortality. Food-based antioxidants showed protective effects.',practical:'Eat antioxidant-rich foods — turmeric, amla, berries, pomegranate, dark leafy greens. Antioxidant supplements do not reliably replicate the benefits of whole foods.'},
  {id:34,tag:'Food Nutrition',india:true,quality:'high',stars:'★★★',title:'Turmeric and Curcumin: Bioavailability and Health Effects',authors:'Gupta SC, Patchva S, Aggarwal BB.',journal:'AAPS Journal',year:'2013',doi:'10.1208/s12248-012-9432-8',url:'https://doi.org/10.1208/s12248-012-9432-8',design:'Review of clinical and experimental evidence',n:'Multiple trials',finding:'Curcumin has poor oral bioavailability (<1%) when consumed alone. Piperine (black pepper) increases absorption by 2000%. Anti-inflammatory effects are real but require consistent consumption.',practical:'Add black pepper when cooking with turmeric. A pinch of black pepper alongside haldi dramatically increases curcumin absorption — as Indian cooking traditionally does.'},
  {id:35,tag:'Food Nutrition',india:false,quality:'high',stars:'★★★',title:'Zinc Status and Human Health: A Comprehensive Review',authors:'Prasad AS.',journal:'Journal of Trace Elements in Medicine and Biology',year:'2012',doi:'10.1016/j.jtemb.2012.04.004',url:'https://doi.org/10.1016/j.jtemb.2012.04.004',design:'Review and experimental data',n:'Multiple clinical studies',finding:'Zinc is essential for immune function, wound healing, testosterone production, and over 300 enzymatic reactions. Deficiency is highly prevalent globally, particularly in plant-based diets.',practical:'Best plant sources: pumpkin seeds (10mg/100g), hemp seeds, legumes, and whole grains. Soaking and sprouting legumes reduces phytates that inhibit zinc absorption.'},
  {id:36,tag:'Food Nutrition',india:true,quality:'high',stars:'★★★',title:'Vitamin B12 Deficiency in Indian Vegetarians: Prevalence and Risk',authors:'Yajnik CS, Deshpande SS, Lubree HG, et al.',journal:'Diabetologia',year:'2006',doi:'10.1007/s00125-006-0310-1',url:'https://doi.org/10.1007/s00125-006-0310-1',design:'Cross-sectional population study',n:'2,291 Indian adults',finding:'B12 deficiency was found in 52% of Indian vegetarians vs 11% of non-vegetarians. Low B12 was associated with insulin resistance, elevated homocysteine, and cardiovascular risk.',practical:'Vegetarian Indians should supplement 500–1000mcg B12 cyanocobalamin weekly, or 25–50mcg daily. Dairy and eggs contain B12 but amounts are often insufficient without deliberate effort.'},
  {id:37,tag:'Food Nutrition',india:false,quality:'high',stars:'★★★',title:'Magnesium Intake and Type 2 Diabetes: Prospective Meta-Analysis',authors:'Schulze MB, Schulz M, Heidemann C, et al.',journal:'Diabetes Care',year:'2007',doi:'10.2337/dc07-0116',url:'https://doi.org/10.2337/dc07-0116',design:'Meta-analysis of prospective cohort studies',n:'286,668 participants',finding:'Higher magnesium intake was associated with significantly lower risk of type 2 diabetes. Each 100mg/day increase in dietary magnesium reduced diabetes risk by 15%.',practical:'Best Indian food sources of magnesium: dark leafy greens (palak), bajra, almonds, pumpkin seeds, dark chocolate, and black beans. Target 350–400mg/day.'},
  {id:38,tag:'Food Nutrition',india:false,quality:'high',stars:'★★★',title:'Potassium Intake and Blood Pressure: Updated Meta-Analysis',authors:'Aburto NJ, Hanson S, Gutierrez H, et al.',journal:'BMJ',year:'2013',doi:'10.1136/bmj.f1378',url:'https://doi.org/10.1136/bmj.f1378',design:'Meta-analysis of 22 RCTs',n:'1,606 participants',finding:'Increased potassium intake significantly reduces blood pressure in hypertensive individuals. The effect is greatest when combined with lower sodium intake.',practical:'Eat more potassium-rich foods: bananas, sweet potato, coconut water, spinach, tomatoes, and dal. Most Indians are under-consuming potassium and over-consuming sodium.'},
  {id:39,tag:'Food Nutrition',india:false,quality:'high',stars:'★★★',title:'Saturated Fat and Cardiovascular Disease: Evidence from Meta-Analyses',authors:'Siri-Tarino PW, Sun Q, Hu FB, Krauss RM.',journal:'American Journal of Clinical Nutrition',year:'2010',doi:'10.3945/ajcn.2009.27725',url:'https://doi.org/10.3945/ajcn.2009.27725',design:'Meta-analysis of 21 prospective cohort studies',n:'347,747 participants',finding:'Saturated fat intake was not significantly associated with coronary heart disease when replacing it with refined carbohydrates. Replacing saturated fat with polyunsaturated fat does reduce risk.',practical:'Replace saturated fat with unsaturated fat (nuts, seeds, olive oil, mustard oil), not refined carbohydrates. Avoiding ghee only to replace it with biscuits is counterproductive.'},
  {id:40,tag:'Food Nutrition',india:true,quality:'high',stars:'★★★',title:'Millets and Metabolic Health: A Systematic Review of Evidence',authors:'Nambiar VS, Dhaduk JJ, Sareen N, Shahu T, Desai R.',journal:'Journal of Food Science and Technology',year:'2011',doi:'10.1007/s13197-011-0354-3',url:'https://doi.org/10.1007/s13197-011-0354-3',design:'Systematic review',n:'Multiple clinical studies',finding:'Millets (bajra, jowar, ragi, foxtail) have lower GI than wheat and rice, higher fibre, and more micronutrients. Ragi is the richest plant source of calcium (344mg/100g).',practical:'Replacing 50% of rice/wheat intake with millets significantly reduces glycemic load and increases mineral intake. Bajra roti, ragi mudde, and jowar bhakri are nutritionally superior to wheat roti.'},
  {id:41,tag:'Food Nutrition',india:false,quality:'high',stars:'★★★',title:'Fructose and Metabolic Syndrome: Mechanism and Clinical Evidence',authors:'Bray GA, Nielsen SJ, Popkin BM.',journal:'American Journal of Clinical Nutrition',year:'2004',doi:'10.1093/ajcn/79.4.537',url:'https://doi.org/10.1093/ajcn/79.4.537',design:'Review and mechanistic analysis',n:'Multiple population studies',finding:'Increased fructose consumption from added sugars is linked to non-alcoholic fatty liver disease, insulin resistance, and hypertriglyceridemia through unique hepatic metabolism.',practical:'Avoid high-fructose corn syrup in packaged foods. Whole fruit fructose is not a concern due to fibre content. Limit packaged juices, cold drinks, and sweet sauces.'},
  {id:42,tag:'Food Nutrition',india:false,quality:'high',stars:'★★★',title:'Dietary Patterns and Type 2 Diabetes: PREDIMED Trial',authors:'Salas-Salvadó J, Bulló M, Babio N, et al.',journal:'Diabetes Care',year:'2011',doi:'10.2337/dc10-1628',url:'https://doi.org/10.2337/dc10-1628',design:'Randomized controlled trial',n:'3,541 participants',finding:'Mediterranean diet supplemented with olive oil or nuts significantly reduced type 2 diabetes incidence by 52% vs low-fat diet over 4 years.',practical:'Increase unsaturated fats (nuts, seeds, mustard oil, groundnut oil), vegetables, and legumes. Reduce refined grains and added sugars. This dietary pattern closely resembles traditional South Indian vegetarian food.'},
  {id:43,tag:'Food Nutrition',india:false,quality:'high',stars:'★★★',title:'Dairy Consumption and Bone Health: A Global Perspective',authors:'Weaver CM, Gordon CM, Janz KF, et al.',journal:'Osteoporosis International',year:'2016',doi:'10.1007/s00198-015-3454-x',url:'https://doi.org/10.1007/s00198-015-3454-x',design:'Systematic review',n:'Multiple RCTs and observational studies',finding:'3 servings of dairy per day significantly increases bone mineral density and reduces fracture risk, particularly in childhood, adolescence, and postmenopause.',practical:'3 servings of dairy (1 glass milk, 100g curd, 50g paneer) covers most calcium needs. Fortified plant milks are a reasonable alternative for those avoiding dairy.'},
  {id:44,tag:'Food Nutrition',india:true,quality:'med',stars:'★★☆',title:'Traditional Fermented Indian Foods and Gut Health',authors:'Patel S, Shukla R, Goyal A.',journal:'Journal of Food Science and Technology',year:'2016',doi:'10.1007/s13197-015-1772-z',url:'https://doi.org/10.1007/s13197-015-1772-z',design:'Review and observational data',n:'Multiple studies',finding:'Traditional Indian fermented foods — idli, dosa, dhokla, kanji, curd — contain beneficial Lactobacillus and Bifidobacterium strains. Fermentation also improves bioavailability of minerals and reduces antinutrients.',practical:'Daily consumption of fermented foods (one serving of curd, 1–2 meals of idli/dosa weekly) supports gut health and improves absorption of iron, zinc, and calcium.'},
  {id:45,tag:'Food Nutrition',india:false,quality:'high',stars:'★★★',title:'Plant vs Animal Protein and Longevity: Large Prospective Study',authors:'Levine ME, Suarez JA, Brandhorst S, et al.',journal:'Cell Metabolism',year:'2014',doi:'10.1016/j.cmet.2014.02.006',url:'https://doi.org/10.1016/j.cmet.2014.02.006',design:'Prospective cohort + experimental',n:'6,381 adults (20-year follow-up)',finding:'High protein intake from animal sources was associated with increased cancer and all-cause mortality in middle age (50–65). After 65, higher protein intake was protective against mortality.',practical:'Focus on plant protein (dal, legumes, soy, nuts) through midlife. After 65, increase total protein to prevent sarcopenia. This supports traditional Indian dal-centric diets.'},
  {id:46,tag:'Food Nutrition',india:false,quality:'high',stars:'★★★',title:'Dietary Sodium Restriction and Blood Pressure: Cochrane Review',authors:'Adler AJ, Taylor F, Martin N, et al.',journal:'Cochrane Database of Systematic Reviews',year:'2014',doi:'10.1002/14651858.CD009217.pub3',url:'https://doi.org/10.1002/14651858.CD009217.pub3',design:'Systematic review of 36 RCTs',n:'Multiple',finding:'Reducing sodium intake from 9–12g/day to 5–6g/day produced significant blood pressure reductions: 3.4/1.5 mmHg in normotensives and 5.4/2.8 mmHg in hypertensives.',practical:'Reduce salt in cooking gradually (the taste adapts). Avoid processed foods, pickles, and papads which are the main sources of excess sodium in Indian diets.'},
  {id:47,tag:'Food Nutrition',india:false,quality:'high',stars:'★★★',title:'Coffee Consumption and Type 2 Diabetes: Meta-Analysis',authors:'Ding M, Bhupathiraju SN, Satija A, van Dam RM, Hu FB.',journal:'Diabetes Care',year:'2014',doi:'10.2337/dc13-1203',url:'https://doi.org/10.2337/dc13-1203',design:'Meta-analysis of 28 prospective studies',n:'1.1 million participants',finding:'Both caffeinated and decaffeinated coffee consumption were associated with significantly lower type 2 diabetes risk — suggesting the benefit comes from polyphenols, not caffeine.',practical:'2–4 cups of filter coffee or green tea daily is associated with reduced diabetes risk. The benefit is separate from caffeine — it is the polyphenols and chlorogenic acids.'},
  {id:48,tag:'Food Nutrition',india:false,quality:'high',stars:'★★★',title:'Nuts and Cardiovascular Disease Risk: Evidence from PREDIMED',authors:'Estruch R, Ros E, Salas-Salvadó J, et al.',journal:'New England Journal of Medicine',year:'2013',doi:'10.1056/NEJMoa1200303',url:'https://doi.org/10.1056/NEJMoa1200303',design:'Randomized controlled trial',n:'7,447 high-risk adults',finding:'Mediterranean diet supplemented with mixed nuts reduced cardiovascular events by 30% compared to low-fat control diet over 5 years.',practical:'A small handful of mixed nuts (30g) daily — almonds, walnuts, peanuts — is associated with significantly reduced heart disease risk. Don\'t avoid them due to caloric density.'},
  {id:49,tag:'Food Nutrition',india:true,quality:'high',stars:'★★☆',title:'Coconut Oil and Cardiovascular Health: Current Evidence',authors:'Eyres L, Eyres MF, Chisholm A, Brown RC.',journal:'Nutrition Reviews',year:'2016',doi:'10.1093/nutrit/nuw002',url:'https://doi.org/10.1093/nutrit/nuw002',design:'Review of RCTs and observational studies',n:'Multiple trials',finding:'Coconut oil raises LDL cholesterol significantly compared to unsaturated vegetable oils, but also raises HDL. Overall cardiovascular effects remain contested. High saturated fat content is a concern at high doses.',practical:'Coconut oil in moderation as part of traditional South Indian cooking is not harmful. Using it as a primary cooking oil or consuming it as a supplement is not supported by evidence.'},
  {id:50,tag:'Food Nutrition',india:false,quality:'high',stars:'★★★',title:'Sugar-Sweetened Beverages and Type 2 Diabetes: Systematic Review',authors:'Imamura F, O\'Connor L, Ye Z, et al.',journal:'BMJ',year:'2015',doi:'10.1136/bmj.h3576',url:'https://doi.org/10.1136/bmj.h3576',design:'Meta-analysis of 17 prospective cohort studies',n:'38,253 cases among 1 million+ participants',finding:'Consuming 1–2 servings of sugar-sweetened beverages daily increases type 2 diabetes risk by 26% and metabolic syndrome risk by 20%.',practical:'Cold drinks, packaged juices, and sweet lassi are among the most metabolically damaging foods available in India. Replacing them with water, chaas, or black tea has immediate measurable benefits.'},
  {id:51,tag:'Food Nutrition',india:false,quality:'high',stars:'★★★',title:'Whole Grains and Mortality: Prospective Meta-Analysis',authors:'Aune D, Keum N, Giovannucci E, et al.',journal:'BMJ',year:'2016',doi:'10.1136/bmj.i2716',url:'https://doi.org/10.1136/bmj.i2716',design:'Meta-analysis of 45 prospective studies',n:'Multiple large cohorts',finding:'Whole grain consumption (70g/day) associated with 22% lower all-cause mortality, 19% lower cardiovascular mortality, and 15% lower cancer mortality vs low intake.',practical:'Replace refined flour (maida) with whole wheat atta, oats, brown rice, or millets. Even partial substitution (50%) meaningfully reduces disease risk.'},
  {id:52,tag:'Food Nutrition',india:false,quality:'high',stars:'★★★',title:'Vitamin D and Bone Health: Cochrane Systematic Review',authors:'Avenell A, Mak JC, O\'Connell D.',journal:'Cochrane Database of Systematic Reviews',year:'2014',doi:'10.1002/14651858.CD000227.pub4',url:'https://doi.org/10.1002/14651858.CD000227.pub4',design:'Systematic review of 53 RCTs',n:'Multiple',finding:'Vitamin D3 supplementation combined with calcium reduces hip fracture risk in institutionalised elderly. Supplementation alone is not sufficient — calcium co-administration is required.',practical:'Vitamin D supplements (1000–2000 IU D3) are most effective when combined with adequate calcium from diet. Sun exposure (15–30 min midday) remains the most efficient source.'},
  {id:53,tag:'Food Nutrition',india:true,quality:'high',stars:'★★★',title:'Fenugreek (Methi) and Blood Glucose Control: A Meta-Analysis',authors:'Neelakantan N, Narayanan M, de Souza RJ, van Dam RM.',journal:'Nutrition Journal',year:'2014',doi:'10.1186/1475-2891-13-7',url:'https://doi.org/10.1186/1475-2891-13-7',design:'Meta-analysis of RCTs',n:'Multiple trials',finding:'Fenugreek (methi) seed supplementation at 5–50g/day significantly reduced fasting and postprandial blood glucose in diabetic and pre-diabetic individuals. The effect is attributed to the soluble fibre galactomannan.',practical:'Including 1–2 tsp fenugreek seeds (soaked overnight or added to food) daily is a genuine evidence-backed approach to blood sugar management for at-risk Indians.'},
  {id:54,tag:'Food Nutrition',india:false,quality:'high',stars:'★★★',title:'Gut Microbiome, Diet, and Human Health: Landmark Analysis',authors:'Sonnenburg JL, Bäckhed F.',journal:'Nature',year:'2016',doi:'10.1038/nature17883',url:'https://doi.org/10.1038/nature17883',design:'Review and mechanistic analysis',n:'Multiple human and animal studies',finding:'Diet is the primary modifiable factor shaping the gut microbiome. A diverse plant-based diet increases microbiome diversity, which is associated with better metabolic and immune health.',practical:'Eat 30+ different plant foods per week (not 30 servings — 30 different varieties). This is achievable with varied dal, vegetables, and fruits in a typical Indian diet.'},
  {id:55,tag:'Food Nutrition',india:false,quality:'high',stars:'★★★',title:'Protein Bioavailability from Plant Foods: Current Evidence',authors:'van Vliet S, Burd NA, van Loon LJ.',journal:'Journal of Nutrition',year:'2015',doi:'10.3945/jn.114.204305',url:'https://doi.org/10.3945/jn.114.204304',design:'Review of experimental studies',n:'Multiple controlled trials',finding:'Plant proteins have lower DIAAS scores and digestibility than animal proteins. However, higher intake compensates for lower quality. Mixed plant sources covering all essential amino acids work effectively.',practical:'Vegetarians need 10–20% more protein than meat-eaters. Combine grains + legumes + nuts/seeds across the day for complete amino acid coverage.'},
  {id:56,tag:'Food Nutrition',india:false,quality:'high',stars:'★★★',title:'Ultra-Processed Foods and Mortality: French NutriNet Cohort',authors:'Srour B, Fezeu LK, Kesse-Guyot E, et al.',journal:'BMJ',year:'2019',doi:'10.1136/bmj.l1451',url:'https://doi.org/10.1136/bmj.l1451',design:'Prospective cohort',n:'105,159 participants',finding:'Each 10% increase in ultra-processed food consumption was associated with 12% higher all-cause mortality and 11% higher cancer risk.',practical:'Minimise packaged biscuits, instant noodles, flavoured chips, processed cheese, and packaged snacks. Home-cooked Indian food — even with oil and ghee — is nutritionally superior.'},
  {id:57,tag:'Food Nutrition',india:true,quality:'high',stars:'★★★',title:'Soybean Consumption and Cardiovascular Health: Meta-Analysis',authors:'Reynolds K, Chin A, Lees KA, Nguyen A, Bujnowski D, He J.',journal:'Journal of Nutrition',year:'2006',doi:'10.1093/jn/136.2.340',url:'https://doi.org/10.1093/jn/136.2.340',design:'Meta-analysis of 11 RCTs',n:'Multiple',finding:'Soy protein consumption (25–50g/day) reduced LDL cholesterol by 4–6%. Isoflavones in soy have additional cardiovascular benefits. No significant hormonal disruption in healthy adults.',practical:'Soy chunks and tofu are high-quality, affordable vegetarian protein sources (40–52g protein/100g dry weight). Common concerns about soy and hormones are not supported by human clinical evidence.'},
  {id:58,tag:'Food Nutrition',india:false,quality:'high',stars:'★★★',title:'Folate and Neural Tube Defects: Landmark Randomized Trial',authors:'MRC Vitamin Study Research Group.',journal:'The Lancet',year:'1991',doi:'10.1016/0140-6736(91)90133-A',url:'https://doi.org/10.1016/0140-6736(91)90133-A',design:'Randomized controlled trial',n:'1,817 women at high risk',finding:'Folic acid supplementation before and during early pregnancy reduced neural tube defect recurrence by 72%. This is one of the most definitive findings in nutritional science.',practical:'All women planning pregnancy should supplement 400–800mcg folic acid daily from at least 1 month before conception. Indian women are particularly at risk due to low folate intake.'},
  {id:59,tag:'Food Nutrition',india:false,quality:'high',stars:'★★★',title:'Iodine Deficiency and Brain Development: Evidence and Prevention',authors:'Zimmermann MB.',journal:'Endocrine Reviews',year:'2009',doi:'10.1210/er.2009-0011',url:'https://doi.org/10.1210/er.2009-0011',design:'Review of clinical and population evidence',n:'Multiple populations',finding:'Iodine deficiency remains the leading preventable cause of intellectual disability globally. Severe deficiency during pregnancy causes cretinism; mild deficiency impairs IQ by 10–15 points.',practical:'Use iodized salt exclusively. Avoid \'rock salt\' (sendha namak) as a primary salt as it lacks iodine. This is one of the most cost-effective nutritional interventions available.'},
  {id:60,tag:'Food Nutrition',india:true,quality:'high',stars:'★★★',title:'Amla (Indian Gooseberry) and Antioxidant Capacity: Clinical Review',authors:'Dasaroju S, Gottumukkala KM.',journal:'International Journal of Pharmaceutical Sciences Review and Research',year:'2014',doi:'',url:'https://pubmed.ncbi.nlm.nih.gov/24867436/',design:'Review of clinical studies',n:'Multiple trials',finding:'Amla has the highest recorded antioxidant activity of any food tested (ORAC score ~261,500). It contains 600–800mg vitamin C per 100g — 20x more than orange. Clinical evidence supports its role in lipid modulation and blood sugar control.',practical:'1 fresh amla daily or 1 tsp amla powder provides extraordinary antioxidant and vitamin C coverage at near-zero cost. It is among the most nutritionally dense foods available in India.'},
  {id:61,tag:'Food Nutrition',india:false,quality:'high',stars:'★★★',title:'Dietary Protein Distribution and Muscle Protein Synthesis',authors:'Areta JL, Burke LM, Ross ML, et al.',journal:'Journal of Physiology',year:'2013',doi:'10.1113/jphysiol.2012.244897',url:'https://doi.org/10.1113/jphysiol.2012.244897',design:'Randomized crossover study',n:'24 resistance-trained males',finding:'Distributing protein evenly across 4 meals (20g each) stimulated greater muscle protein synthesis than 2 large meals (40g) or 8 small snacks (10g), with the same daily total.',practical:'Eat protein at every meal — breakfast, lunch, dinner, and one snack. Skipping protein at breakfast (common in India — just chai and toast) wastes one of 4 critical MPS windows.'},
  {id:62,tag:'Food Nutrition',india:false,quality:'high',stars:'★★★',title:'Glycemic Load vs Glycemic Index: Which Matters More for Health?',authors:'Salmeron J, Ascherio A, Rimm EB, et al.',journal:'JAMA',year:'1997',doi:'10.1001/jama.277.6.472',url:'https://doi.org/10.1001/jama.277.6.472',design:'Prospective cohort study',n:'65,173 women (6-year follow-up)',finding:'Dietary glycemic load (quantity × GI) was a stronger predictor of type 2 diabetes than GI alone. Women in the highest GL quintile had 2.5x higher diabetes risk.',practical:'Both quantity and type of carbohydrate matter. Eating a small portion of white rice (low GL) is different from eating a large portion (high GL). Plate size and portion control matter as much as food type.'},
  {id:63,tag:'Food Nutrition',india:true,quality:'high',stars:'★★★',title:'Mustard Oil and Cardiovascular Risk in Indian Populations',authors:'Rastogi T, Reddy KS, Vaz M, et al.',journal:'The American Journal of Clinical Nutrition',year:'2004',doi:'10.1093/ajcn/79.4.592',url:'https://doi.org/10.1093/ajcn/79.4.592',design:'Prospective case-control study',n:'2,000+ urban Indians',finding:'Mustard oil consumption was associated with significantly lower risk of coronary heart disease and myocardial infarction. Its high erucic acid content was not associated with harm in this population.',practical:'Cold-pressed mustard oil is a nutritionally superior cooking oil for North Indians — high in omega-3 ALA and monounsaturated fats. Use in moderation (2–4 tsp/day) as part of a varied diet.'},
  {id:64,tag:'Food Nutrition',india:false,quality:'high',stars:'★★★',title:'Water Intake, Hydration, and Health Outcomes: IOM Report',authors:'Institute of Medicine, Panel on Dietary Reference Intakes.',journal:'National Academies Press',year:'2005',doi:'',url:'https://www.ncbi.nlm.nih.gov/books/NBK236237/',design:'Expert review and evidence synthesis',n:'—',finding:'Adequate water intake for adults is 3.7L/day (men) and 2.7L/day (women) total from all sources. About 20% comes from food; remaining from beverages. Thirst is not a reliable early indicator of dehydration.',practical:'Don\'t wait until thirsty to drink. Urine colour is the best indicator: pale yellow = adequate. Dark yellow = dehydrated. In Indian summer heat, add 0.5–1L to baseline recommendations.'},
  {id:65,tag:'Food Nutrition',india:false,quality:'high',stars:'★★★',title:'Green Leafy Vegetables and Cardiovascular Disease: Prospective Analysis',authors:'Hung HC, Joshipura KJ, Jiang R, et al.',journal:'Journal of the National Cancer Institute',year:'2004',doi:'10.1093/jnci/djh012',url:'https://doi.org/10.1093/jnci/djh012',design:'Prospective cohort study',n:'71,910 women',finding:'Every serving of green leafy vegetables per day was associated with 11% reduction in cardiovascular disease risk and 13% reduction in cancer risk.',practical:'Palak, methi, sarson saag, and pudina are among the most affordable and nutritionally dense foods available to Indians. Daily consumption of one of these provides vitamin K, folate, iron, and fibre.'},
  {id:66,tag:'Food Nutrition',india:false,quality:'med',stars:'★★☆',title:'Intermittent Fasting and Metabolic Health: Systematic Review',authors:'Harris L, Hamilton S, Azevedo LB, et al.',journal:'JBI Database of Systematic Reviews',year:'2018',doi:'10.11124/JBISRIR-2016-003229',url:'https://doi.org/10.11124/JBISRIR-2016-003229',design:'Systematic review of 11 studies',n:'Multiple',finding:'Intermittent fasting (5:2 and 16:8) produced comparable weight loss and metabolic improvements to continuous calorie restriction over 8–24 weeks.',practical:'IF works — but not because of fasting magic. It works because most people eat fewer calories in a compressed window. Choose whichever eating pattern you can sustain long-term.'},
  {id:67,tag:'Food Nutrition',india:false,quality:'high',stars:'★★★',title:'Protein and Satiety: Mechanisms and Clinical Evidence',authors:'Paddon-Jones D, Westman E, Mattes RD, Wolfe RR, Astrup A, Westerterp-Plantenga M.',journal:'American Journal of Clinical Nutrition',year:'2008',doi:'10.1093/ajcn/87.5.1558S',url:'https://doi.org/10.1093/ajcn/87.5.1558S',design:'Review of RCTs',n:'Multiple clinical trials',finding:'Protein is the most satiating macronutrient — it suppresses ghrelin and stimulates PYY and GLP-1 more than carbs or fat. A 30% protein diet reduces spontaneous caloric intake by ~440 kcal/day.',practical:'Starting each meal with a protein-rich food (dal, curd, egg, paneer) before carbohydrates reduces total meal calorie intake and keeps you full longer.'},
  {id:68,tag:'Food Nutrition',india:false,quality:'high',stars:'★★★',title:'Mediterranean Diet and Cognitive Decline: PREDIMED-Plus',authors:'Martínez-Lapiscina EH, Clavero P, Toledo E, et al.',journal:'Journal of Neurology, Neurosurgery & Psychiatry',year:'2013',doi:'10.1136/jnnp-2012-304792',url:'https://doi.org/10.1136/jnnp-2012-304792',design:'Randomized trial with 6.5 year follow-up',n:'447 participants',finding:'Mediterranean diet supplemented with olive oil reduced cognitive decline by 13% vs control. Adherence to a plant-rich dietary pattern consistently protects against cognitive aging.',practical:'The brain runs on omega-3s, antioxidants, and B vitamins. Indian diets rich in dal, leafy greens, walnuts, turmeric, and fish are aligned with cognitive protection principles.'},
  {id:69,tag:'Food Nutrition',india:true,quality:'high',stars:'★★★',title:'Vitamin D Status in Indian Population: A Systematic Review',authors:'Ritu G, Gupta A.',journal:'Indian Journal of Endocrinology and Metabolism',year:'2014',doi:'10.4103/2230-8210.131184',url:'https://doi.org/10.4103/2230-8210.131184',design:'Systematic review of 37 Indian studies',n:'9,000+ individuals',finding:'Vitamin D deficiency (<20 ng/mL) affects over 70% of urban Indians despite abundant sunlight. Darker skin, indoor work, full-body clothing, and air pollution all reduce synthesis.',practical:'Most urban Indians should supplement 1,000–2,000 IU vitamin D3 daily. Test 25-OH vitamin D annually and target levels of 40–60 ng/mL. Sun exposure at midday (10 min, arms+legs) is also essential.'},
  {id:70,tag:'Food Nutrition',india:false,quality:'high',stars:'★★★',title:'Red and Processed Meat Consumption and Cancer: IARC Monograph',authors:'Bouvard V, Loomis D, Guyton KZ, et al. (IARC Working Group).',journal:'Lancet Oncology',year:'2015',doi:'10.1016/S1470-2045(15)00444-1',url:'https://doi.org/10.1016/S1470-2045(15)00444-1',design:'Review of 800+ epidemiological studies',n:'Multiple large cohorts',finding:'Processed meat (bacon, sausage, salami) is a Group 1 carcinogen — each 50g/day increases colorectal cancer risk by 18%. Red meat is Group 2A (probably carcinogenic).',practical:'Limit processed meat. Unprocessed chicken and fish do not carry the same risk. Traditional Indian cooking of meat (spiced, with vegetables) is very different from Western processed meat products.'},
  {id:71,tag:'Supplements',india:false,quality:'high',stars:'★★★',title:'Creatine Monohydrate and Athletic Performance: ISSN Position Stand',authors:'Rawson ES, Miles MP, Larson-Meyer DE.',journal:'Journal of the International Society of Sports Nutrition',year:'2021',doi:'10.1186/s12970-021-00412-w',url:'https://doi.org/10.1186/s12970-021-00412-w',design:'Expert review of 500+ studies',n:'Multiple RCTs',finding:'Creatine monohydrate is the most evidence-backed performance supplement. 3–5g/day increases strength by 5–15%, high-intensity performance, and lean mass. Safe for long-term use in healthy adults.',practical:'5g creatine monohydrate daily — no loading phase required. Buy generic creatine monohydrate (Creapure certified). Any other form (HCL, ethyl ester) is not superior and costs more.'},
  {id:72,tag:'Supplements',india:false,quality:'high',stars:'★★★',title:'Caffeine and Physical Performance: A Meta-Analysis',authors:'Grgic J, Grgic I, Pickering C, Schoenfeld BJ, Bishop DJ, Pedisic Z.',journal:'British Journal of Sports Medicine',year:'2020',doi:'10.1136/bjsports-2018-099852',url:'https://doi.org/10.1136/bjsports-2018-099852',design:'Systematic review and meta-analysis',n:'Multiple RCTs',finding:'Caffeine (3–6mg/kg body weight) significantly improves endurance, strength, and power performance. Effect is present even in habitual coffee drinkers.',practical:'Coffee 45–60 minutes before training provides the same performance boost as pre-workout supplements, at 1% of the cost. 200–400mg caffeine is the effective dose.'},
  {id:73,tag:'Supplements',india:false,quality:'high',stars:'★★★',title:'Beta-Alanine Supplementation and Athletic Performance: Meta-Analysis',authors:'Hobson RM, Saunders B, Ball G, Harris RC, Sale C.',journal:'Amino Acids',year:'2012',doi:'10.1007/s00726-011-1200-z',url:'https://doi.org/10.1007/s00726-011-1200-z',design:'Meta-analysis of 15 studies',n:'Multiple',finding:'Beta-alanine supplementation (3.2–6.4g/day) significantly improved performance in exercise lasting 1–4 minutes by buffering lactic acid. Effect is minimal for short (<1 min) or long (>10 min) efforts.',practical:'Beta-alanine is beneficial only for specific activities (400m–1500m running, CrossFit WODs). Not needed for general gym-goers or endurance athletes. Tingling (paresthesia) is harmless.'},
  {id:74,tag:'Supplements',india:false,quality:'high',stars:'★★★',title:'Vitamin D Supplementation and Immune Function: RCT Evidence',authors:'Martineau AR, Jolliffe DA, Hooper RL, et al.',journal:'BMJ',year:'2017',doi:'10.1136/bmj.i6583',url:'https://doi.org/10.1136/bmj.i6583',design:'Meta-analysis of 25 RCTs',n:'11,321 participants',finding:'Vitamin D supplementation reduced acute respiratory infections by 12% overall. The effect was strongest (50% reduction) in those who were severely deficient at baseline.',practical:'For Indians who are deficient (70% of urban population), vitamin D supplementation has clear immune benefits. 1000–2000 IU D3 daily is safe, effective, and inexpensive.'},
  {id:75,tag:'Supplements',india:false,quality:'high',stars:'★★★',title:'Ashwagandha (Withania somnifera) and Cortisol: RCT Evidence',authors:'Chandrasekhar K, Kapoor J, Anishetty S.',journal:'Indian Journal of Psychological Medicine',year:'2012',doi:'10.4103/0253-7176.106022',url:'https://doi.org/10.4103/0253-7176.106022',design:'Randomized, double-blind, placebo-controlled trial',n:'64 adults with chronic stress',finding:'Ashwagandha root extract (300mg KSM-66 twice daily) reduced serum cortisol by 27.9%, stress and anxiety scores by 44%, and improved sleep quality significantly over 60 days.',practical:'Ashwagandha (KSM-66 or Sensoril extract) is one of the most evidence-backed adaptogenic supplements. Use standardised extract, not raw powder. Effects are meaningful but require 4–8 weeks.'},
  {id:76,tag:'Supplements',india:false,quality:'high',stars:'★★★',title:'Magnesium Supplementation and Sleep Quality: Meta-Analysis',authors:'Abbasi B, Kimiagar M, Sadeghniiat K, Shirazi MM, Hedayati M, Rashidkhani B.',journal:'Journal of Research in Medical Sciences',year:'2012',doi:'',url:'https://pubmed.ncbi.nlm.nih.gov/23853635/',design:'Randomized placebo-controlled trial',n:'46 elderly adults',finding:'Magnesium supplementation (500mg/day) significantly improved sleep efficiency, sleep time, early morning awakening, and serum melatonin levels vs placebo.',practical:'Magnesium glycinate (200–400mg) before bed is one of the most evidence-supported sleep supplements. It also reduces muscle cramps and anxiety. Cheap and well-tolerated.'},
  {id:77,tag:'Supplements',india:false,quality:'high',stars:'★★★',title:'Whey Protein Supplementation and Resistance Training: Meta-Analysis',authors:'Cermak NM, Res PT, de Groot LC, Saris WH, van Loon LJ.',journal:'American Journal of Clinical Nutrition',year:'2012',doi:'10.3945/ajcn.112.041640',url:'https://doi.org/10.3945/ajcn.112.041640',design:'Meta-analysis of 22 RCTs',n:'680 participants',finding:'Protein supplementation significantly increased lean body mass and leg press strength during resistance training. Effects were present in both young and old participants.',practical:'Whey protein is a convenient food supplement — not a drug. It helps if you cannot meet protein targets from food. Whole food protein sources (dal, paneer, eggs) are equally effective when feasible.'},
  {id:78,tag:'Supplements',india:false,quality:'med',stars:'★★☆',title:'Omega-3 Fish Oil and Muscle Recovery: RCT Evidence',authors:'Smith GI, Atherton P, Reeds DN, et al.',journal:'American Journal of Clinical Nutrition',year:'2011',doi:'10.3945/ajcn.111.011536',url:'https://doi.org/10.3945/ajcn.111.011536',design:'Randomized controlled trial',n:'9 healthy adults',finding:'Omega-3 fatty acid supplementation (4g EPA+DHA/day for 8 weeks) significantly increased muscle protein synthesis rates in healthy young and middle-aged adults.',practical:'2–3g EPA+DHA daily may support muscle building and reduce exercise-induced inflammation. Most beneficial for vegetarians and those with low fish intake.'},
  {id:79,tag:'Supplements',india:false,quality:'high',stars:'★★★',title:'Probiotic Supplementation and Gastrointestinal Health: Cochrane Review',authors:'Allen SJ, Wareham K, Wang D, et al.',journal:'Cochrane Database of Systematic Reviews',year:'2010',doi:'10.1002/14651858.CD006095.pub3',url:'https://doi.org/10.1002/14651858.CD006095.pub3',design:'Systematic review of 63 RCTs',n:'Multiple',finding:'Probiotics significantly reduced the duration and severity of acute infectious diarrhoea. Specific strains (Lactobacillus rhamnosus GG, Saccharomyces boulardii) are most effective.',practical:'Probiotic supplements are most evidence-backed for traveller\'s diarrhoea, antibiotic-associated diarrhoea, and IBS. Curd and fermented foods provide probiotic benefit at a fraction of the cost.'},
  {id:80,tag:'Supplements',india:false,quality:'high',stars:'★★★',title:'Iron Supplementation and Anaemia: Systematic Review',authors:'Pasricha SR, Hayes E, Kalumba K, Biggs BA.',journal:'Lancet Global Health',year:'2013',doi:'10.1016/S2214-109X(13)70046-9',url:'https://doi.org/10.1016/S2214-109X(13)70046-9',design:'Meta-analysis of 32 RCTs',n:'Multiple populations',finding:'Iron supplementation significantly reduces anaemia prevalence and improves haemoglobin, particularly in women of reproductive age and children. Ferrous sulfate remains the most effective and cheapest form.',practical:'Supplement iron only if blood tests confirm deficiency (ferritin <30 ng/mL). Over-supplementation causes oxidative damage. Test first, supplement second.'},
  {id:81,tag:'Gut Health',india:false,quality:'high',stars:'★★★',title:'Diet, Gut Microbiota and Metabolic Disease: Clinical Connections',authors:'Zmora N, Suez J, Elinav E.',journal:'Nature Medicine',year:'2019',doi:'10.1038/s41591-019-0387-4',url:'https://doi.org/10.1038/s41591-019-0387-4',design:'Review of clinical and experimental evidence',n:'Multiple cohorts',finding:'The gut microbiome is highly individualised. Dietary changes have predictable effects on microbial composition, but the optimal microbiome for health is still being defined.',practical:'Diversity of dietary plants is the strongest predictor of microbiome diversity. Antibiotics have lasting effects on microbiome composition. Avoid unnecessary antibiotic use.'},
  {id:82,tag:'Mental Health',india:false,quality:'high',stars:'★★★',title:'Diet Quality and Depression: Systematic Review and Meta-Analysis',authors:'Li Y, Lv MR, Wei YJ, et al.',journal:'Psychiatry Research',year:'2017',doi:'10.1016/j.psychres.2017.05.020',url:'https://doi.org/10.1016/j.psychres.2017.05.020',design:'Meta-analysis of 21 observational studies',n:'Multiple large cohorts',finding:'High adherence to a healthy dietary pattern (vegetables, fruits, whole grains, fish, olive oil) was associated with 25–35% lower odds of depression.',practical:'The gut-brain axis is bidirectional. Feeding your microbiome well (fibre, fermented foods) has measurable effects on mood and mental health. Diet is a serious mental health tool.'},
  {id:83,tag:'Mental Health',india:false,quality:'high',stars:'★★★',title:'Omega-3 Fatty Acids and Depression: A Meta-Analysis',authors:'Mocking RJ, Harmsen I, Assies J, et al.',journal:'Translational Psychiatry',year:'2016',doi:'10.1038/tp.2016.29',url:'https://doi.org/10.1038/tp.2016.29',design:'Meta-analysis of 13 RCTs',n:'1,233 participants',finding:'EPA-rich omega-3 supplementation (≥60% EPA) significantly reduced depressive symptoms, particularly in patients with major depression already on antidepressants.',practical:'EPA (not DHA) is the active omega-3 for mood. 1–2g EPA/day from fish oil or algae oil is the dose used in trials. Not a replacement for treatment, but a meaningful adjunct.'},
  {id:84,tag:'Heart Disease',india:true,quality:'high',stars:'★★★',title:'Cardiovascular Disease Burden in India: Current Status and Future Projections',authors:'Prabhakaran D, Jeemon P, Roy A.',journal:'Circulation',year:'2016',doi:'10.1161/CIRCULATIONAHA.116.023366',url:'https://doi.org/10.1161/CIRCULATIONAHA.116.023366',design:'Epidemiological review and projection',n:'Multiple national cohorts',finding:'CVD is now the leading cause of death in India, accounting for 28% of total mortality. Indians develop heart disease a decade earlier than Western populations and at lower LDL levels.',practical:'Cardiovascular prevention in India must start in the 30s, not 50s. Regular lipid panels, blood pressure monitoring, and lifestyle modification are essential even for young urban Indians.'},
  {id:85,tag:'Heart Disease',india:false,quality:'high',stars:'★★★',title:'DASH Diet and Blood Pressure: Landmark Trial',authors:'Appel LJ, Moore TJ, Obarzanek E, et al.',journal:'New England Journal of Medicine',year:'1997',doi:'10.1056/NEJM199704173361601',url:'https://doi.org/10.1056/NEJM199704173361601',design:'Randomized controlled trial',n:'459 adults with elevated blood pressure',finding:'The DASH diet (rich in fruits, vegetables, low-fat dairy, reduced sodium) reduced systolic blood pressure by 11.4 mmHg in hypertensives — comparable to single antihypertensive medication.',practical:'DASH diet principles translate well to Indian cooking: more dal, vegetables, curd; less salt, oil, and meat. A traditional balanced Indian vegetarian diet closely resembles DASH.'},
  {id:86,tag:'Diabetes',india:true,quality:'high',stars:'★★★',title:'Type 2 Diabetes Prevalence in India: ICMR-INDIAB Study',authors:'Anjana RM, Pradeepa R, Deepa M, et al.',journal:'The Lancet Diabetes & Endocrinology',year:'2017',doi:'10.1016/S2213-8587(17)30174-2',url:'https://doi.org/10.1016/S2213-8587(17)30174-2',design:'Population-based cross-sectional survey',n:'57,117 individuals across 15 states',finding:'Diabetes prevalence in India is 7.3% overall (77 million adults), with a further 10.3% pre-diabetic. Urban areas have 2–3x higher rates than rural areas. South India has highest prevalence.',practical:'India is the diabetes capital of the world. Prevention requires dietary modification (reduce refined carbs, increase fibre), 150 min/week physical activity, and annual HbA1c testing after age 30.'},
  {id:87,tag:'Diabetes',india:false,quality:'high',stars:'★★★',title:'Lifestyle Intervention vs Metformin for Diabetes Prevention: DPP Trial',authors:'Diabetes Prevention Program Research Group.',journal:'New England Journal of Medicine',year:'2002',doi:'10.1056/NEJMoa012512',url:'https://doi.org/10.1056/NEJMoa012512',design:'Randomized controlled trial',n:'3,234 adults with pre-diabetes',finding:'Lifestyle intervention (7% weight loss + 150 min exercise/week) reduced diabetes incidence by 58% — more effective than metformin (31% reduction) over 3 years.',practical:'Pre-diabetes is reversible. Losing 5–7% of body weight through diet and exercise is more effective than medication. This should be the first-line response to a pre-diabetes diagnosis.'},
  {id:88,tag:'Diabetes',india:true,quality:'high',stars:'★★★',title:'Indian Dietary Patterns and Type 2 Diabetes Risk: Chennai Urban Study',authors:'Radhika G, Van Dam RM, Bhargava KB, Mohan V.',journal:'Nutrition Journal',year:'2009',doi:'10.1186/1475-2891-8-50',url:'https://doi.org/10.1186/1475-2891-8-50',design:'Cross-sectional dietary assessment',n:'2,188 Chennai urban adults',finding:'A \'rice and wheat\' dietary pattern was associated with higher diabetes prevalence. A \'prudent\' pattern (vegetables, fish, legumes) was associated with lower risk. Refined carb intake is a primary driver.',practical:'South Indian dietary modification: replace 1–2 servings of white rice with millet-based alternatives (ragi mudde, bajra roti, jowar bhakri) and increase sambar/dal consumption.'},
  {id:89,tag:'Cancer Prevention',india:false,quality:'high',stars:'★★★',title:'Physical Activity and Cancer Risk: Meta-Analysis of Prospective Studies',authors:'Liu L, Shi Y, Li T, et al.',journal:'British Journal of Cancer',year:'2016',doi:'10.1038/bjc.2016.181',url:'https://doi.org/10.1038/bjc.2016.181',design:'Meta-analysis of 126 prospective studies',n:'Multiple large cohorts',finding:'Higher physical activity levels were associated with significantly lower risk of colon cancer (−19%), breast cancer (−12%), and endometrial cancer (−20%).',practical:'150 minutes of moderate physical activity per week reduces several major cancer risks. This is independent of body weight — the benefit exists even after adjusting for BMI.'},
  {id:90,tag:'Cancer Prevention',india:false,quality:'high',stars:'★★★',title:'Alcohol Consumption and Cancer Risk: IARC Evidence Review',authors:'Rehm J, Shield KD.',journal:'Alcohol Research: Current Reviews',year:'2014',doi:'',url:'https://pubmed.ncbi.nlm.nih.gov/26842911/',design:'Review of epidemiological evidence',n:'Multiple large cohorts',finding:'Alcohol is a Group 1 carcinogen for at least 7 cancer types (mouth, throat, oesophagus, liver, breast, colon, rectum). Risk begins with the first drink — there is no safe level for cancer.',practical:'No amount of alcohol is definitively safe from a cancer perspective. \'Moderate drinking is healthy\' is based on epidemiology prone to confounding. The \'J-curve\' cardiovascular benefit is contested.'},
  {id:91,tag:'Bone Health',india:true,quality:'high',stars:'★★★',title:'Osteoporosis Burden in India: Epidemiology and Risk Factors',authors:'Khadilkar AV, Mandlik RM.',journal:'Archives of Osteoporosis',year:'2015',doi:'10.1007/s11657-015-0226-8',url:'https://doi.org/10.1007/s11657-015-0226-8',design:'Review of Indian population data',n:'Multiple cohorts',finding:'Osteoporosis affects an estimated 50 million Indians, with fracture rates among the highest in Asia. Vitamin D deficiency, low calcium intake, and early menopause are primary risk factors for Indian women.',practical:'Indian women over 40 should have bone density (DEXA) scans and ensure adequate calcium (1000mg) and vitamin D (1000–2000 IU) daily. Weight-bearing exercise is protective.'},
  {id:92,tag:'Gut Health',india:false,quality:'high',stars:'★★★',title:'Dietary Fibre and Colorectal Cancer: Updated WCRF Analysis',authors:'World Cancer Research Fund / AICR.',journal:'Continuous Update Project Report',year:'2018',doi:'',url:'https://www.wcrf.org/dietandcancer/colorectal-cancer/',design:'Systematic review and meta-analysis',n:'Multiple large cohort studies',finding:'Strong evidence that dietary fibre, whole grains, and dairy reduce colorectal cancer risk. Processed and red meat, alcohol, and excess body fat increase risk.',practical:'Each additional 10g fibre/day reduces colorectal cancer risk by 9–10%. This is achievable by adding one serving of dal (7g fibre), one serving of oats (4g), and two portions of vegetables (6g).'},
  {id:93,tag:'Sleep',india:false,quality:'high',stars:'★★★',title:'Melatonin for Sleep Disorders: Systematic Review',authors:'Buscemi N, Vandermeer B, Hooton N, et al.',journal:'Journal of Internal Medicine',year:'2006',doi:'10.1111/j.1365-2796.2005.01581.x',url:'https://doi.org/10.1111/j.1365-2796.2005.01581.x',design:'Meta-analysis of 17 RCTs',n:'284 participants',finding:'Melatonin is significantly effective for sleep onset delay (circadian rhythm disorders) and jet lag, but evidence for chronic insomnia is weaker. Low doses (0.5–3mg) are as effective as high doses.',practical:'0.5mg melatonin 30 minutes before target bedtime is sufficient — most commercial tablets (5–10mg) are overdosed. Useful for shift workers and jet lag, not as a long-term sleep solution.'},
  {id:94,tag:'Exercise',india:false,quality:'high',stars:'★★★',title:'Resistance Training and All-Cause Mortality: Prospective Cohort Study',authors:'Stamatakis E, Lee IM, Bennie J, et al.',journal:'American Journal of Epidemiology',year:'2018',doi:'10.1093/aje/kwx345',url:'https://doi.org/10.1093/aje/kwx345',design:'Prospective cohort',n:'80,306 adults, 9-year follow-up',finding:'Muscle-strengthening activities (2+ sessions/week) were associated with 23% lower all-cause mortality and 31% lower cancer mortality, independent of aerobic exercise.',practical:'Strength training 2x/week dramatically reduces mortality risk regardless of what else you do. Bodyweight exercises (pushups, squats, lunges) at home are sufficient if gym access is limited.'},
  {id:95,tag:'Exercise',india:false,quality:'high',stars:'★★★',title:'Exercise and Type 2 Diabetes: A Systematic Review',authors:'Colberg SR, Sigal RJ, Yardley JE, et al. (ADA/ACSM Joint Statement).',journal:'Diabetes Care',year:'2016',doi:'10.2337/dc16-1728',url:'https://doi.org/10.2337/dc16-1728',design:'Review of clinical evidence',n:'Multiple RCTs',finding:'Both aerobic and resistance exercise significantly improve glycaemic control (HbA1c reduction of 0.67%). Combined training is superior to either modality alone.',practical:'For diabetics and pre-diabetics, a 10-minute walk after each meal reduces postprandial blood glucose by 15–20%. This is more effective than a single 30-minute walk.'},
  {id:96,tag:'Stress',india:false,quality:'high',stars:'★★★',title:'Cortisol, Stress, and Abdominal Fat Deposition: Mechanisms',authors:'Björntorp P.',journal:'Obesity Research',year:'2001',doi:'10.1038/oby.2001.116',url:'https://doi.org/10.1038/oby.2001.116',design:'Review of experimental and human evidence',n:'Multiple studies',finding:'Chronic psychological stress elevates cortisol, which promotes visceral fat deposition (abdominal obesity), insulin resistance, and cardiovascular risk — independent of calorie intake.',practical:'Stress management is a legitimate weight management strategy. Chronic work stress, poor sleep, and anxiety directly contribute to abdominal fat even in the absence of dietary changes.'},
  {id:97,tag:'Ageing',india:false,quality:'high',stars:'★★★',title:'Caloric Restriction and Longevity: Evidence from Multiple Models',authors:'Most J, Tosti V, Redman LM, Fontana L.',journal:'Ageing Research Reviews',year:'2017',doi:'10.1016/j.arr.2016.10.005',url:'https://doi.org/10.1016/j.arr.2016.10.005',design:'Review of animal and human evidence',n:'Multiple studies including CALERIE trial',finding:'25% calorie restriction (without malnutrition) consistently extends lifespan in animal models and reduces biomarkers of ageing in humans. The CALERIE human trial showed meaningful reductions in oxidative stress and metabolic markers.',practical:'Mild caloric restriction (10–15% below maintenance) combined with high nutritional density — not crash dieting — appears to slow biological ageing. Avoid fasting to the point of nutrient deficiency.'},
  {id:98,tag:'Ageing',india:false,quality:'high',stars:'★★★',title:'Sarcopenia: Definition, Prevalence, and Management',authors:'Cruz-Jentoft AJ, Bahat G, Bauer J, et al. (EWGSOP2).',journal:'Age and Ageing',year:'2019',doi:'10.1093/ageing/afy169',url:'https://doi.org/10.1093/ageing/afy169',design:'Consensus paper with evidence review',n:'Multiple population studies',finding:'Sarcopenia (age-related muscle loss) affects up to 50% of adults over 80 and begins in the 30s. It is associated with falls, fractures, metabolic disease, and premature mortality.',practical:'The two most effective interventions are resistance training and adequate protein (1.2–2.0g/kg/day). Sarcopenia is largely preventable and partially reversible with intervention at any age.'},
  {id:99,tag:'Gut Health',india:true,quality:'high',stars:'★★★',title:'Irritable Bowel Syndrome and Diet in Indian Patients',authors:'Ghoshal UC, Shukla R, Ghoshal U.',journal:'Journal of Gastroenterology and Hepatology',year:'2017',doi:'10.1111/jgh.13746',url:'https://doi.org/10.1111/jgh.13746',design:'Systematic review of Indian studies',n:'Multiple Indian cohorts',finding:'IBS affects approximately 4–7% of Indians. Dietary triggers include spicy food, fatty food, and high-FODMAP vegetables. Low-FODMAP diet reduced symptoms in 68–86% of IBS patients.',practical:'For IBS sufferers, common Indian food triggers include onion, garlic, cabbage, and excess dairy. Working with a dietitian on a low-FODMAP trial for 6 weeks is the most evidence-backed dietary approach.'},
  {id:100,tag:'Immunity',india:false,quality:'high',stars:'★★★',title:'Nutrition and Immune Function: A Comprehensive Review',authors:'Calder PC.',journal:'Proceedings of the Nutrition Society',year:'2013',doi:'10.1017/S0029665113001286',url:'https://doi.org/10.1017/S0029665113001286',design:'Review of clinical and experimental evidence',n:'Multiple studies',finding:'Multiple micronutrients — vitamins A, C, D, E, B6, B12, folate, zinc, iron, selenium — are essential for immune function. Deficiency of any impairs immunity. Supplementation above adequate levels rarely provides additional benefit.',practical:'Immune health is not about any single \'superfood\' or supplement — it requires overall nutritional adequacy. Focus on a varied whole-food diet covering all micronutrient needs before reaching for supplements.'}
];

let _resActive = 'All';
let _resSearchTerm = '';

function buildResFilters(){
  const row = document.getElementById('res-filters');
  if(!row) return;
  const tags = ["Ageing", "Bone Health", "Cancer Prevention", "Diabetes", "Exercise", "Food Nutrition", "Gut Health", "Heart Disease", "Immunity", "Mental Health", "Sleep", "Stress", "Supplements", "Weight Management"];
  const btns = [
    `<button class="rfbtn active" onclick="setResFilter('All',this)">All (${RESEARCH.length})</button>`,
    `<button class="rfbtn rfbtn-india" onclick="setResFilter('India',this)">🇮🇳 India-Specific (${RESEARCH.filter(r=>r.india).length})</button>`,
    ...tags.map(t=>{
      const cnt = RESEARCH.filter(r=>r.tag===t).length;
      return `<button class="rfbtn" onclick="setResFilter('${t}',this)">${t} (${cnt})</button>`;
    })
  ];
  row.innerHTML = btns.join('');
}

function setResFilter(tag, btn){
  _resActive = tag;
  document.querySelectorAll('.rfbtn').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  filterResearch();
}

function filterResearch(){
  _resSearchTerm = (document.getElementById('res-search').value||'').toLowerCase().trim();
  let visible = 0;
  document.querySelectorAll('.research-card').forEach(card=>{
    const id = +card.dataset.id;
    const r = RESEARCH.find(x=>x.id===id);
    if(!r){card.classList.add('hidden');return;}
    const matchTag = _resActive==='All' || (_resActive==='India' && r.india) || r.tag===_resActive;
    const matchSearch = !_resSearchTerm ||
      r.title.toLowerCase().includes(_resSearchTerm)||
      r.finding.toLowerCase().includes(_resSearchTerm)||
      r.practical.toLowerCase().includes(_resSearchTerm)||
      r.tag.toLowerCase().includes(_resSearchTerm)||
      r.authors.toLowerCase().includes(_resSearchTerm)||
      r.journal.toLowerCase().includes(_resSearchTerm);
    const show = matchTag && matchSearch;
    card.classList.toggle('hidden', !show);
    if(show) visible++;
  });
  const cnt = document.getElementById('res-count');
  if(cnt) cnt.textContent = visible + ' studies shown';
  const empty = document.getElementById('res-empty');
  if(empty) empty.style.display = visible===0?'block':'none';
}

function renderResearch(){
  const g = document.getElementById('research-grid');
  if(!g) return;
  // Only rebuild cards once — but ALWAYS re-run filters and stats
  if(!g.querySelector(".research-card")){
    g.innerHTML = RESEARCH.map(r=>{
    const qualLabel = r.quality==='high'?'High Quality':'Moderate Quality';
    const qualClass = r.quality==='high'?'rq-high':'rq-med';
    const indiaBadge = r.india?`<span class="rc-india">🇮🇳 India</span>`:'';
    const doiLink = r.url?
      `<a class="rc-doi" href="${r.url}" target="_blank" rel="noopener"><i class="ti ti-external-link" style="font-size:11px;"></i> View Paper</a>`
      :'<span style="color:var(--light)">No DOI</span>';
    const doiText = r.doi?`DOI: ${r.doi} · `:'';
    return `<div class="research-card" data-id="${r.id}">
      <div class="rc-meta">
        <span class="rc-tag" style="background:var(--paper);color:var(--forest);">${r.tag}</span>
        <span class="rc-quality ${qualClass}">${r.stars} ${qualLabel}</span>
        ${indiaBadge}
      </div>
      <h3>${r.title}</h3>
      <div class="rc-authors">${r.authors} · ${r.journal}, ${r.year}</div>
      <p>${r.finding}</p>
      <div class="rc-takeaway">
        <strong>Practical takeaway</strong>
        ${r.practical}
      </div>
      <div class="rc-foot">
        <span>${r.design} · n = ${r.n}</span>
        ${doiLink}
      </div>
    </div>`;
  }).join('');
  } // end: only build cards once
  buildResFilters();
  filterResearch();
  // Update stats
  const highQ = RESEARCH.filter(r=>r.quality==='high').length;
  const india = RESEARCH.filter(r=>r.india).length;
  const latest = Math.max(...RESEARCH.map(r=>+r.year));
  document.getElementById('rs-total').textContent = RESEARCH.length;
  document.getElementById('rs-high').textContent = highQ;
  document.getElementById('rs-india').textContent = india;
  document.getElementById('rs-latest').textContent = latest;
}

window.addEventListener('load',()=>{
  loadFoods();
  renderSupplements();
  renderMeals();
  renderSymptoms();
  renderBloodTests();
  initReveal();
});

/* ════════════════════════════════════
   CHATBOT
════════════════════════════════════ */
function toggleChatbot(){
  const w=document.getElementById('chatbot-window');
  w.style.display=w.style.display==='none'?'block':'none';
}

function addBotMessage(text){
  const box=document.getElementById('chatbot-messages');
  const div=document.createElement('div');
  div.style.cssText='background:rgba(255,255,255,.08);padding:10px 14px;border-radius:var(--r-md);font-size:.82rem;color:rgba(255,255,255,.85);max-width:85%;line-height:1.6;';
  div.innerHTML=text;
  box.appendChild(div);
  box.scrollTop=box.scrollHeight;
}

function addUserMessage(text){
  const box=document.getElementById('chatbot-messages');
  const div=document.createElement('div');
  div.style.cssText='background:var(--mint);padding:10px 14px;border-radius:var(--r-md);font-size:.82rem;color:#fff;max-width:85%;margin-left:auto;line-height:1.6;';
  div.textContent=text;
  box.appendChild(div);
  box.scrollTop=box.scrollHeight;
}

function sendChatbotMessage(){
  const input=document.getElementById('chatbot-input');
  const text=input.value.trim();
  if(!text)return;
  addUserMessage(text);
  input.value='';
  
  setTimeout(()=>{
    const reply=processChatbotQuery(text.toLowerCase());
    addBotMessage(reply);
  },400);
}

// Common, recognizable whole-food keywords — used as a whitelist so general rankings ("high protein
// foods", "best for muscle gain") surface foods people actually cook with, not industrial ingredients.
const WHOLE_FOOD_TERMS=['paneer','tofu','soy chunk','soybean','dal','moong','chana','rajma','lentil',
  'chickpea','kidney bean','black bean','almond','peanut','cashew','walnut','pistachio','hazelnut',
  'pumpkin seed','sunflower seed','chia seed','flax seed','sesame','egg','chicken','mutton','lamb',
  'goat','pork','turkey','duck','fish','salmon','tuna','mackerel','prawn','shrimp','crab','milk',
  'curd','yogurt','sprouts','quinoa','oats','rice','wheat','jowar','bajra','ragi','millet','spinach',
  'broccoli','sweet potato','potato','banana','apple','orange','mango','guava','papaya'];

// Terms indicating a heavily processed/industrial ingredient (isolate, concentrate, extract powder, etc.)
// rather than a whole food, even when it shares a whitelist keyword (e.g. "Milk Protein Isolate").
const PROCESSED_PATTERN=/protein (isolate|concentrate|powder|hydrolysate|granules)|isolate|concentrate|hydrolysate|caseinate|lactoferrin|lactalbumin|lactoglobulin|albumen|phycocyanin|technical grade|chromatographic|microfiltered|ultrafiltered|ion-exchange|spray-dried|extruded|texturized|devitalized|extract|gluten \(|defatted|granules\b/i;

function isWholeFood(name){
  const n=name.toLowerCase();
  if(PROCESSED_PATTERN.test(n))return false;
  return WHOLE_FOOD_TERMS.some(t=>n.includes(t));
}

// Returns top-N foods by a numeric field, preferring recognizable whole foods over heavily processed
// isolates/concentrates/extracts when both are available — so "high protein foods" surfaces chicken/
// paneer/dal before industrial whey/casein/yeast-extract variants, without hiding processed options
// entirely if not enough whole-food matches exist.
function topByField(pool,field,n,direction){
  direction=direction||'desc';
  const sorted=[...pool].sort((a,b)=>direction==='desc'?b[field]-a[field]:a[field]-b[field]);
  const whole=sorted.filter(f=>isWholeFood(f.name));
  const rest=sorted.filter(f=>!isWholeFood(f.name));
  const combined=[...whole,...rest].slice(0,n);
  return combined.sort((a,b)=>direction==='desc'?b[field]-a[field]:a[field]-b[field]);
}

function processChatbotQuery(q){
  if(ALL_FOODS.length===0){
    return 'Food database is still loading... please try again in a few seconds.';
  }
  q=q.toLowerCase().trim();

  // 0. General nutrition knowledge (FAQ) — checked first since these are unambiguous topic phrases
  const faqAnswer=searchFAQ(q);
  if(faqAnswer)return faqAnswer;

  // 1. "Compare X, Y and Z" / "Compare X and Y" — supports 2 or more foods, comma or and/vs separated
  if(q.startsWith('compare')||q.includes(' vs ')||q.includes(' versus ')){
    const body=q.replace(/^compare\s+/,'');
    const parts=body.split(/,| and |&| vs | versus /).map(s=>s.trim()).filter(Boolean);
    if(parts.length>=2){
      const foods=parts.map(p=>findFood(p)).filter(Boolean);
      if(foods.length>=2){
        let out=`<strong>Comparing ${foods.length} foods (per 100g):</strong><br><br>`;
        out+=foods.map(f=>`<strong>${f.name}</strong>: ${f.pro}g protein, ${f.carb}g carbs, ${f.fat}g fat, ${f.cal} kcal`).join('<br>');
        const topProtein=foods.reduce((a,b)=>b.pro>a.pro?b:a);
        const topCal=foods.reduce((a,b)=>b.cal<a.cal?b:a);
        out+=`<br><br>🏆 Highest protein: <strong>${topProtein.name}</strong> (${topProtein.pro}g)<br>🏆 Lowest calorie: <strong>${topCal.name}</strong> (${topCal.cal} kcal)`;
        return out;
      }
    }
  }

  // 2. "Lowest carb [category]" / "lowest calorie X" / "highest fiber X"
  const lowestMatch=q.match(/(?:lowest|least)\s+(carb|carbs|calorie|calories|fat)\s*(?:in\s+)?(\w+)?/);
  if(lowestMatch){
    const field=NUTRIENT_WORDS[lowestMatch[1]]||'carb';
    const cat=lowestMatch[2];
    let pool=RAW_FOODS;
    if(cat){
      const matchedCat=[...new Set(RAW_FOODS.map(f=>f.cat))].find(c=>c.toLowerCase().includes(cat));
      if(matchedCat)pool=pool.filter(f=>f.cat===matchedCat);
    }
    const sorted=[...pool].sort((a,b)=>a[field]-b[field]).slice(0,5);
    return `<strong>Lowest ${lowestMatch[1]}${cat?' in '+cat:''}:</strong><br>`+sorted.map(f=>`• ${f.name}: ${f[field]}${field==='cal'?' kcal':'g'}`).join('<br>');
  }

  // 3. "Highest protein/fiber/etc in [category]"
  const highestMatch=q.match(/(?:highest|most|top)\s+(protein|fiber|fibre|carb|carbs|fat|calorie|calories)\s*(?:in\s+)?(\w+)?/);
  if(highestMatch){
    const field=NUTRIENT_WORDS[highestMatch[1]]||'pro';
    const cat=highestMatch[2];
    let pool=RAW_FOODS;
    if(cat){
      const matchedCat=[...new Set(RAW_FOODS.map(f=>f.cat))].find(c=>c.toLowerCase().includes(cat));
      if(matchedCat)pool=pool.filter(f=>f.cat===matchedCat);
    }
    const sorted=[...pool].sort((a,b)=>b[field]-a[field]).slice(0,5);
    return `<strong>Highest ${highestMatch[1]}${cat?' in '+cat:''}:</strong><br>`+sorted.map(f=>`• ${f.name}: ${f[field]}${field==='cal'?' kcal':'g'}`).join('<br>');
  }

  // 4. "Foods under N calories"
  const underCalMatch=q.match(/under\s+(\d+)\s*(?:kcal|cal|calories)/);
  if(underCalMatch){
    const limit=parseInt(underCalMatch[1]);
    const foods=RAW_FOODS.filter(f=>f.cal<=limit).sort((a,b)=>b.pro-a.pro).slice(0,8);
    if(foods.length){
      return `<strong>Foods under ${limit} kcal (sorted by protein):</strong><br>`+foods.map(f=>`• ${f.name}: ${f.cal} kcal, ${f.pro}g protein`).join('<br>');
    }
    return `I couldn't find foods under ${limit} kcal in our raw database.`;
  }

  // 5. "Vegan/vegetarian sources of [nutrient]"
  const veganSrcMatch=q.match(/(?:vegan|vegetarian|plant)\s+(?:source|sources)\s+(?:of\s+)?(\w+)/);
  if(veganSrcMatch){
    const word=veganSrcMatch[1];
    if(word.includes('protein')){
      // restrict to the vegRaw section directly (excludes dairy and all non-veg meat/fish/egg items by definition)
      const EXCLUDE_PATTERN=/whey|casein|albumin|albumen|lactoferrin|lactalbumin|lactoglobulin|serum|gelatin|collagen|egg/i;
      const f=RAW_FOODS.filter(x=>x.section==='vegRaw'&&x.pro>=15&&!EXCLUDE_PATTERN.test(x.name));
      const combined=topByField(f,'pro',6,'desc');
      return `<strong>Vegetarian Protein Sources:</strong><br>`+combined.map(x=>`• ${x.name}: ${x.pro}g protein`).join('<br>');
    }
    if(word.includes('iron')){
      return searchFAQ('iron deficiency vegetarian source');
    }
    if(word.includes('fiber')||word.includes('fibre')){
      const f=RAW_FOODS.filter(x=>x.fiber>=5).sort((a,b)=>b.fiber-a.fiber).slice(0,6);
      return `<strong>High-Fiber Foods:</strong><br>`+f.map(x=>`• ${x.name}: ${x.fiber}g fiber`).join('<br>');
    }
  }

  // 6. "High protein foods" (checked BEFORE generic "protein in X" so it isn't swallowed by that pattern)
  if(q.includes('high protein')||q.includes('protein rich')||q==='high protein foods'){
    const highPro=topByField(RAW_FOODS.filter(f=>f.pro>=20),'pro',6,'desc');
    return `<strong>Top High Protein Foods:</strong><br>`+highPro.map(f=>`• ${f.name}: <strong>${f.pro}g</strong> protein`).join('<br>');
  }

  // 7. "Foods in [category]"
  const catMatch=q.match(/(?:foods? in|category)\s+(\w+)/);
  if(catMatch){
    const catWord=catMatch[1].toLowerCase();
    const matchedCat=[...new Set(RAW_FOODS.map(f=>f.cat))].find(c=>c.toLowerCase().includes(catWord));
    if(matchedCat){
      const foods=RAW_FOODS.filter(f=>f.cat===matchedCat).slice(0,8);
      return `<strong>${matchedCat} Foods:</strong><br>`+foods.map(f=>`• ${f.name} (${f.pro}g protein)`).join('<br>');
    }
  }

  // 8. "Best for muscle gain"
  if(q.includes('muscle')||q.includes('bulk')||q.includes('bodybuilding')){
    const muscle=topByField(RAW_FOODS.filter(f=>f.pro>=15),'pro',6,'desc');
    return `<strong>Best for Muscle Gain:</strong><br>`+muscle.map(f=>`• ${f.name}: ${f.pro}g protein, ${f.cal} kcal`).join('<br>');
  }

  // 9. "Best for weight loss"
  if(q.includes('weight loss')||q.includes('cutting')||q.includes('fat loss')){
    const lowCal=RAW_FOODS.filter(f=>f.cal<=200&&f.pro>=10).sort((a,b)=>a.cal-b.cal).slice(0,6);
    return `<strong>Best for Weight Loss:</strong><br>`+lowCal.map(f=>`• ${f.name}: ${f.cal} kcal, ${f.pro}g protein`).join('<br>');
  }

  // 10. "Protein in [food]" / "[food] protein" — generic single-food lookup, checked AFTER the multi-word intent patterns above
  const proteinMatch=q.match(/^protein\s+in\s+(.+)$|^protein\s+(.+)$|^(.+)\s+protein$/);
  if(proteinMatch){
    const foodName=(proteinMatch[1]||proteinMatch[2]||proteinMatch[3]||'').trim();
    const food=findFood(foodName);
    if(food){
      return `<strong>${food.name}</strong> (${food.local||''})<br>Protein: <strong>${food.pro}g</strong> per 100g<br>Calories: ${food.cal} kcal<br>Category: ${food.cat}`;
    }
    const suggestion=closestFoodSuggestion(foodName);
    if(suggestion){
      return `I couldn't find "${foodName}" exactly — did you mean <strong>${suggestion.name}</strong>? It has ${suggestion.pro}g protein per 100g.`;
    }
  }

  // 11. "Calories/Fiber/Carbs/Fat in [food]"
  const nutrientInMatch=q.match(/(?:calories|kcal|fiber|fibre|carbs|carbohydrates|fat)\s+(?:in|of)\s+(.+)/);
  if(nutrientInMatch){
    const food=findFood(nutrientInMatch[1].trim());
    if(food){
      return `<strong>${food.name}</strong> (per 100g)<br>Calories: <strong>${food.cal} kcal</strong><br>Protein: ${food.pro}g | Carbs: ${food.carb}g | Fat: ${food.fat}g | Fiber: ${food.fiber>0?food.fiber+'g':'~'}`;
    }
  }

  // 12. Direct food name / single-word query — full nutrition card
  const food=findFood(q);
  if(food){
    return `<strong>${food.name}</strong><br>${food.local?'('+food.local+')<br>':''}<br>
    Protein: ${food.pro}g<br>
    Carbs: ${food.carb}g<br>
    Fat: ${food.fat}g<br>
    Calories: ${food.cal}<br>
    GI: ${food.gi}<br>
    Bioavailability: ${food.bio}<br>
    Category: ${food.cat}`;
  }

  // 13. Smart fallback — try a fuzzy "did you mean" before giving up entirely
  const suggestion=closestFoodSuggestion(q);
  if(suggestion){
    return `I couldn't find an exact match for "${q}" — did you mean <strong>${suggestion.name}</strong>? It has ${suggestion.pro}g protein, ${suggestion.cal} kcal per 100g. <br><br>Or try rephrasing — I can also answer general nutrition questions like "what is glycemic index" or "how much protein do I need".`;
  }

  // 14. Default help message
  return `I can help you with:<br>
  • "Protein in paneer"<br>
  • "Compare paneer, tofu and soy chunks"<br>
  • "Lowest carb in pulses"<br>
  • "Foods under 150 calories"<br>
  • "Vegan sources of protein"<br>
  • "What is glycemic index?"<br>
  • "How much protein do I need?"<br><br>
  Try asking about any of our 1,385 verified raw foods, or general nutrition topics! For cooked dishes, visit the Cooked Food Database.`;
}

/* ════════════════════════════════════
   CHATBOT v2 — fuzzy matching, aliases, FAQ knowledge base
   ════════════════════════════════════ */

// Common Indian/English synonyms and aliases mapped to canonical search terms
const FOOD_ALIASES={
  'chana':'chickpea','kabuli chana':'chickpea','white chana':'chickpea','kala chana':'black chickpea',
  'rajma':'kidney beans','moong':'moong dal','mung':'moong dal','toor':'toor dal','arhar':'toor dal',
  'urad':'urad dal','masoor':'masoor dal','chickoo':'sapota','dahi':'curd','doodh':'milk',
  'roti ka atta':'wheat flour','atta':'wheat flour','maida':'refined flour','besan':'gram flour',
  'mungfali':'peanut','moongfali':'peanut','badam':'almond','kaju':'cashew','akhrot':'walnut',
  'kishmish':'raisins','chiken':'chicken','chiken breast':'chicken breast','panir':'paneer',
  'panner':'paneer','tofo':'tofu','egss':'eggs','egg':'whole chicken egg'
};

// Quick keyword -> nutrient field mapping
const NUTRIENT_WORDS={
  protein:'pro',proteins:'pro',
  carb:'carb',carbs:'carb',carbohydrate:'carb',carbohydrates:'carb',
  fat:'fat',fats:'fat',
  cal:'cal',cals:'cal',calorie:'cal',calories:'cal',kcal:'cal',
  fiber:'fiber',fibre:'fiber'
};

// Levenshtein edit distance — powers typo tolerance
function levenshtein(a,b){
  a=a.toLowerCase();b=b.toLowerCase();
  const m=a.length,n=b.length;
  if(m===0)return n; if(n===0)return m;
  const dp=Array.from({length:m+1},(_,i)=>[i,...Array(n).fill(0)]);
  for(let j=0;j<=n;j++)dp[0][j]=j;
  for(let i=1;i<=m;i++){
    for(let j=1;j<=n;j++){
      dp[i][j]=a[i-1]===b[j-1]?dp[i-1][j-1]:1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);
    }
  }
  return dp[m][n];
}

// Resolve aliases before searching, e.g. "panir" -> "paneer", "chana" -> "chickpea"
function resolveAlias(term){
  const t=term.toLowerCase().trim();
  return FOOD_ALIASES[t]||t;
}

// Fuzzy food finder: exact match -> substring match -> alias -> typo-tolerant closest match
function findFood(query,pool){
  pool=pool||RAW_FOODS;
  let term=query.toLowerCase().trim();
  if(!term)return null;
  term=resolveAlias(term);

  // 1. exact name match
  let f=pool.find(x=>x.name.toLowerCase()===term);
  if(f)return f;

  // 2. exact local (Hindi) name match
  f=pool.find(x=>x.local&&x.local.toLowerCase()===term);
  if(f)return f;

  // 3. substring match on name
  f=pool.find(x=>x.name.toLowerCase().includes(term));
  if(f)return f;

  // 4. substring match on local name
  f=pool.find(x=>x.local&&x.local.toLowerCase().includes(term));
  if(f)return f;

  // 5. reverse substring (query contains the food name — handles "i ate chicken breast today")
  f=pool.find(x=>term.includes(x.name.toLowerCase()));
  if(f)return f;

  // 6. typo-tolerant fuzzy match — find closest name within an edit-distance threshold
  let best=null,bestDist=Infinity;
  const threshold=Math.max(2,Math.floor(term.length*0.34)); // allow more typos on longer words
  pool.forEach(x=>{
    const dist=levenshtein(term,x.name.toLowerCase());
    if(dist<bestDist){bestDist=dist;best=x;}
    // also check against first word of multi-word names (e.g. "chiken" vs "Chicken Breast")
    const firstWord=x.name.toLowerCase().split(' ')[0];
    const dist2=levenshtein(term,firstWord);
    if(dist2<bestDist){bestDist=dist2;best=x;}
  });
  if(best&&bestDist<=threshold)return best;

  return null;
}

// Find the closest food name even if no good match — used for "did you mean?" suggestions
function closestFoodSuggestion(query,pool){
  pool=pool||RAW_FOODS;
  const term=resolveAlias(query.toLowerCase().trim());
  let best=null,bestDist=Infinity;
  pool.forEach(x=>{
    const dist=levenshtein(term,x.name.toLowerCase());
    if(dist<bestDist){bestDist=dist;best=x;}
  });
  return best;
}

// ---- Curated Nutrition FAQ knowledge base ----
// Each entry: trigger keywords (any match fires it) + a well-written, evidence-based answer
const NUTRITION_FAQ=[
  {kw:['intermittent fasting','if diet','16:8','fasting window'],
   a:`<strong>Intermittent Fasting (IF):</strong><br>IF restricts eating to a window (commonly 16:8) rather than changing what you eat. Research shows it works mainly because it tends to reduce overall calorie intake — not through any special metabolic "magic."<br><br>It can suit people who prefer fewer, larger meals. It's not inherently superior to regular meal timing for fat loss when calories and protein are matched. Skip it if you have a history of disordered eating, are pregnant, or have blood sugar management needs — talk to a doctor first.`},
  {kw:['protein timing','when to eat protein','protein window','anabolic window'],
   a:`<strong>Protein Timing:</strong><br>The "anabolic window" is real but much wider than once believed — roughly 4-6 hours around training, not 30 minutes. What matters far more is your <strong>total daily protein</strong> (aim for 1.6-2.2g/kg bodyweight if you train) spread across 3-5 meals.<br><br>Eating protein within a few hours pre/post workout is sensible and convenient, but missing the "window" by an hour won't cost you gains.`},
  {kw:['glycemic index','gi value','what is gi','low gi','high gi'],
   a:`<strong>Glycemic Index (GI):</strong><br>GI measures how quickly a food raises blood sugar, on a 0-100 scale (pure glucose = 100). Low GI (under 55) foods release sugar slowly — good for steady energy and blood sugar control. High GI (70+) foods spike sugar fast.<br><br>Context matters: GI changes when foods are combined with fat, protein, or fiber (e.g. rice with dal is lower-GI in practice than rice alone). Don't over-index on GI alone — total carb quantity and your overall diet pattern matter more for most people.`},
  {kw:['fiber benefit','why fiber','fibre important','dietary fiber'],
   a:`<strong>Why Fiber Matters:</strong><br>Fiber slows digestion (steadier blood sugar, longer fullness), feeds beneficial gut bacteria, and is linked to lower risk of heart disease and certain cancers. Most Indians get well under the recommended 25-30g/day.<br><br>Good sources in our database: whole grains, pulses (dal), vegetables, and seeds like chia and flax. Increase fiber gradually with adequate water to avoid bloating.`},
  {kw:['how much protein','protein requirement','protein per day','protein needs'],
   a:`<strong>Daily Protein Needs:</strong><br>• Sedentary adults: ~0.8-1g/kg bodyweight<br>• Active / strength training: ~1.6-2.2g/kg<br>• Weight loss (preserve muscle): ~2.0-2.4g/kg<br><br>Vegetarians may need the higher end of these ranges since plant proteins are typically less bioavailable than animal sources. Use our <a onclick="go('calculators')" style="color:var(--gold);text-decoration:underline;cursor:pointer;">Protein Calculator</a> for a number tailored to you.`},
  {kw:['vegan protein','vegetarian protein source','plant protein','complete protein'],
   a:`<strong>Vegetarian/Vegan Protein Sources:</strong><br>Strong options in our database: soy chunks, tofu, paneer, moong dal, chana, lentils, quinoa, and seeds like pumpkin and hemp.<br><br>"Complete protein" (all 9 essential amino acids) matters less than people think if you eat a varied diet across the day — combining grains + legumes (e.g. rice + dal) naturally covers your amino acid bases.`},
  {kw:['b12 vegetarian','vitamin b12','b12 deficiency','b12 source'],
   a:`<strong>Vitamin B12 for Vegetarians:</strong><br>B12 is found almost exclusively in animal products — dairy and eggs provide some, but strict vegetarians and vegans are at real risk of deficiency. Symptoms include fatigue, tingling in hands/feet, and memory issues.<br><br>If you're vegetarian, a B12 supplement or fortified foods are strongly recommended — get levels checked via a blood test rather than guessing. See our <a onclick="go('home')" style="color:var(--gold);text-decoration:underline;cursor:pointer;">Blood Test Guide</a>.`},
  {kw:['iron deficiency','iron source vegetarian','anemia food','low iron'],
   a:`<strong>Iron for Vegetarians:</strong><br>Plant ("non-heme") iron is absorbed less efficiently than animal ("heme") iron. Good vegetarian sources: chana, rajma, soybeans, spinach, jaggery, and fortified cereals.<br><br>Pair iron-rich foods with vitamin C (lemon, amla, tomato) to boost absorption significantly — and avoid tea/coffee right after meals, as tannins block iron uptake.`},
  {kw:['water intake','how much water','hydration daily','litres of water'],
   a:`<strong>Daily Water Needs:</strong><br>A common baseline is 30-35ml per kg bodyweight, adjusted up for hot climates, exercise, or high-fiber diets. For a 70kg person in India's climate, that's roughly 2.5-3.5 litres/day from all sources (water, food, other drinks).<br><br>Thirst and pale-yellow urine are decent practical indicators. Use our <a onclick="go('calculators')" style="color:var(--gold);text-decoration:underline;cursor:pointer;">Water Calculator</a> for a personalized number.`},
  {kw:['carb cycling','low carb diet','keto diet india','carb timing'],
   a:`<strong>Low-Carb / Keto Approaches:</strong><br>These can work for weight loss mainly by reducing overall calories and appetite, not through unique "fat-burning" mechanisms. They're harder to sustain long-term in an Indian diet built around rice, roti and dal.<br><br>If you try it, prioritize protein and fiber to manage hunger, and monitor energy levels — very low-carb diets aren't ideal for high-intensity training.`},
  {kw:['sugar bad','added sugar','sugar harmful','how much sugar'],
   a:`<strong>Added Sugar:</strong><br>WHO recommends keeping added sugar under 10% of daily calories (ideally under 5%) — roughly 25-50g/day for most adults. This excludes naturally occurring sugar in whole fruit, which comes with fiber and nutrients.<br><br>The bigger issue is usually liquid sugar (sodas, sweetened tea/coffee, juices) since it's easy to over-consume without feeling full.`},
  {kw:['meal frequency','how many meals','3 meals or 6','eating frequency'],
   a:`<strong>Meal Frequency:</strong><br>Total daily calories and protein matter far more than how many meals you split them into. 3 meals, 5 small meals, or 2 large ones can all work equally well for fat loss or muscle gain if totals are matched.<br><br>Choose what's practical and helps you hit your targets consistently — that's the real deciding factor.`},
  {kw:['cheat day','cheat meal','refeed','diet break'],
   a:`<strong>Cheat Days/Meals:</strong><br>An occasional higher-calorie meal won't undo consistent progress and can help psychologically with long-term adherence. The risk is when "cheat day" becomes a pattern that erases a week's calorie deficit.<br><br>A planned, moderate "treat meal" within your week is more sustainable than an all-or-nothing mentality.`},
  {kw:['bmr vs tdee','what is bmr','what is tdee','basal metabolic rate'],
   a:`<strong>BMR vs TDEE:</strong><br><strong>BMR</strong> (Basal Metabolic Rate) is the calories your body burns at complete rest just to function. <strong>TDEE</strong> (Total Daily Energy Expenditure) adds activity, exercise, and digestion on top of BMR — it's your real daily calorie need.<br><br>Use our <a onclick="go('calculators')" style="color:var(--gold);text-decoration:underline;cursor:pointer;">TDEE Calculator</a> to get both numbers for your body and activity level.`},
  {kw:['supplement necessary','do i need supplements','whey protein necessary','creatine safe'],
   a:`<strong>Are Supplements Necessary?</strong><br>No supplement replaces a solid diet — they fill gaps. Whey/plant protein powder is simply convenient concentrated protein. Creatine monohydrate is one of the most well-studied, safe supplements for strength/muscle gain.<br><br>Check our <strong>Supplement Ratings</strong> page for unsponsored, transparent reviews before buying anything.`},
  {kw:['weight loss plateau','stuck weight loss','not losing weight','weight loss stalled'],
   a:`<strong>Weight Loss Plateau:</strong><br>Common causes: your TDEE has dropped as you've lost weight (recalculate it), portion sizes have crept up, water retention is masking fat loss, or you're underestimating intake. Track honestly for 1-2 weeks before changing anything drastically.<br><br>A short diet break (eating at maintenance for 1-2 weeks) can also help reset hormones and adherence for some people.`},
  {kw:['bioavailability meaning','what is bioavailability','absorption protein'],
   a:`<strong>Bioavailability:</strong><br>This refers to how efficiently your body can actually absorb and use a nutrient. Animal proteins (eggs, dairy, meat) generally have higher bioavailability than most plant proteins, partly due to amino acid profile and anti-nutrient content in some plants (like phytates in grains).<br><br>This doesn't mean plant sources are inadequate — just that vegetarians may need to eat slightly more total protein to compensate.`},
  {kw:['empty calories','junk food meaning','processed food bad'],
   a:`<strong>"Empty Calories" Explained:</strong><br>This refers to foods that provide energy (calories) but very little else — minimal protein, fiber, vitamins or minerals. Examples: sugary drinks, refined snacks, deep-fried items.<br><br>They're not "forbidden," but building your diet primarily around them tends to leave you under-nourished even at a normal calorie intake.`},
  {kw:['diabetic food','diabetes diet','blood sugar food','sugar patient diet'],
   a:`<strong>Diabetes-Friendly Eating (general guidance):</strong><br>Favor low-GI carbs (whole grains, legumes), pair carbs with protein/fiber/fat to blunt blood sugar spikes, and keep portion sizes consistent meal to meal. Our database's GI ratings can help you choose.<br><br>This is general information, not medical advice — diabetes management should always be guided by your doctor or a registered dietitian.`},
  {kw:['muscle soreness','doms','sore after workout'],
   a:`<strong>Muscle Soreness (DOMS):</strong><br>Delayed Onset Muscle Soreness typically peaks 24-48 hours after unfamiliar or intense exercise and isn't a reliable indicator of how effective your workout was. Adequate protein, sleep, and light movement help recovery.<br><br>Sharp or joint pain (different from general muscle soreness) warrants caution and possibly a doctor's input.`},
  {kw:['eating before bed','late night eating','dinner late','eat at night'],
   a:`<strong>Eating Late at Night:</strong><br>Eating before bed doesn't directly cause fat gain — total daily calories do. That said, very heavy late meals can disrupt sleep quality for some people. If you're hungry at night, a protein-containing snack is a reasonable choice.<br><br>The "don't eat after 7pm" rule is a myth as a universal law — it's really about your total daily intake.`},
  {kw:['ghee healthy','is ghee good','ghee benefits'],
   a:`<strong>Ghee:</strong><br>Ghee is mostly saturated fat with a high smoke point, making it stable for Indian-style cooking. In moderation, it fits within a balanced diet — but it's still calorie-dense (~900 kcal/100g), so portion awareness matters if you're managing weight.<br><br>It's not inherently "superhealthy" or "unhealthy" — context and quantity decide that.`},
  {kw:['omega 3 vegetarian','omega 3 source','fish oil alternative'],
   a:`<strong>Vegetarian Omega-3 Sources:</strong><br>Flaxseed, chia seeds, walnuts, and soybean oil provide ALA (a plant omega-3), but conversion to the more bioactive EPA/DHA (found directly in fatty fish) is inefficient in the body.<br><br>Vegetarians who want EPA/DHA directly may consider an algae-based omega-3 supplement, which is the only non-fish source of pre-formed EPA/DHA.`},
  {kw:['detox diet','detox juice','body detox','cleanse diet'],
   a:`<strong>"Detox" Diets:</strong><br>Your liver and kidneys already detoxify your body continuously — no juice cleanse or "detox tea" speeds this up or removes toxins faster. Short-term weight changes from these diets are mostly water weight and reduced calorie intake.<br><br>A whole-food diet with adequate fiber, water, and protein supports your body's natural detox systems far better than any cleanse product.`},
  {kw:['portion size','how much should i eat','plate method'],
   a:`<strong>Portion Sizing (Plate Method):</strong><br>A simple visual approach: fill half your plate with vegetables, a quarter with protein, and a quarter with carbs (rice/roti), plus a thumb-sized portion of fat. This naturally moderates calories without needing to weigh everything.<br><br>For precise tracking, our calculators and food database give exact gram-level numbers.`}
];

function searchFAQ(q){
  const ql=q.toLowerCase();
  for(const entry of NUTRITION_FAQ){
    if(entry.kw.some(k=>ql.includes(k)))return entry.a;
  }
  return null;
}

// Register service worker for PWA installability
if('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

let deferredPrompt = null;
let isInstalled = false;

// Check if already running as installed PWA
if(window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true){
  isInstalled = true;
  // Hide FAB — already installed
  document.addEventListener('DOMContentLoaded', () => {
    const fab = document.getElementById('pwa-fab');
    if(fab) fab.style.display = 'none';
  });
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  // Show nav pill + FAB
  const pill = document.getElementById('pwa-pill');
  const mobLink = document.getElementById('mob-pwa-link');
  const heroBtn = document.getElementById('hero-install-btn');
  const fab = document.getElementById('pwa-fab');
  if(mobLink && !isInstalled) mobLink.style.display = 'flex';
  if(pill && !isInstalled) pill.classList.add('visible');
  if(heroBtn && !isInstalled) heroBtn.style.display = 'inline-flex';
  if(fab && !isInstalled) fab.style.display = 'flex';
  // Update button state
  const btn = document.getElementById('pwa-install-btn');
  const txt = document.getElementById('pwa-btn-text');
  if(btn && !isInstalled){
    btn.classList.remove('installed');
    if(txt) txt.textContent = 'INSTALL ON THIS DEVICE';
  }
});

window.addEventListener('appinstalled', () => {
  isInstalled = true;
  deferredPrompt = null;
  const pill = document.getElementById('pwa-pill');
  if(pill) pill.classList.remove('visible');
  setInstalledState();
  showToast('✅ NutraInfo installed! Find it in your app drawer.');
});

function setInstalledState(){
  const btn = document.getElementById('pwa-install-btn');
  const txt = document.getElementById('pwa-btn-text');
  const notice = document.getElementById('pwa-installed-notice');
  const heroBtn = document.getElementById('hero-install-btn');
  const pill = document.getElementById('pwa-pill');
  const fab = document.getElementById('pwa-fab');
  if(btn){ btn.classList.add('installed'); btn.disabled = true; }
  if(txt) txt.textContent = '● INSTALLED ON THIS DEVICE';
  if(notice) notice.classList.add('show');
  if(heroBtn) heroBtn.style.display = 'none';
  if(pill) pill.classList.remove('visible');
  if(fab) fab.style.display = 'none';
}

async function triggerPWAInstall(){
  if(isInstalled){ 
    showToast('NutraInfo is already installed on this device!');
    return; 
  }
  if(deferredPrompt){
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if(outcome === 'accepted'){
      showToast('Installing NutraInfo…');
    } else {
      showToast('Install cancelled. You can always come back to this page.');
    }
    deferredPrompt = null;
  } else {
    // No prompt available — guide to install page
    go('install');
    showToast('Follow the steps below to install NutraInfo on your device.');
  }
}

// On install page load, set correct button state
if(isInstalled){ 
  document.addEventListener('DOMContentLoaded', setInstalledState);
}

