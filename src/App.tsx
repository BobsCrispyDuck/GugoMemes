import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  ImagePlus,
  Loader2,
  Lock,
  Maximize2,
  ShieldCheck,
  Trash2,
  Upload,
  X,
  XCircle
} from "lucide-react";
import type { ReactNode } from "react";
import { ChangeEvent, DragEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { GalleryImage, galleryImages, imageUrl } from "./data/gallery";

type View = "gallery" | "upload" | "admin";
type Notice = { type: "success" | "error"; text: string } | null;
type CategoryId = "gugo-images" | "gugo-memes" | "holder-submitted" | "holder-submitted-gifs";

const categories: Array<{ id: CategoryId; label: string; empty: string }> = [
  { id: "gugo-images", label: "GUGO images", empty: "No GUGO images yet." },
  { id: "gugo-memes", label: "GUGO memes", empty: "No official GUGO memes yet." },
  { id: "holder-submitted", label: "Holder submitted memes", empty: "No holder submitted memes have been approved yet." },
  { id: "holder-submitted-gifs", label: "Holder submitted GIFs", empty: "No holder GIFs have been approved yet." }
];
const maxUploadFiles = 20;
const moderationPollMs = 15000;
const crispyReferralUrl = "https://gugo.run/register.html?ref=RUNGRZJ";
const acceptedImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const acceptedImageExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

interface ModerationPayload {
  pending: GalleryImage[];
  approved: GalleryImage[];
}

export function App() {
  const [images, setImages] = useState<GalleryImage[]>(galleryImages);
  const [activeCategory, setActiveCategory] = useState<CategoryId>("gugo-images");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [lightboxImages, setLightboxImages] = useState<GalleryImage[]>([]);
  const view = currentView();
  const visibleImages = useMemo(
    () => images.filter((image) => (image.category ?? "gugo-images") === activeCategory),
    [activeCategory, images]
  );
  const activeIndex = useMemo(
    () => lightboxImages.findIndex((image) => image.id === activeId),
    [activeId, lightboxImages]
  );
  const activeImage = activeIndex >= 0 ? lightboxImages[activeIndex] : null;
  const latestApprovedMemes = useMemo(
    () => [...images]
      .filter((image) => image.category === "holder-submitted" && image.source === "approved")
      .sort((a, b) => approvalSortValue(b).localeCompare(approvalSortValue(a)))
      .slice(0, 3),
    [images]
  );

  async function refreshGallery() {
    try {
      const response = await fetch("/api/gallery");
      if (!response.ok) return;
      const data = await response.json();
      if (Array.isArray(data.images)) setImages(data.images);
    } catch {
      // Static fallback stays usable without the app server.
    }
  }

  function openImage(image: GalleryImage, scopedImages = visibleImages) {
    setLightboxImages(scopedImages);
    setActiveId(image.id);
  }

  function closeLightbox() {
    setActiveId(null);
  }

  function moveLightbox(direction: -1 | 1) {
    if (activeIndex < 0) return;
    const nextIndex = (activeIndex + direction + lightboxImages.length) % lightboxImages.length;
    setActiveId(lightboxImages[nextIndex].id);
  }

  useEffect(() => {
    void refreshGallery();
  }, []);

  useEffect(() => {
    if (!activeImage) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeLightbox();
      if (event.key === "ArrowLeft") moveLightbox(-1);
      if (event.key === "ArrowRight") moveLightbox(1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeImage, activeIndex, lightboxImages]);

  useEffect(() => {
    document.body.style.overflow = activeImage ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [activeImage]);

  return (
    <main className="shell">
      <Header imageCount={images.length} view={view} />
      {view === "upload" ? (
        <UploadView latestApprovedMemes={latestApprovedMemes} onImageOpen={openImage} />
      ) : view === "admin" ? (
        <AdminView onGalleryChanged={refreshGallery} />
      ) : (
        <GalleryView images={visibleImages} allImages={images} activeCategory={activeCategory} onCategoryChange={setActiveCategory} onImageOpen={openImage} />
      )}

      {activeImage && (
        <Lightbox
          image={activeImage}
          index={activeIndex}
          total={lightboxImages.length}
          onClose={closeLightbox}
          onPrevious={() => moveLightbox(-1)}
          onNext={() => moveLightbox(1)}
        />
      )}
    </main>
  );
}

function currentView(): View {
  const path = window.location.pathname.replace(/\/+$/, "");
  if (path === "/upload") return "upload";
  if (path === "/admin") return "admin";
  return "gallery";
}

function approvalSortValue(image: GalleryImage) {
  return image.approvedAt ?? image.submittedAt ?? image.filename;
}

function formatApprovalDate(image: GalleryImage) {
  const value = image.approvedAt ?? image.submittedAt;
  if (!value) return "Approved recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Approved recently";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function visibleImageTitle(image: GalleryImage) {
  const title = image.title.trim();
  if (/\.(jpe?g|png|webp|gif)$/i.test(title)) {
    if (image.category === "holder-submitted-gifs") return "Holder submitted GIF";
    if (image.category === "holder-submitted") return "Holder submitted meme";
    if (image.category === "gugo-memes") return "GUGO meme";
    return "GUGO image";
  }
  return title;
}

function isAcceptedImageFile(file: File) {
  if (acceptedImageTypes.has(file.type)) return true;
  const name = file.name.toLowerCase();
  return acceptedImageExtensions.some((extension) => name.endsWith(extension));
}

function referralLinkText(image: GalleryImage) {
  return image.twitterHandle ? `Join @${image.twitterHandle}'s GUGO Pack` : "Join this runner's GUGO Pack";
}

function moderationSignature(payload: ModerationPayload) {
  return [
    ...payload.pending.map((image) => `pending:${image.filename}`),
    ...payload.approved.map((image) => `approved:${image.filename}`)
  ].sort().join("|");
}

function hasNewPendingUploads(previous: ModerationPayload, next: ModerationPayload) {
  const previousPending = new Set(previous.pending.map((image) => image.filename));
  return next.pending.some((image) => !previousPending.has(image.filename));
}

function Header({ imageCount, view }: { imageCount: number; view: View }) {
  return (
    <header className="hero">
      <div className="heroCopy">
        <h1>{view === "admin" ? "GUGO Admin" : view === "upload" ? "Add GUGO" : "GUGO Gallery"}</h1>
        <p>
          {view === "admin"
            ? "Review new uploads before they go live. Approve the good stuff, delete the trash."
            : view === "upload"
              ? "Got a GUGO meme worth sharing? Drop it here with the upload password and it will wait for review."
              : "A clean little home for the GUGO image set. Open anything in the lightbox, download the originals, and keep the page out of the way."}
        </p>
        <nav className="heroNav" aria-label="GUGO pages">
          <a href="/" aria-current={view === "gallery" ? "page" : undefined}>Gallery</a>
          <a href="/upload" aria-current={view === "upload" ? "page" : undefined}>Upload</a>
          <a href="https://gugo.run/register.html?ref=RUNGRZJ" target="_blank" rel="noreferrer">Main GUGO site</a>
        </nav>
      </div>
      <div className="heroStats" aria-label="Gallery summary">
        <strong>{imageCount}</strong>
        <span>images ready</span>
      </div>
    </header>
  );
}

function GalleryView({
  images,
  allImages,
  activeCategory,
  onCategoryChange,
  onImageOpen
}: {
  images: GalleryImage[];
  allImages: GalleryImage[];
  activeCategory: CategoryId;
  onCategoryChange: (category: CategoryId) => void;
  onImageOpen: (image: GalleryImage) => void;
}) {
  const activeMeta = categories.find((category) => category.id === activeCategory) ?? categories[0];
  return (
    <>
      <nav className="categoryTabs" aria-label="Gallery categories">
        {categories.map((category) => {
          const count = allImages.filter((image) => (image.category ?? "gugo-images") === category.id).length;
          return (
            <button
              key={category.id}
              className={activeCategory === category.id ? "active" : ""}
              onClick={() => onCategoryChange(category.id)}
              aria-pressed={activeCategory === category.id}
            >
              <span>{category.label}</span>
              <strong>{count}</strong>
            </button>
          );
        })}
      </nav>
      {images.length === 0 ? (
        <section className="emptyCategory">
          <ImagePlus />
          <h2>{activeMeta.label}</h2>
          <p>{activeMeta.empty}</p>
        </section>
      ) : (
        <section className="gallery" aria-label={`${activeMeta.label} gallery`}>
          {images.map((image) => {
            const src = image.src ?? imageUrl(image.filename);
            const title = visibleImageTitle(image);
            return (
              <article className="tile" key={image.id}>
                <button className="previewButton" onClick={() => onImageOpen(image)}>
                  <img src={src} alt={title} loading="lazy" />
                  <span className="previewOverlay">
                    <Maximize2 />
                    View
                  </span>
                </button>
                <div className="tileFooter">
                  <div>
                    {image.twitterHandle && image.twitterUrl && (
                      <a className="attributionLink" href={image.twitterUrl} target="_blank" rel="noreferrer">
                        @{image.twitterHandle}
                      </a>
                    )}
                    {image.referralUrl && (
                      <a className="packLink" href={image.referralUrl} target="_blank" rel="noreferrer">
                        {referralLinkText(image)}
                      </a>
                    )}
                  </div>
                  <a className="downloadButton" href={src} download={image.filename} aria-label={`Download ${title}`}>
                    <Download />
                  </a>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </>
  );
}

function UploadView({
  latestApprovedMemes,
  onImageOpen
}: {
  latestApprovedMemes: GalleryImage[];
  onImageOpen: (image: GalleryImage, scopedImages?: GalleryImage[]) => void;
}) {
  const [password, setPassword] = useState("");
  const [twitterHandle, setTwitterHandle] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  function chooseFiles(nextFiles: File[]) {
    setNotice(null);
    const imageFiles = nextFiles.filter(isAcceptedImageFile);
    if (imageFiles.length !== nextFiles.length) {
      setNotice({ type: "error", text: "Only JPG, PNG, WebP, and GIF images are allowed." });
    }
    if (imageFiles.length > maxUploadFiles) {
      setFiles(imageFiles.slice(0, maxUploadFiles));
      setNotice({ type: "error", text: `Only ${maxUploadFiles} images can be uploaded at once.` });
      return;
    }
    setFiles(imageFiles);
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    chooseFiles(Array.from(event.target.files ?? []));
  }

  function onDrop(event: DragEvent<HTMLSpanElement>) {
    event.preventDefault();
    setIsDragging(false);
    chooseFiles(Array.from(event.dataTransfer.files));
  }

  async function submitUpload(event: FormEvent) {
    event.preventDefault();
    setNotice(null);
    if (files.length === 0) {
      setNotice({ type: "error", text: "Pick at least one image first." });
      return;
    }

    const form = new FormData();
    form.append("password", password);
    form.append("twitterHandle", twitterHandle);
    form.append("referralCode", referralCode);
    files.forEach((file) => form.append("image", file));
    setBusy(true);
    try {
      const response = await fetch("/api/upload", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error ?? "Upload failed.");
      const uploadCount = Array.isArray(data.filenames) ? data.filenames.length : files.length;
      setFiles([]);
      setFileInputKey((key) => key + 1);
      setPassword("");
      setTwitterHandle("");
      setReferralCode("");
      setNotice({ type: "success", text: uploadCount === 1 ? "Uploaded. It will show up after approval." : `${uploadCount} uploads queued for review.` });
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Upload failed." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="uploadLayout">
      <div className="panel uploadPanel">
        <div className="panelHeader">
          <span><Lock /> Password required</span>
          <h2>Submit a meme for review</h2>
          <p>Uploads do not go live automatically. Crispy gets final say.</p>
        </div>
        <form className="formStack" onSubmit={submitUpload}>
          <label>
            <span>Upload password</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
          </label>
          <label>
            <span>Twitter handle</span>
            <input
              type="text"
              value={twitterHandle}
              onChange={(event) => setTwitterHandle(event.target.value)}
              placeholder="@yourhandle"
              autoComplete="off"
            />
          </label>
          <label>
            <span>GUGO referral code</span>
            <input
              type="text"
              value={referralCode}
              onChange={(event) => setReferralCode(event.target.value)}
              placeholder="RUNGRZJ or your referral URL"
              autoComplete="off"
            />
          </label>
          <p className="formHint">
            Optional. Need your own code? <a href={crispyReferralUrl} target="_blank" rel="noreferrer">Join GUGO here</a>, then use your referral URL on future uploads.
          </p>
          <label>
            <span>Images</span>
            <span
              className={`dropZone ${isDragging ? "dragging" : ""}`}
              onDragEnter={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
            >
              <Upload />
              <strong>Drop images here</strong>
              <small>or click to choose up to {maxUploadFiles}</small>
              <input
                key={fileInputKey}
                className="dropZoneInput"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                onChange={onFileChange}
              />
            </span>
          </label>
          {files.length > 0 && (
            <p className="selectedFiles">{files.length === 1 ? files[0].name : `${files.length} images selected`}</p>
          )}
          <button className="primaryButton" type="submit" disabled={busy}>
            {busy ? <Loader2 className="spin" /> : <Upload />}
            {busy ? "Uploading" : "Upload for review"}
          </button>
        </form>
        <NoticeBox notice={notice} />
      </div>
      <LatestApprovedMemes images={latestApprovedMemes} onImageOpen={onImageOpen} />
    </section>
  );
}

function LatestApprovedMemes({
  images,
  onImageOpen
}: {
  images: GalleryImage[];
  onImageOpen: (image: GalleryImage, scopedImages?: GalleryImage[]) => void;
}) {
  return (
    <aside className="latestMemePanel" aria-label="Latest approved memes">
      <div className="latestMemeHeader">
        <span>Latest approved memes</span>
        <h2>Recently cleared</h2>
      </div>
      {images.length > 0 ? (
        <div className="latestMemeList">
          {images.map((image) => {
            const src = image.src ?? imageUrl(image.filename);
            const title = visibleImageTitle(image);
            return (
              <article className="latestMemeItem" key={image.id}>
                <button className="latestMemeImage" onClick={() => onImageOpen(image, images)}>
                  <img src={src} alt={title} />
                  <span>View</span>
                </button>
                <div className="latestMemeMeta">
                  <p>{formatApprovalDate(image)}</p>
                  {image.twitterHandle && image.twitterUrl && (
                    <a className="attributionLink" href={image.twitterUrl} target="_blank" rel="noreferrer">
                      Follow fellow runner @{image.twitterHandle}
                    </a>
                  )}
                  {image.referralUrl && (
                    <a className="packLink" href={image.referralUrl} target="_blank" rel="noreferrer">
                      {referralLinkText(image)}
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="latestMemeEmpty">
          <ImagePlus />
          <p>Approved holder memes will land here.</p>
        </div>
      )}
    </aside>
  );
}

function AdminView({ onGalleryChanged }: { onGalleryChanged: () => Promise<void> }) {
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [moderation, setModeration] = useState<ModerationPayload>({ pending: [], approved: [] });
  const moderationRef = useRef<ModerationPayload>(moderation);

  async function loadModeration(options: { notifyNewUploads?: boolean } = {}) {
    const response = await fetch("/api/admin/moderation");
    if (response.status === 401) {
      setLoggedIn(false);
      return;
    }
    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error ?? "Could not load moderation queue.");
    const nextModeration = { pending: data.pending ?? [], approved: data.approved ?? [] };
    const previousModeration = moderationRef.current;
    if (moderationSignature(previousModeration) !== moderationSignature(nextModeration)) {
      setModeration(nextModeration);
      moderationRef.current = nextModeration;
      if (options.notifyNewUploads && hasNewPendingUploads(previousModeration, nextModeration)) {
        setNotice({ type: "success", text: "New uploads loaded for review." });
      }
    }
    setLoggedIn(true);
  }

  async function login(event: FormEvent) {
    event.preventDefault();
    setBusy("login");
    setNotice(null);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password })
      });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error ?? "Login failed.");
      setPassword("");
      setLoggedIn(true);
      await loadModeration();
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Login failed." });
    } finally {
      setBusy(null);
    }
  }

  async function moderate(action: "approve" | "delete-pending" | "delete-approved", filename: string) {
    setBusy(`${action}:${filename}`);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/${action}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ filename })
      });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error ?? "Action failed.");
      await loadModeration();
      await onGalleryChanged();
      setNotice({ type: "success", text: action === "approve" ? "Approved and live." : "Deleted." });
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Action failed." });
    } finally {
      setBusy(null);
    }
  }

  async function approveAllPending() {
    const filenames = moderation.pending.map((image) => image.filename);
    if (filenames.length === 0) return;
    setBusy("approve-all");
    setNotice(null);
    try {
      const response = await fetch("/api/admin/approve-all", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ filenames })
      });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error ?? "Approve all failed.");
      await loadModeration();
      await onGalleryChanged();
      const approvedCount = Array.isArray(data.approved) ? data.approved.length : filenames.length;
      setNotice({ type: "success", text: `${approvedCount} upload${approvedCount === 1 ? "" : "s"} approved and live.` });
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Approve all failed." });
    } finally {
      setBusy(null);
    }
  }

  useEffect(() => {
    loadModeration().catch(() => setLoggedIn(false));
  }, []);

  useEffect(() => {
    moderationRef.current = moderation;
  }, [moderation]);

  useEffect(() => {
    if (!loggedIn || busy) return;
    const intervalId = window.setInterval(() => {
      loadModeration({ notifyNewUploads: true }).catch(() => undefined);
    }, moderationPollMs);
    const onFocus = () => {
      loadModeration({ notifyNewUploads: true }).catch(() => undefined);
    };
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
    };
  }, [busy, loggedIn]);

  if (!loggedIn) {
    return (
      <section className="panel uploadPanel">
        <div className="panelHeader">
          <span><ShieldCheck /> Moderator only</span>
          <h2>Log in to review uploads</h2>
          <p>Pending images stay private until you approve them.</p>
        </div>
        <form className="formStack" onSubmit={login}>
          <label>
            <span>Admin password</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
          </label>
          <button className="primaryButton" type="submit" disabled={busy === "login"}>
            {busy === "login" ? <Loader2 className="spin" /> : <Lock />}
            {busy === "login" ? "Checking" : "Open moderation"}
          </button>
        </form>
        <NoticeBox notice={notice} />
      </section>
    );
  }

  return (
    <section className="moderation">
      <NoticeBox notice={notice} />
      <ModerationSection
        title="Pending review"
        emptyText="No pending uploads."
        images={moderation.pending}
        headerAction={moderation.pending.length > 0 ? (
          <button className="primaryButton compact" disabled={Boolean(busy)} onClick={approveAllPending}>
            {busy === "approve-all" ? <Loader2 className="spin" /> : <CheckCircle2 />}
            Approve all
          </button>
        ) : null}
        renderActions={(image) => (
          <>
            <button className="primaryButton compact" disabled={Boolean(busy)} onClick={() => moderate("approve", image.filename)}>
              {busy === `approve:${image.filename}` ? <Loader2 className="spin" /> : <CheckCircle2 />}
              Approve
            </button>
            <button className="dangerButton compact" disabled={Boolean(busy)} onClick={() => moderate("delete-pending", image.filename)}>
              {busy === `delete-pending:${image.filename}` ? <Loader2 className="spin" /> : <Trash2 />}
              Delete
            </button>
          </>
        )}
      />
      <ModerationSection
        title="Approved uploads"
        emptyText="No approved holder uploads yet."
        images={moderation.approved}
        renderActions={(image) => (
          <button className="dangerButton compact" disabled={Boolean(busy)} onClick={() => moderate("delete-approved", image.filename)}>
            {busy === `delete-approved:${image.filename}` ? <Loader2 className="spin" /> : <Trash2 />}
            Remove
          </button>
        )}
      />
    </section>
  );
}

