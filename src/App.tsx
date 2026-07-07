import { ChevronLeft, ChevronRight, Download, Maximize2, Moon, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { GalleryImage, galleryImages, imageUrl } from "./data/gallery";

export function App() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeIndex = useMemo(
    () => galleryImages.findIndex((image) => image.id === activeId),
    [activeId]
  );
  const activeImage = activeIndex >= 0 ? galleryImages[activeIndex] : null;

  function openImage(image: GalleryImage) {
    setActiveId(image.id);
  }

  function closeLightbox() {
    setActiveId(null);
  }

  function moveLightbox(direction: -1 | 1) {
    if (activeIndex < 0) return;
    const nextIndex = (activeIndex + direction + galleryImages.length) % galleryImages.length;
    setActiveId(galleryImages[nextIndex].id);
  }

  useEffect(() => {
    if (!activeImage) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeLightbox();
      if (event.key === "ArrowLeft") moveLightbox(-1);
      if (event.key === "ArrowRight") moveLightbox(1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeImage, activeIndex]);

  useEffect(() => {
    document.body.style.overflow = activeImage ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [activeImage]);

  return (
    <main className="shell">
      <header className="hero">
        <div className="heroCopy">
          <span className="mark"><Moon /> Dark mode default</span>
          <h1>GUGO Gallery</h1>
          <p>
            A clean little home for the GUGO image set. Open anything in the lightbox,
            download the originals, and keep the page out of the way.
          </p>
        </div>
        <div className="heroStats" aria-label="Gallery summary">
          <strong>{galleryImages.length}</strong>
          <span>images ready</span>
        </div>
      </header>

      <section className="gallery" aria-label="GUGO image gallery">
        {galleryImages.map((image) => {
          const src = imageUrl(image.filename);
          return (
            <article className="tile" key={image.id}>
              <button className="previewButton" onClick={() => openImage(image)}>
                <img src={src} alt={image.title} loading="lazy" />
                <span className="previewOverlay">
                  <Maximize2 />
                  View
                </span>
              </button>
              <div className="tileFooter">
                <div>
                  <h2>{image.title}</h2>
                  <p>{image.filename}</p>
                </div>
                <a className="downloadButton" href={src} download={image.filename} aria-label={`Download ${image.title}`}>
                  <Download />
                </a>
              </div>
            </article>
          );
        })}
      </section>

      {activeImage && (
        <Lightbox
          image={activeImage}
          index={activeIndex}
          total={galleryImages.length}
          onClose={closeLightbox}
          onPrevious={() => moveLightbox(-1)}
          onNext={() => moveLightbox(1)}
        />
      )}
    </main>
  );
}

function Lightbox({
  image,
  index,
  total,
  onClose,
  onPrevious,
  onNext
}: {
  image: GalleryImage;
  index: number;
  total: number;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const src = imageUrl(image.filename);
  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={`${image.title} preview`} onClick={(event) => event.currentTarget === event.target && onClose()}>
      <div className="lightboxPanel">
        <div className="lightboxTop">
          <div>
            <span>{index + 1} / {total}</span>
            <h2>{image.title}</h2>
            <p>{image.filename}</p>
          </div>
          <div className="lightboxActions">
            <a className="actionButton" href={src} download={image.filename} aria-label={`Download ${image.title}`}>
              <Download />
              Download
            </a>
            <button className="iconButton" onClick={onClose} aria-label="Close preview">
              <X />
            </button>
          </div>
        </div>
        <div className="imageStage">
          <button className="navButton previous" onClick={onPrevious} aria-label="Previous image">
            <ChevronLeft />
          </button>
          <img src={src} alt={image.title} />
          <button className="navButton next" onClick={onNext} aria-label="Next image">
            <ChevronRight />
          </button>
        </div>
      </div>
    </div>
  );
}
