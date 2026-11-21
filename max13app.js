// 1. Panoramik görüntünün gösterileceği HTML elemanını seçin
var panoElement = document.getElementById('pano');

// 2. Marzipano Görüntüleyicisini (Viewer) oluşturun
var viewer = new Marzipano.Viewer(panoElement);

// 3. Çoklu Sahne (Multi-Scene) Altyapısı
var scenes = {};
var geometry = new Marzipano.EquirectGeometry([{ width: 4000 }]);
var limiter = Marzipano.RectilinearView.limit.traditional(4096, 100 * Math.PI / 180);

var defaultViewOpts = { yaw: 0, pitch: 0, roll: 0, fov: Math.PI / 3 };

// --- FARKLI PANOLARI (SAHNELERİ) TANIMLAMA ---
var sourceMain = Marzipano.ImageUrlSource.fromString("resimler/max/max_flt_deck.png");
var viewMain = new Marzipano.RectilinearView(defaultViewOpts, limiter);
scenes['main'] = viewer.createScene({ source: sourceMain, geometry: geometry, view: viewMain });

var sourceOverhead = Marzipano.ImageUrlSource.fromString("resimler/max/p_gen_control.jpg");
var viewOverhead = new Marzipano.RectilinearView(defaultViewOpts, limiter);
scenes['overhead'] = viewer.createScene({ source: sourceOverhead, geometry: geometry, view: viewOverhead });

scenes['main'].switchTo();
var activeScene = scenes['main'];

function switchToScene(sceneId) {
    if (scenes[sceneId]) {
        scenes[sceneId].switchTo();
        activeScene = scenes[sceneId];
        var sidebar = document.getElementById('sidebarMenu');
        if (sidebar) sidebar.classList.remove('open');
    }
}

// --- CANLI YAW VE PITCH GÖSTERGESİ ---
var yawValElem = document.getElementById('yawVal');
var pitchValElem = document.getElementById('pitchVal');

viewer.addEventListener('viewChange', function() {
    var currentView = viewer.view();
    if (yawValElem) yawValElem.textContent = currentView.yaw().toFixed(2);
    if (pitchValElem) pitchValElem.textContent = currentView.pitch().toFixed(2);
});

// --- SİSTEMLERİ FİLTRELEME ---
function filterSystems() {
    var input = document.getElementById('searchInput');
    var filter = input.value.toLowerCase();
    var listContainer = document.getElementById('sidebarList');
    var items = listContainer.getElementsByClassName('system-category');

    for (var i = 0; i < items.length; i++) {
        var txtValue = items[i].textContent || items[i].innerText;
        if (txtValue.toLowerCase().indexOf(filter) > -1) {
            items[i].style.display = "";
        } else {
            items[i].style.display = "none";
        }
    }
}

// --- SLİDER İLE EKSEN VE HOTSPOT GİZLEME ---
var toggleAxis = document.getElementById('toggleAxis');
var axisOverlay = document.getElementById('axisOverlay');
var hotspotElementsList = []; 

if (toggleAxis) {
    toggleAxis.addEventListener('change', function() {
        axisOverlay.style.opacity = this.checked ? '0' : '1';
    });
}

var toggleHotspots = document.getElementById('toggleHotspots');
if (toggleHotspots) {
    toggleHotspots.addEventListener('change', function() {
        hotspotElementsList.forEach(function(el) {
            el.style.opacity = toggleHotspots.checked ? '0' : '1';
            el.style.pointerEvents = toggleHotspots.checked ? 'none' : 'auto';
        });
    });
}

// --- MODAL YÖNETİMİ & GERİ DÖNÜŞ İSTİFİ (STACK) ---
var textModal = document.getElementById('textModal');
var textModalTitle = document.getElementById('textModalTitle');
var textModalDesc = document.getElementById('textModalDesc');
var closeTextModal = document.getElementById('closeTextModal');
var modalBackBtn = document.getElementById('modalBackBtn');

// Pencerelerin geçmiş hafızası (Önceki ekranlara dönebilmek için)
var modalStack = [];

