/* SallyIP Word taskpane: lists /api/playbooks, runs one, inserts Markdown result via Office.js */
(function () {
  var lastResult = '';
  function apiBase() {
    var v = document.getElementById('apiBase').value.trim().replace(/\/+$/, '');
    return v || window.location.origin;
  }
  function setStatus(msg) { document.getElementById('status').textContent = msg; }
  function setResult(text) { lastResult = text || ''; document.getElementById('result').textContent = lastResult.slice(0, 4000); }

  async function api(path, options) {
    var res = await fetch(apiBase() + path, Object.assign({ credentials: 'include', headers: { 'Content-Type': 'application/json' } }, options || {}));
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok) throw new Error((data.error && data.error.message) || ('Request failed: ' + res.status));
    return data;
  }

  async function refresh() {
    setStatus('Loading playbooks…');
    try {
      var data = await api('/api/playbooks');
      var sel = document.getElementById('playbook');
      sel.innerHTML = '';
      (data.playbooks || []).forEach(function (p) {
        var o = document.createElement('option');
        o.value = p.id; o.textContent = p.name + ' (' + p.workflow_type + ')';
        sel.appendChild(o);
      });
      setStatus(data.playbooks && data.playbooks.length ? 'Ready.' : 'No playbooks yet — create one in SallyIP chat first.');
    } catch (e) { setStatus('Error: ' + e.message); }
  }

  async function run() {
    var id = document.getElementById('playbook').value;
    var matterId = document.getElementById('matterId').value.trim();
    if (!id) return setStatus('Select a playbook first.');
    if (!matterId) return setStatus('Enter a Matter ID first.');
    var vars = {};
    var raw = document.getElementById('variables').value.trim();
    if (raw) { try { vars = JSON.parse(raw); } catch (e) { return setStatus('Variables must be valid JSON.'); } }
    setStatus('Running playbook…');
    try {
      var data = await api('/api/playbooks', { method: 'POST', body: JSON.stringify({ action: 'run', playbook_id: id, matter_id: matterId, variables: vars }) });
      setResult('# ' + (data.title || 'Playbook result') + '\n\n' + (data.content || data.summary || JSON.stringify(data)));
      setStatus('Done. Run ' + (data.run_id || '') + ' status ' + (data.status || ''));
    } catch (e) { setStatus('Error: ' + e.message); }
  }

  async function insert() {
    if (!lastResult) return setStatus('Nothing to insert — run a playbook first.');
    if (typeof Office === 'undefined' || !Office.context) return setStatus('Office.js not available. Sideload inside Word to insert.');
    try {
      await Word.run(function (context) {
        var body = context.document.body;
        body.insertParagraph('SallyIP result — review required (not legal advice):', Word.InsertLocation.end);
        body.insertParagraph(lastResult.slice(0, 8000), Word.InsertLocation.end);
        return context.sync();
      });
      setStatus('Inserted into document.');
    } catch (e) { setStatus('Insert failed: ' + e.message); }
  }

  document.getElementById('refresh').addEventListener('click', refresh);
  document.getElementById('run').addEventListener('click', run);
  document.getElementById('insert').addEventListener('click', insert);
  if (typeof Office !== 'undefined' && Office.onReady) { Office.onReady(function () { refresh(); }); }
  else { refresh(); }
})();