function ModerationSection({
  title,
  emptyText,
  images,
  headerAction,
  renderActions
}: {
  title: string;
  emptyText: string;
  images: GalleryImage[];
  headerAction?: ReactNode;
  renderActions: (image: GalleryImage) => ReactNode;
}) {
  return (
    <div className="moderationBlock">
      <div className="sectionTitle">
        <h2>{title}</h2>
        <div>
          {headerAction}
          <span>{images.length}</span>
        </div>
      </div>
      {images.length === 0 ? (
        <p className="emptyText">{emptyText}</p>
      ) : (
        <div className="moderationGrid">
          {images.map((image) => (
            <article className="moderationCard" key={image.filename}>
              <img src={image.src ?? imageUrl(image.filename)} alt={visibleImageTitle(image)} />
              <div>
                {image.twitterHandle && image.twitterUrl && (
                  <a className="moderationAttribution" href={image.twitterUrl} target="_blank" rel="noreferrer">
                    @{image.twitterHandle}
                  </a>
                )}
                {image.referralUrl && (
                  <a className="packLink" href={image.referralUrl} target="_blank" rel="noreferrer">
                    {referralLinkText(image)}
                  </a>
                )}
                <div className="moderationActions">{renderActions(image)}</div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function NoticeBox({ notice }: { notice: Notice }) {
  if (!notice) return null;
  return (
    <div className={`notice ${notice.type}`}>
      {notice.type === "success" ? <CheckCircle2 /> : <XCircle />}
      <span>{notice.text}</span>
    </div>
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
  const src = image.src ?? imageUrl(image.filename);
  const title = visibleImageTitle(image);
  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={`${title} preview`} onClick={(event) => event.currentTarget === event.target && onClose()}>
      <div className="lightboxPanel">
        <div className="lightboxTop">
          <div>
            <span>{index + 1} / {total}</span>
            {image.twitterHandle && image.twitterUrl && (
              <a className="lightboxAttribution" href={image.twitterUrl} target="_blank" rel="noreferrer">
                @{image.twitterHandle}
              </a>
            )}
            {image.referralUrl && (
              <a className="packLink" href={image.referralUrl} target="_blank" rel="noreferrer">
                {referralLinkText(image)}
              </a>
            )}
          </div>
          <div className="lightboxActions">
            <a className="actionButton" href={src} download={image.filename} aria-label={`Download ${title}`}>
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
          <img src={src} alt={title} />
          <button className="navButton next" onClick={onNext} aria-label="Next image">
            <ChevronRight />
          </button>
        </div>
      </div>
    </div>
  );
}
