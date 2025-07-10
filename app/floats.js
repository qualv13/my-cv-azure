document.addEventListener("DOMContentLoaded", function() {
    const container = document.querySelector('.bg2-container');
    const icons = document.querySelectorAll('.floating-icon');
    const overlay = document.querySelector('section.two .content-overlay');
    const containerRect = () => container.getBoundingClientRect();
    const iconSize = 60; // px
    const numIcons = icons.length;

    // Calculate grid size (rows x cols)
    const cols = Math.ceil(Math.sqrt(numIcons));
    const rows = Math.ceil(numIcons / cols);
    const cellWidth = container.offsetWidth / cols;
    const cellHeight = container.offsetHeight / rows;

    // Shuffle array helper
    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // Generate shuffled cell indices
    const cellIndices = shuffle(Array.from({length: numIcons}, (_, i) => i));

    // Store state for each icon
    const iconStates = Array.from(icons).map((icon, idx) => {
        // Assign to a cell
        const cell = cellIndices[idx];
        const cellRow = Math.floor(cell / cols);
        const cellCol = cell % cols;
        // Random offset within cell, but keep icon fully inside
        const minX = cellCol * cellWidth;
        const minY = cellRow * cellHeight;
        const maxX = Math.max(minX, minX + cellWidth - iconSize);
        const maxY = Math.max(minY, minY + cellHeight - iconSize);
        const x = minX + Math.random() * (maxX - minX);
        const y = minY + Math.random() * (maxY - minY);
        return {
            el: icon,
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 1.5,
            vy: (Math.random() - 0.5) * 1.5,
            dragging: false,
            offsetX: 0,
            offsetY: 0
        };
    });

    // Set initial positions
    iconStates.forEach(state => {
        state.el.style.left = state.x + "px";
        state.el.style.top = state.y + "px";
    });

    // Helper: detect collision between two icons
    function isColliding(a, b) {
        return (
            a.x < b.x + iconSize &&
            a.x + iconSize > b.x &&
            a.y < b.y + iconSize &&
            a.y + iconSize > b.y
        );
    }

    // Helper: detect collision with overlay
    function isCollidingOverlay(state, overlayRect, contRect) {
        const iconRect = {
            left: state.x + contRect.left,
            right: state.x + iconSize + contRect.left,
            top: state.y + contRect.top,
            bottom: state.y + iconSize + contRect.top
        };
        return !(
            iconRect.right < overlayRect.left ||
            iconRect.left > overlayRect.right ||
            iconRect.bottom < overlayRect.top ||
            iconRect.top > overlayRect.bottom
        );
    }

    // Animation loop for random floating with bouncing
    function animate() {
        const contRect = containerRect();
        const overlayRect = overlay.getBoundingClientRect();
        for (let i = 0; i < iconStates.length; i++) {
            const state = iconStates[i];
            if (!state.dragging) {
                state.x += state.vx;
                state.y += state.vy;

                // Bounce off edges
                if (state.x < 0) { state.x = 0; state.vx *= -1; }
                if (state.x > container.offsetWidth - iconSize) { state.x = container.offsetWidth - iconSize; state.vx *= -1; }
                if (state.y < 0) { state.y = 0; state.vy *= -1; }
                if (state.y > container.offsetHeight - iconSize) { state.y = container.offsetHeight - iconSize; state.vy *= -1; }

                // Bounce off other icons
                for (let j = 0; j < iconStates.length; j++) {
                    if (i === j) continue;
                    const other = iconStates[j];
                    if (!other.dragging && isColliding(state, other)) {
                        // Simple elastic collision: swap velocities
                        const tempVx = state.vx;
                        const tempVy = state.vy;
                        state.vx = other.vx;
                        state.vy = other.vy;
                        other.vx = tempVx;
                        other.vy = tempVy;
                        // Move them apart
                        if (state.x < other.x) { state.x -= 2; other.x += 2; } else { state.x += 2; other.x -= 2; }
                        if (state.y < other.y) { state.y -= 2; other.y += 2; } else { state.y += 2; other.y -= 2; }
                    }
                }

                // Bounce off content-overlay
                if (isCollidingOverlay(state, overlayRect, contRect)) {
                    // Determine the closest edge and bounce away
                    const iconCenterX = state.x + iconSize/2 + contRect.left;
                    const iconCenterY = state.y + iconSize/2 + contRect.top;
                    const dx = Math.max(overlayRect.left - iconCenterX, 0, iconCenterX - overlayRect.right);
                    const dy = Math.max(overlayRect.top - iconCenterY, 0, iconCenterY - overlayRect.bottom);
                    if (Math.abs(dx) > Math.abs(dy)) {
                        state.vx *= -1;
                        // Move out horizontally
                        if (iconCenterX < overlayRect.left) state.x = overlayRect.left - contRect.left - iconSize - 2;
                        else state.x = overlayRect.right - contRect.left + 2;
                    } else {
                        state.vy *= -1;
                        // Move out vertically
                        if (iconCenterY < overlayRect.top) state.y = overlayRect.top - contRect.top - iconSize - 2;
                        else state.y = overlayRect.bottom - contRect.top + 2;
                    }
                }

                state.el.style.left = state.x + "px";
                state.el.style.top = state.y + "px";
            }
        }
        requestAnimationFrame(animate);
    }
    animate();

    // Drag and drop logic
    iconStates.forEach(state => {
        const icon = state.el;

        function onPointerDown(e) {
            state.dragging = true;
            icon.classList.add('dragging');
            const rect = icon.getBoundingClientRect();
            state.offsetX = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
            state.offsetY = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
            document.addEventListener('pointermove', onPointerMove);
            document.addEventListener('pointerup', onPointerUp);
            document.addEventListener('touchmove', onPointerMove, {passive: false});
            document.addEventListener('touchend', onPointerUp);
        }

        function onPointerMove(e) {
            if (!state.dragging) return;
            e.preventDefault();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            const contRect = containerRect();
            let newX = clientX - contRect.left - state.offsetX;
            let newY = clientY - contRect.top - state.offsetY;
            // Clamp
            newX = Math.max(0, Math.min(newX, container.offsetWidth - iconSize));
            newY = Math.max(0, Math.min(newY, container.offsetHeight - iconSize));
            state.x = newX;
            state.y = newY;
            icon.style.left = state.x + "px";
            icon.style.top = state.y + "px";
        }

        function onPointerUp() {
            state.dragging = false;
            icon.classList.remove('dragging');
            document.removeEventListener('pointermove', onPointerMove);
            document.removeEventListener('pointerup', onPointerUp);
            document.removeEventListener('touchmove', onPointerMove);
            document.removeEventListener('touchend', onPointerUp);
        }

        icon.addEventListener('pointerdown', onPointerDown);
        icon.addEventListener('touchstart', onPointerDown, {passive: false});
    });

    // Responsive: update bounds on resize
    window.addEventListener('resize', () => {
        iconStates.forEach(state => {
            state.x = Math.max(0, Math.min(state.x, container.offsetWidth - iconSize));
            state.y = Math.max(0, Math.min(state.y, container.offsetHeight - iconSize));
            state.el.style.left = state.x + "px";
            state.el.style.top = state.y + "px";
        });
    });
});