"use strict";
const $ = id => document.getElementById(id);
const data = window.APP_DATA;
const escapeText = value => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const message = text => { $("message").textContent = text; };
const tabs = document.querySelectorAll(".tabs button");
tabs.forEach(button => button.addEventListener("click", () => {
  document.querySelectorAll(".page").forEach(page => { page.hidden = page.id !== button.dataset.page; });
  tabs.forEach(tab => tab.classList.toggle("active", tab === button));
  window.scrollTo(0, 0);
}));
tabs[0].classList.add("active");

let selected = 0, step = 0, remaining = 0, running = false, started = false, deadline = 0, pictureKey = "";
const background = new Audio(); background.loop = true; background.volume = .35;
let backgroundMuted = false;
function backgroundFile() {
  const name = data.programs[selected].name;
  if (name.startsWith("睡前 · ") || name === "组合 · 睡前安宁") return "rain.wav";
  if (name === "情绪 · 五感落地" || name === "组合 · 日间安心") return "stream.wav";
  return "";
}
function syncBackground() {
  const filename = backgroundFile();
  if (!running || !$("background").checked || !filename) { background.pause(); return; }
  stopMusic();
  background.src = "music/" + filename;
  background.play().catch(error => { $("background").checked = false; message("背景声无法播放，请检查手机音量和浏览器设置：" + error.message); });
}
$("background").addEventListener("change", () => { backgroundMuted = !$("background").checked; syncBackground(); });
data.programs.forEach((program, i) => $("program").add(new Option(program.name, i)));
function chooseProgram(index) {
  if (started && !confirm("切换练习会结束当前练习，确定切换吗？")) { $("program").value = selected; return; }
  running = false; started = false; background.pause(); selected = index; step = 0;
  const p = data.programs[selected]; remaining = p.steps[0][2];
  $("background").disabled = !backgroundFile(); $("background").checked = !!backgroundFile() && !backgroundMuted;
  $("tag").textContent = p.tag; $("program-title").textContent = p.name;
  $("intro").textContent = p.intro; $("when").textContent = p.when; $("notice").textContent = p.notice;
  $("steps").innerHTML = p.steps.map(s => "<li><strong>" + escapeText(s[0]) + "</strong>：" + escapeText(s[1]) + "（" + s[2] + " 秒）</li>").join("");
  renderExercise();
}
$("program").addEventListener("change", event => chooseProgram(Number(event.target.value)));
function illustration(mode, caption) {
  const bed = ["bed","slide","pelvic"].includes(mode), standing = ["balance","walk"].includes(mode);
  const moving = ["slide","pelvic","heels","heel_left","heel_right","knee","chin","shoulderback","openhand","wrist","inhale","exhale","breath"].includes(mode);
  const animate = moving && $("animate").checked && !data.programs[selected].special;
  const two = (a,b) => '<g class="frame-a">'+a+'</g><g class="frame-b">'+b+'</g>';
  let shape;
  if (bed) {
    const upper = '<path d="M25 120h230 M30 120v18 M245 120v18" stroke="#90ae95" stroke-width="8"/><circle cx="65" cy="82" r="15" fill="#f3d9bd"/><path d="M80 91l70 12" stroke="#537d65" stroke-width="7" fill="none" stroke-linecap="round"/>';
    const bent = '<path d="M150 103l35-30 30 43h14" stroke="#537d65" stroke-width="7" fill="none" stroke-linecap="round"/>';
    const straight = '<path d="M150 103l75 12h12" stroke="#537d65" stroke-width="7" fill="none" stroke-linecap="round"/>';
    shape = upper + (mode === "slide" ? two(straight,bent) : bent);
    if (mode === "pelvic") shape += two('<text x="155" y="58" fill="#537d65" font-size="13">自然放松</text>','<text x="155" y="58" fill="#537d65" font-size="13">腰轻靠床</text><path d="M143 76v18" stroke="#c08046" stroke-width="4"/>');
  }
  else if (standing) shape = '<path d="M205 65h40v80" stroke="#90ae95" stroke-width="8" fill="none"/><circle cx="115" cy="30" r="15" fill="#f3d9bd"/><path d="M115 45v52m0-35 45 12h45m-90 23-25 43m25-43 25 43" stroke="#537d65" stroke-width="7" fill="none" stroke-linecap="round"/>';
  else {
    const head = x => '<circle cx="'+x+'" cy="35" r="15" fill="#f3d9bd"/>';
    const normalLeg = '<path d="M110 98l30 18v26h20" stroke="#537d65" stroke-width="7" fill="none" stroke-linecap="round"/>';
    const liftLeg = '<path d="M110 98l30 18v18l20 8" stroke="#537d65" stroke-width="7" fill="none" stroke-linecap="round"/>';
    const straightLeg = '<path d="M110 98l30 18 42 2h12" stroke="#537d65" stroke-width="7" fill="none" stroke-linecap="round"/>';
    shape = '<path d="M65 55v65h70m-60 0v25m55-25v25" stroke="#90ae95" stroke-width="7" fill="none"/>' + (mode === "chin" ? two(head(110),head(104)) : head(110)) + '<path d="M110 50v48m0-36-25 28m25-28 25 28m-25 8 10 18v26h-15" stroke="#537d65" stroke-width="7" fill="none" stroke-linecap="round"/>';
    shape += mode === "knee" ? two(normalLeg,straightLeg) : ["heels","heel_left","heel_right"].includes(mode) ? two(normalLeg,liftLeg) : normalLeg;
    if (mode === "gaze") shape += '<circle cx="220" cy="35" r="12" fill="white" stroke="#537d65" stroke-width="3"/><circle cx="220" cy="35" r="3" fill="#537d65"/><path d="M130 35h75" stroke="#c08046" stroke-dasharray="4 4"/>';
    if (["openhand","wrist","shoulderback","inhale","exhale","breath"].includes(mode)) {
      const labels = {openhand:["轻握","松开"],wrist:["自然放松","轻轻转动"],shoulderback:["自然放松","肩轻向后"],inhale:["轻轻吸气","自然呼气"],exhale:["自然吸气","轻轻呼气"],breath:["自然吸气","轻轻呼气"]}[mode];
      shape += two('<text x="165" y="55" font-size="14" fill="#537d65">'+labels[0]+'</text>','<text x="165" y="55" font-size="14" fill="#537d65">'+labels[1]+'</text>');
    }
  }
  return '<svg class="' + (animate ? 'animated' : '') + '" viewBox="0 0 280 160" aria-hidden="true"><rect width="280" height="160" rx="14" fill="#e7f0e5"/>' + shape + '</svg><strong>' + escapeText(caption) + '</strong>';
}
$("animate").addEventListener("change", renderExercise);
function renderExercise() {
  const p = data.programs[selected], s = p.steps[step], picture = p.pictures[step];
  $("stage").textContent = `步骤 ${step + 1} / ${p.steps.length} · ${s[0]}`;
  const n = Math.ceil(Math.max(0, remaining)); $("timer").textContent = String(Math.floor(n / 60)).padStart(2, "0") + ":" + String(n % 60).padStart(2, "0");
  $("instruction").textContent = s[1];
  const key = selected + ":" + step + ":" + $("animate").checked;
  if (key !== pictureKey) { $("illustration").innerHTML = illustration(picture[0], picture[1]); pictureKey = key; }
  $("start").textContent = running ? "暂停" : started ? "继续练习" : "开始练习";
  $("previous").disabled = !started || step === 0; $("next").disabled = !started; $("stop").disabled = !started;
}
function advance(skipped) {
  if (step + 1 >= data.programs[selected].steps.length) {
    running = false; started = false; background.pause(); step = 0; remaining = data.programs[selected].steps[0][2];
    message("本次练习已结束。请慢慢起身，照顾好自己。");
  } else {
    step++; remaining = data.programs[selected].steps[step][2];
    if (running && !skipped && $("pause-each").checked) { running = false; background.pause(); message("上一步已结束，看清下一步后点击继续。"); }
    if (running) deadline = performance.now() + remaining * 1000;
  }
  renderExercise();
}
$("start").addEventListener("click", () => {
  if (running) { remaining = Math.max(0, (deadline - performance.now()) / 1000); running = false; background.pause(); }
  else {
    if (!started && data.programs[selected].special && !confirm("是否已由专业人员确认此流程符合您的个人处方，并有照看者在旁？如不确定，请取消并先咨询专业人员。")) return;
    started = true; running = true; deadline = performance.now() + remaining * 1000; syncBackground();
  }
  renderExercise();
});
$("previous").addEventListener("click", () => { if (!started || !step) return; step--; remaining = data.programs[selected].steps[step][2]; if (running) deadline = performance.now() + remaining * 1000; renderExercise(); });
$("next").addEventListener("click", () => { if (started) advance(true); });
$("stop").addEventListener("click", () => { running = false; started = false; background.pause(); step = 0; remaining = data.programs[selected].steps[0][2]; renderExercise(); message("练习已结束，可以休息一下。"); });
setInterval(() => { if (!running) return; remaining = Math.max(0, (deadline - performance.now()) / 1000); if (!remaining) advance(false); else renderExercise(); }, 250);
document.addEventListener("visibilitychange", () => {
  if (document.hidden && running) { remaining = Math.max(0, (deadline - performance.now()) / 1000); running = false; background.pause(); renderExercise(); message("离开页面后练习已暂停，回来后可继续。"); }
});

