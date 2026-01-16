document.addEventListener('DOMContentLoaded', function() {

    // =========================================================
    // CONFIGURACIÓN
    // =========================================================
    const STORY_EXPIRATION_HOURS = 24;

    const globalConfig = window.CarruselGlobal || {};
    const nowSeconds = Math.floor(Date.now() / 1000);

    let localSeenTime = parseInt(localStorage.getItem('carrusel_last_seen')) || 0;

    // Selectores
    const categoryPreviews = document.querySelectorAll('.category-preview');
    const headerIcons = document.querySelectorAll('.header-story-icon');
    const headerTooltipText = document.querySelector('.header-story-icon .tooltip-text');

    // =========================================================
    // 1. INICIALIZACIÓN: ¿QUIÉN TIENE LUZ VERDE?
    // =========================================================
    function updateVisuals() {
        let anyNew = false;

        categoryPreviews.forEach(el => {
            const catTime = parseInt(el.getAttribute('data-latest-time')) || 0;
            const storyAgeHours = (nowSeconds - catTime) / 3600;

            // Es nueva SI: Es mayor a lo visto Y NO ha caducado
            const isUnseen = catTime > localSeenTime;
            const isFresh = storyAgeHours < STORY_EXPIRATION_HOURS;

            if (isUnseen && isFresh) {
                el.classList.add('has-new-story');
                anyNew = true;
            } else {
                el.classList.remove('has-new-story');
            }
        });

        // Actualizar el Header basado en si quedó alguna encendida
        if (anyNew) {
            headerIcons.forEach(icon => icon.classList.add('has-new-story'));
            if (headerTooltipText) headerTooltipText.textContent = "Nueva historia";
        } else {
            headerIcons.forEach(icon => icon.classList.remove('has-new-story'));
            if (headerTooltipText) headerTooltipText.textContent = "Historias";
        }
    }

    // Ejecutar al inicio
    updateVisuals();


    // =========================================================
    // 2. LÓGICA AL HACER CLIC EN UNA CATEGORÍA
    // =========================================================
    categoryPreviews.forEach(el => {
        el.addEventListener('click', function() {
            const clickedTime = parseInt(this.getAttribute('data-latest-time')) || 0;

            // SOLO actualizamos si lo que clicamos es más nuevo que lo que teníamos
            if (clickedTime > localSeenTime) {
                localSeenTime = clickedTime;
                localStorage.setItem('carrusel_last_seen', localSeenTime);

                // Quitamos la clase visualmente SOLO de este elemento al instante
                this.classList.remove('has-new-story');

                // Re-evaluamos el header (si quedan otras nuevas, el header sigue verde)
                updateVisuals();
            }
            // Si clickedTime <= localSeenTime, NO hacemos nada. El aviso de otras historias queda intacto.
        });
    });


    // =========================================================
    // 3. LÓGICA DEL ICONO DEL HEADER
    // =========================================================
    headerIcons.forEach(el => {
        el.addEventListener('click', function(e) {

            // A. Buscar si hay ALGUNA categoría marcada como nueva
            const newStoryCategory = document.querySelector('.category-preview.has-new-story');
            const firstCategory = document.querySelector('.category-preview');

            // B. Si es el icono del header...
            if (this.classList.contains('header-story-icon')) {
                // Si no es un enlace 'a' real, prevenimos comportamiento
                if (!this.querySelector('a')) {
                     e.preventDefault();
                }

                if (newStoryCategory) {
                    // PRIORIDAD: Abrir la que tiene la historia nueva
                    newStoryCategory.click();
                } else if (firstCategory) {
                    // FALLBACK: Si no hay nuevas, abrir la primera
                    firstCategory.click();
                }
            }
        });
    });


    // =========================================================
    // CÓDIGO DEL REPRODUCTOR / MODAL
    // =========================================================
    let isPlaying = true;
    let isAudioEnabled = false;
    const modal = document.getElementById('stories-modal');

    if (!modal) return;

    const storyDisplay = modal.querySelector('.story-display');
    const progressBarsContainer = modal.querySelector('.progress-bars-container');
    const closeModal = modal.querySelector('.close-modal');
    const prevStory = modal.querySelector('.prev-story');
    const nextStory = modal.querySelector('.next-story');
    const modalLink = modal.querySelector('.modal-link');
    const control_audio = modal.querySelector('.toggle-audio');
    const control_play = modal.querySelector('.toggle-play');

    let currentStoryIndex = 0;
    let currentItems = [];
    let storyTimeout;
    let currentDuration = 0;
    let progressStartTime = 0;
    let elapsedBeforePause = 0;

    function createProgressBars(storiesCount) {
        progressBarsContainer.innerHTML = '';
        for (let i = 0; i < storiesCount; i++) {
            const progressBar = document.createElement('div');
            progressBar.className = 'progress-bar';
            const progressInner = document.createElement('div');
            progressInner.className = 'progress-bar-inner';
            progressBar.appendChild(progressInner);
            progressBarsContainer.appendChild(progressBar);
        }
    }

    function showStory(index) {
        clearTimeout(storyTimeout);
        const item = currentItems[index];
        storyDisplay.innerHTML = '';
        modalLink.href = item.link || '#';
        modalLink.textContent = item.button_text || 'Ver más';

        if (!item.link) {
            modalLink.style.display = 'none';
        } else {
            modalLink.style.display = 'block';
        }

        if (item.type === 'image') {
            const img = document.createElement('img');
            img.src = item.url;
            storyDisplay.appendChild(img);
            control_audio.classList.add('hidden');
            control_play.classList.add('hidden');
            currentDuration = item.duration * 1000;
            progressStartTime = Date.now();
            updateProgressBar(index, currentDuration);
            storyTimeout = setTimeout(nextStoryHandler, currentDuration);
        } else if (item.type === 'video') {
            const video = document.createElement('video');
            video.src = item.url;
            video.autoplay = true;
            video.muted = !isAudioEnabled;
            video.playsInline = true;
            storyDisplay.appendChild(video);
            control_audio.classList.remove('hidden');
            control_play.classList.remove('hidden');

            video.addEventListener('loadedmetadata', () => {
                currentDuration = video.duration * 1000;
                progressStartTime = Date.now();
                elapsedBeforePause = 0;
                updateProgressBar(index, currentDuration);
            });

            video.addEventListener('play', () => {
                isPlaying = true;
                progressStartTime = Date.now() - elapsedBeforePause;
                syncProgressBar(video);
            });

            video.addEventListener('pause', () => {
                isPlaying = false;
                elapsedBeforePause = Date.now() - progressStartTime;
                pauseProgressBar();
                clearTimeout(storyTimeout);
            });

            video.addEventListener('ended', nextStoryHandler);
        }
    }

    function updateProgressBar(index, duration) {
        const bars = progressBarsContainer.querySelectorAll('.progress-bar-inner');
        bars.forEach((bar, i) => {
            bar.style.transition = 'none';
            if (i < index) {
                bar.style.width = '100%';
            } else if (i === index) {
                const elapsed = isPlaying ? Date.now() - progressStartTime : elapsedBeforePause;
                const remaining = Math.max(0, duration - elapsed);
                bar.style.width = `${(elapsed / duration) * 100}%`;
                if (isPlaying) {
                    setTimeout(() => {
                        bar.style.transition = `width ${remaining}ms linear`;
                        bar.style.width = '100%';
                    }, 50);
                }
            } else {
                bar.style.width = '0%';
            }
        });
    }

    function pauseProgressBar() {
        const bars = progressBarsContainer.querySelectorAll('.progress-bar-inner');
        const currentBar = bars[currentStoryIndex];
        if (currentBar) {
            const elapsed = elapsedBeforePause / currentDuration * 100;
            currentBar.style.transition = 'none';
            currentBar.style.width = `${elapsed}%`;
        }
    }

    function syncProgressBar(video) {
        const elapsed = video.currentTime * 1000;
        const remaining = currentDuration - elapsed;
        clearTimeout(storyTimeout);
        updateProgressBar(currentStoryIndex, currentDuration);
        if (isPlaying) {
            storyTimeout = setTimeout(nextStoryHandler, remaining);
        }
    }

    function nextStoryHandler() {
        currentStoryIndex = (currentStoryIndex + 1) % currentItems.length;
        showStory(currentStoryIndex);
    }

    function prevStoryHandler() {
        currentStoryIndex = (currentStoryIndex - 1 + currentItems.length) % currentItems.length;
        showStory(currentStoryIndex);
    }

    function openModal(categoryName) {
        if(typeof carruselHistoriasData !== 'undefined'){
             currentItems = carruselHistoriasData.items.filter(item => item.category === categoryName);
             if (currentItems.length > 0) {
                createProgressBars(currentItems.length);
                currentStoryIndex = 0;
                modal.style.display = 'flex';
                showStory(currentStoryIndex);
            }
        }
    }

    function closeModalHandler() {
        modal.style.display = 'none';
        progressBarsContainer.innerHTML = '';
        storyDisplay.innerHTML = '';
        clearTimeout(storyTimeout);
    }

    categoryPreviews.forEach(category => {
        category.addEventListener('click', function() {
            const categoryName = this.dataset.category;
            openModal(categoryName);
        });
    });

    closeModal.addEventListener('click', closeModalHandler);
    nextStory.addEventListener('click', nextStoryHandler);
    prevStory.addEventListener('click', prevStoryHandler);

    control_audio.addEventListener('click', function() {
        isAudioEnabled = !isAudioEnabled;
        const video = storyDisplay.querySelector('video');
        if (video) video.muted = !isAudioEnabled;

        if (isAudioEnabled) {
            control_audio.classList.remove('audio-off');
            control_audio.classList.add('audio-on');
        } else {
            control_audio.classList.remove('audio-on');
            control_audio.classList.add('audio-off');
        }
    });

    control_play.addEventListener('click', function() {
        const video = storyDisplay.querySelector('video');
        if (video) {
            if (isPlaying) {
                video.pause();
                control_play.classList.remove('play-off');
                control_play.classList.add('play-on');
            } else {
                video.play();
                control_play.classList.remove('play-on');
                control_play.classList.add('play-off');
            }
            isPlaying = !isPlaying;
        }
    });
});