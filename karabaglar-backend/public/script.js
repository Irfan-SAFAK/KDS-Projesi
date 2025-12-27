// script.js - Karabağlar KDS Frontend (ÇAKIŞMA ÖNLEYİCİ SÜRÜM)

// ==================== KONFİGÜRASYON ====================
const API_BASE_URL = 'http://localhost:3000/api';

// ==================== GLOBAL DEĞİŞKENLER ====================
// HATA ÇÖZÜMÜ: Değişken adı 'kdsHaritasi' yapıldı (map çakışmasını önlemek için)
let kdsHaritasi; 
let parametreler = [];
let originalParametreler = [];
let mahalleLayer = null;

// Modal Grafik Değişkenleri
let modalDonatiChart = null;
let modalKritikChart = null;
let modalNufusChart = null;
let modalButceChart = null;

// Ana Ekran Grafik Değişkenleri
window.chartDonati = null; 
window.butceChart = null;  

// API'den gelen verileri saklamak için önbellek
window.chartData = {
    dagilim: null,
    kritik: null,
    nufus: null
};

// ==================== SAYFA YÜKLENİNCE ====================
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    initSenaryoPanel();
    yukleParametreler();
    yukleAnaliz();
    yukleMahalleler(); 
    
    // Ana ekran grafiklerini başlat (1 sn gecikmeli)
    setTimeout(window.updateCharts, 1000);

    console.log('🚀 Sayfa Yüklendi - Çakışma Önleyici Mod Devrede...');
    
    // 1. ANALİZ BUTONU
    const btnAnaliz = document.getElementById('btnAnalizAc');
    const modal = document.getElementById('dashboardModal');
    const btnKapat = document.getElementById('btnModalKapat');
    
    if (btnAnaliz && modal) {
        btnAnaliz.addEventListener('click', () => {
            modal.style.display = 'flex';
            cizModalGrafikleri(); 
        });
    }
    
    // 2. MODAL KAPATMA
    if (btnKapat && modal) {
        btnKapat.addEventListener('click', () => { modal.style.display = 'none'; });
    }
    
    // 3. DIŞARI TIKLAYINCA KAPATMA
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = 'none';
        });
    }

    // 4. PDF VE EXCEL BUTONLARI
    const btnPdf = document.getElementById('btnPdfIndir');
    if (btnPdf) btnPdf.addEventListener('click', exportToPDF);

    const btnExcel = document.getElementById('btnExcelIndir');
    if (btnExcel) btnExcel.addEventListener('click', exportToExcel);
    
    // 5. GÖSTERGE TOGGLE
    const btnGosterge = document.getElementById('btnGostergeToggle');
    const legendBox = document.getElementById('legendBox');
    if (btnGosterge && legendBox) {
        btnGosterge.addEventListener('click', () => {
            legendBox.style.display = (legendBox.style.display === 'none' || legendBox.style.display === '') ? 'block' : 'none';
        });
    }
});

