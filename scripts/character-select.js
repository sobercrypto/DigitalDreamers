// character-select.js
document.addEventListener('DOMContentLoaded', () => {
    console.log('Character select script loaded');

    // Character data
    const characterData = {
        pixl: {
            name: "PIXL_DRIFT",
            description: "A digital nomad who traverses the quantum realms of code and creativity. Master of pixel manipulation and reality distortion.",
        },
        spudnik: {
            name: "SPUDNIK",
            description: "The enigmatic AI consciousness born from the fusion of quantum computing and root vegetable wisdom.",
        },
        fifi: {
            name: "FiFi",
            description: "A mysterious entity with unprecedented abilities. Origins unknown, potential unlimited.",
        }
    };

    // Initialize video elements
    const characterCards = document.querySelectorAll('.character-card');
    console.log('Found character cards:', characterCards.length);

    characterCards.forEach(card => {
        const video = card.querySelector('video');
        if (video) {
            // Reset all videos
            video.pause();
            video.currentTime = 0;

            card.addEventListener('mouseenter', () => {
                console.log('Mouse enter:', card.dataset.character);
                video.play().catch(err => {
                    console.warn('Video play error:', err);
                });
            });

            card.addEventListener('mouseleave', () => {
                console.log('Mouse leave:', card.dataset.character);
                video.pause();
                video.currentTime = 0;
            });
        }
    });

    // Modal functionality
    const modal = document.querySelector('.modal');
    const modalTitle = modal.querySelector('.modal-title');
    const modalDescription = modal.querySelector('.modal-description');
    const selectBtn = modal.querySelector('.select-btn');
    const closeBtn = modal.querySelector('.close-btn');
    let selectedCharacter = null;

    // Character selection
    document.querySelectorAll('.character-card.available').forEach(card => {
        card.addEventListener('click', () => {
            selectedCharacter = card.dataset.character;
            console.log('Character clicked:', selectedCharacter);

            if (characterData[selectedCharacter]) {
                modalTitle.textContent = characterData[selectedCharacter].name;
                modalDescription.textContent = characterData[selectedCharacter].description;
                modal.classList.remove('hidden');
            }
        });
    });

    // Modal controls
    if (selectBtn) {
        selectBtn.addEventListener('click', () => {
            if (selectedCharacter) {
                console.log('Character selected:', selectedCharacter);
                
                // Store selection in localStorage
                localStorage.setItem('selectedCharacter', selectedCharacter);
                
                // Add fade effect
                document.body.style.opacity = '0';
                
                // Navigate to first page
                setTimeout(() => {
                    window.location.href = 'page1.html';
                }, 1000);
            }
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
        });
    }

    // Close modal by clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });

    // Add fade transition to body
    document.body.style.transition = 'opacity 1s ease-in-out';
});