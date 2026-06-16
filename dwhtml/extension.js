const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

function activate(context) {
  let currentPanel = undefined;
  let currentFilePath = undefined;

  context.subscriptions.push(
    vscode.commands.registerCommand('dwhtml.editHtml', async (uri) => {
      const fileUri = uri || vscode.window.activeTextEditor?.document.uri;
      if (!fileUri) {
        vscode.window.showErrorMessage('Open an HTML file first');
        return;
      }
      const filePath = fileUri.fsPath;
      if (!filePath.match(/\.html?$/i)) {
        vscode.window.showErrorMessage('File must be .html or .htm');
        return;
      }
      if (currentPanel) { currentPanel.reveal(vscode.ViewColumn.Beside); return; }

      currentPanel = vscode.window.createWebviewPanel(
        'dwhtmlEditor', `DWHTML: ${path.basename(filePath)}`,
        vscode.ViewColumn.Beside,
        { enableScripts: true, retainContextWhenHidden: true }
      );
      currentFilePath = filePath;

      const html = fs.readFileSync(filePath, 'utf-8');
      const editorJs = fs.readFileSync(path.join(context.extensionPath, 'editor.js'), 'utf-8');
      const fileName = path.basename(filePath);

      const lang = vscode.env.language.startsWith('zh') ? 'zh' : 'en';
      currentPanel.webview.html = buildWebview(editorJs, fileName, lang);
      currentPanel.webview.onDidReceiveMessage(async (msg) => {
        if (msg.type === 'ready') {
          currentPanel.webview.postMessage({ type: 'loadHtml', html, fileName, lang });
        } else if (msg.type === 'save') {
          try {
            fs.writeFileSync(filePath, msg.html, 'utf-8');
            currentPanel.webview.postMessage({ type: 'saved' });
          } catch (err) {
            currentPanel.webview.postMessage({ type: 'saveError', error: err.message });
          }
        } else if (msg.type === 'saveAs') {
          const result = await vscode.window.showSaveDialog({
            filters: { 'HTML files': ['html', 'htm'] },
            defaultUri: vscode.Uri.file(filePath)
          });
          if (result) {
            fs.writeFileSync(result.fsPath, msg.html, 'utf-8');
            vscode.window.showInformationMessage(`Saved to ${path.basename(result.fsPath)}`);
          }
        }
      });
      currentPanel.onDidDispose(() => { currentPanel = undefined; currentFilePath = undefined; });
    })
  );

  // Sync: when file saved externally, refresh the iframe
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(doc => {
      if (currentPanel && currentFilePath && doc.uri.fsPath === currentFilePath) {
        const html = fs.readFileSync(currentFilePath, 'utf-8');
        currentPanel.webview.postMessage({ type: 'updateHtml', html });
      }
    })
  );
}

