const API_BASE_URL = 'https://script.google.com/macros/s/AKfycbx1l6QuqWnD4fg0XcUyGlGxnBpItqX5-Uw_fBhk9ov1SvuFTfDrY1Ok2YNlUwqC8wNdig/exec'
let allRoteiros = [];
let themeRoteiros = [];
let currentSlideIndex = 0;
let snapLines = [];

let selectedElement = null;
let zIndexCounter = 1;

// Configurações da Cloudinary
const CLOUDINARY_CLOUD_NAME = 'dh8hpjwlc';
const CLOUDINARY_UPLOAD_PRESET = 'my-carousel-preset';

// Função para fazer o upload da imagem para a Cloudinary
async function uploadImageToCloudinary(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error('Falha no upload para a Cloudinary.');
        }

        const data = await response.json();
        return data.secure_url;
    } catch (error) {
        console.error('Erro no upload para a Cloudinary:', error);
        alert('Erro ao carregar a imagem para a Cloudinary.');
        return null;
    }
}

function createImageElement(imgData) {
    const slideContent = document.getElementById('slideContent');
    const container = document.createElement('div');
    container.className = 'image-container';

    container.style.zIndex = imgData.zIndex || zIndexCounter++;
    container.style.opacity = imgData.opacity || 1;

    const x = imgData.x || 50, y = imgData.y || 50, rotation = imgData.rotation || 0, width = imgData.width || '200px', height = imgData.height || 'auto';
    container.style.transform = `translate(${x}px, ${y}px) rotate(${rotation}deg)`;
    container.style.width = width;
    container.style.height = height;
    container.setAttribute('data-x', x);
    container.setAttribute('data-y', y);
    container.setAttribute('data-rotation', rotation);
    container.setAttribute('data-zindex', container.style.zIndex);
    container.setAttribute('data-is-watermark', imgData.isWatermark || false);

    const img = document.createElement('img');
    img.src = imgData.src;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.display = 'block';
    img.style.pointerEvents = 'none';

    // Remove o botão de rotação apenas para a marca d'água
    if (!imgData.isWatermark) {
        const rotateHandle = document.createElement('div');
        rotateHandle.className = 'rotate-handle';
        rotateHandle.innerHTML = '↻';
        rotateHandle.title = 'Arrastar para rotacionar';
        container.appendChild(rotateHandle);
    }

    const resizeHandles = [
        { pos: 'nw', cursor: 'nw-resize', top: '-8px', left: '-8px', symbol: '↖' }, { pos: 'ne', cursor: 'ne-resize', top: '-8px', right: '-8px', symbol: '↗' },
        { pos: 'sw', cursor: 'sw-resize', bottom: '-8px', left: '-8px', symbol: '↙' }, { pos: 'se', cursor: 'se-resize', bottom: '-8px', right: '-8px', symbol: '↘' }
    ];
    resizeHandles.forEach(handle => {
        const resizeHandle = document.createElement('div');
        resizeHandle.className = `resize-handle resize-${handle.pos}`;
        resizeHandle.innerHTML = handle.symbol;
        resizeHandle.style.cursor = handle.cursor;
        resizeHandle.title = 'Arrastar para redimensionar';
        Object.keys(handle).forEach(key => {
            if (['top', 'right', 'bottom', 'left'].includes(key)) resizeHandle.style[key] = handle[key];
        });
        container.appendChild(resizeHandle);
    });
    container.appendChild(img);
    slideContent.appendChild(container);

    let isDragging = false, isResizing = false, isRotating = false;
    let startPos = { x: 0, y: 0 }, startSize = { width: 0, height: 0 }, startAngle = 0, currentRotation = rotation;

    container.addEventListener('mousedown', (e) => {
        if (e.target === container || e.target === img) {
            isDragging = true;
            startPos.x = e.clientX - (parseFloat(container.getAttribute('data-x')) || 0);
            startPos.y = e.clientY - (parseFloat(container.getAttribute('data-y')) || 0);
            e.preventDefault();
        }
    });

    container.querySelectorAll('.resize-handle').forEach(handle => {
        handle.addEventListener('mousedown', (e) => {
            isResizing = true;
            isDragging = false;
            startSize = { width: container.offsetWidth, height: container.offsetHeight };
            startPos = { x: e.clientX, y: e.clientY };
            e.preventDefault();
            e.stopPropagation();
        });
    });

    if (!imgData.isWatermark) {
        container.querySelector('.rotate-handle').addEventListener('mousedown', (e) => {
            isRotating = true;
            isDragging = false;
            const rect = container.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2, centerY = rect.top + rect.height / 2;
            startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180 / Math.PI;
            currentRotation = parseFloat(container.getAttribute('data-rotation')) || 0;
            e.preventDefault();
            e.stopPropagation();
        });
    }

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const newX = e.clientX - startPos.x;
            const newY = e.clientY - startPos.y;

            let finalX = newX;
            let finalY = newY;
            const slideWidth = slideContent.clientWidth;
            const slideHeight = slideContent.clientHeight;
            const elementWidth = container.offsetWidth;
            const elementHeight = container.offsetHeight;

            if (imgData.isWatermark) {
                const snapThreshold = 20;
                const targetX = (slideWidth - elementWidth) / 2;
                const targetY = slideHeight - elementHeight + 50;

                if (Math.abs(newX - targetX) < snapThreshold) {
                    finalX = targetX;
                }
                if (Math.abs(newY - targetY) < snapThreshold) {
                    finalY = targetY;
                }
            } else {
                finalX = newX;
                finalY = newY;
            }

            container.style.transform = `translate(${finalX}px, ${finalY}px) rotate(${currentRotation}deg)`;
            container.setAttribute('data-x', finalX);
            container.setAttribute('data-y', finalY);
        } else if (isResizing) {
            let newWidth = startSize.width + (e.clientX - startPos.x);
            if (newWidth < 50) newWidth = 50;
            const aspectRatio = img.naturalWidth && img.naturalHeight ? (img.naturalWidth / img.naturalHeight) : 1;
            container.style.width = `${newWidth}px`;
            container.style.height = `${newWidth / aspectRatio}px`;
        } else if (isRotating) {
            const rect = container.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2, centerY = rect.top + rect.height / 2;
            const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180 / Math.PI;
            const newRotation = currentRotation + (currentAngle - startAngle);
            const x = parseFloat(container.getAttribute('data-x')) || 0, y = parseFloat(container.getAttribute('data-y')) || 0;
            container.style.transform = `translate(${x}px, ${y}px) rotate(${newRotation}deg)`;
            container.setAttribute('data-rotation', newRotation);
        }
    });
    document.addEventListener('mouseup', () => {
        if (isRotating) currentRotation = parseFloat(container.getAttribute('data-rotation')) || 0;
        isDragging = isResizing = isRotating = false;
    });
}