const audio = new Audio();
let musicIndex = null, musicGroup = "", musicMode = "", musicDeadline = null, musicPaused = false, musicLoading = false, musicVersion = 0;
const midi = new MidiPlayer(() => musicEnded());
Object.keys(data.groups).forEach(name => $("category").add(new Option(name, name)));
function selectCategory() {
  stopMusic(); musicGroup = $("category").value; $("track").replaceChildren();
  data.groups[musicGroup].forEach((track, i) => $("track").add(new Option(track[0], i)));
  $("duration").value = musicGroup === "自然声音" ? "one30" : "group"; showSource();
}
function showSource() {
  const url = data.groups[$("category").value][Number($("track").value)][2];
  $("source").textContent = url ? "来源：" + url : "原有睡前精选来源见使用说明。";
}
$("category").addEventListener("change", selectCategory); $("track").addEventListener("change", showSource);
function stopMusic() {
  musicVersion++; audio.pause(); audio.removeAttribute("src"); audio.load(); midi.stop();
  musicIndex = null; musicDeadline = null; musicPaused = false; musicLoading = false;
  $("pause-music").textContent = "暂停"; $("music-status").textContent = "音乐已停止";
}
async function playTrack(index, token) {
  const item = data.groups[musicGroup][index]; musicIndex = index; musicPaused = false; musicLoading = true;
  $("track").value = index; showSource(); $("music-status").textContent = "正在加载：" + item[0];
  try {
    if (item[1].endsWith(".mid")) {
      const response = await fetch("music/" + encodeURIComponent(item[1]));
      if (!response.ok) throw new Error("无法读取音频文件");
      const bytes = await response.arrayBuffer();
      if (token !== musicVersion) return;
      await midi.load(bytes);
      if (token !== musicVersion) return;
      await midi.play();
      if (token !== musicVersion) { midi.stop(); return; }
    } else {
      audio.src = "music/" + encodeURIComponent(item[1]); await audio.play();
      if (token !== musicVersion) { audio.pause(); return; }
    }
    musicLoading = false; $("music-status").textContent = "正在播放：" + item[0];
  } catch (error) {
    if (token === musicVersion) { stopMusic(); message("无法播放音乐：" + error.message); }
  }
}
function musicEnded() {
  if (musicIndex === null || musicPaused) return;
  if (musicDeadline !== null && Date.now() >= musicDeadline) { stopMusic(); $("music-status").textContent = "已到设定时间，音乐已停止"; return; }
  let next = musicMode.startsWith("one") ? musicIndex : musicIndex + 1;
  if (next >= data.groups[musicGroup].length) {
    if (musicDeadline === null) { stopMusic(); $("music-status").textContent = "播放完成"; return; }
    next = 0;
  }
  playTrack(next, musicVersion);
}
audio.addEventListener("ended", musicEnded);
audio.addEventListener("error", () => { if (musicIndex !== null && audio.error) { stopMusic(); message("音频文件无法播放，请检查网络或浏览器格式支持。"); } });
$("play-music").addEventListener("click", () => {
  stopMusic(); background.pause(); $("background").checked = false; backgroundMuted = true;
  musicGroup = $("category").value; musicMode = $("duration").value;
  const minutes = Number(musicMode.replace(/[^0-9]/g, ""));
  musicDeadline = minutes ? Date.now() + minutes * 60000 : null;
  if (!midi.context) midi.context = new AudioContext();
  midi.context.resume().catch(error => message("浏览器音频未能启动：" + error.message));
  playTrack(Number($("track").value), musicVersion);
});
$("stop-music").addEventListener("click", stopMusic);
$("pause-music").addEventListener("click", async () => {
  if (musicIndex === null) return;
  if (musicLoading) { message("音乐正在加载，请稍候再暂停。"); return; }
  try {
    const isMidi = data.groups[musicGroup][musicIndex][1].endsWith(".mid");
    if (musicPaused) { if (isMidi) await midi.play(); else await audio.play(); musicPaused = false; }
    else { if (isMidi) midi.pause(); else audio.pause(); musicPaused = true; }
    $("pause-music").textContent = musicPaused ? "继续" : "暂停";
    $("music-status").textContent = (musicPaused ? "已暂停：" : "正在播放：") + data.groups[musicGroup][musicIndex][0];
  } catch (error) { message("无法暂停或继续播放：" + error.message); }
});
setInterval(() => { if (musicIndex !== null && musicDeadline !== null && Date.now() >= musicDeadline) { stopMusic(); $("music-status").textContent = "已到设定时间，音乐已停止"; } }, 1000);

