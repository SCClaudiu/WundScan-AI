/* =============================================
   WundScan-AI v5.0.0 — Komplette App-Logik
   Letzte Reparatur: 2026-03-23
   ============================================= */

// ============ STORAGE KEYS ============
var STORAGE = {
    PATIENTS: 'wundscan_patients',
    DOCS: 'wundscan_docs',
    SETTINGS: 'wundscan_settings'
};

// ============ GLOBALER STATE ============
var patients = [];
var docs = [];
var currentPhoto = null;

// ============ INIT ============
document.addEventListener('DOMContentLoaded', function() {
    console.log('[WundScan-AI] Init gestartet...');
    checkProtocol();
    loadData();
    updateDashboard();
    updatePatientSelect();
    renderPatients();
    setDateDisplay();
    loadSettings();   // <-- lädt AI-Settings, Dark Mode, alles
    updateServerInfo();
    console.log('[WundScan-AI] Init abgeschlossen.');
});

// ============ PROTOCOL CHECK ============
function checkProtocol() {
    if (window.location.protocol === 'file:') {
        var s = document.getElementById('server-status');
        if (s) s.innerHTML = '<span class="status-dot" style="background:#dc2626;box-shadow:0 0 6px #dc2626"></span><span class="status-text">Kein Server</span>';
    }
}

// ============ NAVIGATION ============
function showSection(id) {
    document.querySelectorAll('.content-section').forEach(function(s) { s.classList.remove('active'); });
    var t = document.getElementById('section-' + id);
    if (t) t.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });
    var nav = document.querySelector('.nav-item[data-section="' + id + '"]');
    if (nav) nav.classList.add('active');
    var titles = { 'dashboard':'Dashboard', 'neue-wunde':'Neue Wunddokumentation', 'verlauf':'Wundverlauf', 'patienten':'Patienten', 'einstellungen':'Einstellungen' };
    document.getElementById('page-title').textContent = titles[id] || '';
    document.getElementById('sidebar').classList.remove('open');
    if (id === 'verlauf') renderVerlauf();
}

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }

