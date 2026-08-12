import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { InsertView2D } from "./components/viewer/InsertView2D";
import { VaseViewer3D } from "./components/viewer/VaseViewer3D";
import { useUIStore } from "./store/ui-store";
import { SHOP_COUNTRIES } from "./shop/shop-countries";
import {
  DEFAULT_HERO_GALLERY_FADE_IN_MS,
  DEFAULT_HERO_GALLERY_FADE_OUT_MS,
  DEFAULT_HERO_GALLERY_TRANSITION_MS,
  fetchShopConfig,
  formatShopPriceFromCents,
  getShopBasePriceCents,
  getShopEffectiveShippingPriceCents,
  getShopStripeCheckoutEndpoint,
  isShopCheckoutAllowed,
  SHOP_MONDIAL_RELAY_BRAND,
  resolveShopConfigAssetPath,
  type ShopPublicConfig,
} from "./shop/shop-config";
import {
  getShopShippingOption,
  getShopShippingOptions,
  isShopShippingOptionSuspended,
} from "./shop/shop-shipping";
import { useShopStore } from "./shop/shop-store";
import type { WaterproofInsertCompatibility } from "./engine/insert-compatibility";
import vasoMark from "./assets/shop/vaso-mark.png";
import "./App.css";

const APP_VERSION = typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "dev";
const isMondialRelayWidgetReady = SHOP_MONDIAL_RELAY_BRAND.trim().length > 0;
const SHOP_NEUTRAL_VASE_COLOR = "#d9d2c7";
const SHOP_PRIORITY_COUNTRY = "France";
const SHOP_MONDIAL_RELAY_WIDGET_ID = "shop-mondial-relay-widget";
const SHOP_MONDIAL_RELAY_TARGET_ID = "shop-mondial-relay-target";
const SHOP_MONDIAL_RELAY_TARGET_DISPLAY_ID = "shop-mondial-relay-target-display";
const SHOP_MONDIAL_RELAY_TARGET_INFO_ID = "shop-mondial-relay-target-info";
const SHOP_MONDIAL_RELAY_SCRIPT_URL =
  "https://widget.mondialrelay.com/parcelshop-picker/jquery.plugin.mondialrelay.parcelshoppicker.min.js";
const SHOP_JQUERY_SCRIPT_URL = "https://ajax.googleapis.com/ajax/libs/jquery/2.2.4/jquery.min.js";
const SHOP_LEAFLET_SCRIPT_URL = "https://unpkg.com/leaflet/dist/leaflet.js";
const SHOP_LEAFLET_CSS_URL = "https://unpkg.com/leaflet/dist/leaflet.css";
const SHOP_SOLIFLORE_TEST_TUBE_LABEL = "Tube à essai 75 × 12 mm";
const SHOP_NO_WATER_INSERT_LABEL = "Aucun contenant étanche (usage sans eau)";
const SHOP_COUNTRIES_FOR_ORDER = [
  SHOP_PRIORITY_COUNTRY,
  ...SHOP_COUNTRIES.filter((country) => country !== SHOP_PRIORITY_COUNTRY),
] as const;
const SHOP_MONDIAL_RELAY_COUNTRY_CODES: Record<string, string> = {
  Allemagne: "DE",
  Autriche: "AT",
  Belgique: "BE",
  Espagne: "ES",
  France: "FR",
  Italie: "IT",
  Luxembourg: "LU",
  "Pays-Bas": "NL",
  Pologne: "PL",
  Portugal: "PT",
};

interface ShopRelaySelection {
  id: string;
  name: string;
  address: string;
  postalCode: string;
  city: string;
  country: string;
}

type SolifloreChoice = "" | "yes" | "no";

interface MondialRelayParcelShopData {
  Adresse1?: string;
  Adresse2?: string;
  CP?: string;
  ID?: string;
  Nom?: string;
  Pays?: string;
  Ville?: string;
}

interface MondialRelayPickerOptions {
  Target: string;
  TargetDisplay: string;
  TargetDisplayInfoPR: string;
  Brand: string;
  Country: string;
  AllowedCountries: string;
  PostCode?: string;
  City?: string;
  Theme: "mondialrelay";
  Responsive: boolean;
  ShowResultsOnMap: boolean;
  OnParcelShopSelected: (data: MondialRelayParcelShopData) => void;
}

interface MondialRelayJQueryElement {
  MR_ParcelShopPicker?: (options: MondialRelayPickerOptions) => void;
  empty: () => MondialRelayJQueryElement;
  trigger: (eventName: string, data?: unknown) => MondialRelayJQueryElement;
}

interface MondialRelayJQuery {
  (selector: string): MondialRelayJQueryElement;
}

declare global {
  interface Window {
    jQuery?: MondialRelayJQuery;
    $?: MondialRelayJQuery;
  }
}

function formatShippingOptionDisplay(optionLabel: string, optionProvider: string): string {
  if (!optionProvider || optionProvider === "Mondial Relay Domicile") {
    return optionLabel;
  }

  return `${optionLabel} · ${optionProvider}`;
}

