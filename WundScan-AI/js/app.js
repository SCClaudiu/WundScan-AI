/* WundScan-AI v5.0.0 — App Logic */

const STORAGE = { PATIENTS: 'wundscan_patients', DOCS: 'wundscan_docs', SETTINGS: 'wundscan_settings' };
let patients = [], docs = [], currentPhoto = null;

document.addEventListener('DOMContentLoaded', () => {
    checkProtocol();
    loadData();
    updateDashboard();
    updatePatientSelect();
    renderPatients();
    setDateDisplay();
    loadSettings();
    updateServerInfo();
});

// === Protocol Check ===
function checkProtocol() {
    if (window.location.protocol === 'file:') {
        const s = document.getElementById('server-status');
        if (s) s.innerHTML = '<span class="status-dot" style="background:#dc2626;box-shadow:0 0 6px #dc2626"></span><span class="status-text">Kein Server</span>';
    }
}

// === Navigation ===
function showSection(id) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    const t = document.getElementById('section-' + id);
    if (t) t.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const nav = document.querySelector('.nav-item[data-section="' + id + '"]');
    if (nav) nav.classList.add('active');
    const titles = { 'dashboard':'Dashboard', 'neue-wunde':'Neue Wunddokumentation', 'verlauf':'Wundverlauf', 'patienten':'Patienten', 'einstellungen':'Einstellungen' };
    document.getElementById('page-title').textContent = titles[id] || '';
    document.getElementById('sidebar').classList.remove('open');
    if (id === 'verlauf') renderVerlauf();
}

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }

function setDateDisplay() {
    document.getElementById('date-display').textContent = new Date().toLocaleDateString('de-AT', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
}

// === Data ===
function loadData() {
    try { patients = JSON.parse(localStorage.getItem(STORAGE.PATIENTS)) || []; } catch(e) { patients = []; }
    try { docs = JSON.parse(localStorage.getItem(STORAGE.DOCS)) || []; } catch(e) { docs = []; }
}
function saveData() {
    localStorage.setItem(STORAGE.PATIENTS, JSON.stringify(patients));
    localStorage.setItem(STORAGE.DOCS, JSON.stringify(docs));
}

// === Dashboard ===
function updateDashboard() {
    document.getElementById('stat-patients').textContent = patients.length;
    document.getElementById('stat-wounds').textContent = docs.filter(d => d.status !== 'abgeheilt').length;
    document.getElementById('stat-healed').textContent = docs.filter(d => d.status === 'abgeheilt').length;
    document.getElementById('stat-docs').textContent = docs.length;
    const rc = document.getElementById('recent-docs');
    if (docs.length === 0) {
        rc.innerHTML = '<div class="empty-state"><p>Noch keine Dokumentationen.</p><button class="btn btn-primary" onclick="showSection(\'neue-wunde\')">Erste erstellen</button></div>';
    } else {
        rc.innerHTML = docs.slice(-5).reverse().map(d => {
            const p = patients.find(x => x.id === d.patientId);
            const n = p ? p.nachname + ', ' + p.vorname : 'Unbekannt';
            return '<div class="doc-row"><div><div class="patient-name">' + esc(n) + '</div><div class="doc-type">' + esc(d.wundart||'') + '</div></div><span class="doc-date">' + new Date(d.datum).toLocaleDateString('de-AT') + '</span></div>';
        }).join('');
    }
}

// === Patients ===
function showPatientModal() { document.getElementById('patient-modal').style.display = 'flex'; document.getElementById('pat-nachname').focus(); }
function hidePatientModal() { document.getElementById('patient-modal').style.display = 'none'; ['pat-nachname','pat-vorname','pat-gebdatum','pat-station','pat-zimmer'].forEach(id => document.getElementById(id).value = ''); }

function savePatient() {
    const nn = document.getElementById('pat-nachname').value.trim();
    const vn = document.getElementById('pat-vorname').value.trim();
    if (!nn || !vn) { showToast('Name und Vorname eingeben!', 'error'); return; }
    patients.push({
        id: 'P' + Date.now(), nachname: nn, vorname: vn,
        gebdatum: document.getElementById('pat-gebdatum').value,
        station: document.getElementById('pat-station').value.trim(),
        zimmer: document.getElementById('pat-zimmer').value.trim(),
        erstellt: new Date().toISOString()
    });
    saveData(); hidePatientModal(); renderPatients(); updatePatientSelect(); updateDashboard();
    showToast('Patient ' + nn + ', ' + vn + ' angelegt.', 'success');
}

function renderPatients() {
    const c = document.getElementById('patienten-list');
    if (!patients.length) { c.innerHTML = '<div class="empty-state"><p>Noch keine Patienten.</p><button class="btn btn-primary" onclick="showPatientModal()">Ersten anlegen</button></div>'; return; }
    c.innerHTML = patients.map(p => '<div class="patient-row"><div><div class="patient-name">' + esc(p.nachname) + ', ' + esc(p.vorname) + '</div><div class="patient-meta">' + (p.station ? esc(p.station) : '') + (p.zimmer ? ' · Zi. ' + esc(p.zimmer) : '') + (p.gebdatum ? ' · geb. ' + new Date(p.gebdatum).toLocaleDateString('de-AT') : '') + '</div></div><button class="btn btn-secondary btn-sm" onclick="deletePatient(\'' + p.id + '\')">Entfernen</button></div>').join('');
}

function deletePatient(id) { if (!confirm('Patient entfernen?')) return; patients = patients.filter(p => p.id !== id); saveData(); renderPatients(); updatePatientSelect(); updateDashboard(); }

function updatePatientSelect() {
    const s = document.getElementById('patient-select');
    if (!s) return;
    s.innerHTML = '<option value="">— Patient auswählen —</option>' + patients.map(p => '<option value="' + p.id + '">' + esc(p.nachname) + ', ' + esc(p.vorname) + '</option>').join('');
}

// === Photo ===
function handlePhotoUpload(input) {
    if (!input.files || !input.files[0]) return;
    const r = new FileReader();
    r.onload = e => { currentPhoto = e.target.result; document.getElementById('foto-img').src = currentPhoto; document.getElementById('foto-preview').style.display = 'block'; document.getElementById('upload-zone').style.display = 'none'; };
    r.readAsDataURL(input.files[0]);
}
function removePhoto() { currentPhoto = null; document.getElementById('foto-preview').style.display = 'none'; document.getElementById('upload-zone').style.display = ''; document.getElementById('foto-input').value = ''; }

// === Wound Doc ===
function getChecked(labelText) {
    const labels = document.querySelectorAll('#section-neue-wunde .form-group > label');
    for (const l of labels) {
        if (l.textContent.trim() === labelText) {
            const g = l.closest('.form-group');
            if (g) return [...g.querySelectorAll('input[type=checkbox]:checked')].map(c => c.value);
        }
    }
    return [];
}

function saveWoundDoc() {
    const pid = document.getElementById('patient-select').value;
    const wa = document.getElementById('wund-art').value;
    if (!pid) { showToast('Bitte Patient auswählen.', 'error'); return; }
    if (!wa) { showToast('Bitte Wundart auswählen.', 'error'); return; }
    docs.push({
        id: 'D' + Date.now(), patientId: pid, datum: new Date().toISOString(),
        wundart: document.getElementById('wund-art').selectedOptions[0]?.text || wa,
        lokalisation: document.getElementById('lokalisation').value,
        groesse: { l: parseFloat(document.getElementById('wund-laenge').value)||0, b: parseFloat(document.getElementById('wund-breite').value)||0, t: parseFloat(document.getElementById('wund-tiefe').value)||0 },
        wundgrund: getChecked('Wundgrund'), exsudat: { menge: document.getElementById('exsudat-menge').value, art: document.getElementById('exsudat-art').value },
        wundrand: getChecked('Wundrand'), infektionszeichen: getChecked('Infektionszeichen'),
        schmerz: parseInt(document.getElementById('schmerz-vas').value),
        bemerkungen: document.getElementById('bemerkungen').value.trim(), foto: currentPhoto, status: 'aktiv'
    });
    saveData(); updateDashboard(); resetWoundForm();
    showToast('Dokumentation gespeichert!', 'success');
    showSection('dashboard');
}

function resetWoundForm() {
    ['patient-select','wund-art','lokalisation','exsudat-menge','exsudat-art'].forEach(id => document.getElementById(id).value = '');
    ['wund-laenge','wund-breite','wund-tiefe'].forEach(id => document.getElementById(id).value = '');
    document.querySelectorAll('#section-neue-wunde input[type=checkbox]').forEach(c => c.checked = false);
    document.getElementById('schmerz-vas').value = 0; document.getElementById('schmerz-display').textContent = '0';
    document.getElementById('bemerkungen').value = '';
    document.getElementById('ai-result-container').style.display = 'none';
    removePhoto();
}

// === Verlauf ===
function renderVerlauf() {
    const c = document.getElementById('verlauf-content');
    if (!docs.length) { c.innerHTML = '<div class="empty-state"><p>Noch kein Wundverlauf.</p></div>'; return; }
    c.innerHTML = [...docs].reverse().map(d => {
        const p = patients.find(x => x.id === d.patientId);
        const n = p ? p.nachname + ', ' + p.vorname : 'Unbekannt';
        const g = d.groesse;
        const sz = (g && (g.l || g.b)) ? g.l + '×' + g.b + (g.t ? '×' + g.t : '') + ' cm' : '';
        return '<div class="doc-row"><div><div class="patient-name">' + esc(n) + ' — ' + esc(d.wundart) + '</div><div class="patient-meta">' + esc(d.lokalisation||'') + (sz ? ' · ' + sz : '') + ' · VAS ' + d.schmerz + '/10</div></div><div style="text-align:right"><span class="doc-date">' + new Date(d.datum).toLocaleDateString('de-AT') + '</span><br><button class="btn btn-secondary btn-sm" style="margin-top:4px" onclick="deleteDoc(\'' + d.id + '\')">Löschen</button></div></div>';
    }).join('');
}
function deleteDoc(id) { if (!confirm('Dokumentation löschen?')) return; docs = docs.filter(d => d.id !== id); saveData(); updateDashboard(); renderVerlauf(); }

// === AI Analysis ===
function collectWoundData() {
    return {
        wundart: document.getElementById('wund-art').selectedOptions[0]?.text || '–',
        lokalisation: document.getElementById('lokalisation').value || '–',
        laenge: document.getElementById('wund-laenge')?.value || '0',
        breite: document.getElementById('wund-breite')?.value || '0',
        tiefe: document.getElementById('wund-tiefe')?.value || '0',
        wundgrund: getChecked('Wundgrund'),
        exsudat_menge: document.getElementById('exsudat-menge')?.value || '–',
        exsudat_art: document.getElementById('exsudat-art')?.value || '–',
        wundrand: getChecked('Wundrand'),
        infektionszeichen: getChecked('Infektionszeichen'),
        schmerz: document.getElementById('schmerz-vas')?.value || '0',
        bemerkungen: document.getElementById('bemerkungen')?.value || ''
    };
}

function buildPrompt(data) {
    return `Du bist ein erfahrener Wundexperte (ICW-zertifiziert) und unterstützt bei der pflegerischen Wunddokumentation und -beurteilung.

Analysiere folgende Wunddaten und gib eine strukturierte pflegerische Einschätzung ab:

Wundart: ${data.wundart}
Lokalisation: ${data.lokalisation}
Größe: ${data.laenge} × ${data.breite} × ${data.tiefe} cm
Wundgrund: ${data.wundgrund.length ? data.wundgrund.join(', ') : 'nicht angegeben'}
Exsudat: Menge: ${data.exsudat_menge}, Art: ${data.exsudat_art}
Wundrand: ${data.wundrand.length ? data.wundrand.join(', ') : 'nicht angegeben'}
Infektionszeichen: ${data.infektionszeichen.length ? data.infektionszeichen.join(', ') : 'keine'}
Schmerz (VAS): ${data.schmerz}/10
${data.bemerkungen ? 'Bemerkungen: ' + data.bemerkungen : ''}

Bitte antworte auf Deutsch mit:
1. Wundbeurteilung (Heilungsphase, Wundzustand)
2. Infektionsrisiko-Einschätzung
3. Empfohlene Wundversorgung (Wundauflage, Reinigung, Verbandwechsel-Intervall)
4. Pflegehinweise und Empfehlungen
5. Wann ärztliche Konsultation empfohlen ist

Hinweis: Dies ist eine pflegerische Einschätzung und ersetzt keine ärztliche Diagnose.`;
}

async function runAIAnalysis() {
    const btn = document.getElementById('btn-ai-analyse');
    const container = document.getElementById('ai-result-container');
    const result = document.getElementById('ai-result');
    btn.disabled = true; btn.textContent = '⏳ Analyse läuft...';
    container.style.display = 'block'; result.textContent = 'Analyse wird durchgeführt...';

    const settings = getAISettings();
    const backend = settings.aiBackend || 'anthropic';
    const data = collectWoundData();

    try {
        let analysisText = '';

        if (backend === 'anthropic') {
            const key = settings.anthropicKey?.trim();
            if (!key) {
                result.textContent = '⚠️ Kein API Key hinterlegt.\n\nBitte geh in Einstellungen → AI-Konfiguration und trage deinen Anthropic API Key ein.';
                btn.disabled = false; resetAIButton(btn); return;
            }
            const model = settings.anthropicModel || 'claude-sonnet-4-20250514';
            result.textContent = '🔄 Sende Anfrage an Claude (' + model + ')...';

            const res = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': key,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true'
                },
                body: JSON.stringify({
                    model: model,
                    max_tokens: 2048,
                    messages: [{ role: 'user', content: buildPrompt(data) }]
                })
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error('API Fehler ' + res.status + ': ' + (err.error?.message || 'Unbekannt'));
            }
            const json = await res.json();
            analysisText = json.content?.map(c => c.text || '').join('\n') || 'Keine Antwort erhalten.';

        } else if (backend === 'ollama') {
            const url = (settings.ollamaUrl || 'http://localhost:11434').replace(/\/$/, '');
            const model = settings.ollamaModel || 'llava:latest';
            result.textContent = '🔄 Sende Anfrage an Ollama (' + model + ')...';

            const res = await fetch(url + '/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: model,
                    prompt: buildPrompt(data),
                    stream: false
                })
            });

            if (!res.ok) throw new Error('Ollama Fehler ' + res.status);
            const json = await res.json();
            analysisText = json.response || 'Keine Antwort erhalten.';

        } else {
            // "none" mode — lokale Zusammenfassung
            analysisText = buildLocalAnalysis(data);
        }

        result.textContent = analysisText;

    } catch (e) {
        result.textContent = '❌ Fehler bei der AI-Analyse:\n\n' + e.message + '\n\n💡 Tipps:\n• Prüfe den API Key in den Einstellungen\n• Bei Ollama: Ist der Server gestartet?\n• Teste die Verbindung über den Test-Button in den Einstellungen';
    }

    btn.disabled = false;
    resetAIButton(btn);
}