function setDateDisplay() {
    document.getElementById('date-display').textContent = new Date().toLocaleDateString('de-AT', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
}

// ============ DATA PERSISTENCE ============
function loadData() {
    try { patients = JSON.parse(localStorage.getItem(STORAGE.PATIENTS)) || []; } catch(e) { patients = []; }
    try { docs = JSON.parse(localStorage.getItem(STORAGE.DOCS)) || []; } catch(e) { docs = []; }
}
function saveData() {
    localStorage.setItem(STORAGE.PATIENTS, JSON.stringify(patients));
    localStorage.setItem(STORAGE.DOCS, JSON.stringify(docs));
}

// ============ DASHBOARD ============
function updateDashboard() {
    document.getElementById('stat-patients').textContent = patients.length;
    document.getElementById('stat-wounds').textContent = docs.filter(function(d) { return d.status !== 'abgeheilt'; }).length;
    document.getElementById('stat-healed').textContent = docs.filter(function(d) { return d.status === 'abgeheilt'; }).length;
    document.getElementById('stat-docs').textContent = docs.length;
    var rc = document.getElementById('recent-docs');
    if (docs.length === 0) {
        rc.innerHTML = '<div class="empty-state"><p>Noch keine Dokumentationen.</p><button class="btn btn-primary" onclick="showSection(\'neue-wunde\')">Erste erstellen</button></div>';
    } else {
        rc.innerHTML = docs.slice(-5).reverse().map(function(d) {
            var p = patients.find(function(x) { return x.id === d.patientId; });
            var n = p ? p.nachname + ', ' + p.vorname : 'Unbekannt';
            return '<div class="doc-row"><div><div class="patient-name">' + esc(n) + '</div><div class="doc-type">' + esc(d.wundart||'') + '</div></div><span class="doc-date">' + new Date(d.datum).toLocaleDateString('de-AT') + '</span></div>';
        }).join('');
    }
}

// ============ PATIENTS ============
function showPatientModal() { document.getElementById('patient-modal').style.display = 'flex'; document.getElementById('pat-nachname').focus(); }
function hidePatientModal() { document.getElementById('patient-modal').style.display = 'none'; ['pat-nachname','pat-vorname','pat-gebdatum','pat-station','pat-zimmer'].forEach(function(id) { document.getElementById(id).value = ''; }); }

function savePatient() {
    var nn = document.getElementById('pat-nachname').value.trim();
    var vn = document.getElementById('pat-vorname').value.trim();
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
    var c = document.getElementById('patienten-list');
    if (!patients.length) { c.innerHTML = '<div class="empty-state"><p>Noch keine Patienten.</p><button class="btn btn-primary" onclick="showPatientModal()">Ersten anlegen</button></div>'; return; }
    c.innerHTML = patients.map(function(p) { return '<div class="patient-row"><div><div class="patient-name">' + esc(p.nachname) + ', ' + esc(p.vorname) + '</div><div class="patient-meta">' + (p.station ? esc(p.station) : '') + (p.zimmer ? ' · Zi. ' + esc(p.zimmer) : '') + (p.gebdatum ? ' · geb. ' + new Date(p.gebdatum).toLocaleDateString('de-AT') : '') + '</div></div><button class="btn btn-secondary btn-sm" onclick="deletePatient(\'' + p.id + '\')">Entfernen</button></div>'; }).join('');
}

function deletePatient(id) { if (!confirm('Patient entfernen?')) return; patients = patients.filter(function(p) { return p.id !== id; }); saveData(); renderPatients(); updatePatientSelect(); updateDashboard(); }

function updatePatientSelect() {
    var s = document.getElementById('patient-select');
    if (!s) return;
    s.innerHTML = '<option value="">— Patient auswählen —</option>' + patients.map(function(p) { return '<option value="' + p.id + '">' + esc(p.nachname) + ', ' + esc(p.vorname) + '</option>'; }).join('');
}

// ============ PHOTO ============
function handlePhotoUpload(input) {
    if (!input.files || !input.files[0]) return;
    var r = new FileReader();
    r.onload = function(e) { currentPhoto = e.target.result; document.getElementById('foto-img').src = currentPhoto; document.getElementById('foto-preview').style.display = 'block'; document.getElementById('upload-zone').style.display = 'none'; };
    r.readAsDataURL(input.files[0]);
}
function removePhoto() { currentPhoto = null; document.getElementById('foto-preview').style.display = 'none'; document.getElementById('upload-zone').style.display = ''; document.getElementById('foto-input').value = ''; }

// ============ WOUND FORM HELPERS ============
function getChecked(labelText) {
    var labels = document.querySelectorAll('#section-neue-wunde .form-group > label');
    for (var i = 0; i < labels.length; i++) {
        if (labels[i].textContent.trim() === labelText) {
            var g = labels[i].closest('.form-group');
            if (g) return Array.from(g.querySelectorAll('input[type=checkbox]:checked')).map(function(c) { return c.value; });
        }
    }
    return [];
}

function saveWoundDoc() {
    var pid = document.getElementById('patient-select').value;
    var wa = document.getElementById('wund-art').value;
    if (!pid) { showToast('Bitte Patient auswählen.', 'error'); return; }
    if (!wa) { showToast('Bitte Wundart auswählen.', 'error'); return; }
    var sel = document.getElementById('wund-art');
    docs.push({
        id: 'D' + Date.now(), patientId: pid, datum: new Date().toISOString(),
        wundart: sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].text : wa,
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
    ['patient-select','wund-art','lokalisation','exsudat-menge','exsudat-art'].forEach(function(id) { document.getElementById(id).value = ''; });
    ['wund-laenge','wund-breite','wund-tiefe'].forEach(function(id) { document.getElementById(id).value = ''; });
    document.querySelectorAll('#section-neue-wunde input[type=checkbox]').forEach(function(c) { c.checked = false; });
    document.getElementById('schmerz-vas').value = 0;
    document.getElementById('schmerz-display').textContent = '0';
    document.getElementById('bemerkungen').value = '';
    document.getElementById('ai-result-container').style.display = 'none';
    removePhoto();
}

// ============ VERLAUF ============
function renderVerlauf() {
    var c = document.getElementById('verlauf-content');
    if (!docs.length) { c.innerHTML = '<div class="empty-state"><p>Noch kein Wundverlauf.</p></div>'; return; }
    var sorted = docs.slice().reverse();
    c.innerHTML = sorted.map(function(d) {
        var p = patients.find(function(x) { return x.id === d.patientId; });
        var n = p ? p.nachname + ', ' + p.vorname : 'Unbekannt';
        var g = d.groesse;
        var sz = (g && (g.l || g.b)) ? g.l + '×' + g.b + (g.t ? '×' + g.t : '') + ' cm' : '';
        return '<div class="doc-row"><div><div class="patient-name">' + esc(n) + ' — ' + esc(d.wundart) + '</div><div class="patient-meta">' + esc(d.lokalisation||'') + (sz ? ' · ' + sz : '') + ' · VAS ' + d.schmerz + '/10</div></div><div style="text-align:right"><span class="doc-date">' + new Date(d.datum).toLocaleDateString('de-AT') + '</span><br><button class="btn btn-secondary btn-sm" style="margin-top:4px" onclick="deleteDoc(\'' + d.id + '\')">Löschen</button></div></div>';
    }).join('');
}
function deleteDoc(id) { if (!confirm('Dokumentation löschen?')) return; docs = docs.filter(function(d) { return d.id !== id; }); saveData(); updateDashboard(); renderVerlauf(); }


/* ==========================================================
   AI-ANALYSE — KOMPLETT VERDRAHTET
   ========================================================== */

// Wunddaten aus dem Formular sammeln
function collectWoundData() {
    var waSel = document.getElementById('wund-art');
    return {
        wundart: (waSel && waSel.options[waSel.selectedIndex]) ? waSel.options[waSel.selectedIndex].text : '–',
        lokalisation: document.getElementById('lokalisation').value || '–',
        laenge: document.getElementById('wund-laenge').value || '0',
        breite: document.getElementById('wund-breite').value || '0',
        tiefe: document.getElementById('wund-tiefe').value || '0',
        wundgrund: getChecked('Wundgrund'),
        exsudat_menge: document.getElementById('exsudat-menge').value || '–',
        exsudat_art: document.getElementById('exsudat-art').value || '–',
        wundrand: getChecked('Wundrand'),
        infektionszeichen: getChecked('Infektionszeichen'),
        schmerz: document.getElementById('schmerz-vas').value || '0',
        bemerkungen: document.getElementById('bemerkungen').value || ''
    };
}

// Prompt für AI-Backend bauen
function buildPrompt(data) {
    return 'Du bist ein erfahrener Wundexperte (ICW-zertifiziert) und unterstützt bei der pflegerischen Wunddokumentation.\n\n' +
        'Analysiere folgende Wunddaten und gib eine strukturierte pflegerische Einschätzung:\n\n' +
        'Wundart: ' + data.wundart + '\n' +
        'Lokalisation: ' + data.lokalisation + '\n' +
        'Größe: ' + data.laenge + ' × ' + data.breite + ' × ' + data.tiefe + ' cm\n' +
        'Wundgrund: ' + (data.wundgrund.length ? data.wundgrund.join(', ') : 'nicht angegeben') + '\n' +
        'Exsudat: Menge: ' + data.exsudat_menge + ', Art: ' + data.exsudat_art + '\n' +
        'Wundrand: ' + (data.wundrand.length ? data.wundrand.join(', ') : 'nicht angegeben') + '\n' +
        'Infektionszeichen: ' + (data.infektionszeichen.length ? data.infektionszeichen.join(', ') : 'keine') + '\n' +
        'Schmerz (VAS): ' + data.schmerz + '/10\n' +
        (data.bemerkungen ? 'Bemerkungen: ' + data.bemerkungen + '\n' : '') +
        '\nAntworte auf Deutsch mit:\n' +
        '1. Wundbeurteilung (Heilungsphase, Wundzustand)\n' +
        '2. Infektionsrisiko-Einschätzung\n' +
        '3. Empfohlene Wundversorgung (Wundauflage, Reinigung, Verbandwechsel-Intervall)\n' +
        '4. Pflegehinweise und Empfehlungen\n' +
        '5. Wann ärztliche Konsultation empfohlen ist\n\n' +
        'Hinweis: Dies ist eine pflegerische Einschätzung und ersetzt keine ärztliche Diagnose.';
}

// ---- HAUPT-ANALYSE-FUNKTION ----
function runAIAnalysis() {
    var btn = document.getElementById('btn-ai-analyse');
    var container = document.getElementById('ai-result-container');
    var resultEl = document.getElementById('ai-result');

    // UI: Lade-Zustand
    btn.disabled = true;
    btn.textContent = '⏳ Analyse läuft...';
    container.style.display = 'block';
    resultEl.textContent = 'Analyse wird vorbereitet...';

    // Settings aus localStorage lesen — DIREKT, nicht gecached
    var settings = {};
    try { settings = JSON.parse(localStorage.getItem(STORAGE.SETTINGS)) || {}; } catch(e) { settings = {}; }

    var backend = settings.aiBackend || 'anthropic';
    var woundData = collectWoundData();

    console.log('[WundScan-AI] AI-Analyse gestartet. Backend:', backend);

    if (backend === 'anthropic') {
        runAnthropicAnalysis(settings, woundData, resultEl, btn);
    } else if (backend === 'ollama') {
        runOllamaAnalysis(settings, woundData, resultEl, btn);
    } else {
        // Offline / none
        resultEl.textContent = buildLocalAnalysis(woundData);
        btn.disabled = false;
        resetAIButton(btn);
    }
}

// ---- ANTHROPIC CLAUDE ANALYSE ----
function runAnthropicAnalysis(settings, woundData, resultEl, btn) {
    var key = (settings.anthropicKey || '').trim();
    if (!key) {
        resultEl.textContent = '⚠️ Kein Anthropic API Key hinterlegt!\n\n' +
            'So gehst du vor:\n' +
            '1. Klicke links auf "Einstellungen"\n' +
            '2. Unter "AI-KONFIGURATION" → "Anthropic API Key"\n' +
            '3. Trage deinen Key ein (sk-ant-api03-...)\n' +
            '4. Klicke "Test" um ihn zu prüfen\n' +
            '5. Dann hier nochmal "AI-Analyse starten" klicken';
        btn.disabled = false;
        resetAIButton(btn);
        return;
    }

    var model = settings.anthropicModel || 'claude-sonnet-4-20250514';
    resultEl.textContent = '🔄 Sende Anfrage an Claude (' + model + ')...\n\nDas kann einige Sekunden dauern.';

    fetch('https://api.anthropic.com/v1/messages', {
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
            messages: [{ role: 'user', content: buildPrompt(woundData) }]
        })
    })
    .then(function(res) {
        if (!res.ok) {
            return res.json().catch(function() { return {}; }).then(function(err) {
                var msg = (err.error && err.error.message) ? err.error.message : 'Unbekannter Fehler';
                throw new Error('API Fehler ' + res.status + ': ' + msg);
            });
        }
        return res.json();
    })
    .then(function(json) {
        var text = '';
        if (json.content && json.content.length > 0) {
            for (var i = 0; i < json.content.length; i++) {
                if (json.content[i].text) text += json.content[i].text;
            }
        }
        resultEl.textContent = text || 'Keine Antwort von Claude erhalten.';
        console.log('[WundScan-AI] Anthropic Analyse erfolgreich.');
    })
    .catch(function(err) {
        console.error('[WundScan-AI] Anthropic Fehler:', err);
        resultEl.textContent = '❌ Fehler bei der Anthropic-Analyse:\n\n' + err.message +
            '\n\n💡 Mögliche Ursachen:\n' +
            '• API Key ungültig oder abgelaufen\n' +
            '• Kein Guthaben auf dem Anthropic-Konto\n' +
            '• Netzwerk-/Firewall-Problem\n' +
            '• Falsches Modell gewählt\n\n' +
            'Gehe in Einstellungen → klicke "Test" um den Key zu prüfen.';
    })
    .finally(function() {
        btn.disabled = false;
        resetAIButton(btn);
    });
}

