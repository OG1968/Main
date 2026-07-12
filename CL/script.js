(function() {
    let L = 62;
    let W = 46;
    let H = 88.5;
    const BASE_SCALE = 3.78;

    const topColor = '#ffe6f0';
    const wallColor = '#f9f9f9';
    const bottomColor = '#e6f2ff';

    let currentScale = 1;
    let isMobile = window.innerWidth <= 768;

    function showToast(message) {
        const toast = document.getElementById('toast');
        toast.textContent = message || '✅ הפריסה עודכנה!';
        toast.classList.add('show');
        clearTimeout(toast._timeout);
        toast._timeout = setTimeout(() => {
            toast.classList.remove('show');
        }, 2500);
    }

    function getDimensions() {
        L = parseFloat(document.getElementById('inputL').value) || 62;
        W = parseFloat(document.getElementById('inputW').value) || 46;
        H = parseFloat(document.getElementById('inputH').value) || 88.5;
        return { L, W, H };
    }

    function getMobileDimensions() {
        const l = parseFloat(document.getElementById('mobileInputL').value) || 62;
        const w = parseFloat(document.getElementById('mobileInputW').value) || 46;
        const h = parseFloat(document.getElementById('mobileInputH').value) || 88.5;
        return { L: l, W: w, H: h };
    }

    function getNote() {
        return document.getElementById('noteInput').value.trim();
    }

    function getMobileNote() {
        return document.getElementById('mobileNoteInput').value.trim();
    }

    function getHideLabels() {
        return document.getElementById('hideLabels').checked;
    }

    function getMobileHideLabels() {
        return document.getElementById('mobileHideLabels').checked;
    }

    function calculateAutoScale() {
        isMobile = window.innerWidth <= 768;
        if (!isMobile) {
            currentScale = 1;
            return;
        }

        const totalWidth = W + L + W + L;
        const maxWidth = window.innerWidth - 40;
        const maxHeight = window.innerHeight - 300;
        const totalHeight = Math.max(L/2, W/2) + H + Math.max(L/2, W/2);
        
        const scaleByWidth = maxWidth / (totalWidth * BASE_SCALE);
        const scaleByHeight = maxHeight / (totalHeight * BASE_SCALE);
        
        let autoScale = Math.min(scaleByWidth, scaleByHeight, 1);
        autoScale = Math.max(autoScale, 0.2);
        autoScale = Math.min(autoScale, 1.2);
        
        currentScale = autoScale;
    }

    // פונקציה לבניית הפריסה עם קנה מידה ספציפי
    function buildNetWithScale(L, W, H, scaleFactor) {
        const totalWidth = W + L + W + L;
        const maxTopHeight = Math.max(L/2, W/2);
        const totalHeight = maxTopHeight + H + maxTopHeight;
        
        const effectiveScale = BASE_SCALE * scaleFactor;
        
        const totalW = totalWidth * effectiveScale;
        const totalH = totalHeight * effectiveScale;

        const container = document.getElementById('netContainer');
        container.style.width = totalW + 'px';
        container.style.height = totalH + 'px';
        container.className = 'net';
        container.innerHTML = '';

        const hideLabels = getHideLabels() || getMobileHideLabels();

        function createPanel(name, left, top, w, h, color, sub) {
            const div = document.createElement('div');
            div.className = 'panel';
            div.style.left = (left * effectiveScale) + 'px';
            div.style.top = (top * effectiveScale) + 'px';
            div.style.width = (w * effectiveScale) + 'px';
            div.style.height = (h * effectiveScale) + 'px';
            div.style.background = color;
            
            const fontSize = Math.max(7, Math.min(16, 14 * scaleFactor));
            const subFontSize = Math.max(6, Math.min(12, 11 * scaleFactor));
            
            if (hideLabels) {
                div.innerHTML = `
                    <span class="dim-label" style="font-size: ${fontSize + 2}px;">${sub}</span>
                `;
            } else {
                div.innerHTML = `
                    <span class="dim-label" style="font-size: ${fontSize}px;">${name}<br><span class="dim-sub" style="font-size: ${subFontSize}px;">${sub}</span></span>
                `;
            }
            
            div.title = `${name}: ${sub} ס"מ`;
            container.appendChild(div);
        }

        const topData = [
            { name: 'מכסה עליון', w: W, h: L/2, sub: W + '×' + (L/2).toFixed(1) },
            { name: 'מכסה עליון', w: L, h: W/2, sub: L + '×' + (W/2).toFixed(1) },
            { name: 'מכסה עליון', w: W, h: L/2, sub: W + '×' + (L/2).toFixed(1) },
            { name: 'מכסה עליון', w: L, h: W/2, sub: L + '×' + (W/2).toFixed(1) },
        ];

        let x = 0;
        topData.forEach(p => {
            const topPos = maxTopHeight - p.h;
            createPanel(p.name, x, topPos, p.w, p.h, topColor, p.sub);
            x += p.w;
        });

        const wallData = [
            { name: 'דופן 1', w: W, h: H, sub: W + '×' + H },
            { name: 'דופן 2', w: L, h: H, sub: L + '×' + H },
            { name: 'דופן 3', w: W, h: H, sub: W + '×' + H },
            { name: 'דופן 4', w: L, h: H, sub: L + '×' + H },
        ];

        x = 0;
        wallData.forEach(p => {
            createPanel(p.name, x, maxTopHeight, p.w, p.h, wallColor, p.sub);
            x += p.w;
        });

        const bottomData = [
            { name: 'תחתית', w: W, h: L/2, sub: W + '×' + (L/2).toFixed(1) },
            { name: 'תחתית', w: L, h: W/2, sub: L + '×' + (W/2).toFixed(1) },
            { name: 'תחתית', w: W, h: L/2, sub: W + '×' + (L/2).toFixed(1) },
            { name: 'תחתית', w: L, h: W/2, sub: L + '×' + (W/2).toFixed(1) },
        ];

        x = 0;
        bottomData.forEach(p => {
            createPanel(p.name, x, maxTopHeight + H, p.w, p.h, bottomColor, p.sub);
            x += p.w;
        });

        window._currentL = L;
        window._currentW = W;
        window._currentH = H;
        window._totalWidth = totalWidth;
        window._totalHeight = totalHeight;
        window._totalW = totalW;
        window._totalH = totalH;
    }

    function buildNet(L, W, H) {
        const indicator = document.getElementById('loadingIndicator');
        indicator.style.display = 'block';

        calculateAutoScale();

        setTimeout(() => {
            buildNetWithScale(L, W, H, currentScale);

            const totalWidth = W + L + W + L;
            const totalHeight = Math.max(L/2, W/2) + H + Math.max(L/2, W/2);
            
            document.getElementById('infoBar').innerHTML =
                '📐 L=' + L + ' ס"מ &nbsp;|&nbsp; W=' + W + ' ס"מ &nbsp;|&nbsp; H=' + H + ' ס"מ &nbsp;|&nbsp; ' +
                'פריסה: ' + totalWidth + '×' + totalHeight.toFixed(1) + ' ס"מ &nbsp;|&nbsp; ' +
                '🔲 12 חלקים' +
                (isMobile ? ' &nbsp;|&nbsp; 📱 מותאם לנייד' : '');

            indicator.style.display = 'none';
            showToast('✅ פריסה עודכנה!');
        }, 300);
    }

    function syncFieldsToMobile() {
        const dims = getDimensions();
        document.getElementById('mobileInputL').value = dims.L;
        document.getElementById('mobileInputW').value = dims.W;
        document.getElementById('mobileInputH').value = dims.H;
        document.getElementById('mobileHideLabels').checked = getHideLabels();
        document.getElementById('mobileNoteInput').value = getNote();
    }

    function syncFieldsToDesktop() {
        const dims = getMobileDimensions();
        document.getElementById('inputL').value = dims.L;
        document.getElementById('inputW').value = dims.W;
        document.getElementById('inputH').value = dims.H;
        document.getElementById('hideLabels').checked = getMobileHideLabels();
        document.getElementById('noteInput').value = getMobileNote();
    }

    window.updateNet = function() {
        const dims = getDimensions();
        syncFieldsToMobile();
        buildNet(dims.L, dims.W, dims.H);
    };

    window.updateNetMobile = function() {
        const dims = getMobileDimensions();
        syncFieldsToDesktop();
        buildNet(dims.L, dims.W, dims.H);
        closeMobileMenu();
    };

    window.downloadPDF = function() {
        const dims = getDimensions();
        const L = dims.L;
        const W = dims.W;
        const H = dims.H;
        const note = getNote() || getMobileNote();
        const hideLabels = getHideLabels() || getMobileHideLabels();
        
        // בניית הפריסה עם קנה מידה 100% ל-PDF
        buildNetWithScale(L, W, H, 1);
        
        const container = document.getElementById('netContainer');
        const originalHTML = container.innerHTML;
        const totalWidthCm = W + L + W + L;
        const totalHeightCm = Math.max(L/2, W/2) + H + Math.max(L/2, W/2);

        // החזרת הקנה מידה המקורי
        setTimeout(() => {
            buildNetWithScale(L, W, H, currentScale);
        }, 100);

        showToast('📄 מוריד PDF...');

        const printWindow = window.open('', '_blank', 'width=1200,height=800');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <title>פריסת קרטון - ${L}×${W}×${H}</title>
              <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                html, body {
                  margin: 0;
                  padding: 0;
                  background: white;
                  width: 100%;
                  height: 100%;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  font-family: 'Segoe UI', Arial, sans-serif;
                }
                @page { 
                  size: A4 landscape; 
                  margin: 0.5cm;
                }
                .page-container {
                  display: flex;
                  flex-direction: column;
                  justify-content: center;
                  align-items: center;
                  width: 100%;
                  height: 100%;
                  padding: 5px;
                }
                .net-wrapper-print {
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  width: 100%;
                  flex: 1;
                  overflow: hidden;
                  min-height: 0;
                }
                .net-print {
                  position: relative;
                  transform: scale(0.78);
                  transform-origin: center center;
                  margin: 0 auto;
                  flex-shrink: 0;
                }
                .panel-print {
                  position: absolute;
                  border: 1.5px solid black;
                  background: white;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  font-size: 13px;
                  font-weight: bold;
                  text-align: center;
                  flex-direction: column;
                  overflow: hidden;
                }
                .dim-label-print {
                  font-size: 14px;
                  font-weight: bold;
                  line-height: 1.3;
                }
                .dim-sub-print {
                  font-size: 10px;
                  font-weight: normal;
                  color: #333;
                  background: rgba(255,255,255,0.6);
                  padding: 1px 6px;
                  border-radius: 10px;
                  margin-top: 1px;
                }
                .footer {
                  width: 100%;
                  text-align: center;
                  font-size: 10px;
                  color: #555;
                  font-family: 'Segoe UI', Arial, sans-serif;
                  padding: 4px 10px;
                  background: white;
                  border-top: 1px solid #ddd;
                  direction: rtl;
                  display: flex;
                  flex-direction: column;
                  align-items: flex-end;
                  flex-shrink: 0;
                }
                .footer .dimensions {
                  direction: rtl;
                  text-align: right;
                  padding-left: 10px;
                  width: 100%;
                  font-size: 10px;
                }
                .footer .note {
                  color: #1a4972;
                  font-weight: 600;
                  margin-top: 1px;
                  font-size: 9px;
                  text-align: right;
                  direction: rtl;
                  width: 100%;
                }
                @media print {
                  html, body { margin: 0; padding: 0; height: 100%; }
                  .page-container { padding: 0; height: 100%; }
                  .net-print { transform: scale(0.78) !important; }
                  .panel-print { border: 1.5px solid black; }
                  .footer { border-top: 1px solid #999; }
                }
              </style>
            </head>
            <body>
              <div class="page-container">
                <div class="net-wrapper-print">
                  <div class="net-print" style="width:${window._totalW || 0}px;height:${window._totalH || 0}px;">
                    ${originalHTML.replace(/panel/g, 'panel-print').replace(/dim-label/g, 'dim-label-print').replace(/dim-sub/g, 'dim-sub-print')}
                  </div>
                </div>
                <div class="footer">
                  <div class="dimensions">מידות: L=${L} ס"מ | W=${W} ס"מ | H=${H} ס"מ &nbsp;·&nbsp; ${totalWidthCm}×${totalHeightCm.toFixed(1)} ס"מ</div>
                  ${note ? `<div class="note">📝 ${note}</div>` : ''}
                </div>
              </div>
              <script>
                window.onload = function() {
                  window.print();
                };
              <\/script>
            </body>
            </html>
        `);
        printWindow.document.close();
        
        setTimeout(() => {
            showToast('✅ PDF נוצר בהצלחה!');
        }, 1000);
    };

    // ===== תפריט נייד =====
    function openMobileMenu() {
        document.getElementById('mobileMenuPanel').classList.add('open');
        document.getElementById('mobileOverlay').classList.add('open');
        syncFieldsToMobile();
    }

    function closeMobileMenu() {
        document.getElementById('mobileMenuPanel').classList.remove('open');
        document.getElementById('mobileOverlay').classList.remove('open');
    }

    function toggleMobileMenu() {
        if (document.getElementById('mobileMenuPanel').classList.contains('open')) {
            closeMobileMenu();
        } else {
            openMobileMenu();
        }
    }

    // ===== אירועים =====
    document.getElementById('mobileMenuToggle').addEventListener('click', toggleMobileMenu);
    document.getElementById('mobileMenuClose').addEventListener('click', closeMobileMenu);
    document.getElementById('mobileOverlay').addEventListener('click', closeMobileMenu);

    document.getElementById('mobileUpdateBtn').addEventListener('click', window.updateNetMobile);
    document.getElementById('mobilePdfBtn').addEventListener('click', function() {
        closeMobileMenu();
        const dims = getMobileDimensions();
        document.getElementById('inputL').value = dims.L;
        document.getElementById('inputW').value = dims.W;
        document.getElementById('inputH').value = dims.H;
        document.getElementById('hideLabels').checked = getMobileHideLabels();
        document.getElementById('noteInput').value = getMobileNote();
        buildNet(dims.L, dims.W, dims.H);
        setTimeout(window.downloadPDF, 400);
    });

    // סנכרון שדות
    document.getElementById('inputL').addEventListener('change', syncFieldsToMobile);
    document.getElementById('inputW').addEventListener('change', syncFieldsToMobile);
    document.getElementById('inputH').addEventListener('change', syncFieldsToMobile);
    document.getElementById('hideLabels').addEventListener('change', function() {
        document.getElementById('mobileHideLabels').checked = this.checked;
        const dims = getDimensions();
        buildNet(dims.L, dims.W, dims.H);
    });
    document.getElementById('noteInput').addEventListener('input', function() {
        document.getElementById('mobileNoteInput').value = this.value;
    });

    document.getElementById('mobileHideLabels').addEventListener('change', function() {
        document.getElementById('hideLabels').checked = this.checked;
        const dims = getMobileDimensions();
        buildNet(dims.L, dims.W, dims.H);
    });
    document.getElementById('mobileNoteInput').addEventListener('input', function() {
        document.getElementById('noteInput').value = this.value;
    });

    // Enter
    document.querySelectorAll('#mobileInputL, #mobileInputW, #mobileInputH, #mobileNoteInput').forEach(input => {
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                window.updateNetMobile();
            }
        });
    });

    document.querySelectorAll('.controls input').forEach(input => {
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                updateNet();
            }
        });
    });

    document.getElementById('noteInput').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            updateNet();
        }
    });

    // התאמה לשינוי גודל חלון
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            const dims = getDimensions();
            buildNet(dims.L, dims.W, dims.H);
        }, 400);
    });

    // ===== אתחול =====
    document.getElementById('inputL').value = L;
    document.getElementById('inputW').value = W;
    document.getElementById('inputH').value = H;
    document.getElementById('mobileInputL').value = L;
    document.getElementById('mobileInputW').value = W;
    document.getElementById('mobileInputH').value = H;

    buildNet(L, W, H);

    console.log('✅ מוכן!');
})();