function resetAIButton(btn) {
    btn.innerHTML = '<svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z"/></svg> AI-Analyse starten';
}

function buildLocalAnalysis(d) {
    let t = '🔍 WundScan-AI Analyse (Offline)\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
    t += '📋 Wundart: ' + d.wundart + '\n📍 Lokalisation: ' + d.lokalisation + '\n';
    t += '📐 Größe: ' + d.laenge + ' × ' + d.breite + ' × ' + d.tiefe + ' cm\n';
    t += '😣 Schmerz: VAS ' + d.schmerz + '/10\n\n';
    if (d.wundgrund.length) t += '🔬 Wundgrund: ' + d.wundgrund.join(', ') + '\n';
    if (d.wundrand.length) t += '🔲 Wundrand: ' + d.wundrand.join(', ') + '\n';
    t += '💧 Exsudat: ' + d.exsudat_menge + ' / ' + d.exsudat_art + '\n\n';
    if (d.infektionszeichen.length) {
        t += '⚠️ INFEKTIONSZEICHEN VORHANDEN:\n' + d.infektionszeichen.map(i => '   • ' + i).join('\n');
        t += '\n\n🔴 Empfehlung: Ärztliche Begutachtung empfohlen.\n   Wundabstrich in Betracht ziehen.\n';
    } else {
        t += '✅ Keine Infektionszeichen dokumentiert.\n';
    }
    t += '\n━━━━━━━━━━━━━━━━━━━━━━━━\nℹ️ Offline-Modus: Für detaillierte Analyse bitte AI-Backend in den Einstellungen konfigurieren.\n';
    t += 'Generiert am ' + new Date().toLocaleString('de-AT');
    return t;
}

