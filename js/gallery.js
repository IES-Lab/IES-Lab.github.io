// A reusable gallery that also initializes when jQuery inserts an article.
class ImageGallery extends HTMLElement {
	connectedCallback() {
		const track = this.querySelector(".gallery-track");
		const controls = this.querySelector(".gallery-controls");
		if (!track || !controls) return;

		const previous = controls.querySelector('[data-gallery-step="-1"]');
		const next = controls.querySelector('[data-gallery-step="1"]');
		const originals = Array.from(track.children);
		const count = originals.length;
		if (!previous || !next || !count) return;

		// Generate the viewport and clickable edges without changing the article.
		const viewport = document.createElement("div");
		viewport.className = "gallery-viewport";
		track.before(viewport);
		viewport.append(track);

		const createEdge = (side, label) => {
			const button = document.createElement("button");
			button.type = "button";
			button.className = "gallery-edge " + side;
			button.setAttribute("aria-label", label);
			button.tabIndex = -1;
			button.hidden = true;
			viewport.append(button);
			return button;
		};

		const leftEdge = createEdge("prev", "Previous image");
		const rightEdge = createEdge("next", "Next image");
		let clones = [];
		let looping = false;
		let step = 0;
		let logicalIndex = 0;
		let targetIndex = null;
		let settleTimer;
		const mod = (index) => ((index % count) + count) % count;

		const cloneCards = () => originals.map((card) => {
			const clone = card.cloneNode(true);
			clone.setAttribute("aria-hidden", "true");
			clone.inert = true;
			clone.removeAttribute("id");
			clone.querySelectorAll("[id]").forEach(el => el.removeAttribute("id"));
			return clone;
		});

		const jump = (index) => track.scrollTo({
			left: index * step,
			behavior: "instant"
		});

		// Recenter on the identical card in the middle copy after scrolling.
		const settle = () => {
			clearTimeout(settleTimer);
			targetIndex = null;
			if (!looping || !step) return;
			const index = Math.round(track.scrollLeft / step);
			logicalIndex = mod(index);
			if (index < count || index >= 2 * count) {
				jump(count + logicalIndex);
			}
		};

		const onScroll = () => {
			clearTimeout(settleTimer);
			settleTimer = setTimeout(settle, 180);
		};

		const updateLayout = () => {
			const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
			const newStep = originals[0].getBoundingClientRect().width + gap;
			if (!track.clientWidth || newStep <= gap) return;
			const needsLoop = count * newStep - gap > track.clientWidth + 1;
			if (needsLoop === looping && Math.abs(newStep - step) < 0.01) return;

			// Preserve the current item when the responsive layout changes.
			if (looping && step) {
				logicalIndex = mod(targetIndex ?? Math.round(track.scrollLeft / step));
			}
			clearTimeout(settleTimer);
			targetIndex = null;
			step = newStep;

			if (needsLoop !== looping) {
				clones.forEach(clone => clone.remove());
				clones = [];
				looping = needsLoop;
				if (looping) {
					const before = cloneCards();
					const after = cloneCards();
					track.prepend(...before);
					track.append(...after);
					clones = [...before, ...after];
				}
				viewport.classList.toggle("is-looping", looping);
				controls.hidden = leftEdge.hidden = rightEdge.hidden = !looping;
			}

			jump(looping ? count + logicalIndex : 0);
		};

		const move = (direction) => {
			if (!looping) return;
			let index = targetIndex ?? Math.round(track.scrollLeft / step);
			const maxIndex = Math.floor((track.scrollWidth - track.clientWidth + 1) / step);
			if (index + direction < 0 || index + direction > maxIndex) {
				index = count + mod(index);
				jump(index);
			}
			targetIndex = index + direction;
			track.scrollTo({ left: targetIndex * step, behavior: "auto" });
			onScroll();
		};

		const clearTarget = () => { targetIndex = null; };
		previous.onclick = leftEdge.onclick = () => move(-1);
		next.onclick = rightEdge.onclick = () => move(1);
		track.addEventListener("scroll", onScroll, { passive: true });
		track.addEventListener("scrollend", settle);
		track.addEventListener("pointerdown", clearTarget);
		track.addEventListener("wheel", clearTarget, { passive: true });

		const observer = new ResizeObserver(updateLayout);
		observer.observe(track);
		updateLayout();

		this.cleanup = () => {
			observer.disconnect();
			clearTimeout(settleTimer);
			track.removeEventListener("scroll", onScroll);
			track.removeEventListener("scrollend", settle);
			track.removeEventListener("pointerdown", clearTarget);
			track.removeEventListener("wheel", clearTarget);
			previous.onclick = next.onclick = null;
			clones.forEach(clone => clone.remove());
			viewport.before(track);
			viewport.remove();
			controls.hidden = true;
		};
	}

	disconnectedCallback() {
		if (this.cleanup) this.cleanup();
	}
}

customElements.define("image-gallery", ImageGallery);