// ---- OLLAMA ANALYSE ----
function runOllamaAnalysis(settings, woundData, resultEl, btn) {
    var url = (settings.ollamaUrl || 'http://localhost:11434').replace(/\/$/, '');
    var model = settings.ollamaModel || 'llava:latest';
    resultEl.textContent = '🔄 Sende Anfrage an Ollama (' + model + ')...\n\nBitte warten.';

    fetch(url + '/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: model,
            prompt: buildPrompt(woundData),
            stream: false
        })
    })
    .then(function(res) {
        if (!res.ok) throw new Error('Ollama HTTP Fehler ' + res.status);
        return res.json();
    })
    .then(function(json) {
        resultEl.textContent = json.response || 'Keine Antwort von Ollama.';
        console.log('[WundScan-AI] Ollama Analyse erfolgreich.');
    })
    .catch(function(err) {
        console.error('[WundScan-AI] Ollama Fehler:', err);
        resultEl.textContent = '❌ Fehler bei der Ollama-Analyse:\n\n' + err.message +
            '\n\n💡 Prüfe:\n' +
            '• Läuft Ollama? (ollama serve)\n' +
            '• Ist das Modell geladen? (ollama pull ' + model + ')\n' +
            '• Stimmt die URL in den Einstellungen?';
    })
    .finally(function() {
        btn.disabled = false;
        resetAIButton(btn);
    });
}

