const log = (m)=>document.getElementById('log').textContent = m;

async function send(action, payload={}) {
  const [tab] = await chrome.tabs.query({active:true, currentWindow:true});
  const res = await chrome.tabs.sendMessage(tab.id, {action, payload});
  log(JSON.stringify(res, null, 2));
}

document.getElementById('btn-simplify').onclick = () => send('simplify_page');
document.getElementById('btn-tone').onclick     = () => send('soften_tone');
document.getElementById('btn-calm').onclick     = () => send('calm_mode');