function buildWebview(editorJs, fileName, lang) {
  const STR = lang === 'zh' ? {
    saved: '已保存！', save: '保存', saveAs: '另存为...',
  } : {
    saved: 'Saved!', save: 'Save', saveAs: 'Save As...',
  };
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { display:flex; flex-direction:column; height:100vh; background:#1e1e1e; }
  #toolbar {
    display:flex; align-items:center; gap:8px; padding:6px 14px;
    background:#2d2d2d; color:#ccc; border-bottom:1px solid #444;
    flex-shrink:0; z-index:10;
  }
  .file-name { font-size:12px; color:#999; flex:1; }
  .btn {
    padding:4px 16px; border:none; border-radius:4px;
    cursor:pointer; font-size:12px; font-family:inherit;
  }
  .btn-save { background:#4CAF50; color:#fff; }
  .btn-save:hover { background:#45a049; }
  .btn-save-as { background:#555; color:#ccc; }
  .btn-save-as:hover { background:#666; }
  .btn-lang {
    padding:4px 8px; border:1px solid #555; border-radius:4px;
    background:transparent; color:#999; cursor:pointer; font-size:11px; font-family:inherit;
  }
  .btn-lang:hover { border-color:#89b4fa; color:#89b4fa; }
  #save-status { font-size:11px; color:#4CAF50; opacity:0; transition:opacity .3s; }
  #save-status.show { opacity:1; }
  iframe { flex:1; width:100%; border:none; background:#fff; }
</style>
</head>
<body>
<div id="toolbar">
  <span class="file-name" id="fileName">${escapeHtml(fileName)}</span>
  <button class="btn-lang" id="langToggle" onclick="toggleLang()">${lang === 'zh' ? 'EN' : '中'}</button>
  <span id="save-status">${STR.saved}</span>
  <button class="btn btn-save-as" onclick="saveAs()">${STR.saveAs}</button>
  <button class="btn btn-save" onclick="save()">${STR.save}</button>
</div>
<iframe id="editorFrame"></iframe>
<script>
const vscode = acquireVsCodeApi();
const frame = document.getElementById('editorFrame');
const SCRIPT_EDITOR = ${JSON.stringify(editorJs)};
let docHtml = '';
let currentLang = '${lang}';
const STR_EN = { saved:'Saved!', save:'Save', saveAs:'Save As...' };
const STR_ZH = { saved:'已保存！', save:'保存', saveAs:'另存为...' };

function getStr() { return currentLang === 'zh' ? STR_ZH : STR_EN; }

vscode.postMessage({ type: 'ready' });

function injectEditor(doc) {
  const s = doc.createElement('script');
  s.id = 'dw-editor-script';
  s.textContent = SCRIPT_EDITOR;
  doc.documentElement.appendChild(s);
  doc.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save(); }
  });
}

function loadHtml(html) {
  docHtml = html;
  frame.srcdoc = html;
  frame.onload = () => {
    const doc = frame.contentDocument || frame.contentWindow.document;
    injectEditor(doc);
    const w = frame.contentWindow;
    if (w && w.__dwSetLang) w.__dwSetLang(currentLang);
  };
}

function toggleLang() {
  currentLang = currentLang === 'zh' ? 'en' : 'zh';
  document.getElementById('langToggle').textContent = currentLang === 'zh' ? 'EN' : '中';
  const s = getStr();
  document.getElementById('save-status').textContent = s.saved;
  document.querySelector('.btn-save').textContent = s.save;
  document.querySelector('.btn-save-as').textContent = s.saveAs;
  const iframeWin = frame.contentWindow;
  if (iframeWin && iframeWin.__dwSetLang) iframeWin.__dwSetLang(currentLang);
}

window.addEventListener('message', e => {
  const msg = e.data;
  if (msg.type === 'loadHtml') {
    document.getElementById('fileName').textContent = msg.fileName;
    if (msg.lang) currentLang = msg.lang;
    loadHtml(msg.html);
  } else if (msg.type === 'updateHtml') {
    loadHtml(msg.html);
  } else if (msg.type === 'saved') {
    document.getElementById('save-status').classList.add('show');
    setTimeout(() => document.getElementById('save-status').classList.remove('show'), 2000);
  } else if (msg.type === 'saveError') {
    alert('Save failed: ' + msg.error);
  }
});

function getDocHtml() {
  const doc = frame.contentDocument || frame.contentWindow.document;
  const clone = doc.documentElement.cloneNode(true);
  clone.querySelectorAll('#dw-root, #dw-editor-style, #dw-editor-script').forEach(el => el.remove());
  return '<!DOCTYPE ' + (doc.doctype ? doc.doctype.name : 'html') + '>\\n' + clone.outerHTML;
}

function save() { vscode.postMessage({ type: 'save', html: getDocHtml() }) }
function saveAs() { vscode.postMessage({ type: 'saveAs', html: getDocHtml() }) }

document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save(); }
});
</script>
</body>
</html>`;
}

function escapeHtml(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function deactivate() {}

module.exports = { activate, deactivate };