// === Settings ===
function loadSettings() {
    try {
        const s = JSON.parse(localStorage.getItem(STORAGE.SETTINGS)) || {};
        if (s.darkMode) { document.documentElement.setAttribute('data-theme', 'dark'); const t = document.getElementById('dark-mode-toggle'); if (t) t.checked = true; }
        // AI Settings laden
        if (s.aiBackend) { const el = document.getElementById('ai-backend'); if (el) el.value = s.aiBackend; }
        if (s.anthropicKey) { const el = document.getElementById('anthropic-api-key'); if (el) el.value = s.anthropicKey; }
        if (s.anthropicModel) { const el = document.getElementById('anthropic-model'); if (el) el.value = s.anthropicModel; }
        if (s.ollamaUrl) { const el = document.getElementById('ollama-url'); if (el) el.value = s.ollamaUrl; }
        if (s.ollamaModel) { const el = document.getElementById('ollama-model'); if (el) el.value = s.ollamaModel; }
        onAIBackendChange(false);
    } catch(e) {}
}

function saveAISettings() {
    const s = JSON.parse(localStorage.getItem(STORAGE.SETTINGS) || '{}');
    s.aiBackend = document.getElementById('ai-backend')?.value || 'anthropic';
    s.anthropicKey = document.getElementById('anthropic-api-key')?.value || '';
    s.anthropicModel = document.getElementById('anthropic-model')?.value || 'claude-sonnet-4-20250514';
    s.ollamaUrl = document.getElementById('ollama-url')?.value || 'http://localhost:11434';
    s.ollamaModel = document.getElementById('ollama-model')?.value || 'llava:latest';
    localStorage.setItem(STORAGE.SETTINGS, JSON.stringify(s));
}

