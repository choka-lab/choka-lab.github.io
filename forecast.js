/* 釣果ラボ 堤防予報：計算の共通部分（index.html と post.html で使う） */
(function(global){
"use strict";

// 釣り場（港の近くの海の点）
const SPOTS = [
  ["三重・四日市", 34.96, 136.64], ["三重・津", 34.71, 136.53], ["三重・鳥羽", 34.48, 136.85], ["三重・尾鷲", 34.07, 136.21],
  ["愛知・名古屋港", 35.04, 136.84], ["愛知・知多（師崎）", 34.70, 136.99], ["愛知・蒲郡", 34.81, 137.22], ["愛知・伊良湖", 34.58, 137.01],
  ["大阪・南港", 34.63, 135.41], ["大阪・泉南（りんくう）", 34.40, 135.29], ["兵庫・神戸", 34.67, 135.19], ["兵庫・明石", 34.64, 134.99],
  ["和歌山・和歌山港", 34.22, 135.14], ["和歌山・白浜", 33.68, 135.34],
  ["静岡・清水港", 35.01, 138.50], ["静岡・浜名湖（舞阪）", 34.68, 137.61],
  ["神奈川・横浜", 35.45, 139.65], ["千葉・木更津", 35.38, 139.91], ["福井・敦賀", 35.66, 136.07],
  // ここから追加分（番号がずれないよう、増やすときは「緯度・経度を入れる」の前に足す）
  ["北海道・小樽", 43.20, 141.01], ["宮城・塩釜（松島湾）", 38.31, 141.06], ["新潟・新潟港", 37.96, 139.06], ["石川・金沢港", 36.62, 136.59],
  ["京都・舞鶴", 35.53, 135.37], ["東京・若洲", 35.62, 139.84], ["神奈川・三浦（城ヶ島）", 35.13, 139.62], ["千葉・館山", 34.99, 139.84],
  ["静岡・沼津", 35.07, 138.85], ["静岡・焼津", 34.86, 138.33], ["愛知・常滑", 34.88, 136.82], ["三重・鈴鹿（白子）", 34.83, 136.61],
  ["大阪・岸和田", 34.47, 135.36], ["兵庫・姫路", 34.76, 134.65], ["岡山・玉野（宇野）", 34.48, 133.94], ["広島・広島港", 34.33, 132.46],
  ["香川・高松", 34.36, 134.05], ["徳島・小松島", 34.01, 134.62], ["高知・浦戸", 33.49, 133.57], ["山口・下関", 33.95, 130.93],
  ["福岡・博多", 33.62, 130.38], ["長崎・長崎港", 32.73, 129.84], ["鹿児島・鹿児島港", 31.60, 130.57], ["沖縄・那覇", 26.22, 127.66],
  ["緯度・経度を入れる", null, null]
];
const CUSTOM = SPOTS.length - 1;
// 選択肢の並び（北から）
const PREF_ORDER = ["北海道","宮城","新潟","石川","福井","京都","東京","神奈川","千葉","静岡","愛知","三重","大阪","兵庫","和歌山","岡山","広島","香川","徳島","高知","山口","福岡","長崎","鹿児島","沖縄"];
const pref = name => name.split("・")[0];
// 地域のハッシュタグ（例：#三重釣り）
const prefTag = si => SPOTS[si] && SPOTS[si][1]!==null ? "#"+pref(SPOTS[si][0])+"釣り" : "";
function fillSpotSelect(sel){
  sel.innerHTML="";
  PREF_ORDER.forEach(pf=>{
    const g=document.createElement("optgroup"); g.label=pf;
    SPOTS.forEach((s,i)=>{ if(s[1]!==null && pref(s[0])===pf){ const o=document.createElement("option"); o.value=i; o.textContent=s[0]; g.appendChild(o); } });
    if(g.children.length) sel.appendChild(g);
  });
  const o=document.createElement("option"); o.value=CUSTOM; o.textContent=SPOTS[CUSTOM][0]; sel.appendChild(o);
}
// 前の版で「緯度・経度を入れる」が 19 番だった名残りを直す
(function(){ try{ if(localStorage.getItem("chokalab_spot")==="19" && localStorage.getItem("chokalab_spotv")===null){ localStorage.setItem("chokalab_spot", String(CUSTOM)); } localStorage.setItem("chokalab_spotv","2"); }catch(e){} })();

// 狙い（時間帯ごとの向き不向き w、我慢できる風 m/s・波 m、投稿用のタグ）
const FISH = [
  {name:"アジ（サビキ）",           w:{am:1.0, day:0.5, pm:1.0, night:0.7}, wind:7, wave:1.2, tags:"#サビキ釣り #アジ釣り"},
  {name:"青物（ショアジギング）",   w:{am:1.0, day:0.4, pm:0.8, night:0.0}, wind:8, wave:1.5, tags:"#ショアジギング #青物"},
  {name:"アオリイカ（エギング）",   w:{am:0.8, day:0.5, pm:1.0, night:0.8}, wind:6, wave:1.2, tags:"#エギング #アオリイカ"},
  {name:"キス（ちょい投げ）",       w:{am:0.8, day:1.0, pm:0.6, night:0.1}, wind:6, wave:1.0, tags:"#ちょい投げ #キス釣り"},
  {name:"チヌ・メバル（夜釣り）",   w:{am:0.6, day:0.3, pm:0.9, night:1.0}, wind:7, wave:1.2, tags:"#夜釣り #メバリング"},
  {name:"なんでも（家族で安全に）", w:{am:0.6, day:1.0, pm:0.7, night:0.0}, wind:5, wave:0.8, tags:"#ファミリーフィッシング #海釣り"}
];

const SLOTS = [["am","朝まずめ"],["day","日中"],["pm","夕まずめ"],["night","夜"]];
const WD = ["日","月","火","水","木","金","土"];
const GRADE = {s:["◎","行くべき"],a:["○","いい日"],b:["△","微妙"],c:["×","やめとけ"]};

const store = {
  get(k, d){ try{ const v = localStorage.getItem("chokalab_"+k); return v===null?d:JSON.parse(v);}catch(e){return d;} },
  set(k, v){ try{ localStorage.setItem("chokalab_"+k, JSON.stringify(v)); }catch(e){} }
};

function ymd(d){ return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function md(s){ const [y,m,d]=s.split("-").map(Number); const w=new Date(y,m-1,d).getDay(); return {txt:m+"/"+d+"("+WD[w]+")", w}; }
const toMin = s => { const t=s.slice(11,16).split(":"); return (+t[0])*60+(+t[1]); };
const hm = m => { m=Math.round(m); if(m<0)m+=1440; return Math.floor(m/60)%24+":"+String(m%60).padStart(2,"0"); };
const dirName = deg => ["北","北東","東","南東","南","南西","西","北西"][Math.round(((deg%360)+360)%360/45)%8];

// 潮回り（月齢から）
const TIDE_NAME = [null,"大潮","大潮","大潮","中潮","中潮","中潮","小潮","小潮","小潮","長潮","若潮","中潮","中潮","大潮","大潮","大潮","大潮","中潮","中潮","中潮","中潮","小潮","小潮","小潮","長潮","若潮","中潮","中潮","大潮","大潮"];
const TIDE_PT = {"大潮":25,"中潮":19,"若潮":10,"小潮":7,"長潮":4};
function moonAge(dateStr){
  const [y,m,d]=dateStr.split("-").map(Number);
  const jd = Date.UTC(y,m-1,d,3,0)/86400000 + 2440587.5; // 日本の正午
  const syn = 29.530588853;
  return (((jd - 2451550.1) % syn) + syn) % syn;
}
function tideName(dateStr){ return TIDE_NAME[Math.min(30, Math.max(1, Math.floor(moonAge(dateStr)) + 1))]; }

async function getData(lat, lon){
  const q = "latitude="+lat+"&longitude="+lon+"&timezone=Asia%2FTokyo&forecast_days=8";
  const wx = "https://api.open-meteo.com/v1/forecast?"+q+"&hourly=temperature_2m,precipitation,wind_speed_10m,wind_gusts_10m,wind_direction_10m,weather_code&daily=sunrise,sunset&wind_speed_unit=ms";
  const sea = "https://marine-api.open-meteo.com/v1/marine?"+q+"&hourly=wave_height,sea_level_height_msl";
  const [a,b] = await Promise.all([fetch(wx), fetch(sea)]);
  if(!a.ok) throw new Error("天気のデータが取れませんでした");
  const W = await a.json();
  const S = b.ok ? await b.json() : null;
  return {W,S};
}

// 過去（や近い先）の1日分。前後1日も取って満潮・干潮の山を拾えるようにする
async function getDataDay(lat, lon, date){
  const d0=new Date(date+"T12:00:00"), today=new Date();
  const sh=n=>ymd(new Date(d0.getFullYear(),d0.getMonth(),d0.getDate()+n));
  const ago=(today-d0)/86400000;
  const q="latitude="+lat+"&longitude="+lon+"&timezone=Asia%2FTokyo&start_date="+sh(-1)+"&end_date="+sh(1);
  const vars="&hourly=temperature_2m,precipitation,wind_speed_10m,wind_gusts_10m,wind_direction_10m,weather_code&daily=sunrise,sunset&wind_speed_unit=ms";
  const base = ago>85 ? "https://archive-api.open-meteo.com/v1/archive?" : "https://api.open-meteo.com/v1/forecast?";
  const [a,b] = await Promise.all([fetch(base+q+vars), fetch("https://marine-api.open-meteo.com/v1/marine?"+q+"&hourly=wave_height,sea_level_height_msl")]);
  if(!a.ok) throw new Error("その日の天気のデータが取れませんでした");
  return {W: await a.json(), S: b.ok ? await b.json() : null};
}

function analyze(data, fish){
  const W=data.W, S=data.S, H=W.hourly;
  const lv = S && S.hourly && S.hourly.sea_level_height_msl ? S.hourly.sea_level_height_msl : null;
  const wv = S && S.hourly && S.hourly.wave_height ? S.hourly.wave_height : null;
  const hasTide = !!(lv && lv.some(v=>v!==null));

  let ref=0.3;
  if(hasTide){
    const d=[]; for(let i=1;i<lv.length;i++){ if(lv[i]!==null&&lv[i-1]!==null) d.push(Math.abs(lv[i]-lv[i-1])); }
    d.sort((x,y)=>x-y); if(d.length) ref=Math.max(0.05, d[Math.floor(d.length*0.9)]);
  }
  const ext=[];
  if(hasTide){
    for(let i=1;i<lv.length-1;i++){
      const a=lv[i-1],b=lv[i],c=lv[i+1]; if(a===null||b===null||c===null) continue;
      const isHi = b>=a && b>c, isLo = b<=a && b<c;
      if(!isHi && !isLo) continue;
      const den=(a-2*b+c); const off = den!==0 ? 0.5*(a-c)/den : 0;
      ext.push({t:H.time[i].slice(0,10), m:toMin(H.time[i])+off*60, h:b-0.25*(a-c)*off, hi:isHi});
    }
  }

  const days=[];
  W.daily.time.forEach((date,di)=>{
    const sr=toMin(W.daily.sunrise[di]), ss=toMin(W.daily.sunset[di]);
    const idx=[]; H.time.forEach((t,i)=>{ if(t.slice(0,10)===date) idx.push(i); });
    if(idx.length<20) return;
    const tn=tideName(date);
    const win={ am:[sr-60, sr+90], day:[sr+90, ss-90], pm:[ss-90, ss+60], night:[ss+60, 23*60] };
    const slots=[];
    SLOTS.forEach(([k,label])=>{
      const wgt=fish.w[k]; if(wgt<=0) return;
      const [s,e]=win[k];
      const hs=idx.filter(i=>{ const m=toMin(H.time[i]); return m>=Math.floor(s/60)*60 && m<=e; });
      if(!hs.length) return;
      const wind=Math.max(...hs.map(i=>H.wind_speed_10m[i]??0));
      const gust=Math.max(...hs.map(i=>H.wind_gusts_10m[i]??0));
      const rain=hs.reduce((a,i)=>a+(H.precipitation[i]??0),0);
      const thunder=hs.some(i=>(H.weather_code[i]??0)>=95);
      const wave= wv ? Math.max(...hs.map(i=>wv[i]??0)) : null;
      const dirs=hs.map(i=>H.wind_direction_10m[i]??0);
      const dir=dirName(dirs[Math.floor(dirs.length/2)]);
      let move=0.5, trend="";
      if(hasTide){
        let sum=0,n=0; hs.forEach(i=>{ if(i>0&&lv[i]!==null&&lv[i-1]!==null){ sum+=Math.abs(lv[i]-lv[i-1]); n++; } });
        move = n? Math.min(1, (sum/n)/ref) : 0.5;
        const first=lv[hs[0]], lastv=lv[hs[hs.length-1]];
        if(first!==null&&lastv!==null) trend = lastv-first>0.08 ? "上げ潮" : (first-lastv>0.08 ? "下げ潮" : "潮止まり前後");
      }
      const pTide = TIDE_PT[tn];
      const pMove = 25*move*wgt;
      const pWind = wind<=3?25 : wind<=5?19 : wind<=fish.wind?10 : wind<=fish.wind+2?3 : 0;
      const pWave = wave===null?10 : wave<=0.5?15 : wave<=fish.wave?10 : wave<=fish.wave+0.5?3 : 0;
      const pRain = rain<0.2?10 : rain<2?6 : rain<5?2 : 0;
      const stop=[];
      if(wind>fish.wind+2) stop.push("風が強い（"+wind.toFixed(0)+"m/s）");
      if(gust>15) stop.push("突風（"+gust.toFixed(0)+"m/s）");
      if(wave!==null && wave>fish.wave+0.5) stop.push("波が高い（"+wave.toFixed(1)+"m）");
      if(thunder) stop.push("雷のおそれ");
      if(rain>=10) stop.push("大雨");
      slots.push({k,label,s:Math.max(0,s),e:Math.min(24*60-1,e),wind,gust,rain,wave,dir,move,trend,
        score:Math.round(pTide+pMove+pWind+pWave+pRain),stop,
        why:"潮"+pTide+"・潮の動き"+Math.round(pMove)+"・風"+pWind+"・波"+pWave+"・雨"+pRain});
    });
    if(!slots.length) return;
    const ok=slots.filter(x=>!x.stop.length);
    const best=(ok.length?ok:slots).slice().sort((a,b)=>b.score-a.score)[0];
    const grade = best.stop.length ? "c" : best.score>=85 ? "s" : best.score>=72 ? "a" : best.score>=55 ? "b" : "c";
    days.push({date,tn,sr,ss,slots,best,grade,hiLo:ext.filter(x=>x.t===date),
      series: hasTide ? idx.map(i=>lv[i]) : null, allStop:!ok.length});
  });
  return {days, hasTide};
}

// 地点の決め方（画面の選択から緯度経度を返す。だめなら null）
function spotLatLon(si, latStr, lonStr){
  let lat,lon;
  if(SPOTS[si][1]===null){ lat=parseFloat(latStr); lon=parseFloat(lonStr);
    if(!isFinite(lat)||!isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180) return null; }
  else { lat=SPOTS[si][1]; lon=SPOTS[si][2]; }
  return [Math.round(lat*100)/100, Math.round(lon*100)/100];
}

const SNS = [
  ["Instagram","https://www.instagram.com/choka_lab/"],
  ["X","https://x.com/choka_lab"],
  ["YouTube","https://www.youtube.com/@choka_lab"],
  ["TikTok","https://www.tiktok.com/@choka_lab"]
];

global.ChokaLab = {CUSTOM,pref,prefTag,fillSpotSelect,getDataDay,SPOTS,FISH,SLOTS,WD,GRADE,store,ymd,md,hm,toMin,tideName,getData,analyze,spotLatLon,SNS};
})(window);