// ---- OFFLINE ANALYSE ----
function buildLocalAnalysis(d) {
    var t = '🔍 WundScan-AI Analyse (Offline-Modus)\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
    t += '📋 Wundart: ' + d.wundart + '\n';
    t += '📍 Lokalisation: ' + d.lokalisation + '\n';
    t += '📐 Größe: ' + d.laenge + ' × ' + d.breite + ' × ' + d.tiefe + ' cm\n';
    t += '😣 Schmerz: VAS ' + d.schmerz + '/10\n\n';
    if (d.wundgrund.length) t += '🔬 Wundgrund: ' + d.wundgrund.join(', ') + '\n';
    if (d.wundrand.length) t += '🔲 Wundrand: ' + d.wundrand.join(', ') + '\n';
    t += '💧 Exsudat: ' + d.exsudat_menge + ' / ' + d.exsudat_art + '\n\n';
    if (d.infektionszeichen.length) {
        t += '⚠️ INFEKTIONSZEICHEN:\n';
        for (var i = 0; i < d.infektionszeichen.length; i++) { t += '   • ' + d.infektionszeichen[i] + '\n'; }
        t += '\n🔴 Ärztliche Begutachtung empfohlen. Wundabstrich erwägen.\n';
    } else {
        t += '✅ Keine Infektionszeichen dokumentiert.\n';
    }
    t += '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    t += 'ℹ️ Dies ist der Offline-Modus ohne AI.\n';
    t += 'Für detaillierte Analyse: Einstellungen → API Key eintragen.\n';
    t += 'Generiert: ' + new Date().toLocaleString('de-AT');
    return t;
}

