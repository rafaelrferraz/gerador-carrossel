document.addEventListener('DOMContentLoaded', () => {
    // === CONSTANTES E VARIÁVEIS GLOBAIS ===
    const API_BASE_URL = 'https://script.google.com/macros/s/AKfycbx1l6QuqWnD4fg0XcUyGlGxnBpItqX5-Uw_fBhk9ov1SvuFTfDrY1Ok2YNlUwqC8wNdig/exec';
    const CLOUDINARY_CLOUD_NAME = 'dh8hpjwlc';
    const CLOUDINARY_UPLOAD_PRESET = 'my-carousel-preset';

    let allRoteiros = [];
    let themeRoteiros = [];
    let currentSlideIndex = 0;
    let activeElement = null;
    let elementCounter = 0;
    let isPanning = false;

    // Variáveis para Zoom e Pan
    let currentScale = 1;
    let slidePosX = 0;
    let slidePosY = 0;

    const watermarkData = {
        clara: 'https://i.imgur.com/aRMubKX.png',
        escura: 'https://i.imgur.com/1jWGIzV.png'
    };
    const colors = {
        terracota: '#C36640',
        lightGray: '#F4F4F4',
        black: '#000000',
    };

    // === ELEMENTOS DO DOM ===
    const slideContainer = document.getElementById('slideContainer');
    const introScreen = document.getElementById('intro-screen');
    const introThemeDropdown = document.getElementById('introThemeDropdown');
    const introCarouselDropdown = document.getElementById('introCarouselDropdown');
    const confirmBtn = document.getElementById('confirmBtn');
    const topBarsWrapper = document.querySelector('.top-bars-wrapper');
    const mainElement = document.querySelector('main');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const slideCounter = document.getElementById('slideCounter');
    const themeDropdown = document.getElementById('themeDropdown');
    const carouselDropdown = document.getElementById('carouselDropdown');
    const boldBtn = document.getElementById('boldBtn');
    const italicBtn = document.getElementById('italicBtn');
    const underlineBtn = document.getElementById('underlineBtn');
    const leftAlignBtn = document.getElementById('leftAlignBtn');
    const centerAlignBtn = document.getElementById('centerAlignBtn');
    const rightAlignBtn = document.getElementById('rightAlignBtn');
    const justifyBtn = document.getElementById('justifyBtn');
    const lineHeightSelect = document.getElementById('lineHeightSelect');
    const fontFamilySelect = document.getElementById('fontFamilySelect');
    const fontSizeSelect = document.getElementById('fontSizeSelect');
    const textColorPicker = document.getElementById('textColorPicker');
    const bringToFrontBtn = document.getElementById('bringToFrontBtn');
    const sendToBackBtn = document.getElementById('sendToBackBtn');
    const opacitySlider = document.getElementById('opacitySlider');
    const deleteBtn = document.getElementById('deleteBtn');
    const colorPicker = document.getElementById('colorPicker');
    const exportPngBtn = document.getElementById('exportPngBtn');
    const imageUpload = document.getElementById('imageUpload');
    const addSlideBtn = document.getElementById('addSlideBtn');
    const removeSlideBtn = document.getElementById('removeSlideBtn');
    const uploadBtn = document.getElementById('uploadBtn');
    const saveBtn = document.getElementById('saveBtn');
    const addTextBtn = document.getElementById('addTextBtn');
    const resetZoomBtn = document.getElementById('resetZoomBtn');

    // === FUNÇÕES AUXILIARES ===
    function updateSlideTransform() {
        slideContainer.style.transform = `translate(${slidePosX}px, ${slidePosY}px) scale(${currentScale})`;
    }

    function rgbToHex(rgb) {
        if (!rgb || !rgb.startsWith('rgb')) return rgb;
        let sep = rgb.indexOf(",") > -1 ? "," : " ";
        rgb = rgb.substr(4).split(")")[0].split(sep);
        let r = (+rgb[0]).toString(16).padStart(2, '0');
        let g = (+rgb[1]).toString(16).padStart(2, '0');
        let b = (+rgb[2]).toString(16).padStart(2, '0');
        return "#" + r + g + b;
    }

    function isColorDark(rgbColor) {
        if (!rgbColor) return false;
        if (rgbColor.startsWith('#')) {
            let r = 0, g = 0, b = 0;
            if (rgbColor.length == 4) { r = "0x" + rgbColor[1] + rgbColor[1]; g = "0x" + rgbColor[2] + rgbColor[2]; b = "0x" + rgbColor[3] + rgbColor[3]; }
            else if (rgbColor.length == 7) { r = "0x" + rgbColor[1] + rgbColor[2]; g = "0x" + rgbColor[3] + rgbColor[4]; b = "0x" + rgbColor[5] + rgbColor[6]; }
            return (0.2126 * +r + 0.7152 * +g + 0.0722 * +b) < 140;
        }
        const sep = rgbColor.indexOf(",") > -1 ? "," : " ";
        const rgb = rgbColor.substr(4).split(")")[0].split(sep);
        let r = parseInt(rgb[0], 10), g = parseInt(rgb[1], 10), b = parseInt(rgb[2], 10);
        return (0.2126 * r + 0.7152 * g + 0.0722 * b) < 140;
    }

    // === LÓGICA DE INTERATIVIDADE COM INTERACT.JS ===
    function dragMoveListener(event) {
        if (isPanning) {
            slidePosX += event.dx;
            slidePosY += event.dy;
            updateSlideTransform();
            return;
        }

        const target = event.target;
        let x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
        let y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
        const angle = parseFloat(target.getAttribute('data-angle')) || 0;

        if (target.classList.contains('is-text')) {
            const snapTargets = [
                { x: slideContainer.offsetWidth * 0.25, y: slideContainer.offsetHeight * 0.25 },
                { x: slideContainer.offsetWidth * 0.50, y: slideContainer.offsetHeight * 0.50 },
                { x: slideContainer.offsetWidth * 0.75, y: slideContainer.offsetHeight * 0.75 },
            ];
            const snapThreshold = 3;
            const targetRect = target.getBoundingClientRect();
            const containerRect = slideContainer.getBoundingClientRect();
            const centerX = (targetRect.left - containerRect.left) + (targetRect.width / 2);
            const centerY = (targetRect.top - containerRect.top) + (targetRect.height / 2);
            document.querySelectorAll('.snap-line-v, .snap-line-h').forEach(l => l.classList.remove('visible'));
            for (const snap of snapTargets) {
                if (Math.abs(centerX - snap.x) < snapThreshold) {
                    x = x - (centerX - snap.x);
                    document.getElementById(`snap-v-${Math.round(snap.x / slideContainer.offsetWidth * 100)}`).classList.add('visible');
                }
                if (Math.abs(centerY - snap.y) < snapThreshold) {
                    y = y - (centerY - snap.y);
                    document.getElementById(`snap-h-${Math.round(snap.y / slideContainer.offsetHeight * 100)}`).classList.add('visible');
                }
            }
        }
        else if (target.classList.contains('is-watermark')) {
            const snapThreshold = 5;
            const containerWidth = slideContainer.offsetWidth;
            const elementWidth = target.offsetWidth;
            const elementCenterX = x + (elementWidth / 2);
            const containerCenterX = containerWidth / 2;
            if (Math.abs(elementCenterX - containerCenterX) < snapThreshold) {
                x = containerCenterX - (elementWidth / 2);
            }
        }

        target.style.transform = `translate(${x}px, ${y}px) rotate(${angle}deg)`;
        target.setAttribute('data-x', x);
        target.setAttribute('data-y', y);
    }

    function dragEndListener() {
        document.querySelectorAll('.snap-line-v, .snap-line-h').forEach(l => l.classList.remove('visible'));
    }

    function resizeListener(event) {
        const target = event.target;
        let x = (parseFloat(target.getAttribute('data-x')) || 0);
        let y = (parseFloat(target.getAttribute('data-y')) || 0);
        const ratio = parseFloat(target.getAttribute('data-ratio'));
        const angle = parseFloat(target.getAttribute('data-angle')) || 0;
        let newWidth = event.rect.width;
        let newHeight = event.rect.height;

        if (ratio) newHeight = newWidth / ratio;

        target.style.width = newWidth + 'px';
        target.style.height = newHeight + 'px';

        x += event.deltaRect.left;
        y += event.deltaRect.top;
        target.style.transform = `translate(${x}px, ${y}px) rotate(${angle}deg)`;
        target.setAttribute('data-x', x);
        target.setAttribute('data-y', y);
    }

    function makeInteractive(target) {
        interact(target)
            .draggable({
                listeners: { move: dragMoveListener, end: dragEndListener },
                inertia: true,
            })
            .resizable({
                edges: { left: true, right: true, bottom: true, top: true },
                listeners: { move: resizeListener },
                modifiers: [interact.modifiers.restrictSize({ min: { width: 50 } })],
                inertia: false
            })
            .on('tap', setActiveElement);

        const rotationHandle = target.querySelector('.rotation-handle');
        if (rotationHandle) {
            interact(rotationHandle).draggable({
                onstart: function (event) {
                    const rect = target.getBoundingClientRect();
                    const slideRect = slideContainer.getBoundingClientRect();
                    target.setAttribute('data-center-x', (rect.left - slideRect.left) + rect.width / 2);
                    target.setAttribute('data-center-y', (rect.top - slideRect.top) + rect.height / 2);
                },
                onmove: function (event) {
                    const centerX = parseFloat(target.getAttribute('data-center-x'));
                    const centerY = parseFloat(target.getAttribute('data-center-y'));
                    const slideRect = slideContainer.getBoundingClientRect();
                    const clientX = event.clientX - slideRect.left;
                    const clientY = event.clientY - slideRect.top;
                    const angle = Math.atan2(clientY - centerY, clientX - centerX);
                    const x = parseFloat(target.getAttribute('data-x')) || 0;
                    const y = parseFloat(target.getAttribute('data-y')) || 0;
                    const newAngle = angle * (180 / Math.PI) + 90;
                    target.style.transform = `translate(${x}px, ${y}px) rotate(${newAngle}deg)`;
                    target.setAttribute('data-angle', newAngle);
                },
                onend: function (event) {
                    target.removeAttribute('data-center-x');
                    target.removeAttribute('data-center-y');
                }
            });
        }
    }

    function setActiveElement(event) {
        if (activeElement) {
            activeElement.classList.remove('selected');
        }
        activeElement = event.currentTarget;
        activeElement.classList.add('selected');
        updateToolbarState();
    }

    document.addEventListener('click', function (e) {
        if (!slideContainer.contains(e.target) && !e.target.closest('.editor-toolbar') && activeElement) {
            activeElement.classList.remove('selected');
            activeElement = null;
            updateToolbarState();
        }
    });

    // === RENDERIZAÇÃO E ESTADO ===
    function saveCurrentSlideContent() {
        if (currentSlideIndex < 0 || !allRoteiros[currentSlideIndex]) return;
        const elementsData = [];
        slideContainer.querySelectorAll('.draggable-item').forEach(el => {
            const isText = el.classList.contains('is-text');
            const type = isText ? 'text' : (el.classList.contains('is-watermark') ? 'watermark' : 'image');
            const elementState = {
                id: el.id, type: type,
                x: el.getAttribute('data-x') || 0,
                y: el.getAttribute('data-y') || 0,
                angle: el.getAttribute('data-angle') || 0,
                width: el.style.width,
                height: el.style.height,
                content: isText ? el.innerHTML : el.querySelector('img').src,
                style: el.style.cssText
            };
            if (type === 'image') elementState.ratio = el.getAttribute('data-ratio');
            elementsData.push(elementState);
        });
        allRoteiros[currentSlideIndex].slideState = elementsData;
        allRoteiros[currentSlideIndex].backgroundColor = slideContainer.style.backgroundColor;
    }

    function createDefaultDOMElements(roteiro, textColor) {
        // --- PADRÕES DE ESTILO E POSIÇÃO ---

        // --- TÍTULO DO PRIMEIRO SLIDE (CAPA) ---
        const firstSlideTitlePosX = 35;
        const firstSlideTitlePosY = 80;
        const firstSlideTitleFontSize = '20px';
        const firstSlideTitleFontFamily = 'Cinzel';

        // --- TÍTULOS DOS OUTROS SLIDES (PADRÃO) ---
        const titlePosX = 35;
        const titlePosY = 40;
        const titleFontSize = '20px';
        const titleFontFamily = 'Aguila Bold';

        // --- CORPO DO TEXTO (PADRÃO) ---
        const bodyPosX = 35;
        const bodyPosY = 120;
        const bodyBoldColor = '#000000';
        const bodyBoldFontFamily = 'Aguila Bold'; // <-- NOVO: Fonte para o negrito do corpo

        if (roteiro.titulo && roteiro.titulo.trim() !== '') {
            const titleDiv = document.createElement('div');
            titleDiv.id = `element-${elementCounter++}`;
            titleDiv.className = 'draggable-item is-text';
            titleDiv.setAttribute('contenteditable', 'true');
            titleDiv.innerHTML = roteiro.titulo;
            titleDiv.style.color = textColor;
            titleDiv.style.textAlign = 'center';
            titleDiv.style.width = '250px';

            if (currentSlideIndex === 0) {
                titleDiv.style.fontFamily = firstSlideTitleFontFamily;
                titleDiv.style.fontSize = firstSlideTitleFontSize;
                titleDiv.setAttribute('data-x', firstSlideTitlePosX);
                titleDiv.setAttribute('data-y', firstSlideTitlePosY);
                titleDiv.style.transform = `translate(${firstSlideTitlePosX}px, ${firstSlideTitlePosY}px)`;
            } else {
                titleDiv.style.fontFamily = titleFontFamily;
                titleDiv.style.fontSize = titleFontSize;
                titleDiv.setAttribute('data-x', titlePosX);
                titleDiv.setAttribute('data-y', titlePosY);
                titleDiv.style.transform = `translate(${titlePosX}px, ${titlePosY}px)`;
            }

            titleDiv.querySelectorAll('b, strong').forEach(boldEl => {
                boldEl.style.color = textColor;
            });

            slideContainer.appendChild(titleDiv);
            makeInteractive(titleDiv);
        }

        if (roteiro.corpo && roteiro.corpo.trim() !== '') {
            const bodyDiv = document.createElement('div');
            bodyDiv.id = `element-${elementCounter++}`;
            bodyDiv.className = 'draggable-item is-text';
            bodyDiv.setAttribute('contenteditable', 'true');
            bodyDiv.innerHTML = roteiro.corpo;
            bodyDiv.style.fontFamily = 'Aguila';
            bodyDiv.style.fontSize = '14px';
            bodyDiv.style.color = textColor;
            bodyDiv.style.textAlign = 'justify';
            bodyDiv.style.width = '250px';
            bodyDiv.setAttribute('data-x', bodyPosX);
            bodyDiv.setAttribute('data-y', bodyPosY);
            bodyDiv.style.transform = `translate(${bodyPosX}px, ${bodyPosY}px)`;

            // Aplica a cor e a FONTE especiais para o negrito do corpo
            bodyDiv.querySelectorAll('b, strong').forEach(boldEl => {
                boldEl.style.color = bodyBoldColor;
                boldEl.style.fontFamily = bodyBoldFontFamily; // <-- APLICA A FONTE ESPECIAL
            });

            slideContainer.appendChild(bodyDiv);
            makeInteractive(bodyDiv);
        }
    }

    function loadState(elementsData) {
        elementsData.forEach(data => {
            let el;
            if (data.type === 'text') {
                el = document.createElement('div');
                el.innerHTML = data.content;
                el.setAttribute('contenteditable', 'true');
            } else {
                el = document.createElement('div');
                const img = document.createElement('img');
                img.src = data.content;
                el.appendChild(img);
                if (data.type === 'image') {
                    const handle = document.createElement('div');
                    handle.className = 'rotation-handle';
                    el.appendChild(handle);
                }
            }
            el.id = data.id || `element-${elementCounter++}`;
            el.className = `draggable-item ${data.type === 'text' ? 'is-text' : (data.type === 'watermark' ? 'is-watermark' : 'is-image')}`;
            el.style.cssText = data.style;
            const angle = data.angle || 0;
            el.style.transform = `translate(${data.x}px, ${data.y}px) rotate(${angle}deg)`;
            el.setAttribute('data-x', data.x);
            el.setAttribute('data-y', data.y);
            el.setAttribute('data-angle', angle);
            if (data.type === 'image' && data.ratio) {
                el.setAttribute('data-ratio', data.ratio);
            }
            slideContainer.appendChild(el);
            makeInteractive(el);
        });
    }

    function updateWatermark() {
        let watermarkEl = slideContainer.querySelector('.is-watermark');
        if (watermarkEl) watermarkEl.remove();
        const isDark = isColorDark(slideContainer.style.backgroundColor);
        const watermarkSrc = isDark ? watermarkData.clara : watermarkData.escura;
        watermarkEl = document.createElement('div');
        watermarkEl.id = `element-${elementCounter++}`;
        watermarkEl.className = 'draggable-item is-watermark';
        const img = document.createElement('img');
        img.src = watermarkSrc;
        watermarkEl.appendChild(img);
        watermarkEl.style.width = '96px';
        watermarkEl.style.height = 'auto';
        const posX = 111;
        const posY = 311;
        watermarkEl.setAttribute('data-x', posX);
        watermarkEl.setAttribute('data-y', posY);
        watermarkEl.style.transform = `translate(${posX}px, ${posY}px)`;
        slideContainer.appendChild(watermarkEl);
        makeInteractive(watermarkEl);
    }

    function renderSlide() {
        const roteiro = allRoteiros[currentSlideIndex];
        if (!roteiro) return;
        slideContainer.innerHTML = '';
        const snapLinesHTML = `
            <div class="snap-line-v" id="snap-v-25"></div> <div class="snap-line-v" id="snap-v-50"></div> <div class="snap-line-v" id="snap-v-75"></div>
            <div class="snap-line-h" id="snap-h-25"></div> <div class="snap-line-h" id="snap-h-50"></div> <div class="snap-line-h" id="snap-h-75"></div>
        `;
        slideContainer.innerHTML = snapLinesHTML;
        elementCounter = 0;
        const slideGlobalIndex = allRoteiros.findIndex(r => r === roteiro);
        const isOdd = slideGlobalIndex % 2 !== 0;
        const defaultBgColor = isOdd ? colors.terracota : colors.lightGray;
        const finalBgColor = roteiro.backgroundColor || defaultBgColor;
        slideContainer.style.backgroundColor = finalBgColor;
        const textColor = isColorDark(finalBgColor) ? colors.lightGray : colors.terracota;

        if (roteiro.slideState && roteiro.slideState.length > 0) {
            loadState(roteiro.slideState);
        } else {
            createDefaultDOMElements(roteiro, textColor);
        }

        slideCounter.textContent = `${currentSlideIndex + 1} / ${allRoteiros.length}`;
        prevBtn.disabled = currentSlideIndex === 0;
        nextBtn.disabled = currentSlideIndex === allRoteiros.length - 1;
        colorPicker.value = rgbToHex(finalBgColor);
        activeElement = null;
        updateToolbarState();
        updateWatermark();
    }
    async function uploadImageToCloudinary(file) {
        const loadingSpinner = document.getElementById('loadingSpinner');
        if (loadingSpinner) loadingSpinner.classList.remove('hidden');

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

        try {
            const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            // VERIFICA SE A RESPOSTA DO CLOUDINARY FOI UM ERRO
            if (!response.ok) {
                // Se houver um objeto de erro na resposta, usa a mensagem dele
                if (data.error) {
                    throw new Error(data.error.message);
                }
                // Caso contrário, usa o status da resposta
                throw new Error(`Falha no upload. Status: ${response.status}`);
            }

            return data.secure_url;

        } catch (error) {
            console.error('Erro detalhado no upload:', error);
            // MOSTRA O ERRO EXATO NO ALERTA
            alert(`Erro ao carregar a imagem: ${error.message}`);
            return null;
        } finally {
            if (loadingSpinner) loadingSpinner.classList.add('hidden');
        }
    }
    // --- API & DADOS ---
    async function fetchThemes() {
        const targetDropdowns = [introThemeDropdown, themeDropdown];
        targetDropdowns.forEach(d => { d.innerHTML = '<option>Carregando...</option>'; d.disabled = true; });
        try {
            const res = await fetch(`${API_BASE_URL}?action=getTemas`);
            if (!res.ok) throw new Error(`Erro de rede: ${res.status}`);
            const data = await res.json();
            if (data.status === 'success') {
                targetDropdowns.forEach(d => {
                    d.innerHTML = '<option value="" disabled selected>Selecione um tema...</option>';
                    data.data.forEach(theme => d.innerHTML += `<option value="${theme}">${theme}</option>`);
                    d.disabled = false;
                });
            } else { throw new Error('API retornou status de falha.'); }
        } catch (err) {
            console.error('Falha ao buscar temas.', err);
            targetDropdowns.forEach(d => { d.innerHTML = '<option>Erro ao carregar</option>'; });
        }
    }

    async function fetchRoteiros(tema, targetDropdown) {
        console.log('Buscando roteiros para o tema:', tema);
        targetDropdown.innerHTML = '<option>Carregando...</option>';
        targetDropdown.disabled = true;
        try {
            const res = await fetch(`${API_BASE_URL}?action=getRoteiro&tema=${encodeURIComponent(tema)}`);
            if (!res.ok) throw new Error(`Erro de rede: ${res.status}`);

            const data = await res.json();
            console.log('Resposta da API recebida:', data);

            if (data.status === 'success' && data.data && data.data.length > 0) {
                themeRoteiros = data.data;
                console.log('Roteiros armazenados:', themeRoteiros);

                targetDropdown.innerHTML = '<option value="" disabled selected>Selecione um roteiro...</option>';
                themeRoteiros.forEach((c, i) => {
                    if (!c.title) {
                        console.warn('AVISO: Roteiro no índice', i, 'não tem um título (c.title). Roteiro:', c);
                    }
                    targetDropdown.innerHTML += `<option value="${i}">${(c.title || `Roteiro Sem Título ${i + 1}`).replace(/<[^>]*>/g, '')}</option>`;
                });
                targetDropdown.disabled = false;

                // ==========================================================
                // NOVA LÓGICA CORRIGIDA:
                // Se o dropdown da tela inicial foi carregado, mostra o botão.
                // ==========================================================
                if (targetDropdown.id === 'introCarouselDropdown') {
                    confirmBtn.classList.remove('hidden');
                }

            } else {
                targetDropdown.innerHTML = '<option>Nenhum roteiro encontrado</option>';
                // Se não encontrou roteiros, garante que o botão de confirmar esteja escondido
                if (targetDropdown.id === 'introCarouselDropdown') {
                    confirmBtn.classList.add('hidden');
                }
            }
        } catch (err) {
            console.error('Falha CRÍTICA ao buscar roteiros.', err);
            targetDropdown.innerHTML = '<option>Erro ao carregar</option>';
        }
    }
    async function loadRoteiroByIndex(index) {
        const carouselOriginal = themeRoteiros[index];
        if (!carouselOriginal) return;

        const carrosselId = carouselOriginal.slides[0]?.carrossel_id;
        if (!carrosselId) {
            console.error("ID do carrossel não encontrado.");
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}?action=getEditedRoteiro&carrossel_id=${carrosselId}`);
            const result = await response.json();

            if (result.status === 'success' && result.data) {
                console.log("Carregando roteiro editado da planilha.");
                allRoteiros = result.data;
            } else {
                console.log("Carregando roteiro original.");
                allRoteiros = JSON.parse(JSON.stringify(carouselOriginal.slides));

                // --- LÓGICA DO SLIDE DE TÍTULO (CAPA) ---
                const firstSlide = allRoteiros[0];
                if (firstSlide && firstSlide.titulo && firstSlide.titulo.trim() !== '') {
                    const titleSlide = { ...firstSlide, corpo: '', fechamento: '' };
                    allRoteiros.unshift(titleSlide);
                    allRoteiros[1].titulo = '';
                }

                // ==========================================================
                // NOVA LÓGICA PARA O SLIDE DE FECHAMENTO
                // ==========================================================
                const lastSlideData = carouselOriginal.slides[carouselOriginal.slides.length - 1];
                if (lastSlideData && lastSlideData.fechamento && lastSlideData.fechamento.trim() !== '') {
                    // Cria um novo slide apenas com o texto de fechamento no corpo
                    const closingSlide = {
                        ...lastSlideData,
                        titulo: '',
                        corpo: lastSlideData.fechamento
                    };
                    allRoteiros.push(closingSlide);
                }
            }

        } catch (error) {
            console.error("Erro ao buscar roteiro editado, carregando original.", error);
            allRoteiros = JSON.parse(JSON.stringify(carouselOriginal.slides));
        }

        currentSlideIndex = 0;
        renderSlide();
    }
    async function saveEditedRoteiro() {
        saveCurrentSlideContent();
        if (!allRoteiros || allRoteiros.length === 0) {
            alert('Não há nada para salvar.');
            return;
        }
        console.log("Salvando roteiro:", allRoteiros);
        const saveBtnIcon = saveBtn.querySelector('i');
        saveBtnIcon.classList.remove('fa-save');
        saveBtnIcon.classList.add('fa-spinner', 'fa-spin');
        saveBtn.disabled = true;
        try {
            const response = await fetch(`${API_BASE_URL}?action=salvarRoteiroEditado`, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ slides: allRoteiros })
            });
            alert('Roteiro salvo com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar:', error);
            alert('Ocorreu um erro ao tentar salvar o roteiro.');
        } finally {
            saveBtnIcon.classList.remove('fa-spinner', 'fa-spin');
            saveBtnIcon.classList.add('fa-save');
            saveBtn.disabled = false;
        }
    }

    // --- NAVEGAÇÃO E AÇÕES DE SLIDE ---
    function showPrevSlide() {
        saveCurrentSlideContent();
        if (currentSlideIndex > 0) {
            currentSlideIndex--;
            renderSlide();
        }
    }

    function showNextSlide() {
        saveCurrentSlideContent();
        if (currentSlideIndex < allRoteiros.length - 1) {
            currentSlideIndex++;
            renderSlide();
        }
    }

    function addNewSlide() {
        saveCurrentSlideContent();
        const currentRoteiro = allRoteiros[currentSlideIndex];
        const newSlide = {
            titulo: '', corpo: 'Novo Slide', backgroundColor: null,
            carrossel_id: currentRoteiro.carrossel_id,
            tema_geral: currentRoteiro.tema_geral,
            slideState: null
        };
        allRoteiros.splice(currentSlideIndex + 1, 0, newSlide);
        currentSlideIndex++;
        renderSlide();
    }

    function removeCurrentSlide() {
        if (allRoteiros.length <= 1) {
            alert('Não é possível remover o único slide.');
            return;
        }
        if (confirm('Tem certeza que deseja remover este slide?')) {
            allRoteiros.splice(currentSlideIndex, 1);
            if (currentSlideIndex >= allRoteiros.length) {
                currentSlideIndex = allRoteiros.length - 1;
            }
            renderSlide();
        }
    }

    // --- FERRAMENTAS DO EDITOR ---
    function updateToolbarState() {
        const textControls = [boldBtn, italicBtn, underlineBtn, leftAlignBtn, centerAlignBtn, rightAlignBtn, justifyBtn, fontFamilySelect, fontSizeSelect, textColorPicker, lineHeightSelect];
        const generalControls = [deleteBtn, bringToFrontBtn, sendToBackBtn, opacitySlider];

        [...textControls, ...generalControls].forEach(control => control && (control.disabled = !activeElement));

        // O botão de reset do zoom fica sempre ativo
        if (resetZoomBtn) resetZoomBtn.disabled = false;

        if (!activeElement) {
            textControls.forEach(control => control && control.classList.remove('active'));
            return;
        }

        if (!activeElement.classList.contains('is-text')) {
            textControls.forEach(control => control.disabled = true);
            return;
        }

        setTimeout(() => {
            boldBtn.classList.toggle('active', document.queryCommandState('bold'));
            italicBtn.classList.toggle('active', document.queryCommandState('italic'));
            underlineBtn.classList.toggle('active', document.queryCommandState('underline'));

            const styles = window.getComputedStyle(activeElement);
            leftAlignBtn.classList.toggle('active', styles.textAlign === 'left' || styles.textAlign === 'start');
            centerAlignBtn.classList.toggle('active', styles.textAlign === 'center');
            rightAlignBtn.classList.toggle('active', styles.textAlign === 'right' || styles.textAlign === 'end');
            justifyBtn.classList.toggle('active', styles.textAlign === 'justify');

            // --- LÓGICA DA FONTE CORRIGIDA ---
            // Pega o nome da fonte no ponto da seleção e remove aspas
            const selectionFont = document.queryCommandValue('fontName').replace(/['"]/g, '');
            // Usa a fonte da seleção, ou a fonte do bloco inteiro como fallback
            fontFamilySelect.value = selectionFont || styles.fontFamily.replace(/['"]/g, '');
            // --- FIM DA CORREÇÃO ---

            fontSizeSelect.value = parseInt(styles.fontSize, 10);

            const computedLineHeight = styles.lineHeight;
            if (computedLineHeight === 'normal') {
                lineHeightSelect.value = '1.2';
            } else {
                const lineHeightValue = parseFloat(computedLineHeight);
                const fontSizeValue = parseFloat(styles.fontSize);
                if (fontSizeValue > 0) {
                    const finalRatio = (lineHeightValue / fontSizeValue).toFixed(1);
                    lineHeightSelect.value = finalRatio;
                }
            }

            const selectionColor = document.queryCommandValue('foreColor');
            textColorPicker.value = rgbToHex(selectionColor);
            opacitySlider.value = styles.opacity;
        }, 10);
    }

    function applyFormat(command) {
        if (activeElement && activeElement.getAttribute('contenteditable') === 'true') {
            document.execCommand(command, false, null);
            activeElement.focus();
            updateToolbarState();
        }
    }

    function setStyle(property, value) {
        if (activeElement) {
            activeElement.style[property] = value;
            updateToolbarState();
        }
    }

    function addNewTextBox() {
        const newText = document.createElement('div');
        newText.id = `element-${elementCounter++}`;
        newText.className = 'draggable-item is-text';
        newText.setAttribute('contenteditable', 'true');
        newText.innerHTML = "Novo Texto";
        newText.style.width = '280px';
        newText.style.height = '80px';
        newText.style.fontFamily = 'Aguila';
        newText.style.fontSize = '16px';
        const posX = 20;
        const posY = 50;
        newText.setAttribute('data-x', posX);
        newText.setAttribute('data-y', posY);
        newText.style.transform = `translate(${posX}px, ${posY}px)`;
        slideContainer.appendChild(newText);
        makeInteractive(newText);
        setActiveElement({ currentTarget: newText });
    }

    function exportSlideAsPNG() {
        if (activeElement) {
            activeElement.classList.remove('selected');
            activeElement = null;
        }
        html2canvas(slideContainer, {
            scale: 4,
            useCORS: true,
            backgroundColor: null
        }).then(canvas => {
            const link = document.createElement('a');
            link.download = `slide_${currentSlideIndex + 1}_exportado.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        });
    }

    // === SETUP DE EVENTOS DO DOM ===

    function setupEventListeners() {
        const addSafeListener = (el, event, handler) => {
            if (el) el.addEventListener(event, handler);
        };

        // --- Listener de Upload de Imagem CORRIGIDO ---
        addSafeListener(imageUpload, 'change', async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;

            // 1. FAZ O UPLOAD PARA O CLOUDINARY PRIMEIRO
            const cloudinaryUrl = await uploadImageToCloudinary(file);
            e.target.value = ''; // Limpa o input para poder selecionar o mesmo arquivo de novo

            // 2. VERIFICA SE O UPLOAD FUNCIONOU
            if (!cloudinaryUrl) {
                console.error("Upload para o Cloudinary falhou. A imagem não será adicionada.");
                return; // Para a execução se o upload falhou
            }

            // 3. USA A URL DO CLOUDINARY PARA CRIAR A IMAGEM NO SLIDE
            const tempImg = new Image();
            tempImg.onload = () => {
                const ratio = tempImg.naturalWidth / tempImg.naturalHeight;
                const initialWidth = 150;

                const imgContainer = document.createElement('div');
                imgContainer.id = `element-${elementCounter++}`;
                imgContainer.className = 'draggable-item is-image';

                const img = document.createElement('img');
                img.src = cloudinaryUrl; // <-- USA A URL CORRETA DO CLOUDINARY
                imgContainer.appendChild(img);

                const handle = document.createElement('div');
                handle.className = 'rotation-handle';
                imgContainer.appendChild(handle);

                imgContainer.style.width = initialWidth + 'px';
                imgContainer.style.height = (initialWidth / ratio) + 'px';
                imgContainer.setAttribute('data-ratio', ratio);
                imgContainer.setAttribute('data-x', '50');
                imgContainer.setAttribute('data-y', '50');
                imgContainer.style.transform = `translate(50px, 50px)`;

                slideContainer.appendChild(imgContainer);
                makeInteractive(imgContainer);
            };
            // Carrega a imagem temporária usando a URL para pegar as dimensões
            tempImg.src = cloudinaryUrl;
        });

        // --- O RESTANTE DOS LISTENERS ---
        addSafeListener(introThemeDropdown, 'change', e => { confirmBtn.classList.add('hidden'); fetchRoteiros(e.target.value, introCarouselDropdown); });
        addSafeListener(introCarouselDropdown, 'change', () => confirmBtn.classList.remove('hidden'));
        addSafeListener(confirmBtn, 'click', () => {
            const idx = parseInt(introCarouselDropdown.value, 10);
            if (!isNaN(idx) && themeRoteiros[idx]) {
                themeDropdown.value = introThemeDropdown.value;
                carouselDropdown.innerHTML = introCarouselDropdown.innerHTML;
                carouselDropdown.value = introCarouselDropdown.value;
                topBarsWrapper.classList.remove('hidden');
                mainElement.classList.remove('hidden');
                introScreen.classList.add('hidden');
                loadRoteiroByIndex(idx);
            }
        });
        addSafeListener(themeDropdown, 'change', e => fetchRoteiros(e.target.value, carouselDropdown));
        addSafeListener(carouselDropdown, 'change', e => loadRoteiroByIndex(parseInt(e.target.value, 10)));
        addSafeListener(prevBtn, 'click', showPrevSlide);
        addSafeListener(nextBtn, 'click', showNextSlide);
        addSafeListener(addSlideBtn, 'click', addNewSlide);
        addSafeListener(removeSlideBtn, 'click', removeCurrentSlide);
        addSafeListener(exportPngBtn, 'click', exportSlideAsPNG);
        addSafeListener(uploadBtn, 'click', () => imageUpload.click());
        addSafeListener(saveBtn, 'click', saveEditedRoteiro);
        addSafeListener(addTextBtn, 'click', addNewTextBox);
        addSafeListener(boldBtn, 'click', () => applyFormat('bold'));
        addSafeListener(italicBtn, 'click', () => applyFormat('italic'));
        addSafeListener(underlineBtn, 'click', () => applyFormat('underline'));
        addSafeListener(leftAlignBtn, 'click', () => setStyle('textAlign', 'left'));
        addSafeListener(centerAlignBtn, 'click', () => setStyle('textAlign', 'center'));
        addSafeListener(rightAlignBtn, 'click', () => setStyle('textAlign', 'right'));
        addSafeListener(justifyBtn, 'click', () => setStyle('textAlign', 'justify'));
        addSafeListener(fontFamilySelect, 'change', e => setStyle('fontFamily', e.target.value));
        addSafeListener(fontSizeSelect, 'change', e => setStyle('fontSize', e.target.value + 'px'));
        addSafeListener(lineHeightSelect, 'change', e => setStyle('lineHeight', e.target.value));
        addSafeListener(textColorPicker, 'input', e => {
            if (activeElement && activeElement.getAttribute('contenteditable') === 'true') {
                activeElement.focus();
                document.execCommand('foreColor', false, e.target.value);
            }
        });
        addSafeListener(opacitySlider, 'input', e => setStyle('opacity', e.target.value));
        addSafeListener(bringToFrontBtn, 'click', () => {
            if (activeElement) {
                const zIndexes = Array.from(slideContainer.querySelectorAll('.draggable-item:not(.selected)')).map(el => parseInt(el.style.zIndex, 10) || 0);
                const maxZ = zIndexes.length > 0 ? Math.max(...zIndexes) : 0;
                activeElement.style.zIndex = maxZ + 1;
            }
        });
        addSafeListener(sendToBackBtn, 'click', () => {
            if (activeElement) {
                const otherElements = slideContainer.querySelectorAll('.draggable-item:not(.selected)');
                otherElements.forEach(el => {
                    const currentZ = parseInt(el.style.zIndex, 10) || 0;
                    el.style.zIndex = currentZ + 1;
                });
                activeElement.style.zIndex = 0;
            }
        });
        addSafeListener(deleteBtn, 'click', () => {
            if (activeElement) {
                activeElement.remove();
                activeElement = null;
                updateToolbarState();
            }
        });
        addSafeListener(colorPicker, 'input', e => {
            slideContainer.style.backgroundColor = e.target.value;
            updateWatermark();
        });
        document.querySelectorAll('.color-shortcut').forEach(btn => {
            addSafeListener(btn, 'click', e => {
                const color = e.currentTarget.dataset.color;
                colorPicker.value = color;
                slideContainer.style.backgroundColor = color;
                updateWatermark();
            });
        });
        document.querySelectorAll('.text-color-shortcut').forEach(btn => {
            addSafeListener(btn, 'click', e => {
                const color = e.currentTarget.dataset.color;
                textColorPicker.value = color;
                if (activeElement && activeElement.getAttribute('contenteditable') === 'true') {
                    activeElement.focus();
                    document.execCommand('foreColor', false, color);
                }
            });
        });
        addSafeListener(document, 'selectionchange', () => {
            if (document.activeElement && document.activeElement.getAttribute('contenteditable')) {
                setActiveElement({ currentTarget: document.activeElement });
            }
        });
        const zoomPanContainer = document.getElementById('zoom-pan-container');
        addSafeListener(zoomPanContainer, 'wheel', (event) => {
            event.preventDefault();
            const rect = zoomPanContainer.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;
            const zoomIntensity = 0.05;
            const wheel = event.deltaY < 0 ? 1 : -1;
            const scrollZoomFactor = Math.exp(wheel * zoomIntensity);
            const minScale = 1;
            const maxScale = 5;
            const prevSlidePosX = slidePosX;
            const prevSlidePosY = slidePosY;
            const oldScale = currentScale;
            currentScale = Math.max(minScale, Math.min(maxScale, oldScale * scrollZoomFactor));
            if (currentScale === 1) {
                slidePosX = 0;
                slidePosY = 0;
            } else {
                const actualZoomFactor = currentScale / oldScale;
                slidePosX = mouseX - (mouseX - prevSlidePosX) * actualZoomFactor;
                slidePosY = mouseY - (mouseY - prevSlidePosY) * actualZoomFactor;
            }
            updateSlideTransform();
        });
        interact(zoomPanContainer).draggable({
            onstart: function () {
                if (currentScale > 1) {
                    document.body.classList.add('is-panning');
                }
            },
            onmove: function (event) {
                if (currentScale > 1) {
                    slidePosX += event.dx;
                    slidePosY += event.dy;
                    updateSlideTransform();
                }
            },
            onend: function () {
                document.body.classList.remove('is-panning');
            }
        });
        addSafeListener(resetZoomBtn, 'click', () => {
            currentScale = 1;
            slidePosX = 0;
            slidePosY = 0;
            updateSlideTransform();
        });
        addSafeListener(document, 'keydown', (event) => {
            const activeEl = document.activeElement;
            const isTyping = activeEl.tagName === 'INPUT' || activeEl.isContentEditable;
            if (isTyping) {
                return;
            }
            switch (event.key) {
                case 'ArrowLeft':
                    if (!prevBtn.disabled) {
                        showPrevSlide();
                    }
                    break;
                case 'ArrowRight':
                    if (!nextBtn.disabled) {
                        showNextSlide();
                    }
                    break;
            }
        });

        addSafeListener(document, 'keyup', (event) => {
            if (event.code === 'Space') {
                isPanning = false;
                document.body.classList.remove('is-panning');
            }
        });
    }

    // --- INICIALIZAÇÃO DA APLICAÇÃO ---
    setupEventListeners();
    fetchThemes();
})