function onAIBackendChange(save) {
    const backend = document.getElementById('ai-backend')?.value || 'anthropic';
    const showAnthropic = backend === 'anthropic';
    const showOllama = backend === 'ollama';
    document.getElementById('setting-anthropic-key').style.display = showAnthropic ? '' : 'none';
    document.getElementById('setting-anthropic-model').style.display = showAnthropic ? '' : 'none';
    document.getElementById('setting-ollama-url').style.display = showOllama ? '' : 'none';
    document.getElementById('setting-ollama-model').style.display = showOllama ? '' : 'none';
    if (save !== false) saveAISettings();
}

function toggleKeyVisibility() {
    const inp = document.getElementById('anthropic-api-key');
    inp.type = inp.type === 'password' ? 'text' : 'password';
}

function showAIStatus(msg, ok) {
    const el = document.getElementById('ai-status-msg');
    el.style.display = 'block';
    el.style.background = ok ? 'var(--success-soft)' : 'var(--danger-soft)';
    el.style.color = ok ? 'var(--success)' : 'var(--danger)';
    el.textContent = msg;
    setTimeout(() => el.style.display = 'none', 5000);
}

async function testAnthropicKey() {
    const key = document.getElementById('anthropic-api-key')?.value?.trim();
    if (!key) { showAIStatus('Bitte API Key eingeben.', false); return; }
    showAIStatus('Teste Verbindung...', true);
    try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': key,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify({
                model: document.getElementById('anthropic-model')?.value || 'claude-sonnet-4-20250514',
                max_tokens: 32,
                messages: [{ role: 'user', content: 'Sag nur: OK' }]
            })
        });
        if (res.ok) {
            showAIStatus('Verbindung erfolgreich! API Key funktioniert.', true);
        } else {
            const err = await res.json().catch(() => ({}));
            showAIStatus('Fehler ' + res.status + ': ' + (err.error?.message || 'Unbekannt'), false);
        }
    } catch (e) {
        showAIStatus('Verbindungsfehler: ' + e.message, false);
    }
}