function resetAIButton(btn) {
    btn.innerHTML = '<svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z"/></svg> AI-Analyse starten';
}


/* ==========================================================
   EINSTELLUNGEN — LADEN, SPEICHERN, UI-STEUERUNG
   ========================================================== */

// ---- SETTINGS LADEN (beim App-Start) ----
function loadSettings() {
    var s = {};
    try { s = JSON.parse(localStorage.getItem(STORAGE.SETTINGS)) || {}; } catch(e) { s = {}; }

    console.log('[WundScan-AI] Settings geladen:', JSON.stringify(s));

    // Dark Mode
    if (s.darkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
        var dmToggle = document.getElementById('dark-mode-toggle');
        if (dmToggle) dmToggle.checked = true;
    }

    // AI Backend
    var backendEl = document.getElementById('ai-backend');
    if (backendEl && s.aiBackend) {
        backendEl.value = s.aiBackend;
    }

    // Anthropic Key
    var keyEl = document.getElementById('anthropic-api-key');
    if (keyEl && s.anthropicKey) {
        keyEl.value = s.anthropicKey;
    }

    // Anthropic Model
    var modelEl = document.getElementById('anthropic-model');
    if (modelEl && s.anthropicModel) {
        modelEl.value = s.anthropicModel;
    }

    // Ollama URL
    var ollamaUrlEl = document.getElementById('ollama-url');
    if (ollamaUrlEl && s.ollamaUrl) {
        ollamaUrlEl.value = s.ollamaUrl;
    }

    // Ollama Model
    var ollamaModelEl = document.getElementById('ollama-model');
    if (ollamaModelEl && s.ollamaModel) {
        ollamaModelEl.value = s.ollamaModel;
    }

    // UI aktualisieren: zeige/verstecke Felder je nach Backend
    onAIBackendChange(false);  // false = NICHT speichern beim Laden
}