// ==================== HARİTA BAŞLATMA ====================
function initMap() {
    // map yerine kdsHaritasi kullanıyoruz
    kdsHaritasi = L.map('map').setView([38.3739, 27.1250], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(kdsHaritasi);
}

// ==================== SENARYO PANELİ ====================
function initSenaryoPanel() {
    const toggleBtn = document.getElementById('senaryoToggleBtn');
    const closeBtn = document.getElementById('senaryoCloseBtn');
    const panel = document.getElementById('senaryoPanel');
    const kaydetBtn = document.getElementById('kaydetBtn');
    const iptalBtn = document.getElementById('iptalBtn');

    if(toggleBtn) toggleBtn.addEventListener('click', () => panel.classList.toggle('active'));
    if(closeBtn) closeBtn.addEventListener('click', () => panel.classList.remove('active'));
    
    if(kaydetBtn) kaydetBtn.addEventListener('click', kaydetParametreler);

    if(iptalBtn) iptalBtn.addEventListener('click', () => {
        yukleParametreler(); 
        showToast('İptal edildi', 'success');
    });
}

// ==================== AKILLI KAYDETME VE HESAPLAMA ====================
async function kaydetParametreler() {
    const kaydetBtn = document.getElementById('kaydetBtn');
    kaydetBtn.disabled = true;
    kaydetBtn.innerHTML = '🧠 Hesaplanıyor...';

    try {
        const inputs = document.querySelectorAll('.parametre-input');
        const guncellenenParametreler = Array.from(inputs).map(input => ({
            id: parseInt(input.dataset.id),
            deger: parseFloat(input.value)
        }));

        await fetch(`${API_BASE_URL}/parametreler/guncelle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ parametreler: guncellenenParametreler })
        });

        const hesaplaResponse = await fetch(`${API_BASE_URL}/senaryo/hesapla`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tesisTuru: 'park', mesafe: 500 })
        });
        
        const hesapSonuc = await hesaplaResponse.json();

        if (hesapSonuc.success) {
            const maliyet = hesapSonuc.ozet.toplam_maliyet.toLocaleString('tr-TR');
            showToast(`✅ Senaryo Güncellendi!`, 'success');
            setTimeout(() => {
                showToast(`💰 Yeni Tahmini Maliyet: ${maliyet} TL`, 'success');
            }, 800);

            await yukleParametreler();
            await yukleAnaliz();
            await yukleMahalleler();
            window.updateCharts(); 
            
            setTimeout(() => {
                const panel = document.getElementById('senaryoPanel');
                if(panel) panel.classList.remove('active');
            }, 2000);

        } else {
            throw new Error("Hesaplama servisi yanıt vermedi.");
        }

    } catch (error) {
        console.error('Hata:', error);
        showToast('İşlem hatası: ' + error.message, 'error');
    } finally {
        kaydetBtn.disabled = false;
        kaydetBtn.innerHTML = '💾 Kaydet ve Analizi Yenile';
    }
}

// ==================== PARAMETRELERİ YÜKLEME ====================
async function yukleParametreler() {
    try {
        const response = await fetch(`${API_BASE_URL}/parametreler`);
        const data = await response.json();
        if (data.success) {
            parametreler = data.data;
            originalParametreler = JSON.parse(JSON.stringify(data.data));
            renderParametreler();
        }
    } catch (error) { console.error('Parametre yükleme hatası:', error); }
}

function renderParametreler() {
    const container = document.getElementById('parametreListesi');
    if (!container || parametreler.length === 0) return;

    const kategoriler = kategorizeParametreler(parametreler);
    
    container.innerHTML = Object.keys(kategoriler).map((kategoriAdi, index) => {
        const params = kategoriler[kategoriAdi];
        const isOpen = index === 0 ? 'open' : '';
        return `
            <div class="parametre-kategori">
                <div class="kategori-baslik" onclick="toggleKategori(this)">
                    <span>${kategoriAdi}</span>
                    <span class="kategori-arrow ${isOpen}">▼</span>
                </div>
                <div class="kategori-icerik ${isOpen}">
                    ${params.map(p => `
                        <div class="parametre-item">
                            <label class="parametre-label">${formatParametreAdi(p.parametre_adi)}</label>
                            <input type="number" class="parametre-input" data-id="${p.id}" value="${p.deger}" step="0.01">
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
}

function kategorizeParametreler(params) {
    const kats = { '💰 Maliyet & Bütçe': [], '📏 Şehir Standartları': [], '🏗️ Donatı Hedefleri': [], '🔧 Diğer': [] };
    params.forEach(p => {
        const name = p.parametre_adi.toLowerCase();
        if (name.includes('maliyet') || name.includes('butce')) kats['💰 Maliyet & Bütçe'].push(p);
        else if (name.includes('mesafe') || name.includes('hedef')) kats['📏 Şehir Standartları'].push(p);
        else if (['okul','saglik','park'].some(k=>name.includes(k))) kats['🏗️ Donatı Hedefleri'].push(p);
        else kats['🔧 Diğer'].push(p);
    });
    return kats;
}

function toggleKategori(el) {
    el.parentElement.querySelector('.kategori-icerik').classList.toggle('open');
    el.querySelector('.kategori-arrow').classList.toggle('open');
}

function formatParametreAdi(adi) {
    return adi.split('_').map(k => k.charAt(0).toUpperCase() + k.slice(1)).join(' ');
}

// ==================== ANALİZ VE ÖZET ====================
async function yukleAnaliz() {
    try {
        const response = await fetch(`${API_BASE_URL}/dashboard/mahalle-analizi`);
        const data = await response.json();
        if (Array.isArray(data)) {
            renderAnalizOzet(data);
        }
    } catch (error) { console.error('Analiz yükleme hatası:', error); }
}

function renderAnalizOzet(data) {
    const container = document.getElementById('dashboardContent');
    if (!container) return;
    
    const toplamNufus = data.reduce((acc, m) => acc + (m.nufus || 0), 0);
    const yetersizSayisi = data.reduce((acc, m) => acc + (Object.values(m.analiz || {}).filter(k => k.durum === 'YETERSİZ').length > 0 ? 1 : 0), 0);

    container.innerHTML = `
        <div style="margin-bottom:10px;">
            <div>📍 Toplam Mahalle: <b>${data.length}</b></div>
            <div>👥 Toplam Nüfus: <b>${toplamNufus.toLocaleString('tr-TR')}</b></div>
            <div style="color:#e74c3c;">⚠️ Müdahale Gereken: <b>${yetersizSayisi}</b></div>
        </div>
    `;
}

// ==================== HARİTA RENKLENDİRME ====================
async function yukleMahalleler() {
    try {
        const response = await fetch(`${API_BASE_URL}/katman/mahalleler`);
        const geoJsonData = await response.json();

        if (mahalleLayer) kdsHaritasi.removeLayer(mahalleLayer);

        mahalleLayer = L.geoJSON(geoJsonData, {
            style: (feature) => {
                const analiz = feature.properties.analiz_sonucu || {};
                let color = '#2ecc71'; 
                if (analiz.durum === 'KRİTİK' || analiz.durum === 'YETERSİZ') color = '#e74c3c'; 
                else if (analiz.durum === 'UYARI') color = '#f1c40f'; 
                
                return { fillColor: color, weight: 2, opacity: 1, color: 'white', fillOpacity: 0.5 };
            },
            onEachFeature: (feature, layer) => {
                const p = feature.properties;
                layer.bindPopup(`<b>${p.mahalle_adi}</b><br>Nüfus: ${p.toplam_nufus}<br>Durum: ${p.analiz_sonucu?.durum || 'Normal'}`);
            }
        }).addTo(kdsHaritasi);

        if (geoJsonData.features.length > 0) kdsHaritasi.fitBounds(mahalleLayer.getBounds());
    } catch (error) { console.error('Mahalle yükleme hatası:', error); }
}

// ==================== ANA EKRAN GRAFİKLERİ ====================
window.updateCharts = async function() {
    console.log("📊 Ana Ekran Grafikleri Yenileniyor...");

    if (typeof Chart === 'undefined') return;

    // 1. SOL ÜST: DONATI DAĞILIMI
    const ctxDonati = document.getElementById('chartDonati');
    if (ctxDonati) {
        if (window.chartDonati instanceof Chart) window.chartDonati.destroy();
        let dataDonati = [15, 8, 45, 12, 5]; 
        try {
            const res = await fetch(`${API_BASE_URL}/grafik/dagilim`);
            if(res.ok) { const json = await res.json(); dataDonati = json.data; }
        } catch(e) {}

        window.chartDonati = new Chart(ctxDonati, {
            type: 'doughnut',
            data: {
                labels: ['Eğitim', 'Sağlık', 'Park', 'Dini', 'Ulaşım'],
                datasets: [{ data: dataDonati, backgroundColor: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'], borderWidth: 0 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });
    }

    // 2. SAĞ ALT: BÜTÇE PROJEKSİYONU (ÇİZGİ GRAFİK - AKILLI MOD)
    const ctxButce = document.getElementById('chartButce');
    if (ctxButce) {
        if (window.butceChart instanceof Chart) window.butceChart.destroy();

        try {
            const response = await fetch(`${API_BASE_URL}/senaryo/hesapla`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tesisTuru: 'park', mesafe: 500 }) 
            });
            const json = await response.json();
            const toplamMaliyet = json.ozet.toplam_maliyet || 10000000;

            const yillar = ['2025', '2026', '2027', '2028', '2029'];
            const veriSeti = [
                toplamMaliyet * 0.20,
                toplamMaliyet * 0.45,
                toplamMaliyet * 0.70,
                toplamMaliyet * 0.85,
                toplamMaliyet * 1.00
            ];

            window.butceChart = new Chart(ctxButce, {
                type: 'line', 
                data: {
                    labels: yillar,
                    datasets: [{
                        label: 'Kümülatif Yatırım Tutarı (TL)',
                        data: veriSeti,
                        borderColor: '#F59E0B',
                        backgroundColor: 'rgba(245, 158, 11, 0.2)',
                        borderWidth: 3,
                        tension: 0.4,
                        fill: true,
                        pointBackgroundColor: '#fff',
                        pointBorderColor: '#F59E0B',
                        pointRadius: 5
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: '#f3f4f6' },
                            ticks: { callback: function(value) { return (value / 1000000).toFixed(1) + 'M ₺'; } }
                        },
                        x: { grid: { display: false } }
                    },
                    plugins: {
                        legend: { display: false },
                        title: { 
                            display: true, 
                            text: `💰 Toplam Yatırım Projeksiyonu: ${(toplamMaliyet/1000000).toFixed(1)} Milyon TL`,
                            font: { size: 14, weight: 'bold', color: '#333' }
                        },
                        tooltip: { callbacks: { label: function(context) { return context.raw.toLocaleString('tr-TR') + ' TL'; } } }
                    }
                }
            });

        } catch (error) { console.error("Grafik hatası:", error); }
    }
};

// ==================== MODAL GRAFİKLERİ ====================
async function cizModalGrafikleri() {
    await cizModalDonatiDagilimiGrafik();
    await cizModalKritikMahalleGrafik();
    await cizModalNufusDonatıGrafik();
    await cizModalButceGrafik();
    renderAnalizTablosu();
}

async function cizModalDonatiDagilimiGrafik() {
    const ctx = document.getElementById('modalDonatiChart')?.getContext('2d');
    if (!ctx) return;
    let data = [10, 5, 20, 8, 3, 2];
    try {
        const res = await fetch(`${API_BASE_URL}/grafik/dagilim`);
        const json = await res.json();
        if(json.data) data = json.data;
    } catch(e) {}
    if (modalDonatiChart) modalDonatiChart.destroy();
    modalDonatiChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Okul', 'Sağlık', 'Park', 'Spor', 'Kütüphane', 'Afet'],
            datasets: [{ data: data, backgroundColor: ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#FBBF24'] }]
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });
}

async function cizModalKritikMahalleGrafik() {
    const ctx = document.getElementById('modalKritikChart')?.getContext('2d');
    if (!ctx) return;
    let labels = [], values = [];
    try {
        const res = await fetch(`${API_BASE_URL}/grafik/kritik`);
        const json = await res.json();
        labels = json.labels;
        values = json.data;
    } catch(e) {}
    if (modalKritikChart) modalKritikChart.destroy();
    modalKritikChart = new Chart(ctx, {
        type: 'bar',
        data: { labels: labels, datasets: [{ label: 'Eksik Sayısı', data: values, backgroundColor: '#EF4444' }] },
        options: { indexAxis: 'y', responsive: true }
    });
}

async function cizModalNufusDonatıGrafik() {
    const ctx = document.getElementById('modalNufusChart')?.getContext('2d');
    if (!ctx) return;
    let labels = [], values = [];
    try {
        const res = await fetch(`${API_BASE_URL}/grafik/nufus`);
        const json = await res.json();
        labels = json.labels;
        values = json.data;
    } catch(e) {}
    if (modalNufusChart) modalNufusChart.destroy();
    modalNufusChart = new Chart(ctx, {
        type: 'bar',
        data: { labels: labels, datasets: [{ label: 'Nüfus (x1000)', data: values, backgroundColor: '#3B82F6' }] },
        options: { responsive: true }
    });
}

async function cizModalButceGrafik() {
    const ctx = document.getElementById('modalButceChart')?.getContext('2d');
    if (!ctx) return;
    try {
        const [okulRes, parkRes, saglikRes] = await Promise.all([
            fetch(`${API_BASE_URL}/senaryo/hesapla`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ tesisTuru: 'okul', mesafe: 500 }) }),
            fetch(`${API_BASE_URL}/senaryo/hesapla`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ tesisTuru: 'park', mesafe: 500 }) }),
            fetch(`${API_BASE_URL}/senaryo/hesapla`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ tesisTuru: 'saglik', mesafe: 500 }) })
        ]);
        const okulData = await okulRes.json();
        const parkData = await parkRes.json();
        const saglikData = await saglikRes.json();
        const dataValues = [
            okulData.ozet.toplam_maliyet || 50000000,
            parkData.ozet.toplam_maliyet || 15000000,
            saglikData.ozet.toplam_maliyet || 30000000,
            5000000 
        ];
        if (modalButceChart) modalButceChart.destroy();
        modalButceChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Okul İhtiyacı', 'Park İhtiyacı', 'Sağlık İhtiyacı', 'Diğer'],
                datasets: [{ data: dataValues, backgroundColor: ['#3B82F6', '#10B981', '#EF4444', '#6b7280'] }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: '💰 Detaylı Maliyet Analizi' } } }
        });
    } catch (error) { console.error('Bütçe grafik hatası:', error); }
}

async function renderAnalizTablosu() {
    const div = document.getElementById('analizTablosu');
    if (!div) return;
    try {
        const res = await fetch(`${API_BASE_URL}/katman/mahalleler`);
        const json = await res.json();
        const rows = json.features.slice(0, 10).map(f => {
            const p = f.properties;
            return `<tr><td>${p.mahalle_adi}</td><td>${p.toplam_nufus}</td><td>${p.analiz_sonucu?.durum || '-'}</td></tr>`;
        }).join('');
        div.innerHTML = `<table style="width:100%; font-size:12px;"><thead><tr><th>Mahalle</th><th>Nüfus</th><th>Durum</th></tr></thead><tbody>${rows}</tbody></table>`;
    } catch(e) {}
}

// ==================== GELİŞMİŞ EXCEL EXPORT (5 SAYFALI RAPOR) ====================
async function exportToExcel() {
    showToast('📗 Excel Raporu Hazırlanıyor...', 'success');
    
    if (typeof XLSX === 'undefined') {
        alert("❌ Excel kütüphanesi (SheetJS) yüklenemedi!");
        return;
    }

    try {
        const btnExcel = document.getElementById('btnExcelIndir');
        if(btnExcel) btnExcel.innerHTML = '⏳ Hazırlanıyor...';

        const [dagilimRes, kritikRes, nufusRes, mahallelerRes] = await Promise.all([
            fetch(`${API_BASE_URL}/grafik/dagilim`).catch(e => ({ ok: false })),
            fetch(`${API_BASE_URL}/grafik/kritik`).catch(e => ({ ok: false })),
            fetch(`${API_BASE_URL}/grafik/nufus`).catch(e => ({ ok: false })),
            fetch(`${API_BASE_URL}/katman/mahalleler`).catch(e => ({ ok: false }))
        ]);

        const dagilimData = dagilimRes.ok ? await dagilimRes.json() : { labels: [], data: [] };
        const kritikData = kritikRes.ok ? await kritikRes.json() : { labels: [], data: [] };
        const nufusData = nufusRes.ok ? await nufusRes.json() : { labels: [], data: [] };
        const mahallelerData = mahallelerRes.ok ? await mahallelerRes.json() : { features: [] };

        const wb = XLSX.utils.book_new();

        // SAYFA 1: ÖZET
        const toplamNufus = mahallelerData.features.reduce((acc, f) => acc + (f.properties.toplam_nufus || 0), 0);
        const kritikSayisi = mahallelerData.features.filter(f => f.properties.analiz_sonucu?.durum === 'KRİTİK').length;
        const wsOzet = XLSX.utils.aoa_to_sheet([
            ['KARABAĞLAR KDS - GENEL DURUM RAPORU'],
            ['Rapor Tarihi', new Date().toLocaleDateString('tr-TR')],
            [],
            ['Toplam Mahalle Sayısı', mahallelerData.features.length],
            ['Toplam Nüfus', toplamNufus],
            ['Kritik Durumdaki Mahalle Sayısı', kritikSayisi]
        ]);
        XLSX.utils.book_append_sheet(wb, wsOzet, "Özet Rapor");

        // SAYFA 2: DONATI
        const dagilimRows = [['Donatı Türü', 'Adet']];
        dagilimData.labels.forEach((label, i) => dagilimRows.push([label, dagilimData.data[i]]));
        const wsDagilim = XLSX.utils.aoa_to_sheet(dagilimRows);
        XLSX.utils.book_append_sheet(wb, wsDagilim, "Donatı Dağılımı");

        // SAYFA 3: KRİTİK MAHALLELER
        const kritikRows = [['Mahalle Adı', 'Eksik Donatı Sayısı']];
        kritikData.labels.forEach((label, i) => kritikRows.push([label, kritikData.data[i]]));
        const wsKritik = XLSX.utils.aoa_to_sheet(kritikRows);
        XLSX.utils.book_append_sheet(wb, wsKritik, "Kritik Mahalleler");

        // SAYFA 4: TÜM MAHALLELER
        const mahalleRows = [['Mahalle Adı', 'Nüfus', 'Durum', 'Okul', 'Sağlık', 'Park']];
        mahallelerData.features.forEach(f => {
            const p = f.properties;
            mahalleRows.push([p.mahalle_adi, p.toplam_nufus, p.analiz_sonucu?.durum || '-', p.sayi_okul || 0, p.sayi_saglik || 0, p.sayi_park || 0]);
        });
        const wsMahalleler = XLSX.utils.aoa_to_sheet(mahalleRows);
        XLSX.utils.book_append_sheet(wb, wsMahalleler, "Tüm Mahalleler");

        const tarihStr = new Date().toLocaleDateString('tr-TR').replace(/\./g, '_');
        XLSX.writeFile(wb, `Karabaglar_KDS_Detayli_Rapor_${tarihStr}.xlsx`);
        showToast('✅ Excel Raporu İndirildi!', 'success');

    } catch (error) {
        console.error('Excel hatası:', error);
        alert("Excel raporu oluşturulamadı.");
    } finally {
        const btnExcel = document.getElementById('btnExcelIndir');
        if(btnExcel) btnExcel.innerHTML = '📗 Excel İndir';
    }
}

async function exportToPDF() {
    showToast('PDF Hazırlanıyor...', 'success');
    const el = document.getElementById('dashboardModal');
    if (window.html2canvas && window.jspdf) {
        const canvas = await html2canvas(el);
        const img = canvas.toDataURL('image/png');
        const pdf = new window.jspdf.jsPDF('l', 'mm', 'a4');
        pdf.addImage(img, 'PNG', 0, 0, 297, 210);
        pdf.save('Karabaglar_Rapor.pdf');
    } else { alert('Kütüphaneler yüklenmedi!'); }
}

function showToast(msg, type) {
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerText = msg;
    t.style.cssText = "position:fixed; bottom:20px; right:20px; background:#333; color:#fff; padding:10px 20px; border-radius:5px; z-index:9999;";
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}