async function testOllamaConnection() {
    const url = document.getElementById('ollama-url')?.value?.trim() || 'http://localhost:11434';
    showAIStatus('Teste Ollama...', true);
    try {
        const res = await fetch(url + '/api/tags');
        if (res.ok) {
            const data = await res.json();
            const models = (data.models || []).map(m => m.name).join(', ');
            showAIStatus('Ollama OK! Modelle: ' + (models || 'keine gefunden'), true);
        } else {
            showAIStatus('Ollama antwortet mit Fehler ' + res.status, false);
        }
    } catch (e) {
        showAIStatus('Ollama nicht erreichbar: ' + e.message, false);
    }
}

function getAISettings() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE.SETTINGS)) || {};
    } catch(e) { return {}; }
}

function toggleDarkMode() {
    const d = document.getElementById('dark-mode-toggle').checked;
    document.documentElement.setAttribute('data-theme', d ? 'dark' : '');
    const s = JSON.parse(localStorage.getItem(STORAGE.SETTINGS) || '{}');
    s.darkMode = d; localStorage.setItem(STORAGE.SETTINGS, JSON.stringify(s));
}
function updateServerInfo() {
    const el = document.getElementById('server-info-text');
    el.textContent = window.location.protocol === 'file:' ? 'Kein Server (file://)' : window.location.protocol + '//' + window.location.host + ' — aktiv';
}

// === Export/Import ===
function exportData() {
    const blob = new Blob([JSON.stringify({ v:'5.0.0', date:new Date().toISOString(), patients, docs }, null, 2)], { type:'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'wundscan-export-' + new Date().toISOString().slice(0,10) + '.json'; a.click();
    showToast('Export erfolgreich.', 'success');
}
function importData() {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json';
    inp.onchange = e => {
        const f = e.target.files[0]; if (!f) return;
        const r = new FileReader();
        r.onload = ev => {
            try { const d = JSON.parse(ev.target.result); if (d.patients) patients = d.patients; if (d.docs) docs = d.docs; saveData(); updateDashboard(); renderPatients(); updatePatientSelect(); showToast('Import OK: ' + patients.length + ' Patienten, ' + docs.length + ' Docs', 'success'); }
            catch(e) { showToast('Import fehlgeschlagen.', 'error'); }
        };
        r.readAsText(f);
    };
    inp.click();
}

// === Toast ===
function showToast(msg, type) {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div'); t.className = 'toast toast-' + (type||'info'); t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(10px)'; t.style.transition = 'all .3s'; setTimeout(() => t.remove(), 300); }, 3000);
}

// === Util ===
function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