// ---- SETTINGS SPEICHERN ----
function saveAISettings() {
    var s = {};
    try { s = JSON.parse(localStorage.getItem(STORAGE.SETTINGS)) || {}; } catch(e) { s = {}; }

    // Lese ALLE Werte direkt aus den DOM-Elementen
    var backendEl = document.getElementById('ai-backend');
    var keyEl = document.getElementById('anthropic-api-key');
    var modelEl = document.getElementById('anthropic-model');
    var ollamaUrlEl = document.getElementById('ollama-url');
    var ollamaModelEl = document.getElementById('ollama-model');

    s.aiBackend = backendEl ? backendEl.value : 'anthropic';
    s.anthropicKey = keyEl ? keyEl.value : '';
    s.anthropicModel = modelEl ? modelEl.value : 'claude-sonnet-4-20250514';
    s.ollamaUrl = ollamaUrlEl ? ollamaUrlEl.value : 'http://localhost:11434';
    s.ollamaModel = ollamaModelEl ? ollamaModelEl.value : 'llava:latest';

    localStorage.setItem(STORAGE.SETTINGS, JSON.stringify(s));
    console.log('[WundScan-AI] Settings gespeichert:', s.aiBackend, 'Key vorhanden:', !!s.anthropicKey);
}

// ---- BACKEND WECHSEL: Felder anzeigen/verstecken ----
function onAIBackendChange(doSave) {
    var backendEl = document.getElementById('ai-backend');
    var backend = backendEl ? backendEl.value : 'anthropic';

    var showAnthropic = (backend === 'anthropic');
    var showOllama = (backend === 'ollama');

    // Anthropic-Felder
    var el1 = document.getElementById('setting-anthropic-key');
    var el2 = document.getElementById('setting-anthropic-model');
    if (el1) el1.style.display = showAnthropic ? '' : 'none';
    if (el2) el2.style.display = showAnthropic ? '' : 'none';

    // Ollama-Felder
    var el3 = document.getElementById('setting-ollama-url');
    var el4 = document.getElementById('setting-ollama-model');
    if (el3) el3.style.display = showOllama ? '' : 'none';
    if (el4) el4.style.display = showOllama ? '' : 'none';

    // Speichern, aber NUR wenn explizit gewünscht (nicht beim Init-Laden)
    if (doSave !== false) {
        saveAISettings();
    }

    console.log('[WundScan-AI] Backend gewechselt auf:', backend);
}