if (closeTextModal) {
    closeTextModal.addEventListener('click', function(e) {
        e.stopPropagation();
        modalStack = []; // Tamamen kapatınca geçmişi sıfırla
        textModal.style.display = 'none';
    });
}

// Geri Dön Butonuna Basıldığında
if (modalBackBtn) {
    modalBackBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        if (modalStack.length > 0) {
            let previousState = modalStack.pop(); // Bir önceki adımı al
            renderModalState(previousState, false); // Geri yükle (stack'e tekrar ekleme)
        }
    });
}

// Modali Verilen Duruma Göre Çizen Ana Fonksiyon
function renderModalState(state, pushToStack = true) {
    // Eğer mevcut bir state varsa ve yeni state'e geçiyorsak, eskisini stack'e at
    if (pushToStack && textModal.style.display === 'flex') {
        let currentState = {
            title: textModalTitle.textContent,
            desc: textModalDesc.innerHTML,
            image: textModal.querySelector('.modal-inner-img') ? textModal.querySelector('.modal-inner-img').src : null,
            subHotspots: window._currentSubHotspots || null,
            isSubList: window._currentIsSubList || false,
            itemsList: window._currentItemsList || null
        };
        modalStack.push(currentState);
    }

    textModalTitle.textContent = state.title;
    textModalDesc.innerHTML = state.desc || "";

    // Geri butonunun görünürlüğünü ayarla
    if (modalStack.length > 0) {
        modalBackBtn.style.display = 'block';
    } else {
        modalBackBtn.style.display = 'none';
    }

    // Önceki medya/liste kapsayıcısını temizle
    let existingContainer = textModal.querySelector('.modal-media-wrapper');
    if (existingContainer) existingContainer.remove();
    let existingSubList = textModal.querySelector('.sub-items-container');
    if (existingSubList) existingSubList.remove();

    window._currentSubHotspots = state.subHotspots;
    window._currentIsSubList = state.isSubList;
    window._currentItemsList = state.itemsList;

    // DURUM 1: Eğer bu adımda bir "Alt Liste / Thumbnail Listesi" varsa (Örn: Capt Outbd DU tıklanınca açılacak menü)
    if (state.isSubList && state.itemsList && Array.isArray(state.itemsList)) {
        let listContainer = document.createElement('div');
        listContainer.className = 'sub-items-container';
        listContainer.style.display = 'flex';
        listContainer.style.flexDirection = 'column';
        listContainer.style.gap = '12px';
        listContainer.style.maxHeight = '65vh';
        listContainer.style.overflowY = 'auto';
        listContainer.style.marginTop = '10px';

        state.itemsList.forEach((subItem, idx) => {
            let itemRow = document.createElement('div');
            itemRow.className = 'popup-item';
            itemRow.style.borderBottom = '1px solid #eee';
            itemRow.style.paddingBottom = '10px';

            itemRow.innerHTML = `
                <span class="item-number">${idx + 1}</span>
                <img src="${subItem.image}" alt="${subItem.title}">
                <div class="item-text">
                    <h4 class="sub-detail-title" style="cursor:pointer; color:#0066cc; text-decoration:underline; margin:0 0 4px 0;">${subItem.title}</h4>
                    <p style="margin:0; font-size:11px; color:#555;">${subItem.desc || 'Detay için tıklayın.'}</p>
                </div>
            `;

            // Thumbnail resme veya başlığa tıklandığında büyük resmi aç
            let clickAction = function(ev) {
                ev.stopPropagation();
                renderModalState({
                    title: subItem.title,
                    desc: subItem.desc,
                    image: subItem.image,
                    subHotspots: subItem.subHotspots || [],
                    isSubList: false
                });
            };

            itemRow.querySelector('img').addEventListener('click', clickAction);
            itemRow.querySelector('.sub-detail-title').addEventListener('click', clickAction);

            listContainer.appendChild(itemRow);
        });

        var contentBox = textModal.querySelector('.text-modal-content');
        contentBox.insertBefore(listContainer, textModalDesc);
    } 
    // DURUM 2: Normal Büyük Resim ve Üzerindeki Hotspot'lar
    else if (state.image) {
        let mediaWrapper = document.createElement('div');
        mediaWrapper.className = 'modal-media-wrapper';

        let modalImg = document.createElement('img');
        modalImg.className = 'modal-inner-img';
        modalImg.src = state.image;
        mediaWrapper.appendChild(modalImg);

        let subLayer = document.createElement('div');
        subLayer.className = 'sub-hotspot-layer';
        subLayer.style.position = 'absolute';
        subLayer.style.top = '0';
        subLayer.style.left = '0';
        subLayer.style.width = '100%';
        subLayer.style.height = '100%';
        subLayer.style.pointerEvents = 'none';

        if (state.subHotspots && Array.isArray(state.subHotspots)) {
            state.subHotspots.forEach(sub => {
                var subDot = document.createElement('div');
                subDot.className = 'sub-hotspot-dot';
                subDot.style.position = 'absolute';
                subDot.style.top = sub.top;
                subDot.style.left = sub.left;
                subDot.style.width = '20px';  
                subDot.style.height = '20px'; 
                subDot.style.background = 'rgba(255, 140, 0, 0.95)'; 
                subDot.style.border = '1.5px solid #ffffff';
                subDot.style.borderRadius = '50%';
                subDot.style.transform = 'translate(-50%, -50%)';
                subDot.style.cursor = 'pointer';
                subDot.style.pointerEvents = 'auto';
                subDot.style.boxShadow = '0 0 10px rgba(255, 140, 0, 0.8)'; 
                subDot.style.zIndex = '100000';
                
                subDot.innerHTML = '<span style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #fff; font-size: 11px; font-weight: bold;">i</span>';

                subDot.addEventListener('click', function(ev) {
                    ev.stopPropagation();

                    // KONTROL: Eğer bu noktaya tıklandığında bir alt liste açılacaksa (Örn: Flags / Alt Menü)
                    if (sub.isSubList && sub.items) {
                        renderModalState({
                            title: sub.title,
                            desc: sub.desc,
                            isSubList: true,
                            itemsList: sub.items
                        });
                    } 
                    // Eğer doğrudan yeni bir resim açılacaksa
                    else if (sub.image) {
                        renderModalState({
                            title: sub.title,
                            desc: sub.desc,
                            image: sub.image,
                            subHotspots: sub.subHotspots || [],
                            isSubList: false
                        });
                    } 
                    // Sadece metin kutusu gösterecekse
                    else {
                        let infoBox = document.getElementById('subInfoBox');
                        if (infoBox) infoBox.remove();

                        infoBox = document.createElement('div');
                        infoBox.id = 'subInfoBox';
                        infoBox.style.position = 'fixed';
                        infoBox.style.top = '50%';
                        infoBox.style.left = '50%';
                        infoBox.style.transform = 'translate(-50%, -50%)';
                        infoBox.style.background = '#ffffff';
                        infoBox.style.padding = '20px';
                        infoBox.style.borderRadius = '10px';
                        infoBox.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
                        infoBox.style.zIndex = '99999999';
                        infoBox.style.maxWidth = '380px';
                        infoBox.style.fontFamily = 'Arial, sans-serif';

                        infoBox.innerHTML = `
                            <h4 style="margin:0 0 10px 0; color:#ff8c00; cursor:move; user-select:none;">${sub.title}</h4>
                            <div style="font-size:13px; color:#333; line-height:1.4; white-space: pre-line;">${sub.desc}</div>
                            <button style="margin-top:15px; background:#0066cc; color:#fff; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; float:right;" onclick="document.getElementById('subInfoBox').remove()"> X </button>
                        `;
                       
                        document.body.appendChild(infoBox);

                        // Sürükle-bırak desteği
                        var isSubDragging = false;
                        var sX, sY, initX, initY;
                        infoBox.addEventListener('mousedown', function(e) {
                            if (e.target.tagName === 'BUTTON') return;
                            isSubDragging = true;
                            sX = e.clientX;
                            sY = e.clientY;
                            var bRect = infoBox.getBoundingClientRect();
                            initX = bRect.left;
                            initY = bRect.top;
                            infoBox.style.transform = 'none';
                            infoBox.style.left = initX + 'px';
                            infoBox.style.top = initY + 'px';

                            var onSubMouseMove = function(moveEvent) {
                                if (!isSubDragging) return;
                                infoBox.style.left = (initX + (moveEvent.clientX - sX)) + 'px';
                                infoBox.style.top = (initY + (moveEvent.clientY - sY)) + 'px';
                            };
                            var onSubMouseUp = function() {
                                isSubDragging = false;
                                document.removeEventListener('mousemove', onSubMouseMove);
                                document.removeEventListener('mouseup', onSubMouseUp);
                            };
                            document.addEventListener('mousemove', onSubMouseMove);
                            document.addEventListener('mouseup', onSubMouseUp);
                        });
                    }
                });

                subLayer.appendChild(subDot);
            });
        }

        mediaWrapper.appendChild(subLayer);
        
        var contentBox = textModal.querySelector('.text-modal-content');
        contentBox.insertBefore(mediaWrapper, textModalDesc);
    }

    textModal.style.display = 'flex';
}

