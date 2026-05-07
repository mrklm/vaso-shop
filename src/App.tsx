import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { VaseViewer3D } from "./components/viewer/VaseViewer3D";
import { useUIStore } from "./store/ui-store";
import { PLA_COLORS } from "./shop/shop-colors";
import { SHOP_COUNTRIES } from "./shop/shop-countries";
import {
  formatShopPriceFromCents,
  getShopStripeCheckoutEndpoint,
  SHOP_MONDIAL_RELAY_BRAND,
  SHOP_VASE_PRICE_CENTS,
} from "./shop/shop-config";
import {
  getShopShippingOption,
  getShopShippingOptions,
  SHOP_UNSUPPORTED_SHIPPING_MESSAGE,
} from "./shop/shop-shipping";
import { useShopStore } from "./shop/shop-store";
import vasoMark from "./assets/shop/vaso-mark.png";
import "./App.css";

const HERO_GALLERY_IMAGE_MODULES = import.meta.glob(
  "./assets/shop/hero-gallery/*.{png,jpg,jpeg,webp,avif}",
  { eager: true, import: "default" },
) as Record<string, string>;

const HERO_GALLERY_IMAGES = Object.entries(HERO_GALLERY_IMAGE_MODULES)
  .sort(([leftPath], [rightPath]) => leftPath.localeCompare(rightPath))
  .map(([, source]) => source);

const HERO_GALLERY_INTERVAL_MS = 8200;
const HERO_GALLERY_FADE_MS = 3200;
const APP_VERSION = typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "dev";
const isMondialRelayWidgetReady = SHOP_MONDIAL_RELAY_BRAND.trim().length > 0;