const forms = {
  "睡眠": [["起床时间","time"],["睡眠质量","很差|较差|一般|较好|很好"],["白天困倦","没有|轻度|中度|明显"]],
  "前庭和平衡": [["练习","坐姿注视|扶持站稳"],["头晕程度（0～10）","score"],["恶心程度（0～10）","score"],["恢复情况","已恢复|尚未恢复"],["恢复时间（分钟；尚未恢复时留空）","recovery"],["目标是否看清","能看清|不能看清|未观察"],["站立情况","稳定或扶持下完成|明显摇晃或接近跌倒|不适而停止|不适用"]],
  "日常活动": [["类型","愉快|有成就感|与人连接"],["完成了什么小事","text"],["实际分钟数（1～180）","minutes"],["活动前心情（0～10）","score"],["活动后心情（0～10）","score"]],
  "情绪小记": [["发生了什么","text"],["我有什么感受","text"],["接下来的一件小事","text"]]
};
function renderFields() {
  $("record-fields").innerHTML = forms[$("record-kind").value].map(([label, type], i) => {
    let input;
    if (type.includes("|")) input = '<select name="f' + i + '" required><option value="">请选择</option>' + type.split("|").map(s => "<option>" + escapeText(s) + "</option>").join("") + "</select>";
    else if (type === "text") input = '<input name="f' + i + '" maxlength="150" required>';
    else if (type === "time") input = '<input name="f' + i + '" type="time" required>';
    else input = '<input name="f' + i + '" type="number" step="1" min="' + (type === "minutes" ? 1 : 0) + '" max="' + (type === "score" ? 10 : type === "minutes" ? 180 : 1440) + '"' + (type === "recovery" ? "" : " required") + '>';
    return '<label>' + escapeText(label) + input + '</label>';
  }).join("");
}
const recordKey = "jingxin-mobile-records-v1";
function readRecords() {
  const raw = localStorage.getItem(recordKey);
  if (!raw) return [];
  const records = JSON.parse(raw);
  if (!Array.isArray(records)) throw new Error("记录格式无效");
  return records;
}
function renderRecords() {
  try {
    const records = readRecords();
    $("records").innerHTML = records.length ? records.slice(-100).reverse().map(record => '<div class="record"><strong>' + escapeText(record.time) + " · " + escapeText(record.kind) + '</strong>' + Object.entries(record.fields).map(([k,v]) => "<div>" + escapeText(k) + "：" + escapeText(v) + "</div>").join("") + "</div>").join("") : "<p>暂无记录。</p>";
  } catch (error) { $("records").textContent = "无法读取本机记录：" + error.message; }
}
$("record-kind").addEventListener("change", renderFields);
$("record-form").addEventListener("submit", event => {
  event.preventDefault();
  const kind = $("record-kind").value, entries = forms[kind], values = new FormData(event.target);
  const fields = Object.fromEntries(entries.map(([name], i) => [name, String(values.get("f" + i)).trim()]));
  if (Object.entries(fields).some(([name, value]) => !value && !name.startsWith("恢复时间"))) { message("请填写所有必填内容。"); return; }
  if (kind === "前庭和平衡" && ((fields["恢复情况"] === "已恢复") !== (fields["恢复时间（分钟；尚未恢复时留空）"] !== ""))) { message("已恢复时请填写恢复分钟数；尚未恢复时请留空。"); return; }
  try {
    const records = readRecords(); records.push({time: new Date().toLocaleString("zh-CN"), kind, fields});
    localStorage.setItem(recordKey, JSON.stringify(records)); event.target.reset(); renderRecords(); message("记录已保存在手机浏览器。");
  } catch (error) { message("保存失败，请检查浏览器存储空间或隐私设置：" + error.message); }
});
$("delete-records").addEventListener("click", () => {
  if (!confirm("确定清除本机全部记录吗？此操作不可撤销。")) return;
  try { localStorage.removeItem(recordKey); renderRecords(); message("本机记录已清除；系统备份可能仍保留副本。"); }
  catch (error) { message("清除失败：" + error.message); }
});
let shuffled = [], history = [], historyPos = -1, auto = true;
function nextQuote() {
  if (!shuffled.length) {
    shuffled = Array.from({length: data.reflections.length}, (_, i) => i);
    for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
  }
  history = history.slice(0, historyPos + 1); history.push(shuffled.pop()); historyPos++; renderQuote();
}
function renderQuote() {
  const quote = data.reflections[history[historyPos]];
  $("quote").textContent = quote[0]; $("quote-source").textContent = quote[1]; $("quote-note").textContent = quote[2];
  $("quote-prev").disabled = historyPos <= 0;
}
$("quote-next").addEventListener("click", nextQuote);
$("quote-prev").addEventListener("click", () => { if (historyPos > 0) { historyPos--; renderQuote(); } });
$("quote-auto").addEventListener("click", () => { auto = !auto; $("quote-auto").textContent = auto ? "暂停轮换" : "继续轮换"; });
setInterval(() => { if (auto && !$("reflection").hidden) nextQuote(); }, 30000);
chooseProgram(0); selectCategory(); renderFields(); renderRecords(); nextQuote();
