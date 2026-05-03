import { useEffect, useMemo, useState } from "react";
import { VaseViewer3D } from "./components/viewer/VaseViewer3D";
import { useUIStore } from "./store/ui-store";
import { PLA_COLORS } from "./shop/shop-colors";
import { SHOP_ORDER_FORM_ACTION, SHOP_ORDER_FORM_METHOD } from "./shop/shop-config";
import { useShopStore } from "./shop/shop-store";
import "./App.css";

const HERO_GALLERY_IMAGE_MODULES = import.meta.glob(
  "./assets/shop/hero-gallery/*.{png,jpg,jpeg,webp,avif}",
  { eager: true, import: "default" },
) as Record<string, string>;

const HERO_GALLERY_IMAGES = Object.entries(HERO_GALLERY_IMAGE_MODULES)
  .sort(([leftPath], [rightPath]) => leftPath.localeCompare(rightPath))
  .map(([, source]) => source);

const HERO_GALLERY_INTERVAL_MS = 6800;
const HERO_GALLERY_FADE_MS = 2200;

function App() {
  const setShowGrid = useUIStore((s) => s.setShowGrid);
  const setWireframe = useUIStore((s) => s.setWireframe);
  const setFlatShading = useUIStore((s) => s.setFlatShading);
  const setShowClipping = useUIStore((s) => s.setShowClipping);
  const setRotationMode = useUIStore((s) => s.setRotationMode);
  const setAutoRotate = useUIStore((s) => s.setAutoRotate);
  const setVaseColor = useUIStore((s) => s.setVaseColor);
  const generateNext = useShopStore((s) => s.generateNext);
  const goPrevious = useShopStore((s) => s.goPrevious);
  const goNext = useShopStore((s) => s.goNext);
  const openOrderForCurrent = useShopStore((s) => s.openOrderForCurrent);
  const closeOrder = useShopStore((s) => s.closeOrder);
  const setSelectedColorId = useShopStore((s) => s.setSelectedColorId);
  const entries = useShopStore((s) => s.entries);
  const currentIndex = useShopStore((s) => s.currentIndex);
  const selectedEntryId = useShopStore((s) => s.selectedEntryId);
  const selectedColorId = useShopStore((s) => s.selectedColorId);
  const [customerName, setCustomerName] = useState("");
  const [customerContact, setCustomerContact] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerMessage, setCustomerMessage] = useState("");
  const [heroGalleryIndex, setHeroGalleryIndex] = useState(0);
  const [heroGalleryPreviousIndex, setHeroGalleryPreviousIndex] = useState<number | null>(null);

  const currentEntry = entries[currentIndex] ?? null;
  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.id === selectedEntryId) ?? null,
    [entries, selectedEntryId],
  );
  const availableColors = useMemo(
    () => PLA_COLORS.filter((color) => color.available),
    [],
  );
  const selectedColor = useMemo(
    () => availableColors.find((color) => color.id === selectedColorId) ?? null,
    [availableColors, selectedColorId],
  );
  const currentHeroGalleryImage = HERO_GALLERY_IMAGES[heroGalleryIndex] ?? null;
  const previousHeroGalleryImage =
    heroGalleryPreviousIndex === null ? null : HERO_GALLERY_IMAGES[heroGalleryPreviousIndex] ?? null;
  const isOrderFormReady =
    SHOP_ORDER_FORM_ACTION.trim().length > 0 &&
    !SHOP_ORDER_FORM_ACTION.includes("REPLACE_WITH_YOUR_FORM_ID");

  useEffect(() => {
    setShowGrid(false);
    setWireframe(false);
    setFlatShading(false);
    setShowClipping(false);
    setRotationMode("camera");
    setAutoRotate(true);
    setVaseColor("#d9d2c7");
  }, [
    setAutoRotate,
    setFlatShading,
    setRotationMode,
    setShowClipping,
    setShowGrid,
    setVaseColor,
    setWireframe,
  ]);

  useEffect(() => {
    if (HERO_GALLERY_IMAGES.length <= 1) {
      setHeroGalleryIndex(0);
      setHeroGalleryPreviousIndex(null);
      return undefined;
    }

    let clearPreviousTimeoutId: number | undefined;
    const intervalId = window.setInterval(() => {
      if (clearPreviousTimeoutId !== undefined) {
        window.clearTimeout(clearPreviousTimeoutId);
      }

      setHeroGalleryIndex((currentIndex) => {
        setHeroGalleryPreviousIndex(currentIndex);
        return (currentIndex + 1) % HERO_GALLERY_IMAGES.length;
      });

      clearPreviousTimeoutId = window.setTimeout(() => {
        setHeroGalleryPreviousIndex(null);
      }, HERO_GALLERY_FADE_MS);
    }, HERO_GALLERY_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
      if (clearPreviousTimeoutId !== undefined) {
        window.clearTimeout(clearPreviousTimeoutId);
      }
    };
  }, []);

  return (
    <div className="shop-app">
      <main className="shop-shell">
        <section className="shop-hero">
          <div className="shop-copy">
            <div className="shop-copy-top">
              <div className="shop-copy-main">
                <p className="shop-kicker">VASO SHOP</p>
                <h1>Générez un vase et commandez-le en quelques secondes.</h1>
                <p className="shop-lead">
                  Explorez des formes uniques, choisissez votre coloris PLA et passez commande à
                  partir du modèle affiché.
                </p>
              </div>

              <div className="shop-hero-media">
                <div className="shop-hero-gallery" aria-label="Photos d'atelier">
                  <div className="shop-hero-gallery-orb">
                    {previousHeroGalleryImage && previousHeroGalleryImage !== currentHeroGalleryImage ? (
                      <img
                        key={`hero-gallery-previous-${heroGalleryPreviousIndex}-${previousHeroGalleryImage}`}
                        className="shop-hero-gallery-image shop-hero-gallery-image-previous"
                        src={previousHeroGalleryImage}
                        alt=""
                      />
                    ) : null}

                    {currentHeroGalleryImage ? (
                      <img
                        key={`hero-gallery-current-${heroGalleryIndex}-${currentHeroGalleryImage}`}
                        className="shop-hero-gallery-image shop-hero-gallery-image-current"
                        src={currentHeroGalleryImage}
                        alt=""
                      />
                    ) : (
                      <div className="shop-hero-gallery-placeholder">
                        <span>Ajoutez vos photos</span>
                        <small>src/assets/shop/hero-gallery/</small>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <aside className="shop-hero-note shop-current-card">
            <div className="shop-info-head shop-info-head-inline">
              <p className="shop-panel-title">Modèle actuel</p>
              <span className="shop-live-badge">Disponible à la commande</span>
            </div>

            <div className="shop-stats">
              <div className="shop-stat">
                <span className="shop-stat-label">N° de vase</span>
                <strong>{currentEntry?.seed ?? "-"}</strong>
              </div>
              <div className="shop-stat">
                <span className="shop-stat-label">Hauteur</span>
                <strong>{currentEntry ? `${currentEntry.heightMm} mm` : "-"}</strong>
              </div>
              <div className="shop-stat">
                <span className="shop-stat-label">Diamètre max</span>
                <strong>{currentEntry ? `${currentEntry.maxDiameterMm} mm` : "-"}</strong>
              </div>
              <div className="shop-stat shop-stat-material">
                <span className="shop-stat-label">Matière</span>
                <strong>{currentEntry?.material ?? "PLA"}</strong>
                <p>Bioplastique sourcé à partir d'amidon végétal, principalement issu du maïs.</p>
              </div>
            </div>

            <p className="shop-history">
              Vase {currentIndex + 1} sur {entries.length}
            </p>
          </aside>
        </section>

        <section className="shop-stage">
          <div className="shop-viewer-card">
            <div className="shop-viewer-header">
              <span>Visualisation 3D</span>
              <span>Mode galerie</span>
            </div>
            <div className="shop-inline-actions">
              <button className="shop-button shop-button-primary" onClick={generateNext}>
                Generer un vase
              </button>
              <div className="shop-nav">
                <button
                  className="shop-button shop-button-secondary"
                  onClick={goPrevious}
                  disabled={currentIndex === 0}
                >
                  Précédent
                </button>
                <button
                  className="shop-button shop-button-secondary"
                  onClick={goNext}
                  disabled={currentIndex >= entries.length - 1}
                >
                  Suivant
                </button>
              </div>
              <button className="shop-button shop-button-accent" onClick={openOrderForCurrent}>
                Commander ce modèle
              </button>
            </div>
            <div className="shop-viewer-frame">
              <VaseViewer3D />
            </div>
          </div>

          <div className="shop-side-column">
            <aside className="shop-info-card">
              <div className="shop-info-head">
                <p className="shop-panel-title">Modèles générés en direct</p>
              </div>

              <div className="shop-story">
                <p>
                  La visualisation, les dimensions et le N° de vase correspondent toujours au modèle
                  affiché pour vous permettre de valider un vase précis, sans ambiguïté au moment de
                  la commande.
                </p>
              </div>

              <div className="shop-story">
                <p>
                  Chaque génération produit une silhouette différente. Vous pouvez parcourir
                  l'historique, retenir un vase puis commander exactement ce modèle.
                </p>
              </div>
            </aside>

            <aside className="shop-info-card shop-workshop-card">
              <div className="shop-info-head">
                <p className="shop-panel-title">Atelier</p>
              </div>

              <p className="shop-sublead shop-workshop-note">
                <span className="shop-breton-flag" aria-hidden="true">
                  <span className="shop-breton-flag-stripes" />
                  <span className="shop-breton-flag-canton">
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                </span>
                L'atelier de fabrication se situe en Bretagne : chaque vase est imprimé à la
                demande, vérifié, protégé puis expédié avec soin.
              </p>
            </aside>
          </div>
        </section>

        {selectedEntry && (
          <section className="shop-order-card">
            <div className="shop-order-main">
              <div className="shop-order-hero">
                <div className="shop-order-copy">
                  <p className="shop-panel-title">Page de commande</p>
                  <h2>Finalisez ce vase précis.</h2>
                  <p>
                    Votre modèle reste figé avec son N° de vase, sa version et ses dimensions.
                    Cette page prépare la commande et gardera naturellement sa place pour Stripe
                    quand nous relierons le paiement.
                  </p>
                </div>

                <div className="shop-order-flow" aria-label="Parcours de commande">
                  <article className="shop-order-step">
                    <span>01</span>
                    <strong>Vase confirmé</strong>
                    <p>Le modèle choisi reste exactement celui affiché à l'écran.</p>
                  </article>
                  <article className="shop-order-step">
                    <span>02</span>
                    <strong>Couleur atelier</strong>
                    <p>Vous choisissez votre teinte PLA avant validation de la commande.</p>
                  </article>
                  <article className="shop-order-step">
                    <span>03</span>
                    <strong>Infos de contact</strong>
                    <p>Nous récupérons vos coordonnées avant d'ajouter le paiement Stripe.</p>
                  </article>
                </div>
              </div>

              <div className="shop-order-story-grid">
                <div className="shop-story">
                  <p>
                    La commande reste liée à ce vase précis. Les dimensions, la matière et le
                    numéro de vase sont conservés jusqu'à l'envoi.
                  </p>
                </div>
                <div className="shop-story">
                  <p>
                    Stripe viendra se brancher ensuite sur cette étape. Pour l'instant, nous
                    préparons la structure de commande et l'envoi des informations.
                  </p>
                </div>
              </div>

              <form
                className="shop-order-form shop-order-form-card"
                action={isOrderFormReady ? SHOP_ORDER_FORM_ACTION : undefined}
                method={SHOP_ORDER_FORM_METHOD}
              >
                <input type="hidden" name="seed" value={selectedEntry.seed} />
                <input type="hidden" name="version" value={selectedEntry.version} />
                <input type="hidden" name="heightMm" value={selectedEntry.heightMm} />
                <input type="hidden" name="maxDiameterMm" value={selectedEntry.maxDiameterMm} />
                <input type="hidden" name="color" value={selectedColor?.label ?? ""} />
                <input type="hidden" name="material" value={selectedEntry.material} />

                <div className="shop-order-form-head">
                  <div>
                    <p className="shop-panel-title">Coordonnées</p>
                    <h3>Informations de commande</h3>
                  </div>
                  <p>
                    Laissez-nous vos informations pour préparer la suite du parcours, puis nous
                    brancherons le paiement au même endroit.
                  </p>
                </div>

                <div className="shop-order-form-grid">
                  <label className="shop-field">
                    <span>Nom</span>
                    <input
                      name="name"
                      type="text"
                      value={customerName}
                      onChange={(event) => setCustomerName(event.target.value)}
                      placeholder="Votre nom"
                      required
                    />
                  </label>

                  <label className="shop-field">
                    <span>Email ou telephone</span>
                    <input
                      name="contact"
                      type="text"
                      value={customerContact}
                      onChange={(event) => setCustomerContact(event.target.value)}
                      placeholder="Email ou telephone"
                      required
                    />
                  </label>

                  <label className="shop-field shop-field-wide">
                    <span>Adresse</span>
                    <input
                      name="address"
                      type="text"
                      value={customerAddress}
                      onChange={(event) => setCustomerAddress(event.target.value)}
                      placeholder="Optionnel pour l'instant"
                    />
                  </label>

                  <label className="shop-field shop-field-wide">
                    <span>Message</span>
                    <textarea
                      name="message"
                      value={customerMessage}
                      onChange={(event) => setCustomerMessage(event.target.value)}
                      placeholder="Precisions, quantite, delai souhaite..."
                      rows={5}
                    />
                  </label>
                </div>

                <div className="shop-order-actions">
                  <button className="shop-button shop-button-secondary" type="button" onClick={closeOrder}>
                    Retour au modele
                  </button>
                  <button className="shop-button shop-button-primary" type="submit" disabled={!isOrderFormReady}>
                    Envoyer les informations
                  </button>
                </div>

                <p className="shop-form-note">
                  {isOrderFormReady
                    ? "Le paiement Stripe sera raccorde ensuite. Cette etape envoie deja les informations de commande."
                    : "Ajoute l'URL Formspree dans src/shop/shop-config.ts pour activer l'envoi."}
                </p>
              </form>
            </div>

            <aside className="shop-order-sidebar">
              <div className="shop-order-sidebar-card">
                <div className="shop-info-head shop-info-head-inline">
                  <p className="shop-panel-title">Recapitulatif</p>
                  <span className="shop-live-badge">Modele selectionne</span>
                </div>

                <div className="shop-order-summary">
                  <div className="shop-stat">
                    <span className="shop-stat-label">N° de vase</span>
                    <strong>{selectedEntry.seed}</strong>
                  </div>
                  <div className="shop-stat">
                    <span className="shop-stat-label">Version</span>
                    <strong>{selectedEntry.version}</strong>
                  </div>
                  <div className="shop-stat">
                    <span className="shop-stat-label">Hauteur</span>
                    <strong>{selectedEntry.heightMm} mm</strong>
                  </div>
                  <div className="shop-stat">
                    <span className="shop-stat-label">Diamètre max</span>
                    <strong>{selectedEntry.maxDiameterMm} mm</strong>
                  </div>
                  <div className="shop-stat shop-stat-material">
                    <span className="shop-stat-label">Matière</span>
                    <strong>{selectedEntry.material}</strong>
                    <p>Bioplastique sourcé à partir d'amidon végétal, principalement issu du maïs.</p>
                  </div>
                </div>

                <div className="shop-color-block">
                  <label htmlFor="shop-color">Couleur PLA</label>
                  <select
                    id="shop-color"
                    value={selectedColorId}
                    onChange={(event) => setSelectedColorId(event.target.value)}
                  >
                    {availableColors.map((color) => (
                      <option key={color.id} value={color.id}>
                        {color.label}
                      </option>
                    ))}
                  </select>

                  <div className="shop-color-swatches" aria-hidden="true">
                    {availableColors.map((color) => (
                      <span
                        key={color.id}
                        className={`shop-swatch ${selectedColorId === color.id ? "active" : ""}`}
                        style={{ backgroundColor: color.hex }}
                        title={color.label}
                      />
                    ))}
                  </div>

                  <p className="shop-order-helper">
                    Les couleurs suivent le stock atelier disponible au moment de la fabrication.
                  </p>
                </div>

                <div className="shop-order-note-stack">
                  <div className="shop-order-note">
                    <strong>Fabrication a la demande</strong>
                    <p>Le vase est imprime a l'atelier apres validation des informations.</p>
                  </div>
                  <div className="shop-order-note">
                    <strong>Paiement a venir</strong>
                    <p>Cette zone accueillera ensuite le paiement Stripe sans changer le reste de la page.</p>
                  </div>
                </div>
              </div>
            </aside>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
