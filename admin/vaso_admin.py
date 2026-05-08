#!/usr/bin/env python3

from __future__ import annotations

import json
import shutil
import subprocess
import tempfile
from datetime import datetime
from pathlib import Path
import tkinter as tk
from tkinter import filedialog, messagebox, ttk

try:
    from PIL import Image, ImageOps
except ImportError:  # pragma: no cover - fallback runtime only
    Image = None
    ImageOps = None

try:
    from PIL import ImageTk
except ImportError:  # pragma: no cover - fallback runtime only
    ImageTk = None


REPO_ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = REPO_ROOT / "public" / "config" / "shop-config.json"
HERO_DIR = REPO_ROOT / "public" / "images" / "hero"
ADMIN_SETTINGS_PATH = REPO_ROOT / "admin" / ".vaso_admin_settings.json"
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
        self.shipping_lead_time_var = tk.StringVar()
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

        self.commit_message_var = tk.StringVar(value=self.build_default_commit_message())
        self.theme_name_var = tk.StringVar(
            value=self.settings_data.get("theme", next(iter(THEMES))),
        )

        self.active_theme = THEMES[self.theme_name_var.get()] if self.theme_name_var.get() in THEMES else next(iter(THEMES.values()))
        self.hero_preview_photo = None
        self.hero_preview_temp_path = Path(tempfile.gettempdir()) / "vaso-admin-hero-preview.png"
        self.hero_preview_cycle_after_id = None
        self.hero_preview_frame_after_id = None
        self.hero_preview_is_animating = False
        self.hero_preview_current_index = 0

        self.price_euros_var.trace_add("write", lambda *_args: self.update_price_preview())
        self.price_cents_var.trace_add("write", lambda *_args: self.update_price_preview())

        self.build_ui()
        self.populate_form()
        self.apply_theme(self.theme_name_var.get())

    def load_config(self) -> dict:
        with CONFIG_PATH.open("r", encoding="utf-8") as handle:
            return json.load(handle)

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
            json.dump({"theme": self.theme_name_var.get()}, handle, indent=2, ensure_ascii=False)
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
        self.contact_frame = ttk.Frame(notebook, padding=8)
        self.printer_frame = ttk.Frame(notebook, padding=8)
        self.colors_frame = ttk.Frame(notebook, padding=8)
        self.hero_frame = ttk.Frame(notebook, padding=8)
        self.publish_frame = ttk.Frame(notebook, padding=8)

        notebook.add(self.general_frame, text="Boutique")
        notebook.add(self.pricing_frame, text="Tarifs")
        notebook.add(self.contact_frame, text="Contact courriel")
        notebook.add(self.printer_frame, text="Imprimante")
        notebook.add(self.colors_frame, text="Couleurs")
        notebook.add(self.hero_frame, text="Hero")
        notebook.add(self.publish_frame, text="Publication")

        self.build_general_tab()
        self.build_pricing_tab()
        self.build_contact_tab()
        self.build_printer_tab()
        self.build_colors_tab()
        self.build_hero_tab()
        self.build_publish_tab()

        self.tk_text_widgets = [
            self.status_message_text,
            self.temporary_notice_text,
            self.atelier_note_text,
            self.warning_text,
            self.color_preview_note_text,
            self.contact_email_body_text,
            self.shipping_unsupported_text,
            self.output_text,
        ]
        self.tk_listbox_widgets = [self.colors_listbox, self.hero_listbox]

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

        ttk.Label(frame, text="Delai expedition").grid(row=4, column=0, sticky="w")
        ttk.Entry(frame, textvariable=self.shipping_lead_time_var).grid(row=4, column=1, sticky="ew", pady=4)

        ttk.Label(frame, text="Message temporaire").grid(row=5, column=0, sticky="nw")
        self.temporary_notice_text = tk.Text(frame, height=1, wrap="word")
        self.temporary_notice_text.grid(row=5, column=1, sticky="nsew", pady=4)

        ttk.Label(frame, text="Texte atelier").grid(row=6, column=0, sticky="nw")
        atelier_frame = ttk.Frame(frame)
        atelier_frame.grid(row=6, column=1, sticky="ew", pady=4)
        atelier_frame.columnconfigure(0, weight=1)
        atelier_frame.rowconfigure(0, weight=1)
        self.atelier_note_text = tk.Text(atelier_frame, height=4, wrap="word")
        self.atelier_note_text.grid(row=0, column=0, sticky="ew")
        self.atelier_note_scrollbar = ttk.Scrollbar(atelier_frame, orient="vertical", command=self.atelier_note_text.yview)
        self.atelier_note_scrollbar.grid(row=0, column=1, sticky="ns")
        self.atelier_note_text.configure(yscrollcommand=self.atelier_note_scrollbar.set)

        ttk.Label(frame, text="Avertissement PLA").grid(row=7, column=0, sticky="nw")
        warning_frame = ttk.Frame(frame)
        warning_frame.grid(row=7, column=1, sticky="ew", pady=4)
        warning_frame.columnconfigure(0, weight=1)
        warning_frame.rowconfigure(0, weight=1)
        self.warning_text = tk.Text(warning_frame, height=4, wrap="word")
        self.warning_text.grid(row=0, column=0, sticky="ew")
        self.warning_scrollbar = ttk.Scrollbar(warning_frame, orient="vertical", command=self.warning_text.yview)
        self.warning_scrollbar.grid(row=0, column=1, sticky="ns")
        self.warning_text.configure(yscrollcommand=self.warning_scrollbar.set)

        ttk.Label(frame, text="Avertissement couleur").grid(row=8, column=0, sticky="nw")
        color_note_frame = ttk.Frame(frame)
        color_note_frame.grid(row=8, column=1, sticky="ew", pady=4)
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
        frame.rowconfigure(5, weight=0)
        frame.rowconfigure(6, weight=0)
        frame.rowconfigure(7, weight=0)
        frame.rowconfigure(8, weight=0)

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
        frame.rowconfigure(2, weight=1)

        content = ttk.Frame(frame)
        content.grid(row=1, column=0, sticky="n")
        content.columnconfigure(1, weight=1)

        ttk.Label(content, text="Prix").grid(row=0, column=0, sticky="w")
        price_row = ttk.Frame(content)
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

        ttk.Label(content, text="Message pays non geres").grid(row=1, column=0, sticky="nw", pady=(12, 0))
        self.shipping_unsupported_text = tk.Text(content, height=2, wrap="word", width=56)
        self.shipping_unsupported_text.grid(row=1, column=1, sticky="ew", pady=(12, 0))

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

        buttons = ttk.Frame(publish_panel)
        buttons.grid(row=2, column=0)
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
        self.shipping_lead_time_var.set(messages.get("shippingLeadTime", ""))
        self.temporary_notice_var.set(messages.get("temporaryNotice", ""))
        self.contact_prompt_var.set(messages.get("contactPrompt", "Vous avez des questions ?"))
        self.contact_button_label_var.set(messages.get("contactButtonLabel", "Contactez nous"))
        self.contact_email_var.set(messages.get("contactEmail", ""))
        self.contact_email_subject_var.set(messages.get("contactEmailSubject", "Contact VASO SHOP"))

        self.write_text(self.status_message_text, shop_status.get("message", ""))
        self.write_text(self.temporary_notice_text, messages.get("temporaryNotice", ""))
        self.write_text(self.atelier_note_text, messages.get("atelierNote", ""))
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

        self.refresh_colors_listbox()
        self.refresh_hero_listbox()

    def collect_form(self) -> None:
        existing_shipping_countries = self.config_data.get("shipping", {}).get("countries", [])
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

    def parse_shipping_countries(self) -> list[dict]:
        raw_json = self.shipping_countries_text.get("1.0", "end").strip()
        try:
            parsed = json.loads(raw_json or "[]")
        except json.JSONDecodeError as error:
            raise ValueError(f"JSON livraison invalide : {error}") from error

        if not isinstance(parsed, list):
            raise ValueError("La grille livraison doit etre une liste JSON.")

        return parsed

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
        try:
            if self.hero_preview_temp_path.exists():
                self.hero_preview_temp_path.unlink()
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

    def reload_from_disk(self) -> None:
        self.stop_hero_preview_animation()
        self.config_data = self.load_config()
        self.populate_form()
        self.commit_message_var.set(self.build_default_commit_message())
        self.log("Modifications annulees et configuration rechargee depuis le disque")

    def git_status(self) -> None:
        self.run_git_command(["status", "--short"])

    def git_commit(self) -> None:
        self.save_config()
        commit_message = self.commit_message_var.get().strip() or self.build_default_commit_message()
        self.commit_message_var.set(commit_message)
        self.run_git_command(["add", "-A", "public/config/shop-config.json", "public/images/hero", "admin"])
        self.run_git_command(["commit", "-m", commit_message])

    def git_commit_and_push(self) -> None:
        self.git_commit()
        self.run_git_command(["push", "origin", "main"])
        self.commit_message_var.set(self.build_default_commit_message())

    def run_git_command(self, args: list[str]) -> None:
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