// --- HOTSPOT OLUŞTURMA FONKSİYONU ---
function createCustomHotspot(sceneName, jsonFile, buttonText, coordinates) {
    var hotspotElement = document.createElement('div');
    hotspotElement.className = 'custom-hotspot';
    hotspotElementsList.push(hotspotElement); 

    var dotElement = document.createElement('div');
    dotElement.className = 'hotspot-dot';
    
    var textSpan = document.createElement('span');
    textSpan.className = 'hotspot-text';
    textSpan.innerHTML = buttonText;
    
    dotElement.appendChild(textSpan);
    hotspotElement.appendChild(dotElement);

    var popupElement = document.createElement('div');
    popupElement.className = 'hotspot-popup';
    hotspotElement.appendChild(popupElement);

    popupElement.addEventListener('click', function(e) {
        e.stopPropagation();
    });

    // JSON Dosyasından verileri çekme
    fetch(jsonFile)
        .then(response => response.json())
        .then(groups => {
            var globalIndex = 1;

            groups.forEach(group => {
                var groupHeader = document.createElement('div');
                groupHeader.className = 'group-header';
                groupHeader.textContent = group.groupName;
                popupElement.appendChild(groupHeader);

                group.items.forEach(item => {
                    var itemDiv = document.createElement('div');
                    itemDiv.className = 'popup-item';
                    
                    itemDiv.innerHTML = `
                        <span class="item-number">${globalIndex}</span>
                        <img src="${item.image}" alt="Detay ${item.id}" data-item-index="${globalIndex}">
                        <div class="item-text">
                            <h4 class="detail-title" data-title="${item.title}" data-desc="${item.desc}">${item.title}</h4>
                            <p>Detay için başlığa veya resme tıklayın.</p>
                        </div>
                    `;
                    popupElement.appendChild(itemDiv);

                    // --- İLK SEVİYE AÇILIŞ ---
                    var openModalHandler = function(e) {
                        e.stopPropagation();
                        modalStack = []; // En baştan açıldığı için geçmişi sıfırla
                        renderModalState({
                            title: item.title,
                            desc: item.desc,
                            image: item.image,
                            subHotspots: item.subHotspots || [],
                            isSubList: false
                        }, false);
                    };

                    var imgElem = itemDiv.querySelector('img');
                    if (imgElem) {
                        imgElem.addEventListener('click', openModalHandler);
                    }

                    var titleElem = itemDiv.querySelector('.detail-title');
                    if (titleElem) {
                        titleElem.addEventListener('click', openModalHandler);
                    }

                    globalIndex++;
                });
            });
        })
        .catch(error => console.error(jsonFile + ' yükleme hatası:', error));

    hotspotElement.addEventListener('pointerdown', function(e) {
        e.stopPropagation();
    });

    hotspotElement.addEventListener('click', function(e) {
        e.stopPropagation();

        document.querySelectorAll('.hotspot-popup').forEach(function(p) {
            if (p !== popupElement) p.style.display = 'none';
        });

        if (popupElement.style.display === 'flex') {
            popupElement.style.display = 'none';
            if (axisOverlay && toggleAxis && !toggleAxis.checked) {
                axisOverlay.style.opacity = '1';
            }
        } else {
            if (axisOverlay) axisOverlay.style.opacity = '0';

            popupElement.style.display = 'flex';
            popupElement.style.position = 'fixed';

            var currentView = viewer.view();
            currentView.lookAt({
                yaw: coordinates.yaw,
                pitch: coordinates.pitch
            });

            var rect = dotElement.getBoundingClientRect();
            var popupRect = popupElement.getBoundingClientRect();

            var popupWidth = popupRect.width || 440;
            var popupHeight = popupRect.height || 350;

            var leftPos = rect.right + 15;
            if (leftPos + popupWidth > window.innerWidth - 15) {
                leftPos = rect.left - popupWidth - 15;
            }
            popupElement.style.left = leftPos + 'px';

            var buttonCenterY = rect.top + (rect.height / 2);
            var topPos = buttonCenterY - (popupHeight / 2);

            if (topPos < 15) topPos = 15;
            if (topPos + popupHeight > window.innerHeight - 15) {
                topPos = window.innerHeight - popupHeight - 15;
            }

            popupElement.style.top = topPos + 'px';
        }
    });

    if (scenes[sceneName]) {
        scenes[sceneName].hotspotContainer().createHotspot(hotspotElement, coordinates, { interactive: true });
    }
}