// ---- KEY SICHTBARKEIT ----
function toggleKeyVisibility() {
    var inp = document.getElementById('anthropic-api-key');
    if (!inp) return;
    inp.type = (inp.type === 'password') ? 'text' : 'password';
}


/* ==========================================================
   TEST-BUTTONS — MIT SICHTBAREM FEEDBACK
   ========================================================== */

// ---- STATUS-ANZEIGE (sichtbar in der UI) ----
function showAIStatus(msg, isSuccess) {
    var el = document.getElementById('ai-status-msg');
    if (!el) {
        // Fallback: als Toast anzeigen falls Element fehlt
        showToast(msg, isSuccess ? 'success' : 'error');
        return;
    }
    el.style.display = 'block';
    el.style.padding = '0.75rem 1rem';
    el.style.marginTop = '0.5rem';
    el.style.borderRadius = '8px';
    el.style.fontWeight = '500';
    el.style.fontSize = '0.9rem';

    if (isSuccess) {
        el.style.background = '#d1fae5';
        el.style.color = '#065f46';
        el.style.border = '1px solid #6ee7b7';
    } else {
        el.style.background = '#fef2f2';
        el.style.color = '#991b1b';
        el.style.border = '1px solid #fca5a5';
    }

    el.textContent = msg;

    // AUCH als Toast anzeigen (doppelte Sicherheit)
    showToast(msg, isSuccess ? 'success' : 'error');

    // Status-Box nach 10 Sekunden ausblenden
    setTimeout(function() { el.style.display = 'none'; }, 10000);

    console.log('[WundScan-AI] AI Status:', msg, '(success=' + isSuccess + ')');
}

// ---- ANTHROPIC KEY TESTEN ----
function testAnthropicKey() {
    console.log('[WundScan-AI] testAnthropicKey() aufgerufen');

    // Zuerst speichern damit der Key sicher im Storage ist
    saveAISettings();

    var keyEl = document.getElementById('anthropic-api-key');
    var key = keyEl ? keyEl.value.trim() : '';

    if (!key) {
        showAIStatus('❌ Bitte zuerst einen API Key eingeben!', false);
        return;
    }

    if (!key.startsWith('sk-')) {
        showAIStatus('❌ Der Key sieht ungültig aus. Er sollte mit "sk-" beginnen.', false);
        return;
    }

    showAIStatus('⏳ Teste Verbindung zu Anthropic...', true);

    var modelEl = document.getElementById('anthropic-model');
    var model = modelEl ? modelEl.value : 'claude-sonnet-4-20250514';

    fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
            model: model,
            max_tokens: 32,
            messages: [{ role: 'user', content: 'Antworte nur mit: OK' }]
        })
    })
    .then(function(res) {
        if (res.ok) {
            return res.json().then(function() {
                showAIStatus('✅ Verbindung erfolgreich! API Key funktioniert. Modell: ' + model, true);
            });
        } else {
            return res.json().catch(function() { return {}; }).then(function(err) {
                var msg = (err.error && err.error.message) ? err.error.message : 'HTTP ' + res.status;
                if (res.status === 401) {
                    showAIStatus('❌ API Key ungültig oder abgelaufen. Prüfe den Key auf console.anthropic.com', false);
                } else if (res.status === 403) {
                    showAIStatus('❌ Zugriff verweigert. Möglicherweise fehlen Berechtigungen für dieses Modell.', false);
                } else if (res.status === 429) {
                    showAIStatus('⚠️ Rate Limit erreicht. Bitte kurz warten und nochmal versuchen.', false);
                } else {
                    showAIStatus('❌ Fehler ' + res.status + ': ' + msg, false);
                }
            });
        }
    })
    .catch(function(err) {
        console.error('[WundScan-AI] Test-Fehler:', err);
        if (err.message && err.message.indexOf('Failed to fetch') !== -1) {
            showAIStatus('❌ Netzwerkfehler: Anthropic API nicht erreichbar. Internetverbindung prüfen!', false);
        } else {
            showAIStatus('❌ Verbindungsfehler: ' + err.message, false);
        }
    });
}