function loadShopScript(id: string, src: string): Promise<void> {
  const existingScript = document.getElementById(id) as HTMLScriptElement | null;
  if (existingScript?.dataset.loaded === "true") {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const script = existingScript ?? document.createElement("script");

    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "true";
        resolve();
      },
      { once: true },
    );
    script.addEventListener(
      "error",
      () => {
        reject(new Error(`Le script ${src} n'a pas pu être chargé.`));
      },
      { once: true },
    );

    if (!existingScript) {
      script.id = id;
      script.src = src;
      script.async = true;
      document.head.appendChild(script);
    }
  });
}

function loadShopStylesheet(id: string, href: string): void {
  if (document.getElementById(id)) {
    return;
  }

  const stylesheet = document.createElement("link");
  stylesheet.id = id;
  stylesheet.rel = "stylesheet";
  stylesheet.href = href;
  document.head.appendChild(stylesheet);
}

async function loadMondialRelayWidgetAssets(): Promise<void> {
  loadShopStylesheet("shop-leaflet-css", SHOP_LEAFLET_CSS_URL);
  await loadShopScript("shop-jquery-script", SHOP_JQUERY_SCRIPT_URL);
  await loadShopScript("shop-leaflet-script", SHOP_LEAFLET_SCRIPT_URL);
  await loadShopScript("shop-mondial-relay-script", SHOP_MONDIAL_RELAY_SCRIPT_URL);
}

function createShopContactMailto(email: string, subject: string, body: string): string {
  const normalizedEmail = email.trim();
  const encodedSubject = encodeURIComponent(subject.trim() || "Contact VASO SHOP");
  const encodedBody = encodeURIComponent(body);
  return `mailto:${normalizedEmail}?subject=${encodedSubject}&body=${encodedBody}`;
}

function buildShopContactBody(
  bodyTemplate: string,
  vaseDetails: {
    seed: string;
    heightMm: number;
    minDiameterMm: number;
    maxDiameterMm: number;
    waterproofInsertLabel: string;
    colorLabel: string;
  } | null,
): string {
  const normalizedTemplate =
    bodyTemplate.trim().length > 0
      ? bodyTemplate.trimEnd()
      : "Bonjour,\n\nJe vous contacte depuis VASO SHOP.\n\nMessage :";

  if (!vaseDetails) {
    return `${normalizedTemplate}\n`;
  }

  return [
    normalizedTemplate,
    "",
    "Vase selectionne automatiquement :",
    `N° de vase : ${vaseDetails.seed}`,
    `Couleur : ${vaseDetails.colorLabel}`,
    `Hauteur : ${vaseDetails.heightMm} mm`,
    `Diamètre minimum : ${vaseDetails.minDiameterMm} mm`,
    `Diamètre maximum : ${vaseDetails.maxDiameterMm} mm`,
    `Contenant compatible : ${vaseDetails.waterproofInsertLabel}`,
    "",
  ].join("\n");
}

