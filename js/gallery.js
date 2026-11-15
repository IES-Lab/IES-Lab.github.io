// A reusable gallery that also initializes when jQuery inserts an article.
class ImageGallery extends HTMLElement {
	connectedCallback() {
		const track = this.querySelector(".gallery-track");
		const controls = this.querySelector(".gallery-controls");
		if (!track || !controls) return;

		const previous = controls.querySelector('[data-gallery-step="-1"]');
		const next = controls.querySelector('[data-gallery-step="1"]');
		if (!previous || !next) return;

		const update = () => {
			const maxScroll = track.scrollWidth - track.clientWidth;
			controls.hidden = maxScroll <= 1;
			previous.disabled = track.scrollLeft <= 1;
			next.disabled = track.scrollLeft >= maxScroll - 1;
		};

		const move = (direction) => {
			const card = track.firstElementChild;
			if (!card) return;
			const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
			track.scrollBy({ left: direction * (card.getBoundingClientRect().width + gap) });
		};

		previous.onclick = () => move(-1);
		next.onclick = () => move(1);
		track.addEventListener("scroll", update, { passive: true });

		const observer = new ResizeObserver(update);
		observer.observe(track);
		update();

		this.cleanup = () => {
			observer.disconnect();
			track.removeEventListener("scroll", update);
			previous.onclick = null;
			next.onclick = null;
		};
	}

	disconnectedCallback() {
		if (this.cleanup) this.cleanup();
	}
}

customElements.define("image-gallery", ImageGallery);