// ---- OLLAMA VERBINDUNG TESTEN ----
function testOllamaConnection() {
    console.log('[WundScan-AI] testOllamaConnection() aufgerufen');
    saveAISettings();

    var urlEl = document.getElementById('ollama-url');
    var url = urlEl ? urlEl.value.trim() : 'http://localhost:11434';
    if (!url) url = 'http://localhost:11434';

    showAIStatus('⏳ Teste Ollama auf ' + url + '...', true);

    fetch(url + '/api/tags')
    .then(function(res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
    })
    .then(function(data) {
        var models = (data.models || []).map(function(m) { return m.name; });
        if (models.length > 0) {
            showAIStatus('✅ Ollama OK! Verfügbare Modelle: ' + models.join(', '), true);
        } else {
            showAIStatus('⚠️ Ollama erreichbar, aber keine Modelle installiert. (ollama pull llava)', false);
        }
    })
    .catch(function(err) {
        console.error('[WundScan-AI] Ollama Test-Fehler:', err);
        showAIStatus('❌ Ollama nicht erreichbar auf ' + url + '. Läuft "ollama serve"?', false);
    });
}


/* ==========================================================
   ALLGEMEINE EINSTELLUNGEN
   ========================================================== */

function toggleDarkMode() {
    var d = document.getElementById('dark-mode-toggle').checked;
    document.documentElement.setAttribute('data-theme', d ? 'dark' : '');
    var s = {};
    try { s = JSON.parse(localStorage.getItem(STORAGE.SETTINGS) || '{}'); } catch(e) { s = {}; }
    s.darkMode = d;
    localStorage.setItem(STORAGE.SETTINGS, JSON.stringify(s));
}

function updateServerInfo() {
    var el = document.getElementById('server-info-text');
    if (!el) return;
    if (window.location.protocol === 'file:') {
        el.textContent = 'Kein Server — App läuft über file://';
    } else {
        el.textContent = window.location.protocol + '//' + window.location.host + ' — Server aktiv';
    }
}

// ---- HILFSFUNKTION: AI Settings lesen ----
function getAISettings() {
    try { return JSON.parse(localStorage.getItem(STORAGE.SETTINGS)) || {}; }
    catch(e) { return {}; }
}


/* ==========================================================
   EXPORT / IMPORT
   ========================================================== */

function exportData() {
    var data = { version: '5.0.0', date: new Date().toISOString(), patients: patients, docs: docs };
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'wundscan-export-' + new Date().toISOString().slice(0,10) + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('Export erfolgreich.', 'success');
}

function importData() {
    var inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.json';
    inp.onchange = function(e) {
        var f = e.target.files[0];
        if (!f) return;
        var r = new FileReader();
        r.onload = function(ev) {
            try {
                var d = JSON.parse(ev.target.result);
                if (d.patients) patients = d.patients;
                if (d.docs) docs = d.docs;
                saveData();
                updateDashboard();
                renderPatients();
                updatePatientSelect();
                showToast('Import OK: ' + patients.length + ' Patienten, ' + docs.length + ' Docs', 'success');
            } catch(err) {
                showToast('Import fehlgeschlagen: ungültige Datei.', 'error');
            }
        };
        r.readAsText(f);
    };
    inp.click();
}


/* ==========================================================
   TOAST NOTIFICATIONS
   ========================================================== */

function showToast(msg, type) {
    var c = document.getElementById('toast-container');
    if (!c) return;
    var t = document.createElement('div');
    t.className = 'toast toast-' + (type || 'info');
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(function() {
        t.style.opacity = '0';
        t.style.transform = 'translateY(10px)';
        t.style.transition = 'all .3s';
        setTimeout(function() { t.remove(); }, 300);
    }, 4000);
}


/* ==========================================================
   UTILITY
   ========================================================== */

function esc(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
}