function App() {
  const setShowGrid = useUIStore((s) => s.setShowGrid);
  const setWireframe = useUIStore((s) => s.setWireframe);
  const setFlatShading = useUIStore((s) => s.setFlatShading);
  const setShowClipping = useUIStore((s) => s.setShowClipping);
  const setRotationMode = useUIStore((s) => s.setRotationMode);
  const setAutoRotate = useUIStore((s) => s.setAutoRotate);
  const setVaseColor = useUIStore((s) => s.setVaseColor);
  const applyPrinterVolumeConfig = useUIStore((s) => s.applyPrinterVolumeConfig);
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
  const [isShippingModeMenuOpen, setIsShippingModeMenuOpen] = useState(false);
  const [relaySelection, setRelaySelection] = useState<ShopRelaySelection | null>(null);
  const [relaySelectionError, setRelaySelectionError] = useState("");
  const [isRelaySelectorOpen, setIsRelaySelectorOpen] = useState(false);
  const [isRelayWidgetLoading, setIsRelayWidgetLoading] = useState(false);
  const [customerMessage, setCustomerMessage] = useState("");
  const [heroGalleryIndex, setHeroGalleryIndex] = useState(0);
  const [heroGalleryPreviousIndex, setHeroGalleryPreviousIndex] = useState<number | null>(null);
  const [solifloreChoice, setSolifloreChoice] = useState<SolifloreChoice>("");
  const [isModelStepConfirmed, setIsModelStepConfirmed] = useState(false);
  const [isColorStepConfirmed, setIsColorStepConfirmed] = useState(false);
  const [isClientStepConfirmed, setIsClientStepConfirmed] = useState(false);
  const [isGlobalStepConfirmed, setIsGlobalStepConfirmed] = useState(false);
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [shopConfig, setShopConfig] = useState<ShopPublicConfig | null>(null);
  const [shopConfigError, setShopConfigError] = useState("");
  const orderSectionRef = useRef<HTMLElement | null>(null);
  const clientStepRef = useRef<HTMLElement | null>(null);

  const currentEntry = entries[currentIndex] ?? null;
  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.id === selectedEntryId) ?? null,
    [entries, selectedEntryId],
  );
  const contactEntry = selectedEntry ?? currentEntry;
  const canOrder = shopConfig ? isShopCheckoutAllowed(shopConfig) : false;
  const availableColors = useMemo(
    () => shopConfig?.colors.filter((color) => color.available) ?? [],
    [shopConfig],
  );
  const selectedColor = useMemo(
    () => availableColors.find((color) => color.id === selectedColorId) ?? null,
    [availableColors, selectedColorId],
  );
  const heroGalleryImages = useMemo(
    () =>
      (shopConfig?.heroImages ?? [])
        .filter((image) => image.enabled)
        .map((image) => resolveShopConfigAssetPath(image.path)),
    [shopConfig],
  );
  const currentHeroGalleryImage = heroGalleryImages[heroGalleryIndex] ?? null;
  const previousHeroGalleryImage =
    heroGalleryPreviousIndex === null
      ? null
      : (heroGalleryImages[heroGalleryPreviousIndex] ?? null);
  const heroGalleryTransitionMs = Math.max(
    1000,
    shopConfig?.heroGallery.transitionMs ?? DEFAULT_HERO_GALLERY_TRANSITION_MS,
  );
  const heroGalleryFadeInMs = Math.max(
    0,
    shopConfig?.heroGallery.fadeInMs ?? DEFAULT_HERO_GALLERY_FADE_IN_MS,
  );
  const heroGalleryFadeOutMs = Math.max(
    0,
    shopConfig?.heroGallery.fadeOutMs ?? DEFAULT_HERO_GALLERY_FADE_OUT_MS,
  );
  const heroGalleryPreviewClearMs = Math.max(heroGalleryFadeInMs, heroGalleryFadeOutMs, 1);
  const selectedColorLabel = selectedColor?.label ?? "A choisir";
  const productPriceCents = shopConfig ? getShopBasePriceCents(shopConfig) : 0;
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
    () => (shopConfig ? getShopShippingOptions(shopConfig, customerCountry) : []),
    [customerCountry, shopConfig],
  );
  const selectedShippingOption = useMemo(
    () => (shopConfig ? getShopShippingOption(shopConfig, customerCountry, shippingModeId) : null),
    [customerCountry, shippingModeId, shopConfig],
  );
  const isSelectedShippingOptionSuspended =
    shopConfig && selectedShippingOption
      ? isShopShippingOptionSuspended(shopConfig, selectedShippingOption.id)
      : false;
  const isUnsupportedShippingCountry =
    Boolean(shopConfig) && customerCountry.trim().length > 0 && shippingOptions.length === 0;
  const isRelayShippingMode = selectedShippingOption?.id === "relay";
  const shippingPriceCents =
    shopConfig && selectedShippingOption
      ? getShopEffectiveShippingPriceCents(
          shopConfig,
          productPriceCents,
          selectedShippingOption.priceCents,
        )
      : 0;
  const shippingPriceLabel = selectedShippingOption
    ? shippingPriceCents === 0
      ? "Offerte"
      : formatShopPriceFromCents(shippingPriceCents)
    : null;
  const orderTotalCents = productPriceCents + shippingPriceCents;
  const orderTotalLabel = formatShopPriceFromCents(orderTotalCents);
  const isEcoCupCompatible = selectedEntry?.waterproofInsertCompatibility.type === "eco_cup";
  const isTestTubeCompatible = selectedEntry?.waterproofInsertCompatibility.type === "test_tube";
  const wantsSoliflore = solifloreChoice === "yes";
  const hasAnsweredSolifloreQuestion = solifloreChoice !== "";
  const suppressTestTubeSupport = solifloreChoice === "no" && isTestTubeCompatible;
  const selectedWaterproofInsertLabel = wantsSoliflore
    ? `${SHOP_SOLIFLORE_TEST_TUBE_LABEL} (soliflore)`
    : suppressTestTubeSupport
      ? SHOP_NO_WATER_INSERT_LABEL
      : (selectedEntry?.waterproofInsertCompatibility.label ?? "");
  const selectedWaterproofInsertCompatibility: WaterproofInsertCompatibility | null = selectedEntry
    ? wantsSoliflore
      ? {
          presetId: "test-tube-75x12",
          label: SHOP_SOLIFLORE_TEST_TUBE_LABEL,
          type: "test_tube",
        }
      : suppressTestTubeSupport
        ? null
        : selectedEntry.waterproofInsertCompatibility
    : null;
  const solifloreChoiceLabel =
    solifloreChoice === "yes"
      ? "Oui, usage soliflore avec tube à essai"
      : solifloreChoice === "no"
        ? isTestTubeCompatible
          ? "Non, pas de support tube à essai"
          : "Non, contenant étanche compatible"
        : "";
  const selectedShippingOptionLabel =
    shopConfig && selectedShippingOption
      ? `${formatShippingOptionDisplay(selectedShippingOption.label, selectedShippingOption.provider)} · ${formatShopPriceFromCents(
          getShopEffectiveShippingPriceCents(
            shopConfig,
            productPriceCents,
            selectedShippingOption.priceCents,
          ),
        )}`
      : "";
  const contactEmail = shopConfig?.messages.contactEmail?.trim() ?? "";
  const contactEmailSubject =
    shopConfig?.messages.contactEmailSubject?.trim() || "Contact VASO SHOP";
  const contactEmailBody =
    shopConfig?.messages.contactEmailBody || "Nom :\nPrenom :\nN° de tel :\nMail :\n\nMessage :\n";
  const contactBodyWithModel = buildShopContactBody(
    contactEmailBody,
    contactEntry
      ? {
          seed: String(contactEntry.seed),
          heightMm: contactEntry.heightMm,
          minDiameterMm: contactEntry.minDiameterMm,
          maxDiameterMm: contactEntry.maxDiameterMm,
          waterproofInsertLabel: contactEntry.waterproofInsertCompatibility.label,
          colorLabel: selectedColor?.label ?? "A choisir",
        }
      : null,
  );
  const canContactShop = contactEmail.length > 0;
  const isClientInfoComplete =
    customerLastName.trim().length > 0 &&
    customerFirstName.trim().length > 0 &&
    customerEmail.trim().length > 0 &&
    customerAddress.trim().length > 0 &&
    customerCity.trim().length > 0 &&
    customerPostalCode.trim().length > 0 &&
    customerCountry.trim().length > 0;
  const isShippingSelectionComplete =
    selectedShippingOption !== null && !isSelectedShippingOptionSuspended;
  const isRelaySelectionComplete = !isRelayShippingMode || relaySelection !== null;
  const canValidateClientStep =
    isClientInfoComplete &&
    isShippingSelectionComplete &&
    isRelaySelectionComplete &&
    !isUnsupportedShippingCountry;
  const canAccessColorStep = isModelStepConfirmed && availableColors.length > 0;
  const canAccessClientStep = isColorStepConfirmed;
  const canAccessGlobalStep = isClientStepConfirmed && canValidateClientStep;
  const canAccessStripeStep = isGlobalStepConfirmed && canOrder;
  const orderBasePriceLabel = formatShopPriceFromCents(productPriceCents);

  useEffect(() => {
    setShowGrid(false);
    setWireframe(false);
    setFlatShading(false);
    setShowClipping(false);
    setRotationMode("camera");
    setAutoRotate(true);
    setVaseColor(SHOP_NEUTRAL_VASE_COLOR);
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
    let isCancelled = false;

    void fetchShopConfig()
      .then((config) => {
        if (isCancelled) {
          return;
        }

        setShopConfig(config);
        applyPrinterVolumeConfig(config.printerVolume);
        setShopConfigError("");
      })
      .catch((error) => {
        if (isCancelled) {
          return;
        }

        setShopConfigError(
          error instanceof Error
            ? error.message
            : "La configuration boutique n'a pas pu être chargée.",
        );
      });

    return () => {
      isCancelled = true;
    };
  }, [applyPrinterVolumeConfig]);

  useEffect(() => {
    if (availableColors.length === 0) {
      if (selectedColorId) {
        setSelectedColorId("");
      }
      return;
    }

    const isCurrentColorStillAvailable = availableColors.some(
      (color) => color.id === selectedColorId,
    );
    if (!isCurrentColorStillAvailable) {
      setSelectedColorId(availableColors[0]?.id ?? "");
    }
  }, [availableColors, selectedColorId, setSelectedColorId]);

  useEffect(() => {
    if (heroGalleryImages.length <= 1) {
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
        return (currentIndex + 1) % heroGalleryImages.length;
      });

      clearPreviousTimeoutId = window.setTimeout(() => {
        setHeroGalleryPreviousIndex(null);
      }, heroGalleryPreviewClearMs);
    }, heroGalleryTransitionMs);

    return () => {
      window.clearInterval(intervalId);
      if (clearPreviousTimeoutId !== undefined) {
        window.clearTimeout(clearPreviousTimeoutId);
      }
    };
  }, [
    heroGalleryFadeInMs,
    heroGalleryFadeOutMs,
    heroGalleryImages,
    heroGalleryPreviewClearMs,
    heroGalleryTransitionMs,
  ]);

  useEffect(() => {
    if (!selectedEntry) {
      return;
    }

    setIsModelStepConfirmed(false);
    setIsColorStepConfirmed(false);
    setIsClientStepConfirmed(false);
    setIsGlobalStepConfirmed(false);
    setSolifloreChoice("");
    setCheckoutError("");
    setIsStartingCheckout(false);
    setRelaySelection(null);
    setRelaySelectionError("");
    setIsRelaySelectorOpen(false);

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
    setIsRelaySelectorOpen(false);
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
      setIsShippingModeMenuOpen(false);
      setRelaySelection(null);
      setRelaySelectionError("");
      setIsRelaySelectorOpen(false);
      return;
    }

    const isCurrentModeStillAvailable = shippingOptions.some(
      (option) => option.id === shippingModeId,
    );
    if (!isCurrentModeStillAvailable) {
      setShippingModeId("");
      setIsShippingModeMenuOpen(false);
      setRelaySelection(null);
      setRelaySelectionError("");
      setIsRelaySelectorOpen(false);
    }
  }, [customerCountry, shippingModeId, shippingOptions]);

  useEffect(() => {
    if (!isRelayShippingMode) {
      setRelaySelection(null);
      setRelaySelectionError("");
      setIsRelaySelectorOpen(false);
    }
  }, [isRelayShippingMode]);

  useEffect(() => {
    if (!isRelayShippingMode) {
      return;
    }

    setRelaySelection(null);
    setRelaySelectionError("");
  }, [customerCity, customerPostalCode, isRelayShippingMode]);

  useEffect(() => {
    if (!isRelaySelectorOpen || !isRelayShippingMode) {
      return undefined;
    }

    const relayCountryCode = SHOP_MONDIAL_RELAY_COUNTRY_CODES[customerCountry.trim()];
    if (!relayCountryCode) {
      setRelaySelectionError(
        "Mondial Relay ne propose pas de point relais pour ce pays dans la boutique.",
      );
      return undefined;
    }

    if (!isMondialRelayWidgetReady) {
      setRelaySelectionError(
        "Ajoute VITE_MONDIAL_RELAY_BRAND dans tes variables d'environnement pour activer le widget Mondial Relay.",
      );
      return undefined;
    }

    let isCancelled = false;
    setIsRelayWidgetLoading(true);
    setRelaySelectionError("");

    void loadMondialRelayWidgetAssets()
      .then(() => {
        if (isCancelled) {
          return;
        }

        const jquery = window.jQuery ?? window.$;
        const widget = jquery?.(`#${SHOP_MONDIAL_RELAY_WIDGET_ID}`);
        if (!widget || typeof widget.MR_ParcelShopPicker !== "function") {
          throw new Error("Le widget Mondial Relay n'est pas disponible après chargement.");
        }

        widget.empty();
        widget.MR_ParcelShopPicker({
          Target: `#${SHOP_MONDIAL_RELAY_TARGET_ID}`,
          TargetDisplay: `#${SHOP_MONDIAL_RELAY_TARGET_DISPLAY_ID}`,
          TargetDisplayInfoPR: `#${SHOP_MONDIAL_RELAY_TARGET_INFO_ID}`,
          Brand: SHOP_MONDIAL_RELAY_BRAND.trim().padEnd(8, " "),
          Country: relayCountryCode,
          AllowedCountries: relayCountryCode,
          PostCode: customerPostalCode.trim() || undefined,
          City: customerCity.trim() || undefined,
          Theme: "mondialrelay",
          Responsive: true,
          ShowResultsOnMap: true,
          OnParcelShopSelected: (data) => {
            const address = [data.Adresse1, data.Adresse2]
              .map((value) => value?.trim() ?? "")
              .filter(Boolean)
              .join(" ");

            setRelaySelection({
              id: data.ID?.trim() ?? "",
              name: data.Nom?.trim() ?? "",
              address,
              postalCode: data.CP?.trim() ?? "",
              city: data.Ville?.trim() ?? "",
              country: data.Pays?.trim() ?? relayCountryCode,
            });
            setRelaySelectionError("");
            setIsClientStepConfirmed(false);
            setIsGlobalStepConfirmed(false);
          },
        });

        if (customerPostalCode.trim()) {
          widget.trigger("MR_DoSearch", [customerPostalCode.trim(), relayCountryCode]);
        }
      })
      .catch((error) => {
        if (isCancelled) {
          return;
        }

        setRelaySelectionError(
          error instanceof Error
            ? error.message
            : "Le widget Mondial Relay n'a pas pu être chargé.",
        );
      })
      .finally(() => {
        if (!isCancelled) {
          setIsRelayWidgetLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [customerCity, customerCountry, customerPostalCode, isRelaySelectorOpen, isRelayShippingMode]);

  const getOrderStepClassName = (isComplete: boolean, isUnlocked: boolean) =>
    `shop-order-step-card${isComplete ? " is-complete" : ""}${!isUnlocked ? " is-locked" : ""}`;

  const handleSolifloreChoiceChange = (nextChoice: SolifloreChoice) => {
    setSolifloreChoice(nextChoice);
    setIsModelStepConfirmed(false);
    setIsColorStepConfirmed(false);
    setIsClientStepConfirmed(false);
    setIsGlobalStepConfirmed(false);
    setCheckoutError("");
  };

  const handleCheckoutSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (
      !selectedEntry ||
      !shopConfig ||
      !canAccessStripeStep ||
      !hasAnsweredSolifloreQuestion ||
      isStartingCheckout
    ) {
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
          waterproofInsertLabel: selectedWaterproofInsertLabel,
          solifloreChoice,
          solifloreChoiceLabel,
          wantsSoliflore,
          forceTestTubeSupport: wantsSoliflore,
          suppressTestTubeSupport,
          material: selectedEntry.material,
          productPriceCents,
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

      const result = (await response.json().catch(() => null)) as {
        error?: string;
        url?: string;
      } | null;

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
    if (!canOrder) {
      return;
    }

    if (selectedEntry?.id === currentEntry?.id) {
      orderSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    openOrderForCurrent();
  };

  const handleOpenRelaySelector = () => {
    if (!isMondialRelayWidgetReady) {
      setRelaySelectionError(
        "Ajoute VITE_MONDIAL_RELAY_BRAND dans tes variables d'environnement pour activer le widget Mondial Relay.",
      );
      return;
    }

    setIsRelaySelectorOpen(true);
    setRelaySelectionError("");
  };

  if (!shopConfig) {
    return (
      <div className="shop-app">
        <main className="shop-shell">
          <section className="shop-config-state">
            <p className="shop-panel-title">VASO SHOP</p>
            <h1>Chargement de la boutique</h1>
            <p>
              {shopConfigError ||
                "La configuration dynamique est en cours de lecture depuis public/config/shop-config.json."}
            </p>
            {shopConfigError ? (
              <button
                className="shop-button shop-button-accent"
                type="button"
                onClick={() => window.location.reload()}
              >
                Recharger la boutique
              </button>
            ) : null}
          </section>
        </main>
      </div>
    );
  }

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
                <div className="shop-status-banner">
                  <span className={`shop-status-badge shop-status-${shopConfig.shopStatus.state}`}>
                    {shopConfig.shopStatus.label}
                  </span>
                  {shopConfig.messages.shippingLeadTime ? (
                    <p className="shop-status-note">{shopConfig.messages.shippingLeadTime}</p>
                  ) : null}
                  {shopConfig.shopStatus.message ? (
                    <p className="shop-status-note">{shopConfig.shopStatus.message}</p>
                  ) : null}
                  {shopConfig.messages.temporaryNotice ? (
                    <p className="shop-status-note">{shopConfig.messages.temporaryNotice}</p>
                  ) : null}
                </div>
              </div>

              <div className="shop-hero-media">
                <div className="shop-hero-gallery" aria-label="Photos d'atelier">
                  <div
                    className="shop-hero-gallery-orb"
                    style={
                      {
                        "--shop-hero-fade-in-ms": `${heroGalleryFadeInMs}ms`,
                        "--shop-hero-fade-out-ms": `${heroGalleryFadeOutMs}ms`,
                      } as CSSProperties
                    }
                  >
                    {previousHeroGalleryImage &&
                    previousHeroGalleryImage !== currentHeroGalleryImage ? (
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
                        <small>public/images/hero/</small>
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
                {shopConfig.messages.atelierNote}
              </p>
              <div className="shop-story-contact">
                <span>{shopConfig.messages.contactPrompt}</span>
                <button
                  className="shop-contact-button"
                  type="button"
                  disabled={!canContactShop}
                  onClick={() => {
                    if (!canContactShop) {
                      return;
                    }

                    window.location.href = createShopContactMailto(
                      contactEmail,
                      contactEmailSubject,
                      contactBodyWithModel,
                    );
                  }}
                  title={canContactShop ? contactEmail : "Adresse mail de contact non renseignee"}
                >
                  {shopConfig.messages.contactButtonLabel}
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
              <button
                className="shop-button shop-button-accent"
                onClick={handleOpenOrder}
                disabled={!canOrder}
              >
                {canOrder ? "Commander ce modèle" : "Commande indisponible"}
              </button>
            </div>
            <div className="shop-viewer-frame">
              <VaseViewer3D
                colorOverride={SHOP_NEUTRAL_VASE_COLOR}
                forceTestTubeSupport={selectedEntry !== null && wantsSoliflore}
                suppressTestTubeSupport={suppressTestTubeSupport}
              />
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
                <div className="shop-stat">
                  <span className="shop-stat-label">Contenant compatible</span>
                  <strong>{currentEntry?.waterproofInsertCompatibility.label ?? "-"}</strong>
                </div>
                <div className="shop-stat shop-stat-material">
                  <span className="shop-stat-label">Matière</span>
                  <strong>{currentEntry?.material ?? "PLA"}</strong>
                  <p>{shopConfig.messages.materialPlaNote}</p>
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
              <input
                type="hidden"
                name="waterproofInsertLabel"
                value={selectedWaterproofInsertLabel}
              />
              <input type="hidden" name="solifloreChoice" value={solifloreChoice} />
              <input type="hidden" name="solifloreChoiceLabel" value={solifloreChoiceLabel} />
              <input type="hidden" name="wantsSoliflore" value={String(wantsSoliflore)} />
              <input type="hidden" name="forceTestTubeSupport" value={String(wantsSoliflore)} />
              <input
                type="hidden"
                name="suppressTestTubeSupport"
                value={String(suppressTestTubeSupport)}
              />
              <input type="hidden" name="color" value={selectedColor?.label ?? ""} />
              <input type="hidden" name="material" value={selectedEntry.material} />
              <input
                type="hidden"
                name="shippingMode"
                value={selectedShippingOption?.label ?? ""}
              />
              <input
                type="hidden"
                name="shippingProvider"
                value={selectedShippingOption?.provider ?? ""}
              />
              <input type="hidden" name="shippingPriceCents" value={shippingPriceCents} />
              <input type="hidden" name="orderTotalCents" value={orderTotalCents} />
              <input type="hidden" name="relayId" value={relaySelection?.id ?? ""} />
              <input type="hidden" name="relayName" value={relaySelection?.name ?? ""} />
              <input type="hidden" name="relayAddress" value={relaySelection?.address ?? ""} />
              <input
                type="hidden"
                name="relayPostalCode"
                value={relaySelection?.postalCode ?? ""}
              />
              <input type="hidden" name="relayCity" value={relaySelection?.city ?? ""} />
              <input type="hidden" name="relayCountry" value={relaySelection?.country ?? ""} />

              <div className="shop-order-copy shop-order-journey-head">
                <div>
                  <p className="shop-panel-title">Page de commande</p>
                  <h2>Un parcours clair avant le paiement.</h2>
                  <p>
                    La page descend automatiquement pour valider le modèle, choisir la couleur,
                    renseigner vos informations puis ouvrir le paiement sécurisé Stripe.
                  </p>
                </div>
                <button
                  className="shop-button shop-button-secondary"
                  type="button"
                  onClick={closeOrder}
                >
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
                    <div className="shop-stat">
                      <span className="shop-stat-label">Contenant compatible</span>
                      <strong>{selectedWaterproofInsertLabel}</strong>
                    </div>
                  </div>
                  <div className="shop-order-note shop-order-note-highlight shop-order-warning">
                    <span className="shop-order-warning-icon" aria-hidden="true">
                      <span>!</span>
                    </span>
                    <div className="shop-order-warning-copy">
                      <strong>Attention</strong>
                      <p>{shopConfig.messages.warningPla}</p>
                    </div>
                  </div>
                  <div className="shop-order-note shop-order-note-highlight shop-soliflore-panel">
                    <div className="shop-soliflore-question">
                      <p id="shop-soliflore-question">
                        VASO indique à droite si un contenant est compatible avec le vase généré :
                        Eco-Cup 50 cl, Eco-Cup 25 cl ou Eco-Cup 12,5 cl. Si le vase est trop petit
                        pour le plus petit Eco-Cup, VASO peut passer en mode soliflore et intégrer
                        des supports pour accueillir un tube à essai.
                      </p>
                      <p className="shop-soliflore-question-title">
                        Voulez-vous utiliser ce vase comme soliflore avec un tube à essai ?
                      </p>
                      <div
                        className="shop-soliflore-options"
                        role="radiogroup"
                        aria-labelledby="shop-soliflore-question"
                      >
                        <label className="shop-soliflore-option">
                          <input
                            type="radio"
                            name="solifloreChoice"
                            value="yes"
                            checked={solifloreChoice === "yes"}
                            onChange={() => handleSolifloreChoiceChange("yes")}
                          />
                          <span>
                            <strong>Oui</strong>
                            <small>
                              Usage soliflore : VASO prévoit un support pour tube à essai en verre.
                            </small>
                          </span>
                        </label>
                        <label className="shop-soliflore-option">
                          <input
                            type="radio"
                            name="solifloreChoice"
                            value="no"
                            checked={solifloreChoice === "no"}
                            onChange={() => handleSolifloreChoiceChange("no")}
                          />
                          <span>
                            <strong>Non</strong>
                            <small>
                              {isTestTubeCompatible
                                ? "Le vase sera utilisé sans support tube à essai et ne pourra pas contenir d'eau directement."
                                : `VASO utilisera le contenant étanche compatible indiqué${
                                    isEcoCupCompatible
                                      ? ", par exemple l'Eco-Cup lorsque les dimensions le permettent."
                                      : "."
                                  }`}
                            </small>
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="shop-order-step-actions shop-order-step-actions-model">
                  {isModelStepConfirmed ? (
                    <span className="shop-step-status">Modèle validé</span>
                  ) : (
                    <button
                      className="shop-button shop-button-accent"
                      type="button"
                      onClick={() => setIsModelStepConfirmed(true)}
                      disabled={!hasAnsweredSolifloreQuestion}
                    >
                      Je valide ce modèle
                    </button>
                  )}
                  <div className="shop-insert-view-slot">
                    {selectedWaterproofInsertCompatibility ? (
                      <InsertView2D
                        params={selectedEntry.params}
                        compatibility={selectedWaterproofInsertCompatibility}
                      />
                    ) : null}
                  </div>
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
                </div>
                <div className="shop-order-step-actions">
                  {isColorStepConfirmed ? (
                    <span className="shop-step-status">Couleur validee</span>
                  ) : canAccessColorStep ? (
                    <button
                      className="shop-button shop-button-accent"
                      type="button"
                      onClick={() => setIsColorStepConfirmed(true)}
                    >
                      Je valide cette couleur
                    </button>
                  ) : (
                    <span className="shop-step-hint">Validez d'abord le modele</span>
                  )}
                  {canAccessColorStep && (
                    <div className="shop-color-preview-card">
                      <span className="shop-panel-title">Aperçu 3D couleur</span>
                      <strong>{selectedColorLabel}</strong>
                      <div className="shop-color-preview-viewer">
                        <VaseViewer3D
                          mode="preview"
                          colorOverride={
                            selectedColor?.previewHex ??
                            selectedColor?.hex ??
                            SHOP_NEUTRAL_VASE_COLOR
                          }
                          colorOpacity={selectedColor?.opacity ?? 1}
                          colorEmissiveIntensity={selectedColor?.previewEmissiveIntensity ?? 0}
                          shadingOverride={selectedColor?.previewShading}
                          forceTestTubeSupport={wantsSoliflore}
                          suppressTestTubeSupport={suppressTestTubeSupport}
                        />
                      </div>
                      <div className="shop-color-preview-note">
                        {shopConfig.messages.colorPreviewNote}
                      </div>
                    </div>
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
                        {SHOP_COUNTRIES_FOR_ORDER.map((country) => (
                          <option key={country} value={country}>
                            {country}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="shop-field shop-field-wide">
                      <span>Mode de livraison</span>
                      <div className="shop-shipping-combobox">
                        {customerCountry.trim().length === 0 ? (
                          <div className="shop-shipping-mode-empty">Choisissez d'abord un pays</div>
                        ) : isUnsupportedShippingCountry ? (
                          <div className="shop-shipping-mode-empty">
                            Aucun mode de livraison disponible pour ce pays
                          </div>
                        ) : (
                          <>
                            <button
                              className={`shop-shipping-combobox-trigger${isShippingModeMenuOpen ? " open" : ""}`}
                              type="button"
                              onClick={() =>
                                setIsShippingModeMenuOpen((currentValue) => !currentValue)
                              }
                              disabled={!canAccessClientStep}
                              aria-haspopup="listbox"
                              aria-expanded={isShippingModeMenuOpen}
                            >
                              <span>
                                {selectedShippingOptionLabel || "Sélectionnez un mode de livraison"}
                              </span>
                              <span className="shop-shipping-combobox-arrow" aria-hidden="true">
                                ▾
                              </span>
                            </button>

                            {isShippingModeMenuOpen ? (
                              <div
                                className="shop-shipping-combobox-menu"
                                role="listbox"
                                aria-label="Mode de livraison"
                              >
                                {shippingOptions.map((option) => {
                                  const isSuspended = isShopShippingOptionSuspended(
                                    shopConfig,
                                    option.id,
                                  );
                                  const isActive = shippingModeId === option.id;

                                  return (
                                    <button
                                      key={option.id}
                                      className={`shop-shipping-mode-option${isActive ? " active" : ""}`}
                                      type="button"
                                      role="option"
                                      aria-selected={isActive}
                                      onClick={() => {
                                        if (isSuspended) {
                                          return;
                                        }

                                        setShippingModeId(option.id);
                                        setIsShippingModeMenuOpen(false);
                                      }}
                                      disabled={isSuspended}
                                    >
                                      <span className="shop-shipping-mode-copy">
                                        <strong>
                                          {formatShippingOptionDisplay(
                                            option.label,
                                            option.provider,
                                          )}
                                        </strong>
                                        <span>
                                          {formatShopPriceFromCents(
                                            getShopEffectiveShippingPriceCents(
                                              shopConfig,
                                              productPriceCents,
                                              option.priceCents,
                                            ),
                                          )}
                                        </span>
                                      </span>
                                      {isSuspended ? (
                                        <span className="shop-shipping-mode-unavailable">
                                          Indisponible temporairement
                                        </span>
                                      ) : null}
                                    </button>
                                  );
                                })}
                              </div>
                            ) : null}
                          </>
                        )}
                      </div>
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
                        {formatShippingOptionDisplay(
                          selectedShippingOption.label,
                          selectedShippingOption.provider,
                        )}{" "}
                        · {shippingPriceLabel}
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
                            {isRelaySelectorOpen
                              ? "Actualiser la recherche"
                              : "Sélectionner mon point relais"}
                          </button>
                          {isRelaySelectorOpen ? (
                            <div className="shop-relay-widget-shell">
                              <input id={SHOP_MONDIAL_RELAY_TARGET_ID} type="hidden" readOnly />
                              <input
                                id={SHOP_MONDIAL_RELAY_TARGET_DISPLAY_ID}
                                type="hidden"
                                readOnly
                              />
                              <div id={SHOP_MONDIAL_RELAY_TARGET_INFO_ID} hidden />
                              {isRelayWidgetLoading ? (
                                <p className="shop-relay-hint">
                                  Chargement du widget Mondial Relay...
                                </p>
                              ) : null}
                              <div
                                id={SHOP_MONDIAL_RELAY_WIDGET_ID}
                                className="shop-relay-widget"
                              />
                            </div>
                          ) : null}
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
                      <p>{shopConfig.shipping.unsupportedMessage}</p>
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

              <article
                className={getOrderStepClassName(isGlobalStepConfirmed, canAccessGlobalStep)}
              >
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
                      <p>{solifloreChoiceLabel || "Usage soliflore à confirmer"}</p>
                      <p>Contenant : {selectedWaterproofInsertLabel}</p>
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
                            {formatShippingOptionDisplay(
                              selectedShippingOption.label,
                              selectedShippingOption.provider,
                            )}
                          </p>
                          <p>{shippingPriceLabel}</p>
                        </>
                      ) : (
                        <p>{shopConfig.shipping.unsupportedMessage}</p>
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
                    <button
                      className="shop-button shop-button-accent"
                      type="button"
                      onClick={() => setIsGlobalStepConfirmed(true)}
                    >
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
                      <button
                        className="shop-button shop-button-primary"
                        type="submit"
                        disabled={isStartingCheckout}
                      >
                        {isStartingCheckout
                          ? "Ouverture de Stripe..."
                          : "Accéder au paiement sécurisé"}
                      </button>
                    </>
                  ) : !canOrder ? (
                    <span className="shop-step-hint">
                      Le paiement est momentanément indisponible : {shopConfig.shopStatus.label}.
                    </span>
                  ) : (
                    <span className="shop-step-hint">Validez d'abord la confirmation globale</span>
                  )}
                </div>
              </article>

              <p className="shop-form-note shop-form-note-footer">
                Copyright © 2026 - Vaso-Shop - Klm
              </p>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
