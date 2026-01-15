document.addEventListener('DOMContentLoaded', function() {

    let isPlaying = true; // Los videos se reproducen automáticamente por defecto
    let isAudioEnabled = false;

    const categoryPreviews = document.querySelectorAll('.category-preview');
    const modal = document.getElementById('stories-modal');

    // Verificar si el modal existe antes de acceder a sus propiedades
    if (!modal) {
        return; // Detiene la ejecución si el modal no está en la página
    }

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
    let progressStartTime = 0; // Marca el inicio del progreso
    let elapsedBeforePause = 0; // Tiempo transcurrido antes de la pausa

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

            currentDuration = item.duration * 1000; // Duración definida
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
                currentDuration = video.duration * 1000; // Duración real del video
                progressStartTime = Date.now();
                elapsedBeforePause = 0; // Reiniciar el tiempo transcurrido
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
        currentItems = carruselHistoriasData.items.filter(item => item.category === categoryName);
        if (currentItems.length > 0) {
            createProgressBars(currentItems.length);
            currentStoryIndex = 0;
            modal.style.display = 'flex';
            showStory(currentStoryIndex);
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

    const toggleAudioButton = modal.querySelector('.toggle-audio');

    toggleAudioButton.addEventListener('click', function() {
        isAudioEnabled = !isAudioEnabled;

        const video = storyDisplay.querySelector('video');
        if (video) {
            video.muted = !isAudioEnabled;
        }

        if (isAudioEnabled) {
            toggleAudioButton.classList.remove('audio-off');
            toggleAudioButton.classList.add('audio-on');
        } else {
            toggleAudioButton.classList.remove('audio-on');
            toggleAudioButton.classList.add('audio-off');
        }
    });

    const togglePlayButton = modal.querySelector('.toggle-play');

    togglePlayButton.addEventListener('click', function() {
        const video = storyDisplay.querySelector('video');

        if (video) {
            if (isPlaying) {
                video.pause();
                togglePlayButton.classList.remove('play-off');
                togglePlayButton.classList.add('play-on');
            } else {
                video.play();
                togglePlayButton.classList.remove('play-on');
                togglePlayButton.classList.add('play-off');
            }
            isPlaying = !isPlaying;
        }
    });
});