// --- HOTSPOT'LARIN TANIMLANMASI ---
createCustomHotspot('main', 'detaylar1.json', '🔍 ELT P5', { yaw: -1.02, pitch: -1.10 });
createCustomHotspot('main', 'detaylar2.json', '🔍 LE Devices P5', { yaw: -0.91, pitch: -1.02 });
createCustomHotspot('main', 'detaylar3.json', '🔍 Elevator Jam P5', { yaw: -0.90, pitch: -0.88 });
createCustomHotspot('main', 'detaylar4.json', '🔍 Maint Light P5', { yaw: -0.73, pitch: -0.93 });

createCustomHotspot('main', 'detaylar5.json', '⚡ Flight Control paneli', { yaw: -0.72, pitch: -0.58 });
createCustomHotspot('main', 'detaylar6.json', '🔍 NAv source panel P5', { yaw: -0.69, pitch: -0.48 });
createCustomHotspot('main', 'detaylar7.json', '🔍 Display Source panel P5', { yaw: -0.65, pitch: -0.42 });
createCustomHotspot('main', 'detaylar8.json', '📻 Fuel control panel p5', { yaw: -0.59, pitch: -0.25 });
createCustomHotspot('main', 'detaylar9.json', '📻 External Light control p5', { yaw: -0.49, pitch: -0.20 });
createCustomHotspot('main', 'detaylar10.json', '📻 MCP,EFIS capt side panels p7', { yaw: -0.51, pitch: 0.05 });
createCustomHotspot('main', 'detaylar11.json', '📻 Master caution capt side p7', { yaw: -0.70, pitch: 0.04 });
createCustomHotspot('main', 'detaylar12.json', '📻 P1 capt side panels', { yaw: -0.59, pitch: 0.16 });
createCustomHotspot('main', 'detaylar13.json', '📻 P3 fo side panels', { yaw: -0.05, pitch: 0.17 });
createCustomHotspot('main', 'detaylar14.json', '🔍 Observer Seats', { yaw: -1.86, pitch: 0.86 });
createCustomHotspot('main', 'detaylar15.json', '🔍 LG lights', { yaw: -0.33, pitch: 0.20 });