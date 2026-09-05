#!/usr/bin/env python3

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
import hashlib
from datetime import datetime
from pathlib import Path
import tkinter as tk
from tkinter import filedialog, messagebox, simpledialog, ttk
from urllib import error as urllib_error
from urllib import parse as urllib_parse
from urllib import request as urllib_request

try:
    from PIL import Image, ImageOps
except ImportError:  # pragma: no cover - fallback runtime only
    Image = None
    ImageOps = None

try:
    from PIL import ImageTk
except ImportError:  # pragma: no cover - fallback runtime only
    ImageTk = None


CONFIG_RELATIVE_PATH = Path("public") / "config" / "shop-config.json"


def find_repo_root() -> Path:
    candidates: list[Path] = []

    env_root = os.environ.get("VASO_SHOP_ROOT", "").strip()
    if env_root:
        candidates.append(Path(env_root))

    candidates.append(Path.cwd())

    script_path = Path(__file__).resolve()
    if getattr(sys, "frozen", False):
        executable_path = Path(sys.executable).resolve()
        candidates.extend(reversed(executable_path.parents))
    else:
        candidates.extend(script_path.parents)

    seen: set[Path] = set()
    for candidate in candidates:
        try:
            resolved = candidate.resolve()
        except OSError:
            continue
        if resolved in seen:
            continue
        seen.add(resolved)
        if (resolved / CONFIG_RELATIVE_PATH).exists():
            return resolved

    return script_path.parents[1]


REPO_ROOT = find_repo_root()
CONFIG_PATH = REPO_ROOT / "public" / "config" / "shop-config.json"
HERO_DIR = REPO_ROOT / "public" / "images" / "hero"
CONTAINERS_DIR = REPO_ROOT / "public" / "images" / "containers"
ADMIN_SETTINGS_PATH = REPO_ROOT / "admin" / ".vaso_admin_settings.json"
PUBLISH_PATHS = ["public/config/shop-config.json", "public/images/hero", "public/images/containers", "admin"]
DEFAULT_ORDERS_API_URL = "https://vaso-shop.netlify.app/.netlify/functions/list-orders"
DEFAULT_DISCORD_TEST_API_URL = "https://vaso-shop.netlify.app/.netlify/functions/send-discord-test"
DEFAULT_HERO_TRANSITION_MS = 8200
DEFAULT_HERO_FADE_IN_MS = 3200
DEFAULT_HERO_FADE_OUT_MS = 3200
HERO_PREVIEW_SIZE = (400, 520)
DEFAULT_PRINTER_PROFILES = [
    {"name": "Alfawise U30", "width": 220, "depth": 220, "height": 250},
    {"name": "Ender 5 Pro", "width": 220, "depth": 220, "height": 300},
    {"name": "Ender 5-S1", "width": 220, "depth": 220, "height": 280},
    {"name": "Creality CR-10S", "width": 300, "depth": 300, "height": 400},
    {"name": "Bambu Lab A1 Mini", "width": 180, "depth": 180, "height": 180},
    {"name": "Bambu Lab A1", "width": 256, "depth": 256, "height": 256},
    {"name": "Bambu Lab P1S", "width": 256, "depth": 256, "height": 256},
    {"name": "Prusa MINI+", "width": 180, "depth": 180, "height": 180},
    {"name": "Prusa MK4S", "width": 250, "depth": 210, "height": 220},
    {"name": "Prusa CORE One", "width": 250, "depth": 220, "height": 270},
    {"name": "Creality Ender-3 V3 SE", "width": 220, "depth": 220, "height": 250},
    {"name": "Creality Ender-3 V3 KE", "width": 220, "depth": 220, "height": 240},
    {"name": "Creality K1C", "width": 220, "depth": 220, "height": 250},
    {"name": "ELEGOO Neptune 4 Pro", "width": 225, "depth": 225, "height": 265},
]

THEMES = {
    "[Sombre] Midnight Garage": dict(
        BG="#151515", PANEL="#1F1F1F", FIELD="#2A2A2A",
        FG="#EAEAEA", FIELD_FG="#F0F0F0", ACCENT="#FF9800"
    ),
    "[Sombre] AIR-KLM Night flight": dict(
        BG="#0B1E2D", PANEL="#102A3D", FIELD="#16384F",
        FG="#EAF6FF", FIELD_FG="#FFFFFF", ACCENT="#00A1DE"
    ),
    "[Sombre] Café Serré": dict(
        BG="#1B120C", PANEL="#2A1C14", FIELD="#3A281D",
        FG="#F2E6D8", FIELD_FG="#FFF4E6", ACCENT="#C28E5C"
    ),
    "[Sombre] Matrix Déjà Vu": dict(
        BG="#000A00", PANEL="#001F00", FIELD="#003300",
        FG="#00FF66", FIELD_FG="#66FF99", ACCENT="#00FF00"
    ),
    "[Sombre] Miami Vice 1987": dict(
        BG="#14002E", PANEL="#2B0057", FIELD="#004D4D",
        FG="#FFF0FF", FIELD_FG="#FFFFFF", ACCENT="#00FFD5"
    ),
    "[Sombre] Cyber Licorne": dict(
        BG="#1A0026", PANEL="#2E004F", FIELD="#3D0066",
        FG="#F6E7FF", FIELD_FG="#FFFFFF", ACCENT="#FF2CF7"
    ),
    "[Clair] AIR-KLM Day flight": dict(
        BG="#EAF6FF", PANEL="#D6EEF9", FIELD="#FFFFFF",
        FG="#0B2A3F", FIELD_FG="#0B2A3F", ACCENT="#00A1DE"
    ),
    "[Clair] Matin Brumeux": dict(
        BG="#E6E7E8", PANEL="#D4D7DB", FIELD="#FFFFFF",
        FG="#1E1F22", FIELD_FG="#1E1F22", ACCENT="#6B7C93"
    ),
    "[Clair] Latte Vanille": dict(
        BG="#FAF6F1", PANEL="#EFE6DC", FIELD="#FFFFFF",
        FG="#3D2E22", FIELD_FG="#3D2E22", ACCENT="#D8B892"
    ),
    "[Clair] Miellerie La Divette": dict(
        BG="#E6B65C", PANEL="#F5E6CC", FIELD="#FFFFFF",
        FG="#50371A", FIELD_FG="#50371A", ACCENT="#F2B705"
    ),
    "[Pouêt] Chewing-gum Océan": dict(
        BG="#00A6C8", PANEL="#0083A1", FIELD="#00C7B7",
        FG="#082026", FIELD_FG="#082026", ACCENT="#FF4FD8"
    ),
    "[Pouêt] Pamplemousse": dict(
        BG="#FF4A1C", PANEL="#E63B10", FIELD="#FF7A00",
        FG="#1A0B00", FIELD_FG="#1A0B00", ACCENT="#00E5FF"
    ),
    "[Pouêt] Raisin Toxique": dict(
        BG="#7A00FF", PANEL="#5B00C9", FIELD="#B000FF",
        FG="#0F001A", FIELD_FG="#0F001A", ACCENT="#39FF14"
    ),
    "[Pouêt] Citron qui pique": dict(
        BG="#FFF200", PANEL="#E6D800", FIELD="#FFF7A6",
        FG="#1A1A00", FIELD_FG="#1A1A00", ACCENT="#0066FF"
    ),
    "[Pouêt] Barbie Apocalypse": dict(
        BG="#FF1493", PANEL="#004D40", FIELD="#1B5E20",
        FG="#E8FFF8", FIELD_FG="#FFFFFF", ACCENT="#FFEB3B"
    ),
    "[Pouêt] Compagnie Créole": dict(
        BG="#8B3A1A", PANEL="#F2C94C", FIELD="#FFFFFF",
        FG="#5A2E0C", FIELD_FG="#5A2E0C", ACCENT="#8B3A1A"
    ),
}

SHOP_STATUS_LABELS = {
    "open": "Boutique ouverte",
    "slowed": "Boutique ralentie",
    "holiday": "Vacances",
    "closed": "Fermeture temporaire",
}

SHOP_STATUS_CODES_BY_LABEL = {label: code for code, label in SHOP_STATUS_LABELS.items()}
SHIPPING_MODE_LABELS = {
    "relay": "Point relais",
    "home": "Livraison à domicile",
    "pickup": "Retrait à l'Atelier Vaso",
}
SHIPPING_MODE_PROVIDERS = {
    "relay": "Mondial Relay",
    "home": "Mondial Relay Domicile",
    "pickup": "À 45 minutes au nord de Rennes / Ille-et-Vilaine",
}
TOKEN_HELP_TEXT = "Collez ici la valeur de: Environment variables/ADMIN_ORDERS_TOKEN"


class Tooltip:
    def __init__(self, widget: tk.Widget, text: str) -> None:
        self.widget = widget
        self.text = text
        self.window: tk.Toplevel | None = None
        widget.bind("<Enter>", self.show)
        widget.bind("<Leave>", self.hide)

    def show(self, _event: tk.Event | None = None) -> None:
        if self.window is not None:
            return

        x = self.widget.winfo_rootx() + 16
        y = self.widget.winfo_rooty() + self.widget.winfo_height() + 8
        self.window = tk.Toplevel(self.widget)
        self.window.wm_overrideredirect(True)
        self.window.wm_geometry(f"+{x}+{y}")
        label = ttk.Label(
            self.window,
            text=self.text,
            padding=(10, 6),
            relief="solid",
            borderwidth=1,
            background="#fff8ec",
        )
        label.pack()

    def hide(self, _event: tk.Event | None = None) -> None:
        if self.window is None:
            return

        self.window.destroy()
        self.window = None