function addMoveHandleToText(element) {
    if (element.querySelector('.move-handle-text')) return;
    const moveHandle = document.createElement('div');
    moveHandle.className = 'move-handle-text';
    moveHandle.innerHTML = '✥';
    moveHandle.title = 'Arrastar para mover';
    element.appendChild(moveHandle);
}

document.addEventListener('DOMContentLoaded', () => {
    const themeDropdown = document.getElementById('themeDropdown');
    const carouselSelectionContainer = document.getElementById('carouselSelectionContainer');
    const carouselDropdown = document.getElementById('carouselDropdown');
    const apiStatus = document.getElementById('apiStatus');
    const carouselContent = document.querySelector('.carousel-content');
    const slideContent = document.getElementById('slideContent');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const slideCounter = document.getElementById('slideCounter');
    const colorPicker = document.getElementById('colorPicker');
    const boldBtn = document.getElementById('boldBtn');
    const italicBtn = document.getElementById('italicBtn');
    const underlineBtn = document.getElementById('underlineBtn');
    const leftAlignBtn = document.getElementById('leftAlignBtn');
    const centerAlignBtn = document.getElementById('centerAlignBtn');
    const rightAlignBtn = document.getElementById('rightAlignBtn');
    const justifyBtn = document.getElementById('justifyBtn');
    const fontFamilySelect = document.getElementById('fontFamilySelect');
    const fontSizeSelect = document.getElementById('fontSizeSelect');
    const textColorPicker = document.getElementById('textColorPicker');
    const bringToFrontBtn = document.getElementById('bringToFrontBtn');
    const sendToBackBtn = document.getElementById('sendToBackBtn');
    const opacitySlider = document.getElementById('opacitySlider');
    const deleteBtn = document.getElementById('deleteBtn');
    const colorShortcuts = document.querySelectorAll('.color-shortcut');
    const textColorShortcuts = document.querySelectorAll('.text-color-shortcut');
    const addSlideBtn = document.getElementById('addSlideBtn');
    const saveBtn = document.getElementById('saveBtn');
    const formatButtons = [boldBtn, italicBtn, underlineBtn];
    const alignButtons = [leftAlignBtn, centerAlignBtn, rightAlignBtn, justifyBtn];
    const defaultTitleFont = 'Aguila Bold', defaultTitleSize = '30px';
    const defaultBodyFont = 'Aguila', defaultBodySize = '18px';

    function createSnapLines() {
        document.querySelectorAll('.snap-line').forEach(line => line.remove());
        snapLines = [];
        const snapPercents = [0.25, 0.5, 0.75];
        snapPercents.forEach(p => {
            const hLine = document.createElement('div');
            hLine.className = 'snap-line horizontal';
            hLine.style.top = `${p * slideContent.clientHeight}px`;
            slideContent.appendChild(hLine);
            snapLines.push(hLine);
            const vLine = document.createElement('div');
            vLine.className = 'snap-line vertical';
            vLine.style.left = `${p * slideContent.clientWidth}px`;
            slideContent.appendChild(vLine);
            snapLines.push(vLine);
        });
    }

    interact('.editable-text')
        .draggable({
            allowFrom: '.move-handle-text',
            listeners: {
                start: (event) => {
                    event.target.contentEditable = 'false';
                },
                move: (event) => {
                    const target = event.target;
                    let x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
                    let y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

                    const forcaMagnetismo = 0.2;
                    const centerX = x + target.offsetWidth / 2;
                    const centerY = y + target.offsetHeight / 2;
                    const snapThreshold = 15;

                    snapLines.forEach(line => line.classList.remove('visible'));

                    snapLines.forEach(line => {
                        if (line.classList.contains('vertical')) {
                            const lineX = parseFloat(line.style.left);
                            const distanciaX = centerX - lineX;
                            if (Math.abs(distanciaX) < snapThreshold) {
                                x -= distanciaX * forcaMagnetismo;
                                line.classList.add('visible');
                            }
                        } else {
                            const lineY = parseFloat(line.style.top);
                            const distanciaY = centerY - lineY;
                            if (Math.abs(distanciaY) < snapThreshold) {
                                y -= distanciaY * forcaMagnetismo;
                                line.classList.add('visible');
                            }
                        }
                    });

                    target.style.transform = `translate(${x}px, ${y}px)`;
                    target.setAttribute('data-x', x);
                    target.setAttribute('data-y', y);
                },
                end: (event) => {
                    const target = event.target;
                    setTimeout(() => target.contentEditable = 'true', 100);

                    let x = parseFloat(target.getAttribute('data-x')) || 0;
                    let y = parseFloat(target.getAttribute('data-y')) || 0;
                    const centerX = x + target.offsetWidth / 2;
                    const centerY = y + target.offsetHeight / 2;
                    const snapThreshold = 15;

                    snapLines.forEach(line => {
                        if (line.classList.contains('vertical')) {
                            const lineX = parseFloat(line.style.left);
                            if (Math.abs(centerX - lineX) < snapThreshold) {
                                x = lineX - target.offsetWidth / 2;
                            }
                        } else {
                            const lineY = parseFloat(line.style.top);
                            if (Math.abs(centerY - lineY) < snapThreshold) {
                                y = lineY - target.offsetHeight / 2;
                            }
                        }
                    });
                    target.style.transform = `translate(${x}px, ${y}px)`;
                    target.setAttribute('data-x', x);
                    target.setAttribute('data-y', y);

                    snapLines.forEach(line => line.classList.remove('visible'));
                }
            }
        })
        .resizable({
            edges: { left: true, right: true, bottom: true, top: false },
            listeners: {
                move: (event) => {
                    const target = event.target;
                    let x = parseFloat(target.getAttribute('data-x')) || 0;
                    let y = parseFloat(target.getAttribute('data-y')) || 0;
                    target.style.width = `${event.rect.width}px`;
                    target.style.height = `${event.rect.height}px`;
                    x += event.deltaRect.left;
                    y += event.deltaRect.top;
                    target.style.transform = `translate(${x}px, ${y}px)`;
                    target.setAttribute('data-x', x);
                    target.setAttribute('data-y', y);
                }
            }
        });

    async function fetchThemes() {
        console.log('Iniciando fetchThemes...');
        apiStatus.textContent = 'Carregando...'; // Texto inicial de carregamento
        try {
            console.log(`Buscando temas na URL: ${API_BASE_URL}?action=getTemas`);
            const response = await fetch(`${API_BASE_URL}?action=getTemas`);

            if (!response.ok) {
                console.error(`Erro na rede. Status HTTP: ${response.status} ${response.statusText}`);
                throw new Error('Erro na rede. Verifique a URL da API.');
            }

            const data = await response.json();
            console.log('Resposta da API recebida:', data);

            if (data.status === 'success' && Array.isArray(data.data)) {
                console.log('Dados recebidos com sucesso. Processando temas...');
                themeDropdown.innerHTML = '<option value="">Selecione um tema...</option>';
                data.data.forEach(theme => {
                    const option = document.createElement('option');
                    option.value = theme;
                    option.textContent = theme;
                    themeDropdown.appendChild(option);
                });
                console.log('Temas renderizados. Total de temas:', data.data.length);
                apiStatus.textContent = 'Conectado ✅';
                apiStatus.style.color = '#28a745';
            } else {
                console.warn('Resposta da API não é um sucesso ou os dados não são um array.');
                apiStatus.textContent = 'Erro na API ❌';
                apiStatus.style.color = '#dc3545';
            }
        } catch (error) {
            console.error('Erro de conexão ou ao processar temas:', error);
            apiStatus.textContent = 'Erro de conexão ❌';
            apiStatus.style.color = '#dc3545';
        }
    }

    async function fetchRoteiros(tema) {
        carouselContent.classList.add('hidden');
        carouselSelectionContainer.classList.add('hidden');
        slideContent.innerHTML = '<h2>Carregando roteiros...</h2>';
        apiStatus.textContent = 'Carregando roteiros....'; // Texto de carregamento ao buscar carrossel
        apiStatus.style.color = '#0056b3'; // A cor do "Carregando..." agora é azul

        try {
            const response = await fetch(`${API_BASE_URL}?action=getRoteiro&tema=${encodeURIComponent(tema)}`);
            const data = await response.json();
            if (data.status === 'success' && Array.isArray(data.data) && data.data.length > 0) {
                themeRoteiros = data.data;
                if (themeRoteiros.length > 0) {
                    carouselDropdown.innerHTML = '';
                    themeRoteiros.forEach((carousel, index) => {
                        const option = document.createElement('option');
                        option.value = index;
                        option.textContent = carousel.title.replace(/<[^>]*>?/gm, '');
                        carouselDropdown.appendChild(option);
                    });
                    carouselSelectionContainer.classList.remove('hidden');
                    document.querySelector('.editor-toolbar').classList.remove('hidden');
                    document.querySelector('.color-picker-container').classList.remove('hidden');
                    apiStatus.textContent = ''; // Texto de conectado ao carregar carrossel
                    loadRoteiroByIndex(0);
                } else {
                    slideContent.innerHTML = '<h2>Nenhum carrossel válido encontrado. Verifique a coluna `carrossel_id` na planilha.</h2>';
                    apiStatus.textContent = 'Conectado ✅';
                }
            } else {
                slideContent.innerHTML = '<h2>Nenhum roteiro encontrado para este tema.</h2>';
                themeRoteiros = [];
                apiStatus.textContent = 'Conectado ✅';
            }
        } catch (error) {
            slideContent.innerHTML = '<h2>Erro de conexão ao buscar roteiro.</h2>';
            themeRoteiros = [];
            apiStatus.textContent = 'Erro de conexão ❌';
        }
    }

    async function loadRoteiroByIndex(index) {
        console.log(`Iniciando o carregamento do carrossel no índice: ${index}`);
        if (!themeRoteiros[index]) {
            console.error('Erro: Carrossel selecionado não encontrado em themeRoteiros.');
            return;
        }

        const carouselSelecionado = themeRoteiros[index];
        console.log('Carrossel selecionado:', carouselSelecionado);

        const carrosselId = carouselSelecionado.slides[0].carrossel_id;
        const temaGeral = carouselSelecionado.slides[0].tema_geral;

        let slides = [];

        console.log(`Verificando se existe versão editada para o carrosselId: ${carrosselId}`);
        try {
            const response = await fetch(`${API_BASE_URL}?action=getEditedRoteiro&carrossel_id=${encodeURIComponent(carrosselId)}`);
            const data = await response.json();

            console.log('Resposta da API para versão editada:', data);

            if (data.status === 'success' && data.data && data.data.length > 0) {
                console.log('Versão editada encontrada. Carregando slides editados...');
                slides = data.data;
            } else {
                console.log('Nenhuma versão editada encontrada. Carregando slides originais...');
                slides = JSON.parse(JSON.stringify(carouselSelecionado.slides));

                if (slides.length > 0 && slides[0].titulo && slides[0].titulo.trim() !== "") {
                    const originalFirstSlide = slides[0];
                    const mainTitle = originalFirstSlide.titulo;
                    const newTitleSlide = {
                        titulo: mainTitle,
                        corpo: '',
                        fechamento: '',
                        backgroundColor: originalFirstSlide.backgroundColor,
                        carrossel_id: originalFirstSlide.carrossel_id,
                        tema_geral: temaGeral
                    };
                    originalFirstSlide.titulo = '';
                    slides.unshift(newTitleSlide);
                }
            }
        } catch (error) {
            console.error("Erro ao carregar roteiro editado, carregando original:", error);
            slides = JSON.parse(JSON.stringify(carouselSelecionado.slides));
            if (slides.length > 0 && slides[0].titulo && slides[0].titulo.trim() !== "") {
                const originalFirstSlide = slides[0];
                const mainTitle = originalFirstSlide.titulo;
                const newTitleSlide = {
                    titulo: mainTitle,
                    corpo: '',
                    fechamento: '',
                    backgroundColor: originalFirstSlide.backgroundColor,
                    carrossel_id: originalFirstSlide.carrossel_id,
                    tema_geral: temaGeral
                };
                originalFirstSlide.titulo = '';
                slides.unshift(newTitleSlide);
            }
        }

        slides.forEach((slide, i) => {
            if (!slide.backgroundColor) {
                slide.backgroundColor = (i % 2 !== 0) ? '#C36640' : '#F4F4F4';
            }

            // Lógica para o primeiro slide (índice 0)
            if (i === 0) {
                // Define a posição vertical e o tamanho da fonte para o título do primeiro slide
                slide.tituloFontSize = '24px';
                slide.tituloY = 150;
            }

            // Lógica para o segundo slide (índice 1), já presente no seu código
            else if (i === 1 && !slide.corpoFontSize) {
                slide.corpoFontSize = '20px';
                slide.corpoX = (540 - 400) / 2;
                slide.corpoY = ((675 - 200) / 2) - 100;

            }
        });

        console.log('Slides prontos para renderização:', slides);

        allRoteiros = slides;
        currentSlideIndex = 0;
        carouselContent.classList.remove('hidden');
        renderSlide();
    }


    function updateWatermark() {
        const existingWatermark = document.querySelector('[data-is-watermark="true"]');
        if (existingWatermark) {
            existingWatermark.remove();
        }

        const isDarkBackground = slideContent.style.backgroundColor === 'rgb(195, 102, 64)';

        // -------------------------------------------------------------
        // ATUALIZAÇÃO PARA USAR LINKS DO IMGUR
        // -------------------------------------------------------------
        let watermarkSrc;

        if (isDarkBackground) {
            // A imagem para fundos escuros (slogan_f4f4f4.png)
            // Substitua o placeholder pelo link da sua imagem no Imgur.
            watermarkSrc = 'https://i.imgur.com/aRMubKX.png';
        } else {
            // A imagem para fundos claros (slogan_c36640.png)
            // Substitua o placeholder pelo link da sua imagem no Imgur.
            watermarkSrc = 'https://i.imgur.com/1jWGIzV.png';
        }
        // -------------------------------------------------------------

        const slideWidth = slideContent.clientWidth;
        const slideHeight = slideContent.clientHeight;

        // A dimensão única para ambas as marcas d'água
        const watermarkWidth = 160
        const watermarkHeight = 200;
        const marginBottom = -50;

        const savedWatermarkData = allRoteiros[currentSlideIndex].watermarkData;

        const watermark = {
            src: watermarkSrc,
            x: savedWatermarkData ? savedWatermarkData.x : (slideWidth - watermarkWidth) / 2,
            y: savedWatermarkData ? savedWatermarkData.y : slideHeight - watermarkHeight - marginBottom,
            width: savedWatermarkData ? savedWatermarkData.width : `${watermarkWidth}px`,
            height: savedWatermarkData ? savedWatermarkData.height : `${watermarkHeight}px`,
            opacity: savedWatermarkData ? savedWatermarkData.opacity : 1.0,
            zIndex: 0,
            isWatermark: true,
            rotation: savedWatermarkData ? savedWatermarkData.rotation : 0
        };

        createImageElement(watermark);
    }

    function renderSlide() {
        if (allRoteiros.length === 0) return;
        zIndexCounter = 1;
        selectedElement = null;
        deleteBtn.disabled = true;
        const roteiro = allRoteiros[currentSlideIndex];
        slideContent.innerHTML = '';
        slideContent.style.backgroundColor = roteiro.backgroundColor || '#ffffff';
        colorPicker.value = roteiro.backgroundColor || '#ffffff';
        const isDarkBackground = roteiro.backgroundColor === '#C36640';
        const textColor = isDarkBackground ? '#F4F4F4' : '#C36640';
        textColorPicker.value = textColor;
        const slideWidth = slideContent.clientWidth;
        const slideHeight = slideContent.clientHeight;
        const isFirstSlide = currentSlideIndex === 0;
        const titleFontForThisSlide = isFirstSlide ? 'Cinzel' : 'Aguila Bold';
        const bodyFontForThisSlide = isFirstSlide ? 'Cinzel' : 'Aguila';

        const exportPreview = document.createElement('div');
        exportPreview.className = 'export-preview';
        slideContent.appendChild(exportPreview);

        updateWatermark();

        // Cria e posiciona o título
        if (roteiro.titulo && roteiro.titulo.trim() !== "") {
            const tituloEl = document.createElement('h2');
            tituloEl.classList.add('editable-text', 'slide-titulo');
            tituloEl.contentEditable = 'true';
            tituloEl.innerHTML = roteiro.titulo;
            tituloEl.style.color = textColor;
            tituloEl.style.fontFamily = titleFontForThisSlide;
            tituloEl.style.fontSize = roteiro.tituloFontSize || '30px';
            tituloEl.style.width = roteiro.tituloWidth || '400px';
            tituloEl.style.height = roteiro.tituloHeight || 'auto';
            tituloEl.style.position = 'absolute';
            tituloEl.style.zIndex = roteiro.tituloZIndex || zIndexCounter++;
            tituloEl.style.opacity = roteiro.tituloOpacity || 1;
            tituloEl.setAttribute('data-zindex', tituloEl.style.zIndex);
            slideContent.appendChild(tituloEl);
            addMoveHandleToText(tituloEl);

            const tituloX = roteiro.tituloX !== undefined ? roteiro.tituloX : (slideWidth - tituloEl.offsetWidth) / 2;
            const tituloY = roteiro.tituloY !== undefined ? roteiro.tituloY : 50;
            tituloEl.setAttribute('data-x', tituloX);
            tituloEl.setAttribute('data-y', tituloY);
            tituloEl.style.transform = `translate(${tituloX}px, ${tituloY}px)`;
        }

        // Cria e posiciona o corpo do texto
        if (roteiro.corpo && roteiro.corpo.trim() !== "") {
            const corpoEl = document.createElement('p');
            corpoEl.classList.add('editable-text', 'slide-corpo');
            corpoEl.contentEditable = 'true';
            corpoEl.innerHTML = roteiro.corpo;
            corpoEl.style.color = textColor;
            corpoEl.style.fontFamily = bodyFontForThisSlide;
            corpoEl.style.fontSize = roteiro.corpoFontSize || '18px';
            corpoEl.style.width = roteiro.corpoWidth || '400px';
            corpoEl.style.height = roteiro.corpoHeight || 'auto';
            corpoEl.style.position = 'absolute';
            corpoEl.style.textAlign = 'justify';
            corpoEl.style.zIndex = roteiro.corpoZIndex || zIndexCounter++;
            corpoEl.style.opacity = roteiro.corpoOpacity || 1;
            corpoEl.setAttribute('data-zindex', corpoEl.style.zIndex);
            slideContent.appendChild(corpoEl);
            addMoveHandleToText(corpoEl);

            const corpoX = roteiro.corpoX !== undefined ? roteiro.corpoX : (slideWidth - corpoEl.offsetWidth) / 2;
            let corpoY = roteiro.corpoY !== undefined ? roteiro.corpoY : 0;

            // Nova lógica de posicionamento dinâmico para o corpo
            if (corpoY === 0) {
                const tituloEl = slideContent.querySelector('.slide-titulo');
                if (tituloEl) {
                    const tituloHeight = tituloEl.offsetHeight;
                    const tituloY = parseFloat(tituloEl.getAttribute('data-y')) || 0;
                    corpoY = tituloY + tituloHeight + 30; // 30px de espaçamento
                } else {
                    corpoY = (slideHeight / 2) - 50;
                }
            }

            corpoEl.setAttribute('data-x', corpoX);
            corpoEl.setAttribute('data-y', corpoY);
            corpoEl.style.transform = `translate(${corpoX}px, ${corpoY}px)`;
        }

        // Cria e posiciona o fechamento
        if (roteiro.fechamento && roteiro.fechamento.trim() !== "") {
            const fechamentoEl = document.createElement('p');
            fechamentoEl.classList.add('editable-text', 'slide-fechamento');
            fechamentoEl.contentEditable = 'true';
            fechamentoEl.innerHTML = roteiro.fechamento;
            fechamentoEl.style.color = textColor;
            fechamentoEl.style.fontFamily = '"Aguila Bold"';
            fechamentoEl.style.fontSize = roteiro.fechamentoFontSize || '18px';
            fechamentoEl.style.width = roteiro.fechamentoWidth || '400px';
            fechamentoEl.style.height = roteiro.fechamentoHeight || 'auto';
            fechamentoEl.style.position = 'absolute';
            fechamentoEl.style.zIndex = roteiro.fechamentoZIndex || zIndexCounter++;
            fechamentoEl.style.opacity = roteiro.fechamentoOpacity || 1;
            fechamentoEl.setAttribute('data-zindex', fechamentoEl.style.zIndex);
            slideContent.appendChild(fechamentoEl);
            addMoveHandleToText(fechamentoEl);

            const fechamentoX = roteiro.fechamentoX !== undefined ? roteiro.fechamentoX : (slideWidth - fechamentoEl.offsetWidth) / 2;
            let fechamentoY = roteiro.fechamentoY !== undefined ? roteiro.fechamentoY : 0;

            // Nova lógica de posicionamento dinâmico para o fechamento
            if (fechamentoY === 0) {
                const corpoEl = slideContent.querySelector('.slide-corpo');
                if (corpoEl) {
                    const corpoHeight = corpoEl.offsetHeight;
                    const corpoY = parseFloat(corpoEl.getAttribute('data-y')) || 0;
                    fechamentoY = corpoY + corpoHeight + 0; // 30px de espaçamento
                } else {
                    fechamentoY = (slideHeight / 2) + 50;
                }
            }

            fechamentoEl.setAttribute('data-x', fechamentoX);
            fechamentoEl.setAttribute('data-y', fechamentoY);
            fechamentoEl.style.transform = `translate(${fechamentoX}px, ${fechamentoY}px)`;
        }

        // Carrega as imagens
        if (roteiro.imagens && Array.isArray(roteiro.imagens)) {
            roteiro.imagens.forEach(imgData => createImageElement(imgData));
        }

        slideCounter.textContent = `${currentSlideIndex + 1} / ${allRoteiros.length}`;
        prevBtn.disabled = currentSlideIndex === 0;
        nextBtn.disabled = allRoteiros.length <= 1 || currentSlideIndex === allRoteiros.length - 1;
        updateToolbarState();
        createSnapLines();
    }

    function saveCurrentSlideContent() {
        if (!allRoteiros[currentSlideIndex]) return;
        const currentRoteiro = allRoteiros[currentSlideIndex];
        const tituloEl = slideContent.querySelector('h2');
        const corpoEl = slideContent.querySelector('.slide-corpo');
        const fechamentoEl = slideContent.querySelector('.slide-fechamento');

        if (tituloEl) {
            currentRoteiro.titulo = tituloEl.innerHTML;
            currentRoteiro.tituloX = parseFloat(tituloEl.getAttribute('data-x')) || 0;
            currentRoteiro.tituloY = parseFloat(tituloEl.getAttribute('data-y')) || 0;
            currentRoteiro.tituloWidth = tituloEl.style.width;
            currentRoteiro.tituloHeight = tituloEl.style.height;
            currentRoteiro.tituloZIndex = tituloEl.style.zIndex;
            currentRoteiro.tituloOpacity = tituloEl.style.opacity;
        } else {
            currentRoteiro.titulo = '';
            currentRoteiro.tituloX = undefined;
            currentRoteiro.tituloY = undefined;
            currentRoteiro.tituloWidth = undefined;
            currentRoteiro.tituloHeight = undefined;
            currentRoteiro.tituloZIndex = undefined;
            currentRoteiro.tituloOpacity = undefined;
        }
        if (corpoEl) {
            currentRoteiro.corpo = corpoEl.innerHTML;
            currentRoteiro.corpoX = parseFloat(corpoEl.getAttribute('data-x')) || 0;
            currentRoteiro.corpoY = parseFloat(corpoEl.getAttribute('data-y')) || 0;
            currentRoteiro.corpoWidth = corpoEl.style.width;
            currentRoteiro.corpoHeight = corpoEl.style.height;
            currentRoteiro.corpoZIndex = corpoEl.style.zIndex;
            currentRoteiro.corpoOpacity = corpoEl.style.opacity;
        } else {
            currentRoteiro.corpo = '';
            currentRoteiro.corpoX = undefined;
            currentRoteiro.corpoY = undefined;
            currentRoteiro.corpoWidth = undefined;
            currentRoteiro.corpoHeight = undefined;
            currentRoteiro.corpoZIndex = undefined;
            currentRoteiro.corpoOpacity = undefined;
        }
        if (fechamentoEl) {
            currentRoteiro.fechamento = fechamentoEl.innerHTML;
            currentRoteiro.fechamentoX = parseFloat(fechamentoEl.getAttribute('data-x')) || 0;
            currentRoteiro.fechamentoY = parseFloat(fechamentoEl.getAttribute('data-y')) || 0;
            currentRoteiro.fechamentoWidth = fechamentoEl.style.width;
            currentRoteiro.fechamentoHeight = fechamentoEl.style.height;
            currentRoteiro.fechamentoZIndex = fechamentoEl.style.zIndex;
            currentRoteiro.fechamentoOpacity = fechamentoEl.style.opacity;
        } else {
            currentRoteiro.fechamento = '';
            currentRoteiro.fechamentoX = undefined;
            currentRoteiro.fechamentoY = undefined;
            currentRoteiro.fechamentoWidth = undefined;
            currentRoteiro.fechamentoHeight = undefined;
            currentRoteiro.fechamentoZIndex = undefined;
            currentRoteiro.fechamentoOpacity = undefined;
        }
        const imageElements = slideContent.querySelectorAll('.image-container');
        const savedImages = [];
        imageElements.forEach(imgContainer => {
            const img = imgContainer.querySelector('img');
            const isWatermark = imgContainer.getAttribute('data-is-watermark') === 'true';

            const imageData = {
                src: img.src,
                x: parseFloat(imgContainer.getAttribute('data-x')) || 0,
                y: parseFloat(imgContainer.getAttribute('data-y')) || 0,
                width: imgContainer.style.width,
                height: imgContainer.style.height,
                rotation: parseFloat(imgContainer.getAttribute('data-rotation')) || 0,
                zIndex: imgContainer.style.zIndex,
                opacity: imgContainer.style.opacity,
                isWatermark: isWatermark
            };

            if (isWatermark) {
                currentRoteiro.watermarkData = imageData;
            } else {
                savedImages.push(imageData);
            }
        });
        currentRoteiro.imagens = savedImages;
    }

    async function saveEditedRoteiro() {
        console.log('Botão de salvar clicado. Iniciando processo...');
        saveCurrentSlideContent();
        const carrosselId = allRoteiros[0].carrossel_id;
        const slidesToSave = allRoteiros.map((slide, index) => {
            const savedData = {
                carrossel_id: slide.carrossel_id,
                slide_index: index,
                backgroundColor: slide.backgroundColor,
                // Salvar textos e estilos
                titulo: slide.titulo,
                tituloX: slide.tituloX,
                tituloY: slide.tituloY,
                tituloWidth: slide.tituloWidth,
                tituloHeight: slide.tituloHeight,
                tituloZIndex: slide.tituloZIndex,
                tituloOpacity: slide.tituloOpacity,
                corpo: slide.corpo,
                corpoX: slide.corpoX,
                corpoY: slide.corpoY,
                corpoWidth: slide.corpoWidth,
                corpoHeight: slide.corpoHeight,
                corpoZIndex: slide.corpoZIndex,
                corpoOpacity: slide.corpoOpacity,
                fechamento: slide.fechamento,
                fechamentoX: slide.fechamentoX,
                fechamentoY: slide.fechamentoY,
                fechamentoWidth: slide.fechamentoWidth,
                fechamentoHeight: slide.fechamentoHeight,
                fechamentoZIndex: slide.fechamentoZIndex,
                fechamentoOpacity: slide.fechamentoOpacity,
                // Salvar imagens
                imagens: slide.imagens,
                watermarkData: slide.watermarkData
            };
            return savedData;
        });

        console.log('Dados do carrossel para salvar:', slidesToSave);
        console.log('Enviando requisição POST para a API...');

        try {
            const response = await fetch(`${API_BASE_URL}?action=salvarRoteiroEditado`, {
                method: 'POST',
                body: JSON.stringify({ carrossel_id: carrosselId, slides: slidesToSave }),
                headers: { 'Content-Type': 'text/plain' }
            });

            console.log('Requisição enviada. Aguardando resposta...');

            const data = await response.json();

            console.log('Resposta da API recebida:', data);

            if (data.status === 'success') {
                alert('Roteiro salvo com sucesso!');
                console.log('Salvamento concluído com sucesso.');
            } else {
                alert('Erro ao salvar o roteiro: ' + data.message);
                console.error('Erro no salvamento. Mensagem da API:', data.message);
            }
        } catch (error) {
            console.error('Erro de conexão ao tentar salvar o roteiro:', error);
            alert('Erro de conexão ao tentar salvar o roteiro.');
        }
    }

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

    // Função para adicionar um novo slide
    function addNewSlide() {
        saveCurrentSlideContent();
        const currentRoteiro = allRoteiros[currentSlideIndex];
        const newSlide = {
            titulo: 'Novo Slide',
            corpo: '',
            fechamento: '',
            backgroundColor: currentRoteiro.backgroundColor,
            carrossel_id: currentRoteiro.carrossel_id,
            tema_geral: currentRoteiro.tema_geral
        };
        allRoteiros.splice(currentSlideIndex + 1, 0, newSlide);
        currentSlideIndex++;
        renderSlide();
    }

    function formatText(command, value = null) {
        document.execCommand('styleWithCSS', false, false);
        document.execCommand(command, false, value);
        updateToolbarState();
    }

    function updateToolbarState() {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;
        let element = selection.getRangeAt(0).startContainer;
        if (element.nodeType === Node.TEXT_NODE) {
            element = element.parentElement;
        }
        if (!element || !slideContent.contains(element)) {
            return;
        }
        formatButtons.forEach(btn => {
            const command = btn.id.replace('Btn', '');
            document.queryCommandState(command) ? btn.classList.add('active') : btn.classList.remove('active');
        });
        const alignCommands = { leftAlignBtn: 'justifyLeft', centerAlignBtn: 'justifyCenter', rightAlignBtn: 'justifyRight', justifyBtn: 'justifyFull' };
        alignButtons.forEach(btn => {
            document.queryCommandState(alignCommands[btn.id]) ? btn.classList.add('active') : btn.classList.remove('active');
        });
        const computedStyle = window.getComputedStyle(element);
        fontFamilySelect.value = computedStyle.fontFamily.replace(/["']/g, '');
        const rawSize = computedStyle.fontSize;
        const roundedSize = Math.round(parseFloat(rawSize));
        fontSizeSelect.value = `${roundedSize}px`;
    }

    themeDropdown.addEventListener('change', e => {
        if (e.target.value) {
            fetchRoteiros(e.target.value);
        } else {
            carouselContent.classList.add('hidden');
            carouselSelectionContainer.classList.add('hidden');
        }
    });

    carouselDropdown.addEventListener('change', (e) => {
        saveCurrentSlideContent();
        const selectedIndex = parseInt(e.target.value, 10);
        loadRoteiroByIndex(selectedIndex);
    });

    slideContent.addEventListener('click', (e) => {
        const targetElement = e.target.closest('h2, p, .image-container');
        if (selectedElement) {
            selectedElement.classList.remove('element-selected');
        }
        if (targetElement && slideContent.contains(targetElement)) {
            selectedElement = targetElement;
            selectedElement.classList.add('element-selected');
            opacitySlider.value = selectedElement.style.opacity || 1;
            deleteBtn.disabled = false;
        } else {
            selectedElement = null;
            opacitySlider.value = 1;
            deleteBtn.disabled = true;
        }
    });

    deleteBtn.addEventListener('click', () => {
        if (selectedElement) {
            if (confirm('Tem certeza que deseja excluir o elemento selecionado?')) {
                selectedElement.remove();
                selectedElement = null;
                deleteBtn.disabled = true;
            }
        }
    });

    prevBtn.addEventListener('click', showPrevSlide);
    nextBtn.addEventListener('click', showNextSlide);
    addSlideBtn.addEventListener('click', addNewSlide);
    saveBtn.addEventListener('click', saveEditedRoteiro);

    colorPicker.addEventListener('change', e => {
        if (allRoteiros[currentSlideIndex]) {
            allRoteiros[currentSlideIndex].backgroundColor = e.target.value;
            slideContent.style.backgroundColor = e.target.value;
            updateWatermark();
        }
    });

    boldBtn.addEventListener('click', () => formatText('bold'));
    italicBtn.addEventListener('click', () => formatText('italic'));
    underlineBtn.addEventListener('click', () => formatText('underline'));
    leftAlignBtn.addEventListener('click', () => formatText('justifyLeft'));
    centerAlignBtn.addEventListener('click', () => formatText('justifyCenter'));
    rightAlignBtn.addEventListener('click', () => formatText('justifyRight'));
    justifyBtn.addEventListener('click', () => formatText('justifyFull'));
    fontFamilySelect.addEventListener('change', e => formatText('fontName', e.target.value));

    // Lógica para os atalhos de cor de fundo
    colorShortcuts.forEach(button => {
        button.addEventListener('click', (e) => {
            const color = e.currentTarget.dataset.color;
            slideContent.style.backgroundColor = color;
            colorPicker.value = color;
            if (allRoteiros[currentSlideIndex]) {
                allRoteiros[currentSlideIndex].backgroundColor = color;
            }
            updateWatermark();
        });
    });

    textColorPicker.addEventListener('input', e => {
        const value = e.target.value;
        if (window.getSelection().rangeCount) {
            document.execCommand('foreColor', false, value);
        }
    });

    // Lógica para os atalhos de cor de texto
    textColorShortcuts.forEach(button => {
        button.addEventListener('click', (e) => {
            const color = e.currentTarget.dataset.color;
            if (window.getSelection().rangeCount) {
                document.execCommand('foreColor', false, color);
            }
        });
    });

    fontSizeSelect.addEventListener('change', e => {
        const newSize = e.target.value;
        if (!newSize) return;
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const span = document.createElement('span');
            span.style.fontSize = newSize;
            if (!range.collapsed) {
                try {
                    range.surroundContents(span);
                } catch (err) {
                    document.execCommand('fontSize', false, '1');
                    const fontElements = document.activeElement.getElementsByTagName('font');
                    for (let el of fontElements) {
                        if (el.size === "1") {
                            el.style.fontSize = newSize;
                            el.removeAttribute('size');
                        }
                    }
                }
            }
            setTimeout(updateToolbarState, 50);
        }
    });


    textColorPicker.addEventListener('input', e => {
        const value = e.target.value;
        if (window.getSelection().rangeCount) document.execCommand('foreColor', false, value);
    });

    slideContent.addEventListener('mouseup', updateToolbarState);
    slideContent.addEventListener('keyup', updateToolbarState);

    bringToFrontBtn.addEventListener('click', () => {
        if (selectedElement) {
            selectedElement.style.zIndex = zIndexCounter++;
            selectedElement.setAttribute('data-zindex', selectedElement.style.zIndex);
        }
    });

    sendToBackBtn.addEventListener('click', () => {
        if (selectedElement) {
            selectedElement.style.zIndex = 0;
            selectedElement.setAttribute('data-zindex', 0);
        }
    });

    opacitySlider.addEventListener('input', (e) => {
        if (selectedElement) {
            selectedElement.style.opacity = e.target.value;
        }
    });

    const imageUpload = document.getElementById('imageUpload');
    const uploadBtn = document.getElementById('uploadBtn');
    uploadBtn.addEventListener('click', () => imageUpload.click());

    // NOVO CÓDIGO PARA UPLOAD PARA A CLOUDINARY
    imageUpload.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            // Exibe uma mensagem de carregamento enquanto a imagem é enviada
            //alert('Enviando imagem para a Cloudinary...');

            const imageUrl = await uploadImageToCloudinary(file);

            if (imageUrl) {
                // Se o upload for bem-sucedido, cria o elemento da imagem com a URL da Cloudinary
                createImageElement({ src: imageUrl });
                //  alert('Imagem carregada com sucesso!');
            }
        }
        e.target.value = ''; // Limpa o input para permitir uploads do mesmo arquivo
    });

    async function exportSlideAsPNG() {
        if (selectedElement) {
            selectedElement.classList.remove('element-selected');
            selectedElement = null;
        }
        const options = {
            backgroundColor: slideContent.style.backgroundColor || '#ffffff',
            width: 540, height: 675, scale: 2, useCORS: true,
            allowTaint: false, foreignObjectRendering: false,
            removeContainer: true, imageTimeout: 0, logging: false
        };
        try {
            const snapLines = slideContent.querySelectorAll('.snap-line');
            snapLines.forEach(line => line.style.display = 'none');
            const editableElements = slideContent.querySelectorAll('h2[contenteditable="true"], p[contenteditable="true"]');
            const originalBorders = [];
            editableElements.forEach((el, index) => {
                originalBorders[index] = el.style.border;
                el.style.border = 'none';
                el.blur();
            });
            const imageContainers = slideContent.querySelectorAll('.image-container');
            imageContainers.forEach(container => container.style.outline = 'none');
            const originalSlideBorder = slideContent.style.border;
            slideContent.style.border = 'none';
            const allHandles = slideContent.querySelectorAll('.rotate-handle, .resize-handle, .move-handle-text');
            allHandles.forEach(handle => handle.style.display = 'none');
            const exportPreview = document.querySelector('.export-preview');
            exportPreview.style.display = 'none';

            const canvas = await html2canvas(slideContent, options);

            slideContent.style.border = originalSlideBorder;
            snapLines.forEach(line => line.style.display = '');
            editableElements.forEach((el, index) => el.style.border = originalBorders[index]);
            allHandles.forEach(handle => handle.style.display = '');
            exportPreview.style.display = 'block';

            const now = new Date();
            const timestamp = now.toISOString().slice(0, 19).replace(/[:-]/g, '').replace('T', '_');
            const fileName = `slide_${currentSlideIndex + 1}_${timestamp}.png`;
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                const btn = document.getElementById('exportPngBtn');
                btn.innerHTML = '✅ Exportado!';
                btn.style.backgroundColor = '#28a745';
                setTimeout(() => {
                    if (btn) {
                        btn.innerHTML = '<i class="fas fa-file-arrow-down"></i>';
                        btn.style.backgroundColor = '';
                    }
                }, 2000);
            }, 'image/png', 1.0);
        } catch (error) {
            console.error('Erro ao exportar PNG:', error);
            alert('Erro ao exportar o slide. Tente novamente.');
        }
    }
    document.getElementById('exportPngBtn').addEventListener('click', exportSlideAsPNG);

    fetchThemes();
});