interface ShopRelaySelection {
  id: string;
  name: string;
  address: string;
  postalCode: string;
  city: string;
  country: string;
}

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
  const [customerLastName, setCustomerLastName] = useState("");
  const [customerFirstName, setCustomerFirstName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerCity, setCustomerCity] = useState("");
  const [customerPostalCode, setCustomerPostalCode] = useState("");
  const [customerCountry, setCustomerCountry] = useState("");
  const [shippingModeId, setShippingModeId] = useState("");
  const [relaySelection, setRelaySelection] = useState<ShopRelaySelection | null>(null);
  const [relaySelectionError, setRelaySelectionError] = useState("");
  const [customerMessage, setCustomerMessage] = useState("");
  const [heroGalleryIndex, setHeroGalleryIndex] = useState(0);
  const [heroGalleryPreviousIndex, setHeroGalleryPreviousIndex] = useState<number | null>(null);
  const [isModelStepConfirmed, setIsModelStepConfirmed] = useState(false);
  const [isColorStepConfirmed, setIsColorStepConfirmed] = useState(false);
  const [isClientStepConfirmed, setIsClientStepConfirmed] = useState(false);
  const [isGlobalStepConfirmed, setIsGlobalStepConfirmed] = useState(false);
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const orderSectionRef = useRef<HTMLElement | null>(null);
  const clientStepRef = useRef<HTMLElement | null>(null);

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
  const selectedColorLabel = selectedColor?.label ?? "A choisir";
  const customerFullName = [customerFirstName.trim(), customerLastName.trim()]
    .filter(Boolean)
    .join(" ");
  const customerContactSummary = [customerEmail.trim(), customerPhone.trim()]
    .filter(Boolean)
    .join(" · ");
  const customerAddressSummary = [
    customerAddress.trim(),
    [customerPostalCode.trim(), customerCity.trim()].filter(Boolean).join(" "),
    customerCountry.trim(),
  ]
    .filter(Boolean)
    .join(" · ");
  const shippingOptions = useMemo(
    () => getShopShippingOptions(customerCountry),
    [customerCountry],
  );
  const selectedShippingOption = useMemo(
    () => getShopShippingOption(customerCountry, shippingModeId),
    [customerCountry, shippingModeId],
  );
  const isUnsupportedShippingCountry =
    customerCountry.trim().length > 0 && shippingOptions.length === 0;
  const isRelayShippingMode = selectedShippingOption?.id === "relay";
  const shippingPriceCents = selectedShippingOption?.priceCents ?? 0;
  const shippingPriceLabel = selectedShippingOption
    ? formatShopPriceFromCents(shippingPriceCents)
    : null;
  const orderTotalCents = SHOP_VASE_PRICE_CENTS + shippingPriceCents;
  const orderTotalLabel = formatShopPriceFromCents(orderTotalCents);
  const isClientInfoComplete =
    customerLastName.trim().length > 0 &&
    customerFirstName.trim().length > 0 &&
    customerEmail.trim().length > 0 &&
    customerAddress.trim().length > 0 &&
    customerCity.trim().length > 0 &&
    customerPostalCode.trim().length > 0 &&
    customerCountry.trim().length > 0;
  const isShippingSelectionComplete = selectedShippingOption !== null;
  const isRelaySelectionComplete = !isRelayShippingMode || relaySelection !== null;
  const canValidateClientStep =
    isClientInfoComplete &&
    isShippingSelectionComplete &&
    isRelaySelectionComplete &&
    !isUnsupportedShippingCountry;
  const canAccessColorStep = isModelStepConfirmed;
  const canAccessClientStep = isColorStepConfirmed;
  const canAccessGlobalStep = isClientStepConfirmed && canValidateClientStep;
  const canAccessStripeStep = isGlobalStepConfirmed;
  const orderBasePriceLabel = formatShopPriceFromCents(SHOP_VASE_PRICE_CENTS);

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

  useEffect(() => {
    if (!selectedEntry) {
      return;
    }

    setIsModelStepConfirmed(false);
    setIsColorStepConfirmed(false);
    setIsClientStepConfirmed(false);
    setIsGlobalStepConfirmed(false);
    setCheckoutError("");
    setIsStartingCheckout(false);
    setRelaySelection(null);
    setRelaySelectionError("");

    const scrollTimeoutId = window.setTimeout(() => {
      orderSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);

    return () => window.clearTimeout(scrollTimeoutId);
  }, [selectedEntry]);

  useEffect(() => {
    if (!selectedEntry || !isColorStepConfirmed) {
      return;
    }

    const scrollTimeoutId = window.setTimeout(() => {
      clientStepRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);

    return () => window.clearTimeout(scrollTimeoutId);
  }, [isColorStepConfirmed, selectedEntry]);

  useEffect(() => {
    if (!selectedEntry) {
      return;
    }

    setIsColorStepConfirmed(false);
    setIsClientStepConfirmed(false);
    setIsGlobalStepConfirmed(false);
    setCheckoutError("");
    setRelaySelection(null);
    setRelaySelectionError("");
  }, [selectedColorId, selectedEntry]);

  useEffect(() => {
    if (!selectedEntry) {
      return;
    }

    setIsClientStepConfirmed(false);
    setIsGlobalStepConfirmed(false);
    setCheckoutError("");
    setRelaySelectionError("");
  }, [
    customerAddress,
    customerCity,
    customerEmail,
    customerFirstName,
    customerLastName,
    customerMessage,
    customerPostalCode,
    customerPhone,
    customerCountry,
    shippingModeId,
    selectedEntry,
  ]);

  useEffect(() => {
    if (!customerCountry.trim()) {
      setShippingModeId("");
      setRelaySelection(null);
      setRelaySelectionError("");
      return;
    }

    const isCurrentModeStillAvailable = shippingOptions.some(
      (option) => option.id === shippingModeId,
    );
    if (!isCurrentModeStillAvailable) {
      setShippingModeId("");
      setRelaySelection(null);
      setRelaySelectionError("");
    }
  }, [customerCountry, shippingModeId, shippingOptions]);

  useEffect(() => {
    if (!isRelayShippingMode) {
      setRelaySelection(null);
      setRelaySelectionError("");
    }
  }, [isRelayShippingMode]);

  const getOrderStepClassName = (isComplete: boolean, isUnlocked: boolean) =>
    `shop-order-step-card${isComplete ? " is-complete" : ""}${!isUnlocked ? " is-locked" : ""}`;

  const handleCheckoutSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedEntry || !canAccessStripeStep || isStartingCheckout) {
      return;
    }

    setCheckoutError("");
    setIsStartingCheckout(true);

    try {
      const response = await fetch(getShopStripeCheckoutEndpoint(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          seed: selectedEntry.seed,
          version: selectedEntry.version,
          heightMm: selectedEntry.heightMm,
          minDiameterMm: selectedEntry.minDiameterMm,
          maxDiameterMm: selectedEntry.maxDiameterMm,
          material: selectedEntry.material,
          colorId: selectedColorId,
          colorLabel: selectedColorLabel,
          customerFirstName,
          customerLastName,
          customerEmail,
          customerPhone,
          customerAddress,
          customerCity,
          customerPostalCode,
          customerCountry,
          shippingModeId,
          shippingModeLabel: selectedShippingOption?.label ?? "",
          shippingProvider: selectedShippingOption?.provider ?? "",
          shippingPriceCents,
          relayId: relaySelection?.id ?? "",
          relayName: relaySelection?.name ?? "",
          relayAddress: relaySelection?.address ?? "",
          relayPostalCode: relaySelection?.postalCode ?? "",
          relayCity: relaySelection?.city ?? "",
          relayCountry: relaySelection?.country ?? "",
          customerMessage,
          orderTotalCents,
        }),
      });

      const result = (await response.json().catch(() => null)) as
        | { error?: string; url?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          result?.error ??
            "Le paiement sécurisé n'a pas pu être initialisé pour le moment. Réessayez dans un instant.",
        );
      }

      if (!result?.url) {
        throw new Error("Stripe n'a pas renvoyé de page de paiement exploitable.");
      }

      window.location.assign(result.url);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Le paiement sécurisé n'a pas pu être initialisé pour le moment.";
      setCheckoutError(message);
      setIsStartingCheckout(false);
    }
  };

  const handleOpenOrder = () => {
    if (selectedEntry?.id === currentEntry?.id) {
      orderSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    openOrderForCurrent();
  };

  const handleOpenRelaySelector = () => {
    if (!isMondialRelayWidgetReady) {
      setRelaySelectionError(
        "Ajoute d'abord votre identifiant Brand Mondial Relay dans src/shop/shop-config.ts pour activer le widget.",
      );
      return;
    }

    setRelaySelectionError(
      "Le bouton est prêt, mais le branchement du widget Mondial Relay reste à finaliser dans cette étape.",
    );
  };

  return (
    <div className="shop-app">
      <main className="shop-shell">
        <section className="shop-hero">
          <div className="shop-copy">
            <div className="shop-copy-top">
              <div className="shop-copy-main">
                <p className="shop-kicker">
                  <span className="shop-kicker-line">
                    <span>VASO SHOP</span>
                    <span className="shop-kicker-version">{`v${APP_VERSION}`}</span>
                  </span>
                </p>
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
            <div className="shop-info-head">
              <p className="shop-panel-title">Des modèles générés en direct</p>
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
            <div className="shop-story shop-story-workshop">
              <div className="shop-story-head">
                <p className="shop-panel-title shop-title-with-mark shop-workshop-title">
                  <img
                    className="shop-title-mark shop-title-mark-story"
                    src={vasoMark}
                    alt=""
                    aria-hidden="true"
                  />
                  <span>L'Atelier Vaso</span>
                </p>
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
              <div className="shop-story-contact">
                <span>Vous avez des questions ?</span>
                <button className="shop-contact-button" type="button">
                  Contactez nous
                </button>
              </div>
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
              <button className="shop-button shop-button-accent" onClick={handleOpenOrder}>
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
                <p className="shop-panel-title">Modèle actuel</p>
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
                  <span className="shop-stat-label">Diamètre minimum</span>
                  <strong>{currentEntry ? `${currentEntry.minDiameterMm} mm` : "-"}</strong>
                </div>
                <div className="shop-stat">
                  <span className="shop-stat-label">Diamètre maximum</span>
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
          </div>
        </section>

        {selectedEntry && (
          <section ref={orderSectionRef} className="shop-order-card">
            <form className="shop-order-journey" onSubmit={handleCheckoutSubmit}>
              <input type="hidden" name="seed" value={selectedEntry.seed} />
              <input type="hidden" name="version" value={selectedEntry.version} />
              <input type="hidden" name="heightMm" value={selectedEntry.heightMm} />
              <input type="hidden" name="minDiameterMm" value={selectedEntry.minDiameterMm} />
              <input type="hidden" name="maxDiameterMm" value={selectedEntry.maxDiameterMm} />
              <input type="hidden" name="color" value={selectedColor?.label ?? ""} />
              <input type="hidden" name="material" value={selectedEntry.material} />
              <input type="hidden" name="shippingMode" value={selectedShippingOption?.label ?? ""} />
              <input type="hidden" name="shippingProvider" value={selectedShippingOption?.provider ?? ""} />
              <input type="hidden" name="shippingPriceCents" value={shippingPriceCents} />
              <input type="hidden" name="orderTotalCents" value={orderTotalCents} />
              <input type="hidden" name="relayId" value={relaySelection?.id ?? ""} />
              <input type="hidden" name="relayName" value={relaySelection?.name ?? ""} />
              <input type="hidden" name="relayAddress" value={relaySelection?.address ?? ""} />
              <input type="hidden" name="relayPostalCode" value={relaySelection?.postalCode ?? ""} />
              <input type="hidden" name="relayCity" value={relaySelection?.city ?? ""} />
              <input type="hidden" name="relayCountry" value={relaySelection?.country ?? ""} />

              <div className="shop-order-copy shop-order-journey-head">
                <div>
                  <p className="shop-panel-title">Page de commande</p>
                  <h2>Un parcours clair avant le paiement.</h2>
                  <p>
                    La page descend automatiquement jusqu'ici pour valider le modele, choisir la
                    couleur, renseigner vos informations puis ouvrir le paiement sécurisé Stripe.
                  </p>
                </div>
                <button className="shop-button shop-button-secondary" type="button" onClick={closeOrder}>
                  Retour au modele
                </button>
              </div>

              <article className={getOrderStepClassName(isModelStepConfirmed, true)}>
                <div className="shop-order-step-head">
                  <span className="shop-order-step-index">01</span>
                  <div>
                    <p className="shop-panel-title">Validation du modele</p>
                    <h3>Confirmez le vase selectionne</h3>
                  </div>
                </div>
                <div className="shop-order-step-content">
                  <p>
                    Vous validez ici le vase exact qui sera repris dans la commande. Son numéro et
                    ses dimensions restent fixes pour la suite du parcours.
                  </p>
                  <div className="shop-order-summary shop-order-summary-wide">
                    <div className="shop-stat">
                      <span className="shop-stat-label">N° de vase</span>
                      <strong>{selectedEntry.seed}</strong>
                    </div>
                    <div className="shop-stat">
                      <span className="shop-stat-label">Hauteur</span>
                      <strong>{selectedEntry.heightMm} mm</strong>
                    </div>
                    <div className="shop-stat">
                      <span className="shop-stat-label">Diamètre minimum</span>
                      <strong>{selectedEntry.minDiameterMm} mm</strong>
                    </div>
                    <div className="shop-stat">
                      <span className="shop-stat-label">Diamètre maximum</span>
                      <strong>{selectedEntry.maxDiameterMm} mm</strong>
                    </div>
                  </div>
                </div>
                <div className="shop-order-step-actions">
                  {isModelStepConfirmed ? (
                    <span className="shop-step-status">Modèle validé</span>
                  ) : (
                    <button className="shop-button shop-button-accent" type="button" onClick={() => setIsModelStepConfirmed(true)}>
                      Je valide ce modèle
                    </button>
                  )}
                </div>
              </article>

              <article className={getOrderStepClassName(isColorStepConfirmed, canAccessColorStep)}>
                <div className="shop-order-step-head">
                  <span className="shop-order-step-index">02</span>
                  <div>
                    <p className="shop-panel-title">Selection de la couleur</p>
                    <h3>Choisissez la couleur de votre vase</h3>
                  </div>
                </div>
                <div className="shop-order-step-content">
                  <div className="shop-color-block shop-color-block-journey">
                    <label htmlFor="shop-color">Couleur PLA</label>
                    <select
                      id="shop-color"
                      value={selectedColorId}
                      onChange={(event) => setSelectedColorId(event.target.value)}
                      disabled={!canAccessColorStep}
                    >
                      {availableColors.map((color) => (
                        <option key={color.id} value={color.id}>
                          {color.label}
                        </option>
                      ))}
                    </select>

                    <div className="shop-color-swatches" aria-label="Pastilles de couleur PLA">
                      {availableColors.map((color) => (
                        <button
                          key={color.id}
                          className={`shop-swatch-button ${selectedColorId === color.id ? "active" : ""}`}
                          type="button"
                          onClick={() => setSelectedColorId(color.id)}
                          disabled={!canAccessColorStep}
                          aria-pressed={selectedColorId === color.id}
                          title={color.label}
                        >
                          <span
                            className={`shop-swatch ${selectedColorId === color.id ? "active" : ""}`}
                            style={{ backgroundColor: color.hex }}
                            aria-hidden="true"
                          />
                          <span className="shop-swatch-label">{color.label}</span>
                        </button>
                      ))}
                    </div>
                    <p className="shop-color-helper">
                      Cliquez sur une pastille pour mettre à jour la couleur sélectionnée dans la
                      liste.
                    </p>
                  </div>
                  <div className="shop-order-note shop-order-note-highlight shop-order-warning">
                    <span className="shop-order-warning-icon" aria-hidden="true">
                      <span>!</span>
                    </span>
                    <div className="shop-order-warning-copy">
                      <strong>Attention</strong>
                      <p>
                        Nous attirons votre attention sur le fait qu'un vase imprimé en PLA n'est
                        pas prévu pour contenir de l'eau. En effet, la matière étant biosourcée à
                        base d'amidon de maïs, il s'agit d'un matériau biodégradable : le mettre en
                        contact avec de l'eau dégraderait rapidement le vase. Toutefois, en prenant
                        en compte les dimensions du vase (diamètre minimum et maximum), vous pouvez
                        anticiper l'ajout d'un contenant en verre à l'intérieur.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="shop-order-step-actions">
                  {isColorStepConfirmed ? (
                    <span className="shop-step-status">Couleur validee</span>
                  ) : canAccessColorStep ? (
                    <button className="shop-button shop-button-accent" type="button" onClick={() => setIsColorStepConfirmed(true)}>
                      Je valide cette couleur
                    </button>
                  ) : (
                    <span className="shop-step-hint">Validez d'abord le modele</span>
                  )}
                </div>
              </article>

              <article
                ref={clientStepRef}
                className={getOrderStepClassName(isClientStepConfirmed, canAccessClientStep)}
              >
                <div className="shop-order-step-head">
                  <span className="shop-order-step-index">03</span>
                  <div>
                    <p className="shop-panel-title">Informations commande</p>
                    <h3>Renseignez vos coordonnees</h3>
                  </div>
                </div>
                <div className="shop-order-step-content">
                  <div className="shop-order-form-grid">
                    <label className="shop-field">
                      <span>Nom</span>
                      <input
                        name="lastName"
                        type="text"
                        value={customerLastName}
                        onChange={(event) => setCustomerLastName(event.target.value)}
                        placeholder="Votre nom"
                        required
                        disabled={!canAccessClientStep}
                        autoComplete="family-name"
                      />
                    </label>

                    <label className="shop-field">
                      <span>Prénom</span>
                      <input
                        name="firstName"
                        type="text"
                        value={customerFirstName}
                        onChange={(event) => setCustomerFirstName(event.target.value)}
                        placeholder="Votre prénom"
                        required
                        disabled={!canAccessClientStep}
                        autoComplete="given-name"
                      />
                    </label>

                    <label className="shop-field">
                      <span>E-mail</span>
                      <input
                        name="email"
                        type="email"
                        value={customerEmail}
                        onChange={(event) => setCustomerEmail(event.target.value)}
                        placeholder="votre@email.com"
                        required
                        disabled={!canAccessClientStep}
                        autoComplete="email"
                      />
                    </label>

                    <label className="shop-field">
                      <span>N° de téléphone (facultatif)</span>
                      <input
                        name="phone"
                        type="tel"
                        value={customerPhone}
                        onChange={(event) => setCustomerPhone(event.target.value)}
                        placeholder="Votre numéro de téléphone"
                        disabled={!canAccessClientStep}
                        autoComplete="tel"
                      />
                    </label>

                    <label className="shop-field shop-field-wide">
                      <span>Pays</span>
                      <select
                        name="country"
                        value={customerCountry}
                        onChange={(event) => setCustomerCountry(event.target.value)}
                        disabled={!canAccessClientStep}
                        required
                      >
                        <option value="">Sélectionnez un pays</option>
                        {SHOP_COUNTRIES.map((country) => (
                          <option key={country} value={country}>
                            {country}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="shop-field shop-field-wide">
                      <span>Mode de livraison</span>
                      <select
                        name="shippingMode"
                        value={shippingModeId}
                        onChange={(event) => setShippingModeId(event.target.value)}
                        disabled={!canAccessClientStep || !customerCountry.trim() || isUnsupportedShippingCountry}
                        required
                      >
                        <option value="">
                          {customerCountry.trim().length === 0
                            ? "Choisissez d'abord un pays"
                            : "Sélectionnez un mode de livraison"}
                        </option>
                        {shippingOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label} · {option.provider} · {formatShopPriceFromCents(option.priceCents)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="shop-field shop-field-wide">
                      <span>Adresse de facturation</span>
                      <input
                        name="address"
                        type="text"
                        value={customerAddress}
                        onChange={(event) => setCustomerAddress(event.target.value)}
                        placeholder="Votre adresse"
                        disabled={!canAccessClientStep}
                        required
                        autoComplete="street-address"
                      />
                    </label>

                    <label className="shop-field">
                      <span>Ville</span>
                      <input
                        name="city"
                        type="text"
                        value={customerCity}
                        onChange={(event) => setCustomerCity(event.target.value)}
                        placeholder="Votre ville"
                        disabled={!canAccessClientStep}
                        required
                        autoComplete="address-level2"
                      />
                    </label>

                    <label className="shop-field">
                      <span>Code postal</span>
                      <input
                        name="postalCode"
                        type="text"
                        value={customerPostalCode}
                        onChange={(event) => setCustomerPostalCode(event.target.value)}
                        placeholder="Votre code postal"
                        disabled={!canAccessClientStep}
                        required
                        autoComplete="postal-code"
                      />
                    </label>

                    <label className="shop-field shop-field-wide">
                      <span>Message</span>
                      <textarea
                        name="message"
                        value={customerMessage}
                        onChange={(event) => setCustomerMessage(event.target.value)}
                        placeholder="Precisions, quantite, delai souhaite..."
                        rows={4}
                        disabled={!canAccessClientStep}
                      />
                    </label>
                  </div>
                  {selectedShippingOption ? (
                    <div className="shop-order-note">
                      <strong>Livraison sélectionnée</strong>
                      <p>
                        {selectedShippingOption.label} · {selectedShippingOption.provider} ·{" "}
                        {shippingPriceLabel}
                      </p>
                      {selectedShippingOption.id === "relay" ? (
                        <div className="shop-relay-selector">
                          <p>
                            Choisissez ensuite le point relais exact avant de valider cette étape.
                          </p>
                          <button
                            className="shop-button shop-button-secondary shop-relay-button"
                            type="button"
                            onClick={handleOpenRelaySelector}
                            disabled={!canAccessClientStep}
                          >
                            Sélectionner mon point relais
                          </button>
                          {relaySelection ? (
                            <div className="shop-order-note shop-relay-summary">
                              <strong>Point relais sélectionné</strong>
                              <p>{relaySelection.name}</p>
                              <p>
                                {relaySelection.address} · {relaySelection.postalCode}{" "}
                                {relaySelection.city}
                              </p>
                              <p>{relaySelection.country}</p>
                            </div>
                          ) : (
                            <p className="shop-relay-hint">
                              Aucun point relais sélectionné pour le moment.
                            </p>
                          )}
                          {relaySelectionError ? (
                            <p className="shop-relay-error">{relaySelectionError}</p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {isUnsupportedShippingCountry ? (
                    <div className="shop-order-note shop-order-note-error">
                      <strong>Livraison à confirmer</strong>
                      <p>{SHOP_UNSUPPORTED_SHIPPING_MESSAGE}</p>
                    </div>
                  ) : null}
                  <div className="shop-order-note shop-legal-note">
                    <strong>Mentions et donnees personnelles</strong>
                    <p>
                      Ces informations servent uniquement a traiter cette demande de commande et a
                      preparer le futur paiement. Prevu au branchement final : effacement
                      automatique des demandes inactives apres 30 jours.
                    </p>
                  </div>
                </div>
                <div className="shop-order-step-actions">
                  {isClientStepConfirmed ? (
                    <span className="shop-step-status">Informations validees</span>
                  ) : canAccessClientStep ? (
                    <button
                      className="shop-button shop-button-accent"
                      type="button"
                      onClick={() => setIsClientStepConfirmed(true)}
                      disabled={!canValidateClientStep}
                    >
                      Je valide mes informations
                    </button>
                  ) : (
                    <span className="shop-step-hint">Validez d'abord la couleur</span>
                  )}
                  {isRelayShippingMode && !relaySelection ? (
                    <span className="shop-step-hint">
                      Sélectionnez un point relais avant de valider cette étape.
                    </span>
                  ) : null}
                </div>
              </article>

              <article className={getOrderStepClassName(isGlobalStepConfirmed, canAccessGlobalStep)}>
                <div className="shop-order-step-head">
                  <span className="shop-order-step-index">04</span>
                  <div>
                    <p className="shop-panel-title">Récapitulatif et montant</p>
                    <h3>Vérifiez la commande avant le paiement</h3>
                  </div>
                </div>
                <div className="shop-order-step-content">
                  <div className="shop-order-confirm-grid">
                    <div className="shop-order-note">
                      <strong>Modèle</strong>
                      <p>
                        Vase N° {selectedEntry.seed} · {selectedEntry.heightMm} mm ·{" "}
                        {selectedEntry.minDiameterMm} à {selectedEntry.maxDiameterMm} mm
                      </p>
                    </div>
                    <div className="shop-order-note">
                      <strong>Couleur</strong>
                      <p>{selectedColorLabel}</p>
                    </div>
                    <div className="shop-order-note">
                      <strong>Client</strong>
                      <p>
                        {customerFullName || "Nom et prénom à renseigner"} ·{" "}
                        {customerContactSummary || "E-mail à renseigner"}
                      </p>
                      <p>{customerAddressSummary || "Adresse complète à renseigner"}</p>
                    </div>
                    <div className="shop-order-note">
                      <strong>Livraison</strong>
                      {selectedShippingOption ? (
                        <>
                          <p>
                            {selectedShippingOption.label} · {selectedShippingOption.provider}
                          </p>
                          <p>{shippingPriceLabel}</p>
                        </>
                      ) : (
                        <p>{SHOP_UNSUPPORTED_SHIPPING_MESSAGE}</p>
                      )}
                    </div>
                    <div className="shop-order-note">
                      <strong>Montant</strong>
                      <p>Vase : {orderBasePriceLabel}</p>
                      <p>Livraison : {shippingPriceLabel ?? "À confirmer"}</p>
                      <p>Total TTC : {shippingPriceLabel ? orderTotalLabel : "Nous contacter"}</p>
                    </div>
                  </div>
                  <p>
                    Cette validation verrouille votre commande avant l'étape de paiement. Le
                    règlement Stripe portera sur {orderTotalLabel} TTC dès que vous validerez le
                    récapitulatif.
                  </p>
                </div>
                <div className="shop-order-step-actions">
                  {isGlobalStepConfirmed ? (
                    <span className="shop-step-status">Récapitulatif validé</span>
                  ) : canAccessGlobalStep ? (
                    <button className="shop-button shop-button-accent" type="button" onClick={() => setIsGlobalStepConfirmed(true)}>
                      Je valide le récapitulatif
                    </button>
                  ) : (
                    <span className="shop-step-hint">Validez d'abord vos informations</span>
                  )}
                </div>
              </article>

              <article className={getOrderStepClassName(false, canAccessStripeStep)}>
                <div className="shop-order-step-head">
                  <span className="shop-order-step-index">05</span>
                  <div>
                    <p className="shop-panel-title">Paiement sécurisé</p>
                    <h3>Finalisez le règlement Stripe</h3>
                  </div>
                </div>
                <div className="shop-order-step-content">
                  <div className="shop-order-note shop-order-note-highlight">
                    <strong>Paiement sécurisé Stripe</strong>
                    <p>
                      Une page de paiement Stripe sécurisée s'ouvrira avec le modèle, la couleur,
                      vos coordonnées et le montant total de {orderTotalLabel} déjà rattachés à la
                      commande.
                    </p>
                  </div>
                  {checkoutError ? (
                    <div className="shop-order-note shop-order-note-error">
                      <strong>Le paiement n'a pas pu démarrer</strong>
                      <p>{checkoutError}</p>
                    </div>
                  ) : null}
                </div>
                <div className="shop-order-step-actions shop-order-step-actions-final">
                  {canAccessStripeStep ? (
                    <>
                      <span className="shop-step-hint">
                        {isStartingCheckout
                          ? "Redirection vers Stripe..."
                          : `Vous allez être redirigé vers Stripe pour régler ${orderTotalLabel}.`}
                      </span>
                      <button className="shop-button shop-button-primary" type="submit" disabled={isStartingCheckout}>
                        {isStartingCheckout ? "Ouverture de Stripe..." : "Accéder au paiement sécurisé"}
                      </button>
                    </>
                  ) : (
                    <span className="shop-step-hint">Validez d'abord la confirmation globale</span>
                  )}
                </div>
              </article>

              <p className="shop-form-note">
                Le règlement s'effectue sur une page Stripe sécurisée avec le montant de livraison
                correspondant au pays et au mode sélectionnés.
              </p>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
