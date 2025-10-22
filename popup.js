const log = (m)=>document.getElementById('log').textContent = m;

async function send(action, payload={}) {
  const [tab] = await chrome.tabs.query({active:true, currentWindow:true});
  const res = await chrome.tabs.sendMessage(tab.id, {action, payload});
  log(JSON.stringify(res, null, 2));
}

document.getElementById('btn-simplify').onclick = () => send('simplify_page');
document.getElementById('btn-tone').onclick     = () => send('soften_tone');

document.getElementById('btn-calm').onclick = async () => {
  // 使用已有的 send 函数，它会正确处理消息发送和响应显示
  send('calm_mode');
};

(async () => {
  // 可选：在 popup 中也测一次可用性
  if ('LanguageModel' in self) {
    const a = await LanguageModel.availability();
    document.getElementById('aiStatus').textContent = a;
  } else {
    document.getElementById('aiStatus').textContent = 'no-LanguageModel';
  }
})();
