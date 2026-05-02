import { useEffect, useMemo, useState } from "react";
import { VaseViewer3D } from "./components/viewer/VaseViewer3D";
import { useUIStore } from "./store/ui-store";
import { PLA_COLORS } from "./shop/shop-colors";
import { SHOP_ORDER_FORM_ACTION, SHOP_ORDER_FORM_METHOD } from "./shop/shop-config";
import { useShopStore } from "./shop/shop-store";
import vaseBubbleImage from "./assets/shop/vase.png";
import numberBubbleImage from "./assets/shop/num.png";
import "./App.css";

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

  return (
    <div className="shop-app">
      <main className="shop-shell">
        <section className="shop-hero">
          <div className="shop-copy">
            <div className="shop-copy-top">
              <div className="shop-copy-main">
                <p className="shop-kicker">VASO SHOP</p>
                <h1>Generez un vase et precommandez-le en quelques secondes.</h1>
                <p className="shop-lead">
                  Explorez des formes uniques, choisissez votre coloris PLA et validez une
                  precommande a partir du modele affiche.
                </p>
                <p className="shop-sublead">
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
                  L'atelier de fabrication est en Bretagne : chaque vase est imprime a la demande,
                  verifie, protege puis expedie avec soin depuis notre atelier.
                </p>
              </div>

              <div className="shop-hero-note-strip" aria-label="Points forts visuels">
                <article className="shop-feature-orb shop-feature-orb-vase">
                  <div className="shop-feature-orb-art" aria-hidden="true">
                    <img src={vaseBubbleImage} alt="" />
                  </div>
                  <strong>Visualisation</strong>
                </article>

                <article className="shop-feature-orb shop-feature-orb-seed">
                  <div className="shop-feature-orb-art" aria-hidden="true">
                    <img src={numberBubbleImage} alt="" />
                  </div>
                  <strong>N° de vase</strong>
                </article>
              </div>
            </div>

            <div className="shop-hero-pills" aria-label="Points forts">
              <span>Modele unique</span>
              <span>Precommande atelier</span>
              <span>PLA amidon de mais</span>
            </div>
          </div>

          <aside className="shop-hero-note shop-current-card">
            <div className="shop-info-head">
              <p className="shop-panel-title">Modele actuel</p>
              <span className="shop-live-badge">Disponible a la precommande</span>
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
                <span className="shop-stat-label">Diametre max</span>
                <strong>{currentEntry ? `${currentEntry.maxDiameterMm} mm` : "-"}</strong>
              </div>
              <div className="shop-stat">
                <span className="shop-stat-label">Matiere</span>
                <strong>PLA - amidon de mais</strong>
              </div>
            </div>

            <p className="shop-history">
              Vase {currentIndex + 1} sur {entries.length}
            </p>

            <div className="shop-material-note">
              <strong>PLA :</strong> bioplastique sourcé a partir d'amidon vegetal, principalement
              issu du mais.
            </div>

            <div className="shop-color-wheel-card">
              <div className="shop-color-wheel-head">
                <strong>Coloris disponibles</strong>
                <span>Nuancier atelier</span>
              </div>
              <div className="shop-color-wheel" aria-hidden="true">
                {availableColors.map((color) => (
                  <span
                    key={color.id}
                    className={`shop-color-wheel-swatch ${selectedColorId === color.id ? "active" : ""}`}
                    style={{ backgroundColor: color.hex }}
                    title={color.label}
                  />
                ))}
                <span className="shop-color-wheel-core">PLA</span>
              </div>
              <p className="shop-color-wheel-note">
                Teintes selectionnees pour la fabrication en atelier, selon disponibilite des
                bobines.
              </p>
            </div>

            <div className="shop-material-note">
              <strong>Finition :</strong> chaque vase est imprime en petite serie, controle puis
              emballe avec attention avant expedition.
            </div>
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
                  Precedent
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
                Commander ce modele
              </button>
            </div>
            <div className="shop-viewer-frame">
              <VaseViewer3D />
            </div>
          </div>

          <aside className="shop-info-card">
            <div className="shop-info-head">
              <p className="shop-panel-title">Collection en direct</p>
            </div>

            <div className="shop-story">
              <p>
                La visualisation, les dimensions et le N° de vase restent alignes pour que vous
                puissiez valider un modele precis, sans ambiguite au moment de la commande.
              </p>
            </div>

            <div className="shop-story">
              <p>
                Chaque generation produit une silhouette differente. Vous pouvez parcourir
                l'historique, retenir un vase puis commander exactement ce modele.
              </p>
            </div>
          </aside>
        </section>

        {selectedEntry && (
          <section className="shop-order-card">
            <div className="shop-order-copy">
              <p className="shop-panel-title">Commande en preparation</p>
              <h2>Vous commandez ce vase precis.</h2>
              <p>
                Le modele est maintenant fige avec son N° de vase, sa version et ses dimensions.
                Il ne reste plus qu'a choisir le coloris et laisser vos coordonnees de
                precommande.
              </p>
            </div>

            <div className="shop-order-summary">
              <div className="shop-stat">
                <span className="shop-stat-label">N° de vase</span>
                <strong>{selectedEntry.seed}</strong>
              </div>
              <div className="shop-stat">
                <span className="shop-stat-label">Hauteur</span>
                <strong>{selectedEntry.heightMm} mm</strong>
              </div>
              <div className="shop-stat">
                <span className="shop-stat-label">Diametre max</span>
                <strong>{selectedEntry.maxDiameterMm} mm</strong>
              </div>
              <div className="shop-stat">
                <span className="shop-stat-label">Matiere</span>
                <strong>{selectedEntry.material}</strong>
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
            </div>

            <form
              className="shop-order-form"
              action={isOrderFormReady ? SHOP_ORDER_FORM_ACTION : undefined}
              method={SHOP_ORDER_FORM_METHOD}
            >
              <input type="hidden" name="seed" value={selectedEntry.seed} />
              <input type="hidden" name="version" value={selectedEntry.version} />
              <input type="hidden" name="heightMm" value={selectedEntry.heightMm} />
              <input type="hidden" name="maxDiameterMm" value={selectedEntry.maxDiameterMm} />
              <input type="hidden" name="color" value={selectedColor?.label ?? ""} />
              <input type="hidden" name="material" value={selectedEntry.material} />

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

              <label className="shop-field">
                <span>Adresse</span>
                <input
                  name="address"
                  type="text"
                  value={customerAddress}
                  onChange={(event) => setCustomerAddress(event.target.value)}
                  placeholder="Optionnel pour l'instant"
                />
              </label>

              <label className="shop-field">
                <span>Message</span>
                <textarea
                  name="message"
                  value={customerMessage}
                  onChange={(event) => setCustomerMessage(event.target.value)}
                  placeholder="Precisions, quantite, delai souhaite..."
                  rows={4}
                />
              </label>

              <div className="shop-order-actions">
                <button className="shop-button shop-button-secondary" type="button" onClick={closeOrder}>
                  Retour
                </button>
                <button className="shop-button shop-button-primary" type="submit" disabled={!isOrderFormReady}>
                  Envoyer la precommande
                </button>
              </div>

              <p className="shop-form-note">
                {isOrderFormReady
                  ? "Le formulaire est pret a envoyer la precommande."
                  : "Ajoute l'URL Formspree dans src/shop/shop-config.ts pour activer l'envoi."}
              </p>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