class VasoAdminApp(tk.Tk):
    def __init__(self) -> None:
        super().__init__()
        self.title("VASO-Admin")
        self.geometry("1140x760")
        self.minsize(980, 680)
        self.protocol("WM_DELETE_WINDOW", self.on_close)

        self.config_data = self.load_config()
        self.settings_data = self.load_settings()
        self.style = ttk.Style(self)
        self.style.theme_use("clam")

        self.status_state_var = tk.StringVar()
        self.status_state_display_var = tk.StringVar()
        self.status_label_var = tk.StringVar()
        self.status_message_var = tk.StringVar()
        self.status_allow_checkout_var = tk.BooleanVar()
        self.shipping_suspend_relay_var = tk.BooleanVar()
        self.shipping_suspend_home_var = tk.BooleanVar()
        self.shipping_lead_time_var = tk.StringVar()
        self.shipping_country_var = tk.StringVar()
        self.shipping_option_id_var = tk.StringVar()
        self.shipping_option_label_var = tk.StringVar()
        self.shipping_option_provider_var = tk.StringVar()
        self.shipping_option_euros_var = tk.StringVar()
        self.shipping_option_cents_var = tk.StringVar()
        self.shipping_option_preview_var = tk.StringVar()
        self.temporary_notice_var = tk.StringVar()
        self.contact_prompt_var = tk.StringVar()
        self.contact_button_label_var = tk.StringVar()
        self.contact_email_var = tk.StringVar()
        self.contact_email_subject_var = tk.StringVar()

        self.price_euros_var = tk.StringVar()
        self.price_cents_var = tk.StringVar()
        self.price_preview_var = tk.StringVar()
        self.printer_enforce_var = tk.BooleanVar()
        self.printer_active_profile_var = tk.StringVar()
        self.printer_name_var = tk.StringVar()
        self.printer_width_var = tk.StringVar()
        self.printer_depth_var = tk.StringVar()
        self.printer_height_var = tk.StringVar()

        self.color_id_var = tk.StringVar()
        self.color_label_var = tk.StringVar()
        self.color_hex_var = tk.StringVar()
        self.color_available_var = tk.BooleanVar()

        self.hero_enabled_var = tk.BooleanVar()
        self.hero_path_var = tk.StringVar()
        self.hero_transition_ms_var = tk.StringVar()
        self.hero_fade_in_ms_var = tk.StringVar()
        self.hero_fade_out_ms_var = tk.StringVar()
        self.hero_preview_status_var = tk.StringVar(value="Selectionnez une image hero")
        self.container_enabled_var = tk.BooleanVar()
        self.container_path_var = tk.StringVar()
        self.container_label_var = tk.StringVar()
        self.container_alt_var = tk.StringVar()
        self.container_order_var = tk.StringVar()
        self.container_preview_status_var = tk.StringVar(value="Selectionnez une photo de contenant")

        self.commit_message_var = tk.StringVar(value=self.build_default_commit_message())
        self.skip_netlify_deploy_var = tk.BooleanVar(
            value=bool(self.settings_data.get("skip_netlify_deploy", True)),
        )
        self.remember_admin_token_var = tk.BooleanVar(
            value=bool(self.settings_data.get("remember_admin_token", False)),
        )
        self.orders_api_url_var = tk.StringVar(
            value=self.settings_data.get("orders_api_url") or DEFAULT_ORDERS_API_URL,
        )
        self.theme_name_var = tk.StringVar(
            value=self.settings_data.get("theme", next(iter(THEMES))),
        )
        self.session_auth_status_var = tk.StringVar(value="Token Netlify non renseigné")
        self.session_admin_token = (
            self.settings_data.get("admin_orders_token", "").strip()
            if self.remember_admin_token_var.get()
            else ""
        )
        if self.session_admin_token:
            self.session_auth_status_var.set("Token Netlify mémorisé")
        self.admin_access_password_hash = self.settings_data.get("admin_access_password_hash", "")
        self.orders_data: list[dict] = []

        self.active_theme = THEMES[self.theme_name_var.get()] if self.theme_name_var.get() in THEMES else next(iter(THEMES.values()))
        self.hero_preview_photo = None
        self.container_preview_photo = None
        self.hero_preview_temp_path = Path(tempfile.gettempdir()) / "vaso-admin-hero-preview.png"
        self.container_preview_temp_path = Path(tempfile.gettempdir()) / "vaso-admin-container-preview.png"
        self.hero_preview_cycle_after_id = None
        self.hero_preview_frame_after_id = None
        self.hero_preview_is_animating = False
        self.hero_preview_current_index = 0

        self.price_euros_var.trace_add("write", lambda *_args: self.update_price_preview())
        self.price_cents_var.trace_add("write", lambda *_args: self.update_price_preview())
        self.shipping_option_euros_var.trace_add("write", lambda *_args: self.update_shipping_price_preview())
        self.shipping_option_cents_var.trace_add("write", lambda *_args: self.update_shipping_price_preview())

        self.build_ui()
        self.populate_form()
        self.apply_theme(self.theme_name_var.get())
        self.withdraw()
        self.after(120, self.prompt_admin_access_password)

    def load_config(self) -> dict:
        with CONFIG_PATH.open("r", encoding="utf-8") as handle:
            return json.load(handle)

    def hash_admin_access_password(self, password: str) -> str:
        return hashlib.sha256(password.encode("utf-8")).hexdigest()

    def prompt_new_admin_access_password(self) -> bool:
        password = simpledialog.askstring(
            "VASO-Admin",
            "Crée le mot de passe local Vaso-admin :",
            parent=self,
            show="*",
        )
        if password is None:
            return False

        cleaned_password = password.strip()
        if not cleaned_password:
            messagebox.showerror("VASO-Admin", "Le mot de passe Vaso-admin ne peut pas être vide.")
            return False

        confirmation = simpledialog.askstring(
            "VASO-Admin",
            "Confirme le mot de passe local Vaso-admin :",
            parent=self,
            show="*",
        )
        if confirmation is None or confirmation.strip() != cleaned_password:
            messagebox.showerror("VASO-Admin", "Les deux mots de passe ne correspondent pas.")
            return False

        self.admin_access_password_hash = self.hash_admin_access_password(cleaned_password)
        self.save_settings()
        return True

    def prompt_admin_access_password(self) -> None:
        if not self.admin_access_password_hash:
            if not self.prompt_new_admin_access_password():
                self.destroy()
                return

        for attempt_index in range(3):
            password = simpledialog.askstring(
                "VASO-Admin",
                "Renseigne le mot de passe Vaso-admin :",
                parent=self,
                show="*",
            )
            if password is None:
                self.destroy()
                return

            if self.hash_admin_access_password(password.strip()) == self.admin_access_password_hash:
                self.deiconify()
                self.lift()
                return

            remaining_attempts = 2 - attempt_index
            if remaining_attempts > 0:
                messagebox.showerror(
                    "VASO-Admin",
                    f"Mot de passe Vaso-admin incorrect. {remaining_attempts} tentative(s) restante(s).",
                )

        messagebox.showerror("VASO-Admin", "Mot de passe Vaso-admin incorrect.")
        self.destroy()

    def load_settings(self) -> dict:
        if not ADMIN_SETTINGS_PATH.exists():
            return {}

        try:
            with ADMIN_SETTINGS_PATH.open("r", encoding="utf-8") as handle:
                return json.load(handle)
        except (OSError, json.JSONDecodeError):
            return {}

    def save_settings(self) -> None:
        ADMIN_SETTINGS_PATH.parent.mkdir(parents=True, exist_ok=True)
        with ADMIN_SETTINGS_PATH.open("w", encoding="utf-8") as handle:
            json.dump(
                {
                    "theme": self.theme_name_var.get(),
                    "orders_api_url": self.orders_api_url_var.get().strip(),
                    "skip_netlify_deploy": bool(self.skip_netlify_deploy_var.get()),
                    "remember_admin_token": bool(self.remember_admin_token_var.get()),
                    "admin_orders_token": (
                        self.session_admin_token if self.remember_admin_token_var.get() else ""
                    ),
                    "admin_access_password_hash": self.admin_access_password_hash,
                },
                handle,
                indent=2,
                ensure_ascii=False,
            )
            handle.write("\n")

    def save_config(self) -> None:
        self.collect_form()
        CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
        with CONFIG_PATH.open("w", encoding="utf-8") as handle:
            json.dump(self.config_data, handle, indent=2, ensure_ascii=False)
            handle.write("\n")
        self.log(f"Configuration sauvegardee dans {CONFIG_PATH.relative_to(REPO_ROOT)}")

    def build_default_commit_message(self) -> str:
        return f"Met a jour la configuration boutique - {datetime.now().strftime('%Y-%m-%d %H:%M')}"

    def build_ui(self) -> None:
        toolbar = ttk.Frame(self, padding=(10, 10, 10, 0))
        toolbar.pack(fill="x")

        self.theme_selector = ttk.Combobox(
            toolbar,
            textvariable=self.theme_name_var,
            values=list(THEMES.keys()),
            state="readonly",
            width=30,
        )
        self.theme_selector.pack(side="right", padx=(8, 0))
        ttk.Label(toolbar, text="Thème").pack(side="right")
        self.theme_selector.bind("<<ComboboxSelected>>", lambda _event: self.on_theme_change())
        self.notebook = ttk.Notebook(self)
        notebook = self.notebook
        notebook.pack(fill="both", expand=True, padx=10, pady=10)

        self.general_frame = ttk.Frame(notebook, padding=8)
        self.pricing_frame = ttk.Frame(notebook, padding=8)
        self.shipping_frame = ttk.Frame(notebook, padding=8)
        self.contact_frame = ttk.Frame(notebook, padding=8)
        self.printer_frame = ttk.Frame(notebook, padding=8)
        self.colors_frame = ttk.Frame(notebook, padding=8)
        self.hero_frame = ttk.Frame(notebook, padding=8)
        self.containers_frame = ttk.Frame(notebook, padding=8)
        self.orders_frame = ttk.Frame(notebook, padding=8)
        self.publish_frame = ttk.Frame(notebook, padding=8)

        notebook.add(self.general_frame, text="Boutique")
        notebook.add(self.pricing_frame, text="Tarifs")
        notebook.add(self.shipping_frame, text="Livraison")
        notebook.add(self.contact_frame, text="Contact courriel")
        notebook.add(self.printer_frame, text="Imprimante")
        notebook.add(self.colors_frame, text="Couleurs")
        notebook.add(self.hero_frame, text="Hero")
        notebook.add(self.containers_frame, text="Contenants")
        notebook.add(self.orders_frame, text="Commandes")
        notebook.add(self.publish_frame, text="Publication")

        self.build_general_tab()
        self.build_pricing_tab()
        self.build_shipping_tab()
        self.build_contact_tab()
        self.build_printer_tab()
        self.build_colors_tab()
        self.build_hero_tab()
        self.build_containers_tab()
        self.build_orders_tab()
        self.build_publish_tab()

        self.tk_text_widgets = [
            self.status_message_text,
            self.temporary_notice_text,
            self.atelier_note_text,
            self.material_pla_note_text,
            self.warning_text,
            self.color_preview_note_text,
            self.contact_email_body_text,
            self.orders_detail_text,
            self.output_text,
            self.shipping_unsupported_text,
        ]
        self.tk_listbox_widgets = [
            self.colors_listbox,
            self.hero_listbox,
            self.orders_listbox,
            self.shipping_countries_listbox,
            self.shipping_options_listbox,
            self.containers_listbox,
        ]

    def build_general_tab(self) -> None:
        frame = self.general_frame
        frame.columnconfigure(1, weight=1)

        ttk.Label(frame, text="Etat boutique").grid(row=0, column=0, sticky="w")
        ttk.Combobox(
            frame,
            textvariable=self.status_state_display_var,
            values=list(SHOP_STATUS_LABELS.values()),
            state="readonly",
        ).grid(row=0, column=1, sticky="ew", pady=4)

        ttk.Label(frame, text="Libelle etat").grid(row=1, column=0, sticky="w")
        ttk.Entry(frame, textvariable=self.status_label_var).grid(row=1, column=1, sticky="ew", pady=4)

        ttk.Label(frame, text="Message etat").grid(row=2, column=0, sticky="nw")
        self.status_message_text = tk.Text(frame, height=1, wrap="word")
        self.status_message_text.grid(row=2, column=1, sticky="nsew", pady=4)

        ttk.Checkbutton(
          frame,
          text="Autoriser les commandes",
          variable=self.status_allow_checkout_var,
        ).grid(row=3, column=1, sticky="w", pady=(0, 8))

        ttk.Checkbutton(
          frame,
          text="Suspendre le service mondial relais",
          variable=self.shipping_suspend_relay_var,
        ).grid(row=4, column=1, sticky="w", pady=(0, 4))

        ttk.Checkbutton(
          frame,
          text="Suspendre livraison à domicile",
          variable=self.shipping_suspend_home_var,
        ).grid(row=5, column=1, sticky="w", pady=(0, 8))

        ttk.Label(frame, text="Delai expedition").grid(row=6, column=0, sticky="w")
        ttk.Entry(frame, textvariable=self.shipping_lead_time_var).grid(row=6, column=1, sticky="ew", pady=4)

        ttk.Label(frame, text="Message temporaire").grid(row=7, column=0, sticky="nw")
        self.temporary_notice_text = tk.Text(frame, height=1, wrap="word")
        self.temporary_notice_text.grid(row=7, column=1, sticky="nsew", pady=4)

        ttk.Label(frame, text="Texte atelier").grid(row=8, column=0, sticky="nw")
        atelier_frame = ttk.Frame(frame)
        atelier_frame.grid(row=8, column=1, sticky="ew", pady=4)
        atelier_frame.columnconfigure(0, weight=1)
        atelier_frame.rowconfigure(0, weight=1)
        self.atelier_note_text = tk.Text(atelier_frame, height=4, wrap="word")
        self.atelier_note_text.grid(row=0, column=0, sticky="ew")
        self.atelier_note_scrollbar = ttk.Scrollbar(atelier_frame, orient="vertical", command=self.atelier_note_text.yview)
        self.atelier_note_scrollbar.grid(row=0, column=1, sticky="ns")
        self.atelier_note_text.configure(yscrollcommand=self.atelier_note_scrollbar.set)

        ttk.Label(frame, text="Matière PLA").grid(row=9, column=0, sticky="nw")
        material_frame = ttk.Frame(frame)
        material_frame.grid(row=9, column=1, sticky="ew", pady=4)
        material_frame.columnconfigure(0, weight=1)
        material_frame.rowconfigure(0, weight=1)
        self.material_pla_note_text = tk.Text(material_frame, height=3, wrap="word")
        self.material_pla_note_text.grid(row=0, column=0, sticky="ew")
        self.material_pla_note_scrollbar = ttk.Scrollbar(
            material_frame,
            orient="vertical",
            command=self.material_pla_note_text.yview,
        )
        self.material_pla_note_scrollbar.grid(row=0, column=1, sticky="ns")
        self.material_pla_note_text.configure(yscrollcommand=self.material_pla_note_scrollbar.set)

        ttk.Label(frame, text="Avertissement PLA").grid(row=10, column=0, sticky="nw")
        warning_frame = ttk.Frame(frame)
        warning_frame.grid(row=10, column=1, sticky="ew", pady=4)
        warning_frame.columnconfigure(0, weight=1)
        warning_frame.rowconfigure(0, weight=1)
        self.warning_text = tk.Text(warning_frame, height=4, wrap="word")
        self.warning_text.grid(row=0, column=0, sticky="ew")
        self.warning_scrollbar = ttk.Scrollbar(warning_frame, orient="vertical", command=self.warning_text.yview)
        self.warning_scrollbar.grid(row=0, column=1, sticky="ns")
        self.warning_text.configure(yscrollcommand=self.warning_scrollbar.set)

        ttk.Label(frame, text="Avertissement couleur").grid(row=11, column=0, sticky="nw")
        color_note_frame = ttk.Frame(frame)
        color_note_frame.grid(row=11, column=1, sticky="ew", pady=4)
        color_note_frame.columnconfigure(0, weight=1)
        color_note_frame.rowconfigure(0, weight=1)
        self.color_preview_note_text = tk.Text(color_note_frame, height=3, wrap="word")
        self.color_preview_note_text.grid(row=0, column=0, sticky="ew")
        self.color_preview_note_scrollbar = ttk.Scrollbar(
            color_note_frame,
            orient="vertical",
            command=self.color_preview_note_text.yview,
        )
        self.color_preview_note_scrollbar.grid(row=0, column=1, sticky="ns")
        self.color_preview_note_text.configure(yscrollcommand=self.color_preview_note_scrollbar.set)

        frame.rowconfigure(2, weight=0)
        frame.rowconfigure(7, weight=0)
        frame.rowconfigure(8, weight=0)
        frame.rowconfigure(9, weight=0)
        frame.rowconfigure(10, weight=0)
        frame.rowconfigure(11, weight=0)

    def build_contact_tab(self) -> None:
        frame = self.contact_frame
        frame.columnconfigure(1, weight=1)

        ttk.Label(frame, text="Question contact").grid(row=0, column=0, sticky="w")
        ttk.Entry(frame, textvariable=self.contact_prompt_var).grid(row=0, column=1, sticky="ew", pady=4)

        ttk.Label(frame, text="Libelle bouton contact").grid(row=1, column=0, sticky="w")
        ttk.Entry(frame, textvariable=self.contact_button_label_var).grid(row=1, column=1, sticky="ew", pady=4)

        ttk.Label(frame, text="E-mail contact").grid(row=2, column=0, sticky="w")
        ttk.Entry(frame, textvariable=self.contact_email_var).grid(row=2, column=1, sticky="ew", pady=4)

        ttk.Label(frame, text="Sujet contact").grid(row=3, column=0, sticky="w")
        ttk.Entry(frame, textvariable=self.contact_email_subject_var).grid(row=3, column=1, sticky="ew", pady=4)

        ttk.Label(frame, text="Corps contact").grid(row=4, column=0, sticky="nw")
        self.contact_email_body_text = tk.Text(frame, height=5, wrap="word")
        self.contact_email_body_text.grid(row=4, column=1, sticky="ew", pady=4)

    def build_pricing_tab(self) -> None:
        frame = self.pricing_frame
        frame.columnconfigure(0, weight=1)
        frame.rowconfigure(0, weight=1)
        frame.rowconfigure(2, weight=0)

        pricing_block = ttk.LabelFrame(frame, text="Tarif affiche dans la boutique", padding=14)
        pricing_block.grid(row=1, column=0, sticky="n", pady=(8, 12))
        pricing_block.columnconfigure(1, weight=1)

        ttk.Label(pricing_block, text="Prix").grid(row=0, column=0, sticky="w")
        price_row = ttk.Frame(pricing_block)
        price_row.grid(row=0, column=1, sticky="w", pady=4)
        ttk.Entry(price_row, textvariable=self.price_euros_var, width=8).pack(side="left")
        ttk.Label(price_row, text="€").pack(side="left", padx=(6, 4))
        ttk.Label(price_row, text=",").pack(side="left", padx=(0, 4))
        ttk.Entry(price_row, textvariable=self.price_cents_var, width=4).pack(side="left")
        ttk.Label(price_row, text="Aperçu shop").pack(side="left", padx=(16, 6))
        ttk.Entry(
            price_row,
            textvariable=self.price_preview_var,
            width=14,
            state="readonly",
        ).pack(side="left")

        discord_test_frame = ttk.LabelFrame(frame, text="Test message alerte commande Discord", padding=14)
        discord_test_frame.grid(row=2, column=0, sticky="n", pady=(0, 8))
        discord_test_frame.columnconfigure(0, weight=1)

        ttk.Label(
            discord_test_frame,
            text=(
                "Envoie un message clairement marque comme test vers Discord.\n"
                "Aucune commande reelle n'est creee et rien n'est ajoute aux commandes."
            ),
            justify="left",
            wraplength=520,
        ).grid(row=0, column=0, sticky="w", pady=(0, 10))

        self.discord_test_button = ttk.Button(
            discord_test_frame,
            text="Envoyer un test Discord",
            command=self.send_discord_test_message,
        )
        self.discord_test_button.grid(row=1, column=0, sticky="w")

    def build_shipping_tab(self) -> None:
        frame = self.shipping_frame
        frame.columnconfigure(0, weight=0)
        frame.columnconfigure(1, weight=0)
        frame.columnconfigure(2, weight=1)
        frame.rowconfigure(0, weight=1)

        countries_panel = ttk.Frame(frame)
        countries_panel.grid(row=0, column=0, sticky="nsw", padx=(0, 12))
        countries_panel.rowconfigure(1, weight=1)

        ttk.Label(countries_panel, text="Pays").grid(row=0, column=0, sticky="w", pady=(0, 4))
        self.shipping_countries_listbox = tk.Listbox(countries_panel, width=28, exportselection=False)
        self.shipping_countries_listbox.grid(row=1, column=0, sticky="nsew")
        self.shipping_countries_listbox.bind(
            "<<ListboxSelect>>",
            lambda _event: self.load_selected_shipping_country(),
        )

        country_buttons = ttk.Frame(countries_panel)
        country_buttons.grid(row=2, column=0, sticky="ew", pady=(8, 0))
        ttk.Button(country_buttons, text="Ajouter", command=self.add_shipping_country).grid(row=0, column=0, sticky="ew")
        ttk.Button(country_buttons, text="Supprimer", command=self.remove_shipping_country).grid(row=0, column=1, sticky="ew", padx=4)
        ttk.Button(country_buttons, text="Monter", command=lambda: self.move_shipping_country(-1)).grid(row=1, column=0, sticky="ew", pady=(4, 0))
        ttk.Button(country_buttons, text="Descendre", command=lambda: self.move_shipping_country(1)).grid(row=1, column=1, sticky="ew", padx=4, pady=(4, 0))

        options_panel = ttk.Frame(frame)
        options_panel.grid(row=0, column=1, sticky="nsw", padx=(0, 12))
        options_panel.rowconfigure(1, weight=1)

        ttk.Label(options_panel, text="Modes").grid(row=0, column=0, sticky="w", pady=(0, 4))
        self.shipping_options_listbox = tk.Listbox(options_panel, width=34, exportselection=False)
        self.shipping_options_listbox.grid(row=1, column=0, sticky="nsew")
        self.shipping_options_listbox.bind(
            "<<ListboxSelect>>",
            lambda _event: self.load_selected_shipping_option(),
        )

        option_buttons = ttk.Frame(options_panel)
        option_buttons.grid(row=2, column=0, sticky="ew", pady=(8, 0))
        ttk.Button(option_buttons, text="Ajouter", command=self.add_shipping_option).grid(row=0, column=0, sticky="ew")
        ttk.Button(option_buttons, text="Supprimer", command=self.remove_shipping_option).grid(row=0, column=1, sticky="ew", padx=4)
        ttk.Button(option_buttons, text="Monter", command=lambda: self.move_shipping_option(-1)).grid(row=1, column=0, sticky="ew", pady=(4, 0))
        ttk.Button(option_buttons, text="Descendre", command=lambda: self.move_shipping_option(1)).grid(row=1, column=1, sticky="ew", padx=4, pady=(4, 0))

        editor = ttk.Frame(frame)
        editor.grid(row=0, column=2, sticky="nsew")
        editor.columnconfigure(1, weight=1)

        ttk.Label(editor, text="Pays").grid(row=0, column=0, sticky="w")
        ttk.Entry(editor, textvariable=self.shipping_country_var).grid(row=0, column=1, sticky="ew", pady=4)
        ttk.Button(editor, text="Appliquer pays", command=self.apply_shipping_country_changes).grid(
            row=0,
            column=2,
            sticky="e",
            padx=(8, 0),
        )

        ttk.Label(editor, text="Type").grid(row=1, column=0, sticky="w")
        ttk.Combobox(
            editor,
            textvariable=self.shipping_option_id_var,
            values=list(SHIPPING_MODE_LABELS.keys()),
            state="readonly",
        ).grid(row=1, column=1, sticky="ew", pady=4)

        ttk.Label(editor, text="Libelle").grid(row=2, column=0, sticky="w")
        ttk.Entry(editor, textvariable=self.shipping_option_label_var).grid(row=2, column=1, columnspan=2, sticky="ew", pady=4)

        ttk.Label(editor, text="Transporteur").grid(row=3, column=0, sticky="w")
        ttk.Entry(editor, textvariable=self.shipping_option_provider_var).grid(row=3, column=1, columnspan=2, sticky="ew", pady=4)

        ttk.Label(editor, text="Prix").grid(row=4, column=0, sticky="w")
        price_row = ttk.Frame(editor)
        price_row.grid(row=4, column=1, columnspan=2, sticky="w", pady=4)
        ttk.Entry(price_row, textvariable=self.shipping_option_euros_var, width=8).pack(side="left")
        ttk.Label(price_row, text="€").pack(side="left", padx=(6, 4))
        ttk.Label(price_row, text=",").pack(side="left", padx=(0, 4))
        ttk.Entry(price_row, textvariable=self.shipping_option_cents_var, width=4).pack(side="left")
        ttk.Label(price_row, text="Apercu").pack(side="left", padx=(16, 6))
        ttk.Entry(
            price_row,
            textvariable=self.shipping_option_preview_var,
            width=14,
            state="readonly",
        ).pack(side="left")

        ttk.Button(editor, text="Appliquer mode", command=self.apply_shipping_option_changes).grid(
            row=5,
            column=1,
            columnspan=2,
            sticky="e",
            pady=(8, 16),
        )

        ttk.Label(editor, text="Message pays non geres").grid(row=6, column=0, sticky="nw")
        self.shipping_unsupported_text = tk.Text(editor, height=3, wrap="word")
        self.shipping_unsupported_text.grid(row=6, column=1, columnspan=2, sticky="ew", pady=4)

    def get_shipping_config(self) -> dict:
        shipping = self.config_data.setdefault("shipping", {})
        if not isinstance(shipping.get("countries"), list):
            shipping["countries"] = []
        return shipping

    def build_colors_tab(self) -> None:
        frame = self.colors_frame
        frame.columnconfigure(1, weight=1)
        frame.rowconfigure(0, weight=1)

        left = ttk.Frame(frame)
        left.grid(row=0, column=0, sticky="nsw", padx=(0, 12))
        right = ttk.Frame(frame)
        right.grid(row=0, column=1, sticky="nsew")
        right.columnconfigure(1, weight=1)

        self.colors_listbox = tk.Listbox(left, width=36, exportselection=False)
        self.colors_listbox.pack(fill="y", expand=True)
        self.colors_listbox.bind("<<ListboxSelect>>", lambda _event: self.load_selected_color())

        button_bar = ttk.Frame(left)
        button_bar.pack(fill="x", pady=(8, 0))
        ttk.Button(button_bar, text="Ajouter", command=self.add_color).pack(side="left")
        ttk.Button(button_bar, text="Supprimer", command=self.remove_color).pack(side="left", padx=4)
        ttk.Button(button_bar, text="Monter", command=lambda: self.move_color(-1)).pack(side="left")
        ttk.Button(button_bar, text="Descendre", command=lambda: self.move_color(1)).pack(side="left", padx=4)

        ttk.Label(right, text="ID").grid(row=0, column=0, sticky="w")
        ttk.Entry(right, textvariable=self.color_id_var).grid(row=0, column=1, sticky="ew", pady=4)
        ttk.Label(right, text="Libelle").grid(row=1, column=0, sticky="w")
        ttk.Entry(right, textvariable=self.color_label_var).grid(row=1, column=1, sticky="ew", pady=4)
        ttk.Label(right, text="Couleur HEX").grid(row=2, column=0, sticky="w")
        ttk.Entry(right, textvariable=self.color_hex_var).grid(row=2, column=1, sticky="ew", pady=4)
        ttk.Checkbutton(right, text="Couleur disponible", variable=self.color_available_var).grid(
            row=3, column=1, sticky="w", pady=4
        )
        ttk.Button(right, text="Appliquer les changements", command=self.apply_color_changes).grid(
            row=4, column=1, sticky="e", pady=8
        )

    def build_printer_tab(self) -> None:
        frame = self.printer_frame
        frame.columnconfigure(1, weight=1)

        ttk.Checkbutton(
            frame,
            text="Volume imprimante",
            variable=self.printer_enforce_var,
        ).grid(row=0, column=0, columnspan=2, sticky="w", pady=(0, 8))

        ttk.Label(frame, text="Profil actif").grid(row=1, column=0, sticky="w")
        self.printer_profile_selector = ttk.Combobox(
            frame,
            textvariable=self.printer_active_profile_var,
            state="readonly",
        )
        self.printer_profile_selector.grid(row=1, column=1, sticky="ew", pady=4)
        self.printer_profile_selector.bind(
            "<<ComboboxSelected>>",
            lambda _event: self.load_selected_printer_profile(),
        )

        ttk.Label(frame, text="Nom du profil").grid(row=2, column=0, sticky="w")
        ttk.Entry(frame, textvariable=self.printer_name_var).grid(row=2, column=1, sticky="ew", pady=4)

        dims = ttk.Frame(frame)
        dims.grid(row=3, column=0, columnspan=2, sticky="ew", pady=(8, 0))
        dims.columnconfigure(1, weight=1)
        dims.columnconfigure(3, weight=1)
        dims.columnconfigure(5, weight=1)

        ttk.Label(dims, text="Largeur max (mm)").grid(row=0, column=0, sticky="w")
        ttk.Entry(dims, textvariable=self.printer_width_var, width=12).grid(row=0, column=1, sticky="ew", padx=(8, 10))
        ttk.Label(dims, text="Profondeur max (mm)").grid(row=0, column=2, sticky="w")
        ttk.Entry(dims, textvariable=self.printer_depth_var, width=12).grid(row=0, column=3, sticky="ew", padx=(8, 10))
        ttk.Label(dims, text="Hauteur max (mm)").grid(row=0, column=4, sticky="w")
        ttk.Entry(dims, textvariable=self.printer_height_var, width=12).grid(row=0, column=5, sticky="ew", padx=(8, 0))

        actions = ttk.Frame(frame)
        actions.grid(row=4, column=0, columnspan=2, sticky="w", pady=(10, 0))
        ttk.Button(actions, text="Nouveau", command=self.add_printer_profile).pack(side="left")
        ttk.Button(actions, text="Supprimer", command=self.remove_printer_profile).pack(side="left", padx=4)
        ttk.Button(actions, text="Appliquer le profil", command=self.apply_printer_profile_changes).pack(side="left", padx=4)

        help_text = (
            "Le shop reprendra ce profil actif pour limiter le volume imprimable.\n"
            "Les valeurs sont synchronisées dans la configuration JSON de la boutique."
        )
        ttk.Label(frame, text=help_text, justify="left").grid(row=5, column=0, columnspan=2, sticky="w", pady=(12, 0))

    def build_hero_tab(self) -> None:
        frame = self.hero_frame
        frame.columnconfigure(0, weight=0)
        frame.columnconfigure(1, weight=1)
        frame.columnconfigure(2, weight=0)
        frame.rowconfigure(0, weight=1)

        controls = ttk.Frame(frame)
        controls.grid(row=0, column=0, sticky="nw", padx=(0, 18))
        controls.columnconfigure(1, weight=1)
        preview = ttk.Frame(frame)
        preview.grid(row=0, column=1, sticky="n", padx=(0, 18))
        preview.columnconfigure(0, weight=1)
        list_panel = ttk.Frame(frame)
        list_panel.grid(row=0, column=2, sticky="n")
        list_panel.columnconfigure(0, weight=1)
        list_panel.rowconfigure(1, weight=1)

        ttk.Label(list_panel, text="Images hero").grid(row=0, column=0, pady=(0, 4))

        listbox_frame = ttk.Frame(list_panel)
        listbox_frame.grid(row=1, column=0, sticky="n")
        listbox_frame.columnconfigure(0, weight=1)
        listbox_frame.rowconfigure(0, weight=1)

        self.hero_listbox = tk.Listbox(
            listbox_frame,
            width=32,
            height=12,
            exportselection=False,
            xscrollcommand=lambda *args: self.hero_listbox_xscroll.set(*args),
            yscrollcommand=lambda *args: self.hero_listbox_yscroll.set(*args),
        )
        self.hero_listbox.grid(row=0, column=0, sticky="nsew")
        self.hero_listbox.bind("<<ListboxSelect>>", lambda _event: self.load_selected_hero_image())

        self.hero_listbox_yscroll = ttk.Scrollbar(listbox_frame, orient="vertical", command=self.hero_listbox.yview)
        self.hero_listbox_yscroll.grid(row=0, column=1, sticky="ns")
        self.hero_listbox_xscroll = ttk.Scrollbar(listbox_frame, orient="horizontal", command=self.hero_listbox.xview)
        self.hero_listbox_xscroll.grid(row=1, column=0, sticky="ew")

        hero_buttons = ttk.Frame(list_panel)
        hero_buttons.grid(row=2, column=0, pady=(8, 0))
        ttk.Button(hero_buttons, text="Ajouter", command=self.add_hero_images, width=14).grid(row=0, column=0, sticky="ew")
        ttk.Button(hero_buttons, text="Supprimer", command=self.remove_hero_image, width=14).grid(row=0, column=1, sticky="ew", padx=4)
        ttk.Button(hero_buttons, text="Monter", command=lambda: self.move_hero_image(-1), width=14).grid(row=1, column=0, sticky="ew", pady=(4, 0))
        ttk.Button(hero_buttons, text="Descendre", command=lambda: self.move_hero_image(1), width=14).grid(row=1, column=1, sticky="ew", padx=4, pady=(4, 0))

        ttk.Label(controls, text="Chemin publie").grid(row=0, column=0, sticky="w")
        ttk.Entry(controls, textvariable=self.hero_path_var).grid(row=0, column=1, sticky="ew", pady=4)
        ttk.Checkbutton(controls, text="Image active", variable=self.hero_enabled_var).grid(
            row=1, column=1, sticky="w", pady=4
        )
        ttk.Label(controls, text="Transition (ms)").grid(row=2, column=0, sticky="w")
        ttk.Spinbox(
            controls,
            from_=1000,
            to=60000,
            increment=200,
            textvariable=self.hero_transition_ms_var,
            width=12,
        ).grid(row=2, column=1, sticky="w", pady=4)
        ttk.Label(controls, text="Fade in (ms)").grid(row=3, column=0, sticky="w")
        ttk.Spinbox(
            controls,
            from_=0,
            to=10000,
            increment=100,
            textvariable=self.hero_fade_in_ms_var,
            width=12,
        ).grid(row=3, column=1, sticky="w", pady=4)
        ttk.Label(controls, text="Fade out (ms)").grid(row=4, column=0, sticky="w")
        ttk.Spinbox(
            controls,
            from_=0,
            to=10000,
            increment=100,
            textvariable=self.hero_fade_out_ms_var,
            width=12,
        ).grid(row=4, column=1, sticky="w", pady=4)

        actions = ttk.Frame(controls)
        actions.grid(row=5, column=0, columnspan=2, sticky="w", pady=(8, 0))
        ttk.Button(actions, text="Appliquer les changements", command=self.apply_hero_changes).pack(side="left")

        help_text = (
            "L'aperçu anime toutes les images actives avec les memes timings que le site.\n"
            "Les fichiers sont copies automatiquement dans public/images/hero/."
        )
        ttk.Label(controls, text=help_text, justify="left", wraplength=300).grid(
            row=6, column=0, columnspan=2, sticky="w", pady=(10, 0)
        )
        self.hero_animation_button = ttk.Button(
            controls,
            text="Lancer l'animation",
            command=self.toggle_hero_preview_animation,
        )
        self.hero_animation_button.grid(row=7, column=0, columnspan=2, sticky="w", pady=(10, 0))

        ttk.Label(preview, text="Apercu hero").grid(row=0, column=0, sticky="n")
        self.hero_preview_surface = tk.Frame(
            preview,
            width=HERO_PREVIEW_SIZE[0],
            height=HERO_PREVIEW_SIZE[1],
            bd=0,
            highlightthickness=1,
        )
        self.hero_preview_surface.grid(row=1, column=0, pady=(6, 8))
        self.hero_preview_surface.grid_propagate(False)

        self.hero_preview_label = tk.Label(
            self.hero_preview_surface,
            text="Selectionnez une image hero",
            anchor="center",
            justify="center",
            relief="flat",
            compound="center",
            wraplength=HERO_PREVIEW_SIZE[0] - 24,
        )
        self.hero_preview_label.pack(fill="both", expand=True)
        ttk.Label(
            preview,
            textvariable=self.hero_preview_status_var,
            justify="left",
            wraplength=HERO_PREVIEW_SIZE[0],
        ).grid(row=2, column=0, sticky="n")

    def build_containers_tab(self) -> None:
        frame = self.containers_frame
        frame.columnconfigure(0, weight=0)
        frame.columnconfigure(1, weight=1)
        frame.rowconfigure(0, weight=1)

        list_panel = ttk.Frame(frame)
        list_panel.grid(row=0, column=0, sticky="nsw", padx=(0, 18))
        list_panel.rowconfigure(1, weight=1)

        ttk.Label(list_panel, text="Photos contenants").grid(row=0, column=0, sticky="w", pady=(0, 4))
        self.containers_listbox = tk.Listbox(list_panel, width=42, exportselection=False)
        self.containers_listbox.grid(row=1, column=0, sticky="nsew")
        self.containers_listbox.bind("<<ListboxSelect>>", lambda _event: self.load_selected_container_image())

        container_buttons = ttk.Frame(list_panel)
        container_buttons.grid(row=2, column=0, sticky="ew", pady=(8, 0))
        ttk.Button(container_buttons, text="Ajouter", command=self.add_container_images).grid(row=0, column=0, sticky="ew")
        ttk.Button(container_buttons, text="Supprimer", command=self.remove_container_image).grid(row=0, column=1, sticky="ew", padx=4)
        ttk.Button(container_buttons, text="Monter", command=lambda: self.move_container_image(-1)).grid(row=1, column=0, sticky="ew", pady=(4, 0))
        ttk.Button(container_buttons, text="Descendre", command=lambda: self.move_container_image(1)).grid(row=1, column=1, sticky="ew", padx=4, pady=(4, 0))

        editor = ttk.Frame(frame)
        editor.grid(row=0, column=1, sticky="nsew")
        editor.columnconfigure(1, weight=1)

        ttk.Label(editor, text="Chemin publie").grid(row=0, column=0, sticky="w")
        ttk.Entry(editor, textvariable=self.container_path_var).grid(row=0, column=1, sticky="ew", pady=4)
        ttk.Checkbutton(editor, text="Photo active", variable=self.container_enabled_var).grid(
            row=1,
            column=1,
            sticky="w",
            pady=4,
        )
        ttk.Label(editor, text="Libelle").grid(row=2, column=0, sticky="w")
        ttk.Entry(editor, textvariable=self.container_label_var).grid(row=2, column=1, sticky="ew", pady=4)
        ttk.Label(editor, text="Texte alternatif").grid(row=3, column=0, sticky="w")
        ttk.Entry(editor, textvariable=self.container_alt_var).grid(row=3, column=1, sticky="ew", pady=4)

        ttk.Label(editor, text="Position d'affichage").grid(row=4, column=0, sticky="w")
        container_order_controls = ttk.Frame(editor)
        container_order_controls.grid(row=4, column=1, sticky="w", pady=4)
        ttk.Spinbox(
            container_order_controls,
            from_=1,
            to=999,
            width=6,
            textvariable=self.container_order_var,
            command=self.apply_container_order,
        ).grid(row=0, column=0, sticky="w")
        ttk.Button(
            container_order_controls,
            text="Appliquer l'ordre",
            command=self.apply_container_order,
        ).grid(row=0, column=1, sticky="w", padx=(8, 0))
        ttk.Button(editor, text="Appliquer les changements", command=self.apply_container_changes).grid(
            row=5,
            column=1,
            sticky="e",
            pady=(8, 14),
        )

        self.container_preview_surface = tk.Frame(
            editor,
            width=HERO_PREVIEW_SIZE[0],
            height=HERO_PREVIEW_SIZE[1],
            bd=0,
            highlightthickness=1,
        )
        self.container_preview_surface.grid(row=6, column=0, columnspan=2, pady=(4, 8))
        self.container_preview_surface.grid_propagate(False)

        self.container_preview_label = tk.Label(
            self.container_preview_surface,
            text="Selectionnez une photo de contenant",
            anchor="center",
            justify="center",
            relief="flat",
            compound="center",
            wraplength=HERO_PREVIEW_SIZE[0] - 24,
        )
        self.container_preview_label.pack(fill="both", expand=True)
        ttk.Label(
            editor,
            textvariable=self.container_preview_status_var,
            justify="left",
            wraplength=HERO_PREVIEW_SIZE[0],
        ).grid(row=7, column=0, columnspan=2, sticky="n")

    def build_orders_tab(self) -> None:
        frame = self.orders_frame
        frame.columnconfigure(1, weight=1)
        frame.rowconfigure(1, weight=1)

        settings = ttk.Frame(frame)
        settings.grid(row=0, column=0, columnspan=2, sticky="ew", pady=(0, 12))
        settings.columnconfigure(1, weight=1)

        ttk.Label(settings, text="URL commandes").grid(row=0, column=0, sticky="w")
        ttk.Entry(settings, textvariable=self.orders_api_url_var).grid(
            row=0,
            column=1,
            sticky="ew",
            pady=4,
            padx=(8, 10),
        )
        ttk.Label(
            settings,
            text="Le token Netlify donne acces aux commandes et vaut pour tous les onglets.",
            justify="left",
            wraplength=520,
        ).grid(
            row=1,
            column=0,
            columnspan=2,
            sticky="w",
            pady=(2, 4),
        )
        self.orders_refresh_button = ttk.Button(settings, text="Rafraichir", command=self.refresh_orders)
        self.orders_refresh_button.grid(
            row=0,
            column=2,
            rowspan=2,
            sticky="ns",
        )
        token_button = ttk.Button(
            settings,
            text="Renseigner le token Netlify",
            command=self.prompt_session_admin_token,
        )
        token_button.grid(
            row=2,
            column=2,
            sticky="e",
            pady=(4, 0),
        )
        Tooltip(token_button, TOKEN_HELP_TEXT)
        ttk.Checkbutton(
            settings,
            text="Mémoriser sur cet ordinateur",
            variable=self.remember_admin_token_var,
            command=self.save_settings,
        ).grid(
            row=2,
            column=0,
            sticky="w",
            pady=(4, 0),
        )
        ttk.Label(settings, textvariable=self.session_auth_status_var).grid(
            row=2,
            column=1,
            sticky="w",
            pady=(4, 0),
            padx=(8, 10),
        )

        left = ttk.Frame(frame)
        left.grid(row=1, column=0, sticky="nsew", padx=(0, 12))
        left.rowconfigure(1, weight=1)
        right = ttk.Frame(frame)
        right.grid(row=1, column=1, sticky="nsew")
        right.columnconfigure(0, weight=1)
        right.rowconfigure(1, weight=1)

        ttk.Label(left, text="Commandes recues").grid(row=0, column=0, sticky="w", pady=(0, 4))
        self.orders_listbox = tk.Listbox(left, width=42, exportselection=False)
        self.orders_listbox.grid(row=1, column=0, sticky="nsew")
        self.orders_listbox.bind("<<ListboxSelect>>", lambda _event: self.load_selected_order())

        ttk.Label(right, text="Detail commande").grid(row=0, column=0, sticky="w", pady=(0, 4))
        self.orders_detail_text = tk.Text(right, height=18, wrap="word")
        self.orders_detail_text.grid(row=1, column=0, sticky="nsew")
        order_actions = ttk.Frame(right)
        order_actions.grid(row=2, column=0, sticky="ew", pady=(8, 0))
        ttk.Button(
            order_actions,
            text="Exporter JSON production",
            command=self.export_selected_order_production_json,
        ).pack(side="left")

    def build_publish_tab(self) -> None:
        frame = self.publish_frame
        frame.columnconfigure(0, weight=1)

        publish_panel = ttk.Frame(frame)
        publish_panel.grid(row=0, column=0, sticky="n", pady=(18, 0))
        publish_panel.columnconfigure(0, weight=1)

        ttk.Label(publish_panel, text="Message de commit").grid(row=0, column=0, sticky="w")
        ttk.Entry(publish_panel, textvariable=self.commit_message_var, width=72).grid(
            row=1,
            column=0,
            sticky="ew",
            pady=(4, 12),
        )

        ttk.Checkbutton(
            publish_panel,
            text="Ignorer le déploiement Netlify pour ce commit",
            variable=self.skip_netlify_deploy_var,
        ).grid(row=2, column=0, sticky="w", pady=(0, 10))

        buttons = ttk.Frame(publish_panel)
        buttons.grid(row=3, column=0)
        ttk.Button(buttons, text="Annuler", command=self.reload_from_disk).pack(side="left")
        ttk.Button(buttons, text="Sauvegarder", command=self.git_commit_and_push).pack(side="left", padx=6)

        log_panel = ttk.Frame(frame)
        log_panel.grid(row=1, column=0, sticky="ew", pady=(24, 0))
        log_panel.columnconfigure(0, weight=1)
        ttk.Label(log_panel, text="Journal").grid(row=0, column=0, sticky="w", pady=(0, 4))
        self.output_text = tk.Text(log_panel, height=6, wrap="word")
        self.output_text.grid(row=1, column=0, sticky="ew")

    def populate_form(self) -> None:
        pricing = self.config_data.get("pricing", {})
        shop_status = self.config_data.get("shopStatus", {})
        messages = self.config_data.get("messages", {})
        shipping = self.config_data.get("shipping", {})
        hero_gallery = self.config_data.get("heroGallery", {})
        printer_volume = self.ensure_printer_volume_config()

        status_state = shop_status.get("state", "open")
        self.status_state_var.set(status_state)
        self.status_state_display_var.set(
            SHOP_STATUS_LABELS.get(status_state, SHOP_STATUS_LABELS["open"]),
        )
        self.status_label_var.set(shop_status.get("label", ""))
        self.status_allow_checkout_var.set(bool(shop_status.get("allowCheckout", True)))
        self.status_message_var.set(shop_status.get("message", ""))
        self.shipping_suspend_relay_var.set(bool(shipping.get("suspendRelay", False)))
        self.shipping_suspend_home_var.set(bool(shipping.get("suspendHomeDelivery", False)))
        self.shipping_lead_time_var.set(messages.get("shippingLeadTime", ""))
        self.temporary_notice_var.set(messages.get("temporaryNotice", ""))
        self.contact_prompt_var.set(messages.get("contactPrompt", "Vous avez des questions ?"))
        self.contact_button_label_var.set(messages.get("contactButtonLabel", "Contactez nous"))
        self.contact_email_var.set(messages.get("contactEmail", ""))
        self.contact_email_subject_var.set(messages.get("contactEmailSubject", "Contact VASO SHOP"))

        self.write_text(self.status_message_text, shop_status.get("message", ""))
        self.write_text(self.temporary_notice_text, messages.get("temporaryNotice", ""))
        self.write_text(self.atelier_note_text, messages.get("atelierNote", ""))
        self.write_text(
            self.material_pla_note_text,
            messages.get(
                "materialPlaNote",
                "Bioplastique sourcé à partir d'amidon végétal, principalement issu du maïs.",
            ),
        )
        self.write_text(self.warning_text, messages.get("warningPla", ""))
        self.write_text(
            self.color_preview_note_text,
            messages.get(
                "colorPreviewNote",
                "Les aperçus 3D vous donnent une belle idée de la teinte, avec de légères nuances possibles selon la lumière, la matière et l'impression finale.",
            ),
        )
        self.write_text(
            self.contact_email_body_text,
            messages.get(
                "contactEmailBody",
                "Nom :\nPrenom :\nN° de tel :\nMail :\n\nMessage :\n",
            ),
        )
        self.write_text(self.shipping_unsupported_text, shipping.get("unsupportedMessage", ""))

        legacy_prices_cents = pricing.get("pricesCents", {})
        fallback_price_cents = (
            legacy_prices_cents.get("M")
            or legacy_prices_cents.get("S")
            or legacy_prices_cents.get("L")
            or 2500
        )
        price_cents = int(pricing.get("priceCents", fallback_price_cents))
        self.price_euros_var.set(str(price_cents // 100))
        self.price_cents_var.set(f"{price_cents % 100:02d}")
        self.update_price_preview()
        self.printer_enforce_var.set(bool(printer_volume.get("enforce", False)))
        self.refresh_printer_profile_selector()
        self.hero_transition_ms_var.set(str(hero_gallery.get("transitionMs", DEFAULT_HERO_TRANSITION_MS)))
        self.hero_fade_in_ms_var.set(str(hero_gallery.get("fadeInMs", DEFAULT_HERO_FADE_IN_MS)))
        self.hero_fade_out_ms_var.set(str(hero_gallery.get("fadeOutMs", DEFAULT_HERO_FADE_OUT_MS)))

        self.refresh_shipping_countries_listbox()
        self.refresh_colors_listbox()
        self.refresh_hero_listbox()
        self.refresh_containers_listbox()

    def collect_form(self) -> None:
        existing_shipping_countries = self.get_shipping_config().get("countries", [])
        self.config_data["shopStatus"] = {
            "state": SHOP_STATUS_CODES_BY_LABEL.get(
                self.status_state_display_var.get().strip(),
                self.status_state_var.get().strip() or "open",
            ),
            "label": self.status_label_var.get().strip(),
            "message": self.status_message_text.get("1.0", "end").strip(),
            "allowCheckout": bool(self.status_allow_checkout_var.get()),
        }
        self.config_data["messages"] = {
            "shippingLeadTime": self.shipping_lead_time_var.get().strip(),
            "temporaryNotice": self.temporary_notice_text.get("1.0", "end").strip(),
            "atelierNote": self.atelier_note_text.get("1.0", "end").strip(),
            "materialPlaNote": self.material_pla_note_text.get("1.0", "end").strip(),
            "warningPla": self.warning_text.get("1.0", "end").strip(),
            "colorPreviewNote": self.color_preview_note_text.get("1.0", "end").strip(),
            "contactPrompt": self.contact_prompt_var.get().strip(),
            "contactButtonLabel": self.contact_button_label_var.get().strip(),
            "contactEmail": self.contact_email_var.get().strip(),
            "contactEmailSubject": self.contact_email_subject_var.get().strip(),
            "contactEmailBody": self.contact_email_body_text.get("1.0", "end").strip(),
        }
        self.config_data["pricing"] = {
            "priceCents": self.parse_price_cents(),
        }
        self.config_data["printerVolume"] = self.collect_printer_volume_config()
        self.config_data["shipping"] = {
            "suspendRelay": bool(self.shipping_suspend_relay_var.get()),
            "suspendHomeDelivery": bool(self.shipping_suspend_home_var.get()),
            "unsupportedMessage": self.shipping_unsupported_text.get("1.0", "end").strip(),
            "countries": existing_shipping_countries,
        }
        self.config_data["heroGallery"] = {
            "transitionMs": self.parse_int(self.hero_transition_ms_var.get(), "transition hero"),
            "fadeInMs": self.parse_int(self.hero_fade_in_ms_var.get(), "fade in hero"),
            "fadeOutMs": self.parse_int(self.hero_fade_out_ms_var.get(), "fade out hero"),
        }

    def parse_int(self, raw_value: str, field_label: str) -> int:
        try:
            return int(raw_value.strip() or "0")
        except ValueError as error:
            raise ValueError(f"Valeur invalide pour {field_label}") from error

    def parse_price_cents(self) -> int:
        euros = self.parse_int(self.price_euros_var.get(), "prix en euros")
        cents = self.parse_int(self.price_cents_var.get(), "prix en centimes")
        if euros < 0:
            raise ValueError("Le prix en euros ne peut pas être négatif.")
        if cents < 0 or cents > 99:
            raise ValueError("Les centimes doivent être compris entre 0 et 99.")
        return euros * 100 + cents

    def format_price_preview(self, value_in_cents: int) -> str:
        euros = max(0, value_in_cents) / 100
        return f"{euros:,.2f} €".replace(",", "X").replace(".", ",").replace("X", ".")

    def update_price_preview(self) -> None:
        try:
            self.price_preview_var.set(self.format_price_preview(self.parse_price_cents()))
        except ValueError:
            self.price_preview_var.set("Saisie invalide")

    def parse_shipping_option_price_cents(self) -> int:
        euros = self.parse_int(self.shipping_option_euros_var.get(), "prix livraison en euros")
        cents = self.parse_int(self.shipping_option_cents_var.get(), "prix livraison en centimes")
        if euros < 0:
            raise ValueError("Le prix livraison en euros ne peut pas être négatif.")
        if cents < 0 or cents > 99:
            raise ValueError("Les centimes livraison doivent être compris entre 0 et 99.")
        return euros * 100 + cents

    def update_shipping_price_preview(self) -> None:
        try:
            self.shipping_option_preview_var.set(
                self.format_price_preview(self.parse_shipping_option_price_cents())
            )
        except ValueError:
            self.shipping_option_preview_var.set("Saisie invalide")

    def get_selected_shipping_country_index(self) -> int | None:
        selection = self.shipping_countries_listbox.curselection()
        if not selection:
            return None

        return selection[0]

    def get_selected_shipping_option_index(self) -> int | None:
        selection = self.shipping_options_listbox.curselection()
        if not selection:
            return None

        return selection[0]

    def refresh_shipping_countries_listbox(self) -> None:
        countries = self.get_shipping_config().get("countries", [])
        current_selection = self.get_selected_shipping_country_index()

        self.shipping_countries_listbox.delete(0, "end")
        for country in countries:
            option_count = len(country.get("options", [])) if isinstance(country, dict) else 0
            country_name = country.get("country", "") if isinstance(country, dict) else ""
            self.shipping_countries_listbox.insert("end", f"{country_name} ({option_count})")

        if not countries:
            self.shipping_country_var.set("")
            self.refresh_shipping_options_listbox()
            return

        selected_index = min(current_selection or 0, len(countries) - 1)
        self.shipping_countries_listbox.selection_set(selected_index)
        self.load_selected_shipping_country()

    def load_selected_shipping_country(self) -> None:
        country_index = self.get_selected_shipping_country_index()
        countries = self.get_shipping_config().get("countries", [])
        if country_index is None or country_index >= len(countries):
            self.shipping_country_var.set("")
            self.refresh_shipping_options_listbox()
            return

        country = countries[country_index]
        self.shipping_country_var.set(country.get("country", ""))
        if not isinstance(country.get("options"), list):
            country["options"] = []
        self.refresh_shipping_options_listbox()

    def apply_shipping_country_changes(self) -> None:
        country_index = self.get_selected_shipping_country_index()
        countries = self.get_shipping_config().get("countries", [])
        if country_index is None or country_index >= len(countries):
            return

        country_name = self.shipping_country_var.get().strip()
        if not country_name:
            messagebox.showerror("VASO-Admin", "Le nom du pays est obligatoire.")
            return

        if any(
            index != country_index and country.get("country", "").strip().lower() == country_name.lower()
            for index, country in enumerate(countries)
            if isinstance(country, dict)
        ):
            messagebox.showerror("VASO-Admin", f"Le pays existe deja : {country_name}")
            return

        countries[country_index]["country"] = country_name
        self.refresh_shipping_countries_listbox()
        self.shipping_countries_listbox.selection_clear(0, "end")
        self.shipping_countries_listbox.selection_set(country_index)
        self.load_selected_shipping_country()
        self.log(f"Pays livraison mis a jour : {country_name}")

    def add_shipping_country(self) -> None:
        countries = self.get_shipping_config().setdefault("countries", [])
        existing_names = {
            country.get("country", "").strip()
            for country in countries
            if isinstance(country, dict) and country.get("country", "").strip()
        }
        base_name = "Nouveau pays"
        counter = 1
        candidate = base_name
        while candidate in existing_names:
            counter += 1
            candidate = f"{base_name} {counter}"

        countries.append({"country": candidate, "options": []})
        self.refresh_shipping_countries_listbox()
        self.shipping_countries_listbox.selection_clear(0, "end")
        self.shipping_countries_listbox.selection_set(len(countries) - 1)
        self.load_selected_shipping_country()
        self.log(f"Pays livraison ajoute : {candidate}")

    def remove_shipping_country(self) -> None:
        country_index = self.get_selected_shipping_country_index()
        countries = self.get_shipping_config().get("countries", [])
        if country_index is None or country_index >= len(countries):
            return

        country = countries.pop(country_index)
        self.refresh_shipping_countries_listbox()
        self.log(f"Pays livraison supprime : {country.get('country', '')}")

    def move_shipping_country(self, direction: int) -> None:
        country_index = self.get_selected_shipping_country_index()
        countries = self.get_shipping_config().get("countries", [])
        if country_index is None:
            return

        target_index = country_index + direction
        if target_index < 0 or target_index >= len(countries):
            return

        countries[country_index], countries[target_index] = countries[target_index], countries[country_index]
        self.refresh_shipping_countries_listbox()
        self.shipping_countries_listbox.selection_clear(0, "end")
        self.shipping_countries_listbox.selection_set(target_index)
        self.load_selected_shipping_country()

    def refresh_shipping_options_listbox(self) -> None:
        self.shipping_options_listbox.delete(0, "end")
        country_index = self.get_selected_shipping_country_index()
        countries = self.get_shipping_config().get("countries", [])
        if country_index is None or country_index >= len(countries):
            self.clear_shipping_option_form()
            return

        options = countries[country_index].setdefault("options", [])
        for option in options:
            label = option.get("label", "")
            provider = option.get("provider", "")
            price = self.format_price_preview(int(option.get("priceCents", 0)))
            self.shipping_options_listbox.insert("end", f"{option.get('id', '')} · {label} · {provider} · {price}")

        if options:
            self.shipping_options_listbox.selection_set(0)
            self.load_selected_shipping_option()
        else:
            self.clear_shipping_option_form()

    def clear_shipping_option_form(self) -> None:
        self.shipping_option_id_var.set("relay")
        self.shipping_option_label_var.set("")
        self.shipping_option_provider_var.set("")
        self.shipping_option_euros_var.set("0")
        self.shipping_option_cents_var.set("00")
        self.update_shipping_price_preview()

    def load_selected_shipping_option(self) -> None:
        country_index = self.get_selected_shipping_country_index()
        option_index = self.get_selected_shipping_option_index()
        countries = self.get_shipping_config().get("countries", [])
        if country_index is None or country_index >= len(countries) or option_index is None:
            self.clear_shipping_option_form()
            return

        options = countries[country_index].get("options", [])
        if option_index >= len(options):
            self.clear_shipping_option_form()
            return

        option = options[option_index]
        price_cents = int(option.get("priceCents", 0))
        self.shipping_option_id_var.set(option.get("id", "relay"))
        self.shipping_option_label_var.set(option.get("label", ""))
        self.shipping_option_provider_var.set(option.get("provider", ""))
        self.shipping_option_euros_var.set(str(price_cents // 100))
        self.shipping_option_cents_var.set(f"{price_cents % 100:02d}")
        self.update_shipping_price_preview()

    def apply_shipping_option_changes(self) -> None:
        country_index = self.get_selected_shipping_country_index()
        option_index = self.get_selected_shipping_option_index()
        countries = self.get_shipping_config().get("countries", [])
        if country_index is None or country_index >= len(countries) or option_index is None:
            return

        options = countries[country_index].setdefault("options", [])
        if option_index >= len(options):
            return

        option_id = self.shipping_option_id_var.get().strip()
        if option_id not in SHIPPING_MODE_LABELS:
            messagebox.showerror("VASO-Admin", "Le type livraison doit etre relay, home ou pickup.")
            return

        if any(
            index != option_index and option.get("id") == option_id
            for index, option in enumerate(options)
            if isinstance(option, dict)
        ):
            messagebox.showerror("VASO-Admin", f"Le mode {option_id} existe deja pour ce pays.")
            return

        try:
            price_cents = self.parse_shipping_option_price_cents()
        except ValueError as error:
            messagebox.showerror("VASO-Admin", str(error))
            return

        options[option_index] = {
            "id": option_id,
            "label": self.shipping_option_label_var.get().strip() or SHIPPING_MODE_LABELS[option_id],
            "provider": self.shipping_option_provider_var.get().strip(),
            "priceCents": price_cents,
        }
        self.refresh_shipping_options_listbox()
        self.shipping_options_listbox.selection_clear(0, "end")
        self.shipping_options_listbox.selection_set(option_index)
        self.load_selected_shipping_option()
        self.log("Mode livraison mis a jour")

    def add_shipping_option(self) -> None:
        country_index = self.get_selected_shipping_country_index()
        countries = self.get_shipping_config().get("countries", [])
        if country_index is None or country_index >= len(countries):
            return

        options = countries[country_index].setdefault("options", [])
        existing_ids = {option.get("id") for option in options if isinstance(option, dict)}
        option_id = next((mode_id for mode_id in SHIPPING_MODE_LABELS if mode_id not in existing_ids), None)
        if option_id is None:
            messagebox.showinfo("VASO-Admin", "Ce pays possede deja tous les modes livraison.")
            return

        options.append(
            {
                "id": option_id,
                "label": SHIPPING_MODE_LABELS[option_id],
                "provider": SHIPPING_MODE_PROVIDERS[option_id],
                "priceCents": 0,
            }
        )
        self.refresh_shipping_options_listbox()
        self.shipping_options_listbox.selection_clear(0, "end")
        self.shipping_options_listbox.selection_set(len(options) - 1)
        self.load_selected_shipping_option()
        self.log("Mode livraison ajoute")

    def remove_shipping_option(self) -> None:
        country_index = self.get_selected_shipping_country_index()
        option_index = self.get_selected_shipping_option_index()
        countries = self.get_shipping_config().get("countries", [])
        if country_index is None or country_index >= len(countries) or option_index is None:
            return

        options = countries[country_index].setdefault("options", [])
        if option_index >= len(options):
            return

        option = options.pop(option_index)
        self.refresh_shipping_options_listbox()
        self.log(f"Mode livraison supprime : {option.get('id', '')}")

    def move_shipping_option(self, direction: int) -> None:
        country_index = self.get_selected_shipping_country_index()
        option_index = self.get_selected_shipping_option_index()
        countries = self.get_shipping_config().get("countries", [])
        if country_index is None or country_index >= len(countries) or option_index is None:
            return

        options = countries[country_index].setdefault("options", [])
        target_index = option_index + direction
        if target_index < 0 or target_index >= len(options):
            return

        options[option_index], options[target_index] = options[target_index], options[option_index]
        self.refresh_shipping_options_listbox()
        self.shipping_options_listbox.selection_clear(0, "end")
        self.shipping_options_listbox.selection_set(target_index)
        self.load_selected_shipping_option()

    def ensure_printer_volume_config(self) -> dict:
        printer_volume = self.config_data.get("printerVolume")
        if not isinstance(printer_volume, dict):
            printer_volume = {}

        profiles = printer_volume.get("profiles")
        if not isinstance(profiles, list) or not profiles:
            profiles = [profile.copy() for profile in DEFAULT_PRINTER_PROFILES]
        else:
            profiles = [
                {
                    "name": str(profile.get("name", "")).strip() or f"Imprimante {index + 1}",
                    "width": int(profile.get("width", 220)),
                    "depth": int(profile.get("depth", 220)),
                    "height": int(profile.get("height", 250)),
                }
                for index, profile in enumerate(profiles)
                if isinstance(profile, dict)
            ] or [profile.copy() for profile in DEFAULT_PRINTER_PROFILES]

        active_profile = str(printer_volume.get("activeProfile", profiles[0]["name"])).strip()
        if not any(profile["name"] == active_profile for profile in profiles):
            active_profile = profiles[0]["name"]

        normalized = {
            "enforce": bool(printer_volume.get("enforce", False)),
            "activeProfile": active_profile,
            "profiles": profiles,
        }
        self.config_data["printerVolume"] = normalized
        return normalized

    def collect_printer_volume_config(self) -> dict:
        printer_volume = self.ensure_printer_volume_config()
        active_profile = self.printer_active_profile_var.get().strip() or printer_volume["activeProfile"]
        if not any(profile["name"] == active_profile for profile in printer_volume["profiles"]):
            active_profile = printer_volume["profiles"][0]["name"]

        return {
            "enforce": bool(self.printer_enforce_var.get()),
            "activeProfile": active_profile,
            "profiles": printer_volume["profiles"],
        }

    def refresh_printer_profile_selector(self) -> None:
        printer_volume = self.ensure_printer_volume_config()
        profile_names = [profile["name"] for profile in printer_volume["profiles"]]
        self.printer_profile_selector.configure(values=profile_names)

        active_profile = printer_volume["activeProfile"] if profile_names else ""
        self.printer_active_profile_var.set(active_profile)
        self.load_selected_printer_profile()

    def load_selected_printer_profile(self) -> None:
        printer_volume = self.ensure_printer_volume_config()
        profile_name = self.printer_active_profile_var.get().strip()
        profile = next(
            (candidate for candidate in printer_volume["profiles"] if candidate["name"] == profile_name),
            printer_volume["profiles"][0] if printer_volume["profiles"] else None,
        )
        if profile is None:
            self.printer_name_var.set("")
            self.printer_width_var.set("")
            self.printer_depth_var.set("")
            self.printer_height_var.set("")
            return

        self.printer_active_profile_var.set(profile["name"])
        printer_volume["activeProfile"] = profile["name"]
        self.printer_name_var.set(profile["name"])
        self.printer_width_var.set(str(profile["width"]))
        self.printer_depth_var.set(str(profile["depth"]))
        self.printer_height_var.set(str(profile["height"]))

    def apply_printer_profile_changes(self) -> None:
        try:
            printer_volume = self.ensure_printer_volume_config()
            current_name = self.printer_active_profile_var.get().strip()
            profile = next(
                (candidate for candidate in printer_volume["profiles"] if candidate["name"] == current_name),
                None,
            )
            if profile is None:
                return

            new_name = self.printer_name_var.get().strip() or current_name
            width = self.parse_int(self.printer_width_var.get(), "largeur imprimante")
            depth = self.parse_int(self.printer_depth_var.get(), "profondeur imprimante")
            height = self.parse_int(self.printer_height_var.get(), "hauteur imprimante")

            if any(candidate["name"] == new_name and candidate is not profile for candidate in printer_volume["profiles"]):
                raise ValueError(f"Un profil imprimante existe deja : {new_name}")

            profile.update({
                "name": new_name,
                "width": max(1, width),
                "depth": max(1, depth),
                "height": max(1, height),
            })
            printer_volume["activeProfile"] = new_name
            self.refresh_printer_profile_selector()
            self.printer_active_profile_var.set(new_name)
            self.load_selected_printer_profile()
            self.log(f"Profil imprimante mis a jour : {new_name}")
        except ValueError as error:
            messagebox.showerror("VASO-Admin", str(error))

    def add_printer_profile(self) -> None:
        printer_volume = self.ensure_printer_volume_config()
        existing_names = {profile["name"] for profile in printer_volume["profiles"]}
        base_name = "Nouvelle imprimante"
        counter = 1
        candidate = base_name
        while candidate in existing_names:
            counter += 1
            candidate = f"{base_name} {counter}"

        printer_volume["profiles"].append(
            {
                "name": candidate,
                "width": 220,
                "depth": 220,
                "height": 250,
            }
        )
        printer_volume["activeProfile"] = candidate
        self.refresh_printer_profile_selector()
        self.printer_active_profile_var.set(candidate)
        self.load_selected_printer_profile()
        self.log(f"Profil imprimante ajoute : {candidate}")

    def remove_printer_profile(self) -> None:
        printer_volume = self.ensure_printer_volume_config()
        if len(printer_volume["profiles"]) <= 1:
            self.log("Le dernier profil imprimante ne peut pas etre supprime.")
            return

        current_name = self.printer_active_profile_var.get().strip()
        printer_volume["profiles"] = [
            profile for profile in printer_volume["profiles"] if profile["name"] != current_name
        ]
        printer_volume["activeProfile"] = printer_volume["profiles"][0]["name"]
        self.refresh_printer_profile_selector()
        self.log(f"Profil imprimante supprime : {current_name}")

    def refresh_colors_listbox(self) -> None:
        self.colors_listbox.delete(0, "end")
        for color in self.config_data.get("colors", []):
            availability = "ON" if color.get("available", True) else "OFF"
            self.colors_listbox.insert("end", f"{availability} · {color.get('label', '')}")

        if self.colors_listbox.size():
            self.colors_listbox.selection_set(0)
            self.load_selected_color()

    def load_selected_color(self) -> None:
        selection = self.colors_listbox.curselection()
        if not selection:
            return

        color = self.config_data["colors"][selection[0]]
        self.color_id_var.set(color.get("id", ""))
        self.color_label_var.set(color.get("label", ""))
        self.color_hex_var.set(color.get("hex", ""))
        self.color_available_var.set(bool(color.get("available", True)))

    def apply_color_changes(self) -> None:
        selection = self.colors_listbox.curselection()
        if not selection:
            return

        color = self.config_data["colors"][selection[0]]
        color["id"] = self.color_id_var.get().strip()
        color["label"] = self.color_label_var.get().strip()
        color["hex"] = self.color_hex_var.get().strip()
        color["available"] = bool(self.color_available_var.get())
        self.refresh_colors_listbox()
        self.colors_listbox.selection_set(selection[0])
        self.log("Couleur mise a jour")

    def add_color(self) -> None:
        colors = self.config_data.setdefault("colors", [])
        colors.append(
            {
                "id": f"new-color-{len(colors) + 1}",
                "label": "Nouvelle couleur",
                "hex": "#cccccc",
                "available": True,
            }
        )
        self.refresh_colors_listbox()
        self.colors_listbox.selection_clear(0, "end")
        self.colors_listbox.selection_set(len(colors) - 1)
        self.load_selected_color()

    def remove_color(self) -> None:
        selection = self.colors_listbox.curselection()
        if not selection:
            return

        del self.config_data["colors"][selection[0]]
        self.refresh_colors_listbox()
        self.log("Couleur supprimee")

    def move_color(self, direction: int) -> None:
        selection = self.colors_listbox.curselection()
        if not selection:
            return

        index = selection[0]
        target_index = index + direction
        colors = self.config_data["colors"]
        if target_index < 0 or target_index >= len(colors):
            return

        colors[index], colors[target_index] = colors[target_index], colors[index]
        self.refresh_colors_listbox()
        self.colors_listbox.selection_clear(0, "end")
        self.colors_listbox.selection_set(target_index)
        self.load_selected_color()

    def refresh_hero_listbox(self) -> None:
        self.hero_listbox.delete(0, "end")
        for hero_image in self.config_data.get("heroImages", []):
            status = "ON" if hero_image.get("enabled", True) else "OFF"
            self.hero_listbox.insert("end", f"{status} · {hero_image.get('path', '')}")

        if self.hero_listbox.size():
            self.hero_listbox.selection_set(0)
            self.load_selected_hero_image()
        else:
            self.hero_path_var.set("")
            self.hero_enabled_var.set(False)
            self.update_selected_hero_preview()

    def load_selected_hero_image(self) -> None:
        selection = self.hero_listbox.curselection()
        if not selection:
            self.hero_path_var.set("")
            self.hero_enabled_var.set(False)
            self.update_selected_hero_preview()
            return

        hero_image = self.config_data["heroImages"][selection[0]]
        self.hero_path_var.set(hero_image.get("path", ""))
        self.hero_enabled_var.set(bool(hero_image.get("enabled", True)))
        if not self.hero_preview_is_animating:
            self.update_selected_hero_preview()

    def apply_hero_changes(self) -> None:
        selection = self.hero_listbox.curselection()
        if selection:
            hero_image = self.config_data["heroImages"][selection[0]]
            hero_image["path"] = self.hero_path_var.get().strip()
            hero_image["enabled"] = bool(self.hero_enabled_var.get())
            self.refresh_hero_listbox()
            self.hero_listbox.selection_set(selection[0])
            self.load_selected_hero_image()

        self.config_data["heroGallery"] = self.get_hero_gallery_settings_from_form()
        if self.hero_preview_is_animating:
            self.start_hero_preview_animation()
        else:
            self.update_selected_hero_preview()
        self.log("Hero mis a jour")

    def add_hero_images(self) -> None:
        selected_paths = filedialog.askopenfilenames(
            title="Ajouter des images hero",
            filetypes=[
                ("Images", "*.png *.jpg *.jpeg *.webp *.avif"),
                ("Tous les fichiers", "*.*"),
            ],
        )
        if not selected_paths:
            return

        HERO_DIR.mkdir(parents=True, exist_ok=True)
        hero_images = self.config_data.setdefault("heroImages", [])
        for source in selected_paths:
            source_path = Path(source)
            target_path = self.unique_hero_target(source_path.name)
            shutil.copy2(source_path, target_path)
            hero_images.append(
                {
                    "path": f"images/hero/{target_path.name}",
                    "enabled": True,
                }
            )

        self.refresh_hero_listbox()
        self.hero_listbox.selection_clear(0, "end")
        self.hero_listbox.selection_set(len(hero_images) - 1)
        self.load_selected_hero_image()
        self.log(f"{len(selected_paths)} image(s) hero ajoutee(s)")

    def unique_hero_target(self, file_name: str) -> Path:
        target_path = HERO_DIR / file_name
        stem = target_path.stem
        suffix = target_path.suffix
        counter = 2
        while target_path.exists():
            target_path = HERO_DIR / f"{stem}-{counter}{suffix}"
            counter += 1
        return target_path

    def get_hero_gallery_settings_from_form(self) -> dict:
        return {
            "transitionMs": max(1000, self.parse_int(self.hero_transition_ms_var.get(), "transition hero")),
            "fadeInMs": max(0, self.parse_int(self.hero_fade_in_ms_var.get(), "fade in hero")),
            "fadeOutMs": max(0, self.parse_int(self.hero_fade_out_ms_var.get(), "fade out hero")),
        }

    def resolve_public_asset_path(self, relative_path: str) -> Path:
        normalized_path = relative_path.strip().lstrip("/")
        if normalized_path.startswith("public/"):
            return REPO_ROOT / normalized_path

        return REPO_ROOT / "public" / normalized_path

    def get_selected_hero_path(self) -> Path | None:
        relative_path = self.hero_path_var.get().strip()
        if not relative_path:
            return None

        return self.resolve_public_asset_path(relative_path)

    def get_enabled_hero_paths(self) -> list[Path]:
        enabled_paths: list[Path] = []
        for hero_image in self.config_data.get("heroImages", []):
            if not hero_image.get("enabled", True):
                continue

            path = self.resolve_public_asset_path(str(hero_image.get("path", "")).strip())
            if path.is_file():
                enabled_paths.append(path)

        return enabled_paths

    def load_preview_image(self, image_path: Path) -> Image.Image | None:
        if Image is None or ImageOps is None:
            return None

        try:
            with Image.open(image_path) as source:
                contained = ImageOps.contain(
                    source.convert("RGBA"),
                    (HERO_PREVIEW_SIZE[0] - 24, HERO_PREVIEW_SIZE[1] - 24),
                    method=Image.Resampling.LANCZOS,
                )
                background = Image.new("RGBA", HERO_PREVIEW_SIZE, self.active_theme["FIELD"])
                offset = (
                    (HERO_PREVIEW_SIZE[0] - contained.width) // 2,
                    (HERO_PREVIEW_SIZE[1] - contained.height) // 2,
                )
                background.alpha_composite(contained, dest=offset)
                return background
        except OSError:
            return None

    def display_preview_image(self, image: Image.Image | None, status: str, title: str = "") -> None:
        if image is None:
            self.hero_preview_photo = None
            self.hero_preview_label.configure(image="", text=title or "Apercu indisponible")
            self.hero_preview_status_var.set(status)
            return

        if ImageTk is not None:
            preview_photo = ImageTk.PhotoImage(image)
        else:
            image.save(self.hero_preview_temp_path, format="PNG")
            preview_photo = tk.PhotoImage(file=str(self.hero_preview_temp_path))
        self.hero_preview_photo = preview_photo
        self.hero_preview_label.configure(image=preview_photo, text="")
        self.hero_preview_status_var.set(status)

    def update_selected_hero_preview(self) -> None:
        if self.hero_preview_is_animating:
            return

        if Image is None or ImageOps is None:
            self.display_preview_image(
                None,
                "Pillow n'est pas installe. Lancez : python3 -m pip install -r admin/requirements.txt",
                title="Pillow requis",
            )
            return

        image_path = self.get_selected_hero_path()
        if image_path is None:
            self.display_preview_image(None, "Selectionnez une image hero pour afficher son apercu.")
            return

        image = self.load_preview_image(image_path)
        if image is None:
            self.display_preview_image(
                None,
                f"Impossible de charger {image_path.name}.",
                title=image_path.name,
            )
            return

        enabled_label = "active" if self.hero_enabled_var.get() else "inactive"
        self.display_preview_image(
            image,
            f"Apercu fixe : {image_path.name} ({enabled_label})",
        )

    def cancel_hero_preview_jobs(self) -> None:
        if self.hero_preview_cycle_after_id is not None:
            self.after_cancel(self.hero_preview_cycle_after_id)
            self.hero_preview_cycle_after_id = None

        if self.hero_preview_frame_after_id is not None:
            self.after_cancel(self.hero_preview_frame_after_id)
            self.hero_preview_frame_after_id = None

    def stop_hero_preview_animation(self) -> None:
        self.cancel_hero_preview_jobs()
        self.hero_preview_is_animating = False
        self.hero_animation_button.configure(text="Lancer l'animation")
        self.update_selected_hero_preview()

    def toggle_hero_preview_animation(self) -> None:
        if self.hero_preview_is_animating:
            self.stop_hero_preview_animation()
            return

        self.start_hero_preview_animation()

    def start_hero_preview_animation(self) -> None:
        if Image is None or ImageOps is None:
            self.display_preview_image(
                None,
                "Pillow n'est pas installe. Lancez : python3 -m pip install -r admin/requirements.txt",
                title="Pillow requis",
            )
            return

        enabled_paths = self.get_enabled_hero_paths()
        if not enabled_paths:
            self.display_preview_image(None, "Aucune image hero active n'est disponible.")
            return

        if len(enabled_paths) == 1:
            self.hero_preview_is_animating = False
            self.hero_animation_button.configure(text="Lancer l'animation")
            image = self.load_preview_image(enabled_paths[0])
            self.display_preview_image(image, f"Une seule image active : {enabled_paths[0].name}")
            return

        self.cancel_hero_preview_jobs()
        self.hero_preview_is_animating = True
        self.hero_animation_button.configure(text="Arreter l'animation")
        self.hero_preview_current_index = 0
        self.run_hero_preview_cycle()

    def run_hero_preview_cycle(self) -> None:
        if not self.hero_preview_is_animating:
            return

        enabled_paths = self.get_enabled_hero_paths()
        if len(enabled_paths) <= 1:
            self.stop_hero_preview_animation()
            return

        settings = self.get_hero_gallery_settings_from_form()
        current_path = enabled_paths[self.hero_preview_current_index % len(enabled_paths)]
        next_index = (self.hero_preview_current_index + 1) % len(enabled_paths)
        next_path = enabled_paths[next_index]

        current_image = self.load_preview_image(current_path)
        next_image = self.load_preview_image(next_path)
        if current_image is None or next_image is None:
            self.stop_hero_preview_animation()
            self.display_preview_image(None, "Une image hero n'a pas pu etre chargee.")
            return

        self.display_preview_image(
            current_image,
            (
                f"Animation en cours : {current_path.name} -> {next_path.name} | "
                f"transition {settings['transitionMs']} ms | "
                f"fade in {settings['fadeInMs']} ms | fade out {settings['fadeOutMs']} ms"
            ),
        )
        delay_before_fade_ms = max(
            0,
            settings["transitionMs"] - max(settings["fadeInMs"], settings["fadeOutMs"], 1),
        )
        self.hero_preview_cycle_after_id = self.after(
            delay_before_fade_ms,
            lambda: self.animate_hero_crossfade(current_image, next_image, next_index, settings),
        )

    def animate_hero_crossfade(
        self,
        current_image: Image.Image,
        next_image: Image.Image,
        next_index: int,
        settings: dict,
    ) -> None:
        if not self.hero_preview_is_animating:
            return

        duration_ms = max(settings["fadeInMs"], settings["fadeOutMs"], 1)
        total_steps = max(8, min(24, duration_ms // 120 or 8))

        def render_frame(step: int) -> None:
            if not self.hero_preview_is_animating:
                return

            progress = step / total_steps
            elapsed_ms = progress * duration_ms
            previous_alpha = 0 if settings["fadeOutMs"] == 0 else max(
                0.0,
                1 - min(elapsed_ms / settings["fadeOutMs"], 1),
            )
            next_alpha = 1 if settings["fadeInMs"] == 0 else min(
                elapsed_ms / settings["fadeInMs"],
                1,
            )

            frame = self.compose_crossfade_frame(current_image, next_image, previous_alpha, next_alpha)
            self.display_preview_image(
                frame,
                (
                    f"Animation en cours | transition {settings['transitionMs']} ms | "
                    f"fade in {settings['fadeInMs']} ms | fade out {settings['fadeOutMs']} ms"
                ),
            )

            if step >= total_steps:
                self.hero_preview_current_index = next_index
                self.hero_preview_frame_after_id = None
                self.run_hero_preview_cycle()
                return

            delay_ms = max(16, duration_ms // total_steps)
            self.hero_preview_frame_after_id = self.after(delay_ms, lambda: render_frame(step + 1))

        render_frame(1)

    def compose_crossfade_frame(
        self,
        current_image: Image.Image,
        next_image: Image.Image,
        previous_alpha: float,
        next_alpha: float,
    ) -> Image.Image:
        background = Image.new("RGBA", HERO_PREVIEW_SIZE, self.active_theme["FIELD"])

        current_layer = current_image.copy()
        current_layer.putalpha(int(255 * previous_alpha))
        next_layer = next_image.copy()
        next_layer.putalpha(int(255 * next_alpha))

        frame = Image.alpha_composite(background, current_layer)
        frame = Image.alpha_composite(frame, next_layer)
        return frame

    def on_close(self) -> None:
        self.cancel_hero_preview_jobs()
        self.save_settings()
        try:
            if self.hero_preview_temp_path.exists():
                self.hero_preview_temp_path.unlink()
            if self.container_preview_temp_path.exists():
                self.container_preview_temp_path.unlink()
        except OSError:
            pass
        self.destroy()

    def remove_hero_image(self) -> None:
        selection = self.hero_listbox.curselection()
        if not selection:
            return

        hero_image = self.config_data["heroImages"].pop(selection[0])
        relative_path = hero_image.get("path", "")
        absolute_path = self.resolve_public_asset_path(relative_path)
        if absolute_path.is_file() and absolute_path.is_relative_to(HERO_DIR.parent):
            try:
                absolute_path.unlink()
            except OSError:
                pass

        self.stop_hero_preview_animation()
        self.refresh_hero_listbox()
        self.log(f"Image hero supprimee : {relative_path}")

    def move_hero_image(self, direction: int) -> None:
        selection = self.hero_listbox.curselection()
        if not selection:
            return

        index = selection[0]
        target_index = index + direction
        hero_images = self.config_data["heroImages"]
        if target_index < 0 or target_index >= len(hero_images):
            return

        hero_images[index], hero_images[target_index] = hero_images[target_index], hero_images[index]
        self.stop_hero_preview_animation()
        self.refresh_hero_listbox()
        self.hero_listbox.selection_clear(0, "end")
        self.hero_listbox.selection_set(target_index)
        self.load_selected_hero_image()

    def ensure_container_images_config(self) -> list[dict]:
        container_images = self.config_data.get("containerImages")
        if isinstance(container_images, list):
            return container_images

        default_images = [
            {
                "path": "images/containers/eco-cup-50cl.jpg",
                "label": "Eco-Cup 50 cl",
                "alt": "Eco-Cup 50 cl",
                "enabled": True,
            },
            {
                "path": "images/containers/Eco-Cup 25cl.png",
                "label": "Eco Cup 25Cl",
                "alt": "Eco Cup 25Cl",
                "enabled": True,
            },
            {
                "path": "images/containers/Eco-cup 12,5 cl.png",
                "label": "Eco Cup 12,5 Cl",
                "alt": "Eco Cup 12,5 Cl",
                "enabled": True,
            },
            {
                "path": "images/containers/tube-a-essai.jpg",
                "label": "Tube à essai",
                "alt": "Tube à essai",
                "enabled": True,
            },
        ]
        self.config_data["containerImages"] = default_images
        return default_images

    def refresh_containers_listbox(self) -> None:
        self.containers_listbox.delete(0, "end")
        for container_image in self.ensure_container_images_config():
            status = "ON" if container_image.get("enabled", True) else "OFF"
            label = container_image.get("label", "") or container_image.get("path", "")
            self.containers_listbox.insert("end", f"{status} · {label}")

        if self.containers_listbox.size():
            self.containers_listbox.selection_set(0)
            self.load_selected_container_image()
        else:
            self.container_path_var.set("")
            self.container_label_var.set("")
            self.container_alt_var.set("")
            self.container_order_var.set("")
            self.container_enabled_var.set(False)
            self.update_selected_container_preview()

    def load_selected_container_image(self) -> None:
        selection = self.containers_listbox.curselection()
        if not selection:
            self.container_path_var.set("")
            self.container_label_var.set("")
            self.container_alt_var.set("")
            self.container_order_var.set("")
            self.container_enabled_var.set(False)
            self.update_selected_container_preview()
            return

        container_image = self.ensure_container_images_config()[selection[0]]
        self.container_path_var.set(container_image.get("path", ""))
        self.container_label_var.set(container_image.get("label", ""))
        self.container_alt_var.set(container_image.get("alt", ""))
        self.container_order_var.set(str(selection[0] + 1))
        self.container_enabled_var.set(bool(container_image.get("enabled", True)))
        self.update_selected_container_preview()

    def apply_container_changes(self) -> None:
        selection = self.containers_listbox.curselection()
        if not selection:
            return

        container_image = self.ensure_container_images_config()[selection[0]]
        label = self.container_label_var.get().strip()
        alt = self.container_alt_var.get().strip()
        container_image["path"] = self.container_path_var.get().strip()
        container_image["label"] = label
        container_image["alt"] = alt or label
        container_image["enabled"] = bool(self.container_enabled_var.get())
        self.refresh_containers_listbox()
        self.containers_listbox.selection_set(selection[0])
        self.load_selected_container_image()
        self.log("Photo contenant mise a jour")

    def add_container_images(self) -> None:
        selected_paths = filedialog.askopenfilenames(
            title="Ajouter des photos de contenants",
            filetypes=[
                ("Images", "*.png *.jpg *.jpeg *.webp *.avif"),
                ("Tous les fichiers", "*.*"),
            ],
        )
        if not selected_paths:
            return

        CONTAINERS_DIR.mkdir(parents=True, exist_ok=True)
        container_images = self.ensure_container_images_config()
        for source in selected_paths:
            source_path = Path(source)
            target_path = self.unique_container_target(source_path.name)
            shutil.copy2(source_path, target_path)
            label = target_path.stem.replace("-", " ").replace("_", " ").strip().title()
            container_images.append(
                {
                    "path": f"images/containers/{target_path.name}",
                    "label": label,
                    "alt": label,
                    "enabled": True,
                }
            )

        self.refresh_containers_listbox()
        self.containers_listbox.selection_clear(0, "end")
        self.containers_listbox.selection_set(len(container_images) - 1)
        self.load_selected_container_image()
        self.log(f"{len(selected_paths)} photo(s) de contenant ajoutee(s)")

    def unique_container_target(self, file_name: str) -> Path:
        target_path = CONTAINERS_DIR / file_name
        stem = target_path.stem
        suffix = target_path.suffix
        counter = 2
        while target_path.exists():
            target_path = CONTAINERS_DIR / f"{stem}-{counter}{suffix}"
            counter += 1
        return target_path

    def remove_container_image(self) -> None:
        selection = self.containers_listbox.curselection()
        if not selection:
            return

        container_image = self.ensure_container_images_config().pop(selection[0])
        relative_path = container_image.get("path", "")
        absolute_path = self.resolve_public_asset_path(relative_path)
        if absolute_path.is_file() and absolute_path.is_relative_to(CONTAINERS_DIR):
            try:
                absolute_path.unlink()
            except OSError:
                pass

        self.refresh_containers_listbox()
        self.log(f"Photo contenant supprimee : {relative_path}")

    def move_container_image(self, direction: int) -> None:
        selection = self.containers_listbox.curselection()
        if not selection:
            return

        index = selection[0]
        target_index = index + direction
        container_images = self.ensure_container_images_config()
        if target_index < 0 or target_index >= len(container_images):
            return

        self.reorder_container_image(index, target_index)

    def apply_container_order(self) -> None:
        selection = self.containers_listbox.curselection()
        if not selection:
            return

        container_images = self.ensure_container_images_config()
        try:
            target_position = int(self.container_order_var.get())
        except ValueError:
            messagebox.showerror("Ordre invalide", "Indiquez une position sous forme de nombre.")
            self.container_order_var.set(str(selection[0] + 1))
            return

        target_index = max(0, min(target_position - 1, len(container_images) - 1))
        self.reorder_container_image(selection[0], target_index)

    def reorder_container_image(self, index: int, target_index: int) -> None:
        container_images = self.ensure_container_images_config()
        if index == target_index or index < 0 or target_index < 0:
            self.container_order_var.set(str(index + 1))
            return
        if index >= len(container_images) or target_index >= len(container_images):
            return

        container_image = container_images.pop(index)
        container_images.insert(target_index, container_image)
        self.refresh_containers_listbox()
        self.containers_listbox.selection_clear(0, "end")
        self.containers_listbox.selection_set(target_index)
        self.load_selected_container_image()
        self.log(f"Ordre des contenants mis a jour : position {target_index + 1}")

    def get_selected_container_path(self) -> Path | None:
        relative_path = self.container_path_var.get().strip()
        if not relative_path:
            return None

        return self.resolve_public_asset_path(relative_path)

    def display_container_preview_image(self, image: Image.Image | None, status: str, title: str = "") -> None:
        if image is None:
            self.container_preview_photo = None
            self.container_preview_label.configure(image="", text=title or "Apercu indisponible")
            self.container_preview_status_var.set(status)
            return

        if ImageTk is not None:
            preview_photo = ImageTk.PhotoImage(image)
        else:
            image.save(self.container_preview_temp_path, format="PNG")
            preview_photo = tk.PhotoImage(file=str(self.container_preview_temp_path))
        self.container_preview_photo = preview_photo
        self.container_preview_label.configure(image=preview_photo, text="")
        self.container_preview_status_var.set(status)

    def update_selected_container_preview(self) -> None:
        if Image is None or ImageOps is None:
            self.display_container_preview_image(
                None,
                "Pillow n'est pas installe. Lancez : python3 -m pip install -r admin/requirements.txt",
                title="Pillow requis",
            )
            return

        image_path = self.get_selected_container_path()
        if image_path is None:
            self.display_container_preview_image(None, "Selectionnez une photo de contenant pour afficher son apercu.")
            return

        image = self.load_preview_image(image_path)
        if image is None:
            self.display_container_preview_image(
                None,
                f"Impossible de charger {image_path.name}.",
                title=image_path.name,
            )
            return

        enabled_label = "active" if self.container_enabled_var.get() else "inactive"
        self.display_container_preview_image(
            image,
            f"Apercu : {image_path.name} ({enabled_label})",
        )

    def reload_from_disk(self) -> None:
        self.stop_hero_preview_animation()
        self.config_data = self.load_config()
        self.populate_form()
        self.commit_message_var.set(self.build_default_commit_message())
        self.log("Modifications annulees et configuration rechargee depuis le disque")

    def git_status(self) -> None:
        self.run_git_command(["status", "--short"])

    def git_commit(self) -> bool:
        try:
            self.save_config()
        except (OSError, ValueError) as error:
            messagebox.showerror("VASO-Admin", str(error))
            self.log(f"Erreur de sauvegarde : {error}")
            return False

        commit_message = self.build_effective_commit_message()
        self.commit_message_var.set(commit_message)
        add_process = self.run_git_command(["add", "-A", *PUBLISH_PATHS])
        if add_process.returncode != 0:
            messagebox.showerror(
                "VASO-Admin",
                "Git n'a pas pu preparer les fichiers a publier. Consulte le journal.",
            )
            return False

        diff_process = self.run_git_command(["diff", "--cached", "--name-only", "--", *PUBLISH_PATHS])
        if diff_process.returncode != 0:
            messagebox.showerror(
                "VASO-Admin",
                "Git n'a pas pu verifier les changements a publier. Consulte le journal.",
            )
            return False

        changed_files = [line.strip() for line in diff_process.stdout.splitlines() if line.strip()]
        if not changed_files:
            messagebox.showinfo(
                "VASO-Admin",
                "Aucun changement a publier pour la boutique.",
            )
            self.log("Aucun changement detecte dans la configuration boutique.")
            return False

        self.log(f"Fichiers a publier : {', '.join(changed_files)}")

        commit_process = self.run_git_command(["commit", "-m", commit_message])
        if commit_process.returncode != 0:
            messagebox.showerror(
                "VASO-Admin",
                "Le commit Git a echoue. Consulte le journal pour le detail.",
            )
            return False

        self.log("Commit local cree.")
        return True

    def build_effective_commit_message(self) -> str:
        base_message = self.commit_message_var.get().strip() or self.build_default_commit_message()
        normalized_message = base_message.replace("[skip netlify]", "").replace("[skip ci]", "").strip()

        if self.skip_netlify_deploy_var.get():
            return f"{normalized_message} [skip netlify]"

        return normalized_message

    def git_commit_and_push(self) -> None:
        if not self.git_commit():
            return

        push_process = self.run_git_command(["push", "origin", "main"])
        if push_process.returncode != 0:
            messagebox.showerror(
                "VASO-Admin",
                "Le commit local a bien ete cree, mais le push vers GitHub a echoue. Consulte le journal.",
            )
            return

        self.commit_message_var.set(self.build_default_commit_message())
        messagebox.showinfo(
            "VASO-Admin",
            "Configuration boutique sauvegardee et publiee sur GitHub.",
        )

    def run_git_command(self, args: list[str]) -> subprocess.CompletedProcess[str]:
        process = subprocess.run(
            ["git", *args],
            cwd=REPO_ROOT,
            text=True,
            capture_output=True,
            check=False,
        )
        self.log(f"$ git {' '.join(args)}")
        if process.stdout.strip():
            self.log(process.stdout.strip())
        if process.stderr.strip():
            self.log(process.stderr.strip())
        return process

    def refresh_orders(self) -> None:
        api_url = self.orders_api_url_var.get().strip() or DEFAULT_ORDERS_API_URL
        if self.orders_api_url_var.get().strip() != api_url:
            self.orders_api_url_var.set(api_url)
            self.save_settings()
        api_token = self.get_session_admin_token()

        if not api_token:
            return

        parsed_url = urllib_parse.urlsplit(api_url)
        query_params = urllib_parse.parse_qsl(parsed_url.query, keep_blank_values=True)
        filtered_params = [(key, value) for key, value in query_params if key != "token"]
        filtered_params.append(("token", api_token))
        request_url = urllib_parse.urlunsplit(
            (
                parsed_url.scheme,
                parsed_url.netloc,
                parsed_url.path,
                urllib_parse.urlencode(filtered_params),
                parsed_url.fragment,
            ),
        )

        request = urllib_request.Request(
            request_url,
            headers={
                "x-admin-orders-token": api_token,
                "Authorization": f"Bearer {api_token}",
                "Accept": "application/json",
            },
            method="GET",
        )

        try:
            with urllib_request.urlopen(request, timeout=20) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except urllib_error.HTTPError as error:
            body = error.read().decode("utf-8", errors="replace").strip()
            message = body or f"HTTP {error.code}"
            self.log(f"Erreur API commandes : {message}")
            if error.code == 401:
                self.session_admin_token = ""
                self.session_auth_status_var.set("Token Netlify refusé")
                messagebox.showerror(
                    "VASO-Admin",
                    (
                        "Impossible de charger les commandes.\n"
                        "Le token admin a ete refuse par Netlify.\n"
                        "Renseigne la valeur exacte de ADMIN_ORDERS_TOKEN."
                    ),
                )
                self.prompt_session_admin_token()
                return
            messagebox.showerror("VASO-Admin", f"Impossible de charger les commandes.\n{message}")
            return
        except (urllib_error.URLError, TimeoutError, json.JSONDecodeError) as error:
            self.log(f"Erreur API commandes : {error}")
            messagebox.showerror("VASO-Admin", f"Impossible de charger les commandes.\n{error}")
            return

        self.orders_data = payload.get("orders", []) if isinstance(payload, dict) else []
        self.orders_listbox.delete(0, "end")

        for order in self.orders_data:
            created_at = f"{order.get('createdAt', '')}".replace("T", " ").replace("Z", "")
            order_items = self.get_order_cart_items(order)
            item_count = self.get_order_item_count(order_items)
            seeds = ", ".join(
                f"{item.get('seed', '')}".strip()
                for item in order_items[:3]
                if f"{item.get('seed', '')}".strip()
            )
            if len(order_items) > 3:
                seeds = f"{seeds}, ..." if seeds else "..."
            customer_name = " ".join(
                part.strip()
                for part in [order.get("customerFirstName", ""), order.get("customerLastName", "")]
                if isinstance(part, str) and part.strip()
            ).strip()
            summary = " | ".join(
                part
                for part in [
                    created_at[:16],
                    order.get("orderRef", ""),
                    customer_name,
                    f"{item_count} article(s)",
                    f"vase(s) {seeds}" if seeds else "",
                ]
                if part
            )
            self.orders_listbox.insert("end", summary or "Commande")

        self.write_text(
            self.orders_detail_text,
            "Selectionnez une commande dans la liste." if self.orders_data else "Aucune commande recue pour le moment.",
        )
        self.save_settings()
        self.log(f"Commandes rechargees : {len(self.orders_data)}")

    def build_discord_test_api_url(self) -> str:
        api_url = self.orders_api_url_var.get().strip() or DEFAULT_ORDERS_API_URL
        parsed_url = urllib_parse.urlsplit(api_url)
        path = parsed_url.path

        if path.endswith("/list-orders"):
            path = f"{path[:-len('/list-orders')]}/send-discord-test"
        elif path.endswith("list-orders"):
            path = path[: -len("list-orders")] + "send-discord-test"
        elif "/.netlify/functions/" in path:
            path = DEFAULT_DISCORD_TEST_API_URL.removeprefix("https://vaso-shop.netlify.app")
        else:
            path = DEFAULT_DISCORD_TEST_API_URL.removeprefix("https://vaso-shop.netlify.app")

        return urllib_parse.urlunsplit(
            (
                parsed_url.scheme or "https",
                parsed_url.netloc or urllib_parse.urlsplit(DEFAULT_DISCORD_TEST_API_URL).netloc,
                path,
                "",
                "",
            ),
        )

    def send_discord_test_message(self) -> None:
        api_token = self.get_session_admin_token()
        if not api_token:
            return

        base_url = self.build_discord_test_api_url()
        parsed_url = urllib_parse.urlsplit(base_url)
        query_params = urllib_parse.parse_qsl(parsed_url.query, keep_blank_values=True)
        filtered_params = [(key, value) for key, value in query_params if key != "token"]
        filtered_params.append(("token", api_token))
        request_url = urllib_parse.urlunsplit(
            (
                parsed_url.scheme,
                parsed_url.netloc,
                parsed_url.path,
                urllib_parse.urlencode(filtered_params),
                parsed_url.fragment,
            ),
        )
        request = urllib_request.Request(
            request_url,
            headers={
                "x-admin-orders-token": api_token,
                "Authorization": f"Bearer {api_token}",
                "Accept": "application/json",
                "Content-Type": "application/json; charset=utf-8",
            },
            data=b"{}",
            method="POST",
        )

        try:
            with urllib_request.urlopen(request, timeout=20) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except urllib_error.HTTPError as error:
            body = error.read().decode("utf-8", errors="replace").strip()
            message = body or f"HTTP {error.code}"
            self.log(f"Erreur test Discord : {message}")
            messagebox.showerror("VASO-Admin", f"Impossible d'envoyer le test Discord.\n{message}")
            return
        except (urllib_error.URLError, TimeoutError, json.JSONDecodeError) as error:
            self.log(f"Erreur test Discord : {error}")
            messagebox.showerror("VASO-Admin", f"Impossible d'envoyer le test Discord.\n{error}")
            return

        message = payload.get("message", "Message de test Discord envoye.") if isinstance(payload, dict) else "Message de test Discord envoye."
        self.log(message)
        messagebox.showinfo("VASO-Admin", message)

    def prompt_session_admin_token(self) -> None:
        token = simpledialog.askstring(
            "VASO-Admin",
            "Collez la valeur de ADMIN_ORDERS_TOKEN :",
            parent=self,
            show="*",
        )

        if token is None:
            if not self.session_admin_token:
                self.session_auth_status_var.set("Token Netlify non renseigné")
                self.log("Token Netlify non renseigne.")
            return

        cleaned_token = token.strip()
        if not cleaned_token:
            self.session_admin_token = ""
            self.session_auth_status_var.set("Token Netlify non renseigné")
            self.save_settings()
            self.log("Token Netlify vide.")
            return

        self.session_admin_token = cleaned_token
        self.session_auth_status_var.set(
            "Token Netlify mémorisé" if self.remember_admin_token_var.get() else "Token Netlify renseigné"
        )
        self.save_settings()
        self.log("Token Netlify admin renseigne.")

    def get_session_admin_token(self) -> str:
        if self.session_admin_token:
            return self.session_admin_token

        self.prompt_session_admin_token()
        if not self.session_admin_token:
            messagebox.showerror(
                "VASO-Admin",
                "Le token Netlify est requis pour acceder aux commandes et aux tests Discord.",
            )
        return self.session_admin_token

    def get_order_cart_items(self, order: dict) -> list[dict]:
        cart_items = order.get("cartItems")
        if isinstance(cart_items, list):
            normalized_items = [item for item in cart_items if isinstance(item, dict)]
            if normalized_items:
                return normalized_items

        return [
            {
                "seed": order.get("seed"),
                "version": order.get("version"),
                "heightMm": order.get("heightMm"),
                "minDiameterMm": order.get("minDiameterMm"),
                "maxDiameterMm": order.get("maxDiameterMm"),
                "waterproofInsertLabel": order.get("waterproofInsertLabel"),
                "solifloreChoiceLabel": order.get("solifloreChoiceLabel"),
                "forceTestTubeSupport": order.get("forceTestTubeSupport") in [True, "yes"],
                "suppressTestTubeSupport": order.get("suppressTestTubeSupport") in [True, "yes"],
                "material": order.get("material"),
                "colorLabel": order.get("colorLabel"),
                "quantity": order.get("itemCount", 1),
            }
        ]

    def get_order_item_count(self, order_items: list[dict]) -> int:
        total = 0
        for item in order_items:
            try:
                total += max(1, int(item.get("quantity", 1)))
            except (TypeError, ValueError):
                total += 1
        return total

    def format_bool_fr(self, value: object) -> str:
        return "oui" if value in [True, "yes"] else "non"

    def format_order_item_detail(self, item: dict, index: int) -> str:
        dimensions = []
        if item.get("heightMm"):
            dimensions.append(f"H {item.get('heightMm')} mm")
        if item.get("minDiameterMm") and item.get("maxDiameterMm"):
            dimensions.append(f"Ø {item.get('minDiameterMm')} à {item.get('maxDiameterMm')} mm")

        details = [
            f"{item.get('quantity', 1)} x Vase n° {item.get('seed', 'n/a')}",
            f"Version {item.get('version')}" if item.get("version") else "",
            " · ".join(dimensions),
            f"Couleur : {item.get('colorLabel')}" if item.get("colorLabel") else "",
            f"Contenant : {item.get('waterproofInsertLabel')}" if item.get("waterproofInsertLabel") else "",
            f"Usage : {item.get('solifloreChoiceLabel')}" if item.get("solifloreChoiceLabel") else "",
            f"Support tube : {self.format_bool_fr(item.get('forceTestTubeSupport'))}",
            "Support supprime" if item.get("suppressTestTubeSupport") in [True, "yes"] else "",
            f"Materiau : {item.get('material')}" if item.get("material") else "",
        ]
        return f"{index + 1}. " + " | ".join(part for part in details if part)

    def load_selected_order(self) -> None:
        selection = self.orders_listbox.curselection()
        if not selection:
            return

        order = self.orders_data[selection[0]]
        production_files = self.get_order_production_files(order)
        order_items = self.get_order_cart_items(order)
        customer_full_name = " ".join(
            part.strip()
            for part in [order.get("customerFirstName", ""), order.get("customerLastName", "")]
            if isinstance(part, str) and part.strip()
        ).strip()
        address_lines = [
            order.get("customerAddress", ""),
            " ".join(
                part.strip()
                for part in [order.get("customerPostalCode", ""), order.get("customerCity", "")]
                if isinstance(part, str) and part.strip()
            ).strip(),
            order.get("customerCountry", ""),
        ]
        relay_lines = [
            order.get("relayName", ""),
            order.get("relayAddress", ""),
            " ".join(
                part.strip()
                for part in [order.get("relayPostalCode", ""), order.get("relayCity", "")]
                if isinstance(part, str) and part.strip()
            ).strip(),
            order.get("relayCountry", ""),
        ]
        detail_lines = [
            f"Reference : {order.get('orderRef', 'n/a')}",
            f"Date : {order.get('createdAt', 'n/a')}",
            f"Articles : {self.get_order_item_count(order_items)}",
            f"JSON production : {'disponible' if production_files else 'absent'}",
            "",
            "Vases :",
            *[self.format_order_item_detail(item, index) for index, item in enumerate(order_items)],
            "",
            f"Client : {customer_full_name or 'n/a'}",
            f"Email : {order.get('customerEmail', 'n/a')}",
            f"Telephone : {order.get('customerPhone', 'non renseigne')}",
            f"Adresse : {', '.join(line for line in address_lines if isinstance(line, str) and line.strip()) or 'n/a'}",
            "",
            f"Livraison : {order.get('shippingMode', 'n/a')}",
            f"Transporteur : {order.get('shippingProvider', 'n/a')}",
            f"Point relais : {', '.join(line for line in relay_lines if isinstance(line, str) and line.strip()) or 'non'}",
            "",
            f"Montant : {order.get('amountTotal', 'n/a')} {order.get('currency', '')}",
            f"Statut paiement : {order.get('paymentStatus', 'n/a')}",
        ]

        if order.get("customerMessage"):
            detail_lines.extend(["", f"Message client : {order.get('customerMessage')}"])

        if production_files:
            detail_lines.extend(
                [
                    "",
                    "Fichiers production :",
                    *[f"- {production_file.get('filename', 'vase-production.json')}" for production_file in production_files],
                ]
            )

        self.write_text(self.orders_detail_text, "\n".join(detail_lines))

    def get_selected_order(self) -> dict | None:
        selection = self.orders_listbox.curselection()
        if not selection:
            messagebox.showinfo("VASO-Admin", "Selectionnez d'abord une commande.")
            return None

        return self.orders_data[selection[0]]

    def get_order_production_files(self, order: dict) -> list[dict]:
        production_files = order.get("productionVaseFiles")
        if isinstance(production_files, list):
            return [production_file for production_file in production_files if isinstance(production_file, dict)]

        cart_items = order.get("cartItems")
        if not isinstance(cart_items, list):
            return []

        fallback_files: list[dict] = []
        for index, item in enumerate(cart_items):
            if not isinstance(item, dict) or not isinstance(item.get("params"), dict):
                continue
            seed = item.get("seed", order.get("seed", ""))
            seed_label = str(seed).zfill(8) if str(seed).isdigit() else str(seed or "vase")
            fallback_files.append(
                {
                    "filename": f"{order.get('orderRef', 'commande')}-vase-{index + 1}-{seed_label}.json",
                    "content": {
                        "schema": "vaso-production-vase-v1",
                        "orderRef": order.get("orderRef"),
                        "itemIndex": index,
                        "seed": seed,
                        "version": item.get("version", order.get("version")),
                        "colorId": item.get("colorId", order.get("colorId")),
                        "colorLabel": item.get("colorLabel", order.get("colorLabel")),
                        "material": item.get("material", order.get("material")),
                        "waterproofInsertLabel": item.get(
                            "waterproofInsertLabel",
                            order.get("waterproofInsertLabel"),
                        ),
                        "solifloreChoice": item.get("solifloreChoice", order.get("solifloreChoice")),
                        "solifloreChoiceLabel": item.get(
                            "solifloreChoiceLabel",
                            order.get("solifloreChoiceLabel"),
                        ),
                        "forceTestTubeSupport": item.get(
                            "forceTestTubeSupport",
                            order.get("forceTestTubeSupport"),
                        ),
                        "suppressTestTubeSupport": item.get(
                            "suppressTestTubeSupport",
                            order.get("suppressTestTubeSupport"),
                        ),
                        "quantity": item.get("quantity", 1),
                        "params": item["params"],
                    },
                }
            )
        return fallback_files

    def sanitize_filename(self, filename: str) -> str:
        safe = "".join(char if char.isalnum() or char in "._-" else "-" for char in filename)
        safe = "-".join(part for part in safe.split("-") if part)
        return safe or "vaso-production.json"

    def write_production_file(self, path: Path, production_file: dict) -> None:
        content = production_file.get("content")
        if not isinstance(content, dict):
            content = production_file
        with path.open("w", encoding="utf-8") as handle:
            json.dump(content, handle, indent=2, ensure_ascii=False)
            handle.write("\n")

    def export_selected_order_production_json(self) -> None:
        order = self.get_selected_order()
        if not order:
            return

        production_files = self.get_order_production_files(order)
        if not production_files:
            messagebox.showwarning(
                "VASO-Admin",
                "Cette commande ne contient pas encore de JSON production.",
            )
            return

        if len(production_files) == 1:
            filename = self.sanitize_filename(
                str(production_files[0].get("filename", "vaso-production.json"))
            )
            target = filedialog.asksaveasfilename(
                title="Exporter le JSON production",
                initialfile=filename,
                defaultextension=".json",
                filetypes=[("JSON", "*.json"), ("Tous les fichiers", "*.*")],
            )
            if not target:
                return
            self.write_production_file(Path(target), production_files[0])
            self.log(f"JSON production exporte : {target}")
            messagebox.showinfo("VASO-Admin", "JSON production exporte.")
            return

        target_dir = filedialog.askdirectory(title="Choisir le dossier d'export production")
        if not target_dir:
            return

        for production_file in production_files:
            filename = self.sanitize_filename(
                str(production_file.get("filename", "vaso-production.json"))
            )
            self.write_production_file(Path(target_dir) / filename, production_file)

        self.log(f"JSON production exportes : {len(production_files)} fichier(s) dans {target_dir}")
        messagebox.showinfo("VASO-Admin", f"{len(production_files)} JSON production exporte(s).")

    def write_text(self, widget: tk.Text, value: str) -> None:
        widget.delete("1.0", "end")
        widget.insert("1.0", value)

    def on_theme_change(self) -> None:
        self.apply_theme(self.theme_name_var.get())
        self.log(f"Theme applique : {self.theme_name_var.get()}")

    def apply_theme(self, theme_name: str) -> None:
        theme = THEMES.get(theme_name)
        if theme is None:
            theme_name = next(iter(THEMES))
            theme = THEMES[theme_name]
            self.theme_name_var.set(theme_name)

        self.active_theme = theme
        self.configure(bg=theme["BG"])
        self.option_add("*Foreground", theme["FG"])
        self.option_add("*Background", theme["BG"])

        self.style.configure("TFrame", background=theme["BG"])
        self.style.configure("TLabel", background=theme["BG"], foreground=theme["FG"])
        self.style.configure(
            "TButton",
            background=theme["PANEL"],
            foreground=theme["FG"],
            borderwidth=0,
            focusthickness=0,
            padding=(10, 6),
        )
        self.style.map(
            "TButton",
            background=[("active", theme["ACCENT"]), ("pressed", theme["ACCENT"])],
            foreground=[("active", theme["FIELD_FG"]), ("pressed", theme["FIELD_FG"])],
        )
        self.style.configure(
            "TEntry",
            fieldbackground=theme["FIELD"],
            foreground=theme["FIELD_FG"],
            insertcolor=theme["FIELD_FG"],
        )
        self.style.configure(
            "TCombobox",
            fieldbackground=theme["FIELD"],
            background=theme["PANEL"],
            foreground=theme["FIELD_FG"],
            arrowcolor=theme["FG"],
        )
        self.style.configure(
            "TLabelframe",
            background=theme["BG"],
            borderwidth=1,
            relief="solid",
        )
        self.style.configure(
            "TLabelframe.Label",
            background=theme["BG"],
            foreground=theme["FG"],
        )
        self.style.map(
            "TCombobox",
            fieldbackground=[("readonly", theme["FIELD"])],
            foreground=[("readonly", theme["FIELD_FG"])],
            selectbackground=[("readonly", theme["ACCENT"])],
            selectforeground=[("readonly", theme["FIELD_FG"])],
        )
        self.style.configure("TCheckbutton", background=theme["BG"], foreground=theme["FG"])
        self.style.map(
            "TCheckbutton",
            background=[("active", theme["BG"])],
            foreground=[("active", theme["FG"])],
            indicatorcolor=[("selected", theme["ACCENT"]), ("!selected", theme["FIELD"])],
        )
        self.style.configure("TNotebook", background=theme["BG"], borderwidth=0, tabmargins=(0, 0, 0, 0))
        self.style.configure(
            "TNotebook.Tab",
            background=theme["PANEL"],
            foreground=theme["FG"],
            padding=(12, 8),
            borderwidth=0,
        )
        self.style.map(
            "TNotebook.Tab",
            background=[("selected", theme["ACCENT"]), ("active", theme["PANEL"])],
            foreground=[("selected", theme["FIELD_FG"]), ("active", theme["FG"])],
        )

        for widget in self.tk_text_widgets:
            widget.configure(
                bg=theme["FIELD"],
                fg=theme["FIELD_FG"],
                insertbackground=theme["FIELD_FG"],
                selectbackground=theme["ACCENT"],
                selectforeground=theme["FIELD_FG"],
                highlightbackground=theme["PANEL"],
                highlightcolor=theme["ACCENT"],
                relief="flat",
                borderwidth=1,
            )

        for widget in self.tk_listbox_widgets:
            widget.configure(
                bg=theme["PANEL"],
                fg=theme["FG"],
                selectbackground=theme["ACCENT"],
                selectforeground=theme["FIELD_FG"],
                highlightbackground=theme["PANEL"],
                highlightcolor=theme["ACCENT"],
                relief="flat",
                borderwidth=1,
            )

        self.hero_preview_label.configure(
            bg=theme["FIELD"],
            fg=theme["FIELD_FG"],
            highlightbackground=theme["PANEL"],
            highlightcolor=theme["ACCENT"],
            padx=10,
            pady=10,
        )
        self.hero_preview_surface.configure(
            bg=theme["PANEL"],
            highlightbackground=theme["ACCENT"],
            highlightcolor=theme["ACCENT"],
        )
        self.container_preview_label.configure(
            bg=theme["FIELD"],
            fg=theme["FIELD_FG"],
            highlightbackground=theme["PANEL"],
            highlightcolor=theme["ACCENT"],
            padx=10,
            pady=10,
        )
        self.container_preview_surface.configure(
            bg=theme["PANEL"],
            highlightbackground=theme["ACCENT"],
            highlightcolor=theme["ACCENT"],
        )

        self.save_settings()

    def log(self, message: str) -> None:
        self.output_text.insert("end", f"{message}\n")
        self.output_text.see("end")


def main() -> None:
    if not CONFIG_PATH.exists():
        messagebox.showerror("VASO-Admin", f"Configuration introuvable : {CONFIG_PATH}")
        raise SystemExit(1)

    app = VasoAdminApp()
    app.mainloop()


if __name__ == "__main__":
    main()
