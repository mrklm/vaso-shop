#!/usr/bin/env python3

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path
import tkinter as tk
from tkinter import filedialog, messagebox, ttk


REPO_ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = REPO_ROOT / "public" / "config" / "shop-config.json"
HERO_DIR = REPO_ROOT / "public" / "images" / "hero"
ADMIN_SETTINGS_PATH = REPO_ROOT / "admin" / ".vaso_admin_settings.json"

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


class VasoAdminApp(tk.Tk):
    def __init__(self) -> None:
        super().__init__()
        self.title("VASO-Admin")
        self.geometry("1220x880")
        self.minsize(1080, 760)

        self.config_data = self.load_config()
        self.settings_data = self.load_settings()
        self.style = ttk.Style(self)
        self.style.theme_use("clam")

        self.status_state_var = tk.StringVar()
        self.status_label_var = tk.StringVar()
        self.status_message_var = tk.StringVar()
        self.status_allow_checkout_var = tk.BooleanVar()
        self.shipping_lead_time_var = tk.StringVar()
        self.temporary_notice_var = tk.StringVar()
        self.contact_prompt_var = tk.StringVar()
        self.contact_button_label_var = tk.StringVar()

        self.default_size_var = tk.StringVar()
        self.price_s_var = tk.StringVar()
        self.price_m_var = tk.StringVar()
        self.price_l_var = tk.StringVar()
        self.free_shipping_threshold_var = tk.StringVar()

        self.color_id_var = tk.StringVar()
        self.color_label_var = tk.StringVar()
        self.color_hex_var = tk.StringVar()
        self.color_available_var = tk.BooleanVar()

        self.hero_enabled_var = tk.BooleanVar()
        self.hero_path_var = tk.StringVar()

        self.commit_message_var = tk.StringVar(value="Met a jour la configuration boutique")
        self.theme_name_var = tk.StringVar(
            value=self.settings_data.get("theme", next(iter(THEMES))),
        )

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

    def build_ui(self) -> None:
        toolbar = ttk.Frame(self, padding=(12, 12, 12, 0))
        toolbar.pack(fill="x")

        ttk.Label(toolbar, text="Theme interface").pack(side="left")
        self.theme_selector = ttk.Combobox(
            toolbar,
            textvariable=self.theme_name_var,
            values=list(THEMES.keys()),
            state="readonly",
            width=34,
        )
        self.theme_selector.pack(side="left", padx=(8, 0))
        self.theme_selector.bind("<<ComboboxSelected>>", lambda _event: self.on_theme_change())

        self.notebook = ttk.Notebook(self)
        notebook = self.notebook
        notebook.pack(fill="both", expand=True, padx=12, pady=12)

        self.general_frame = ttk.Frame(notebook, padding=12)
        self.pricing_frame = ttk.Frame(notebook, padding=12)
        self.colors_frame = ttk.Frame(notebook, padding=12)
        self.hero_frame = ttk.Frame(notebook, padding=12)
        self.publish_frame = ttk.Frame(notebook, padding=12)

        notebook.add(self.general_frame, text="Boutique")
        notebook.add(self.pricing_frame, text="Tarifs")
        notebook.add(self.colors_frame, text="Couleurs")
        notebook.add(self.hero_frame, text="Hero")
        notebook.add(self.publish_frame, text="Publication")

        self.build_general_tab()
        self.build_pricing_tab()
        self.build_colors_tab()
        self.build_hero_tab()
        self.build_publish_tab()

        self.tk_text_widgets = [
            self.status_message_text,
            self.temporary_notice_text,
            self.atelier_note_text,
            self.warning_text,
            self.shipping_unsupported_text,
            self.shipping_countries_text,
            self.output_text,
        ]
        self.tk_listbox_widgets = [self.colors_listbox, self.hero_listbox]

    def build_general_tab(self) -> None:
        frame = self.general_frame
        frame.columnconfigure(1, weight=1)

        ttk.Label(frame, text="Etat boutique").grid(row=0, column=0, sticky="w")
        ttk.Combobox(
            frame,
            textvariable=self.status_state_var,
            values=["open", "slowed", "holiday", "closed"],
            state="readonly",
        ).grid(row=0, column=1, sticky="ew", pady=4)

        ttk.Label(frame, text="Libelle etat").grid(row=1, column=0, sticky="w")
        ttk.Entry(frame, textvariable=self.status_label_var).grid(row=1, column=1, sticky="ew", pady=4)

        ttk.Label(frame, text="Message etat").grid(row=2, column=0, sticky="nw")
        self.status_message_text = tk.Text(frame, height=3, wrap="word")
        self.status_message_text.grid(row=2, column=1, sticky="nsew", pady=4)

        ttk.Checkbutton(
          frame,
          text="Autoriser les commandes",
          variable=self.status_allow_checkout_var,
        ).grid(row=3, column=1, sticky="w", pady=(0, 8))

        ttk.Label(frame, text="Delai expedition").grid(row=4, column=0, sticky="w")
        ttk.Entry(frame, textvariable=self.shipping_lead_time_var).grid(row=4, column=1, sticky="ew", pady=4)

        ttk.Label(frame, text="Message temporaire").grid(row=5, column=0, sticky="nw")
        self.temporary_notice_text = tk.Text(frame, height=3, wrap="word")
        self.temporary_notice_text.grid(row=5, column=1, sticky="nsew", pady=4)

        ttk.Label(frame, text="Texte atelier").grid(row=6, column=0, sticky="nw")
        self.atelier_note_text = tk.Text(frame, height=5, wrap="word")
        self.atelier_note_text.grid(row=6, column=1, sticky="nsew", pady=4)

        ttk.Label(frame, text="Avertissement PLA").grid(row=7, column=0, sticky="nw")
        self.warning_text = tk.Text(frame, height=8, wrap="word")
        self.warning_text.grid(row=7, column=1, sticky="nsew", pady=4)

        ttk.Label(frame, text="Question contact").grid(row=8, column=0, sticky="w")
        ttk.Entry(frame, textvariable=self.contact_prompt_var).grid(row=8, column=1, sticky="ew", pady=4)

        ttk.Label(frame, text="Libelle bouton contact").grid(row=9, column=0, sticky="w")
        ttk.Entry(frame, textvariable=self.contact_button_label_var).grid(row=9, column=1, sticky="ew", pady=4)

        frame.rowconfigure(2, weight=0)
        frame.rowconfigure(5, weight=0)
        frame.rowconfigure(6, weight=1)
        frame.rowconfigure(7, weight=1)

    def build_pricing_tab(self) -> None:
        frame = self.pricing_frame
        frame.columnconfigure(1, weight=1)

        ttk.Label(frame, text="Taille active sur le shop").grid(row=0, column=0, sticky="w")
        ttk.Combobox(
            frame,
            textvariable=self.default_size_var,
            values=["S", "M", "L"],
            state="readonly",
        ).grid(row=0, column=1, sticky="ew", pady=4)

        ttk.Label(frame, text="Prix S (centimes)").grid(row=1, column=0, sticky="w")
        ttk.Entry(frame, textvariable=self.price_s_var).grid(row=1, column=1, sticky="ew", pady=4)

        ttk.Label(frame, text="Prix M (centimes)").grid(row=2, column=0, sticky="w")
        ttk.Entry(frame, textvariable=self.price_m_var).grid(row=2, column=1, sticky="ew", pady=4)

        ttk.Label(frame, text="Prix L (centimes)").grid(row=3, column=0, sticky="w")
        ttk.Entry(frame, textvariable=self.price_l_var).grid(row=3, column=1, sticky="ew", pady=4)

        ttk.Label(frame, text="Seuil livraison offerte (centimes)").grid(row=4, column=0, sticky="w")
        ttk.Entry(frame, textvariable=self.free_shipping_threshold_var).grid(row=4, column=1, sticky="ew", pady=4)

        ttk.Label(frame, text="Message pays non geres").grid(row=5, column=0, sticky="nw")
        self.shipping_unsupported_text = tk.Text(frame, height=3, wrap="word")
        self.shipping_unsupported_text.grid(row=5, column=1, sticky="ew", pady=4)

        ttk.Label(frame, text="Grille livraison (JSON)").grid(row=6, column=0, sticky="nw")
        self.shipping_countries_text = tk.Text(frame, height=22, wrap="none")
        self.shipping_countries_text.grid(row=6, column=1, sticky="nsew", pady=4)

        frame.rowconfigure(6, weight=1)

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

    def build_hero_tab(self) -> None:
        frame = self.hero_frame
        frame.columnconfigure(1, weight=1)
        frame.rowconfigure(0, weight=1)

        left = ttk.Frame(frame)
        left.grid(row=0, column=0, sticky="nsw", padx=(0, 12))
        right = ttk.Frame(frame)
        right.grid(row=0, column=1, sticky="nsew")
        right.columnconfigure(1, weight=1)

        self.hero_listbox = tk.Listbox(left, width=40, exportselection=False)
        self.hero_listbox.pack(fill="y", expand=True)
        self.hero_listbox.bind("<<ListboxSelect>>", lambda _event: self.load_selected_hero_image())

        hero_buttons = ttk.Frame(left)
        hero_buttons.pack(fill="x", pady=(8, 0))
        ttk.Button(hero_buttons, text="Ajouter des images", command=self.add_hero_images).pack(side="left")
        ttk.Button(hero_buttons, text="Supprimer", command=self.remove_hero_image).pack(side="left", padx=4)
        ttk.Button(hero_buttons, text="Monter", command=lambda: self.move_hero_image(-1)).pack(side="left")
        ttk.Button(hero_buttons, text="Descendre", command=lambda: self.move_hero_image(1)).pack(side="left", padx=4)

        ttk.Label(right, text="Chemin publie").grid(row=0, column=0, sticky="w")
        ttk.Entry(right, textvariable=self.hero_path_var).grid(row=0, column=1, sticky="ew", pady=4)
        ttk.Checkbutton(right, text="Image active", variable=self.hero_enabled_var).grid(
            row=1, column=1, sticky="w", pady=4
        )
        ttk.Button(right, text="Appliquer les changements", command=self.apply_hero_changes).grid(
            row=2, column=1, sticky="e", pady=8
        )

        help_text = (
            "Les fichiers sont copies automatiquement dans public/images/hero/.\n"
            "La liste ci-dessus definit l'ordre et l'activation reelle sur le site."
        )
        ttk.Label(right, text=help_text, justify="left").grid(row=3, column=0, columnspan=2, sticky="w", pady=(8, 0))

    def build_publish_tab(self) -> None:
        frame = self.publish_frame
        frame.columnconfigure(1, weight=1)
        frame.rowconfigure(2, weight=1)

        ttk.Label(frame, text="Message de commit").grid(row=0, column=0, sticky="w")
        ttk.Entry(frame, textvariable=self.commit_message_var).grid(row=0, column=1, sticky="ew", pady=4)

        buttons = ttk.Frame(frame)
        buttons.grid(row=1, column=0, columnspan=2, sticky="w", pady=8)
        ttk.Button(buttons, text="Recharger la config", command=self.reload_from_disk).pack(side="left")
        ttk.Button(buttons, text="Sauvegarder", command=self.save_config).pack(side="left", padx=4)
        ttk.Button(buttons, text="Git status", command=self.git_status).pack(side="left")
        ttk.Button(buttons, text="Commit", command=self.git_commit).pack(side="left", padx=4)
        ttk.Button(buttons, text="Commit + Push", command=self.git_commit_and_push).pack(side="left")

        self.output_text = tk.Text(frame, height=26, wrap="word")
        self.output_text.grid(row=2, column=0, columnspan=2, sticky="nsew")

    def populate_form(self) -> None:
        pricing = self.config_data.get("pricing", {})
        shop_status = self.config_data.get("shopStatus", {})
        messages = self.config_data.get("messages", {})
        shipping = self.config_data.get("shipping", {})

        self.status_state_var.set(shop_status.get("state", "open"))
        self.status_label_var.set(shop_status.get("label", ""))
        self.status_allow_checkout_var.set(bool(shop_status.get("allowCheckout", True)))
        self.status_message_var.set(shop_status.get("message", ""))
        self.shipping_lead_time_var.set(messages.get("shippingLeadTime", ""))
        self.temporary_notice_var.set(messages.get("temporaryNotice", ""))
        self.contact_prompt_var.set(messages.get("contactPrompt", "Vous avez des questions ?"))
        self.contact_button_label_var.set(messages.get("contactButtonLabel", "Contactez nous"))

        self.write_text(self.status_message_text, shop_status.get("message", ""))
        self.write_text(self.temporary_notice_text, messages.get("temporaryNotice", ""))
        self.write_text(self.atelier_note_text, messages.get("atelierNote", ""))
        self.write_text(self.warning_text, messages.get("warningPla", ""))
        self.write_text(self.shipping_unsupported_text, shipping.get("unsupportedMessage", ""))
        self.write_text(
            self.shipping_countries_text,
            json.dumps(shipping.get("countries", []), indent=2, ensure_ascii=False),
        )

        self.default_size_var.set(pricing.get("defaultSize", "M"))
        prices_cents = pricing.get("pricesCents", {})
        self.price_s_var.set(str(prices_cents.get("S", 0)))
        self.price_m_var.set(str(prices_cents.get("M", 2500)))
        self.price_l_var.set(str(prices_cents.get("L", 0)))
        self.free_shipping_threshold_var.set(str(pricing.get("freeShippingThresholdCents", 0)))

        self.refresh_colors_listbox()
        self.refresh_hero_listbox()

    def collect_form(self) -> None:
        self.config_data["shopStatus"] = {
            "state": self.status_state_var.get().strip() or "open",
            "label": self.status_label_var.get().strip(),
            "message": self.status_message_text.get("1.0", "end").strip(),
            "allowCheckout": bool(self.status_allow_checkout_var.get()),
        }
        self.config_data["messages"] = {
            "shippingLeadTime": self.shipping_lead_time_var.get().strip(),
            "temporaryNotice": self.temporary_notice_text.get("1.0", "end").strip(),
            "atelierNote": self.atelier_note_text.get("1.0", "end").strip(),
            "warningPla": self.warning_text.get("1.0", "end").strip(),
            "contactPrompt": self.contact_prompt_var.get().strip(),
            "contactButtonLabel": self.contact_button_label_var.get().strip(),
        }
        self.config_data["pricing"] = {
            "defaultSize": self.default_size_var.get().strip() or "M",
            "pricesCents": {
                "S": self.parse_int(self.price_s_var.get(), "prix S"),
                "M": self.parse_int(self.price_m_var.get(), "prix M"),
                "L": self.parse_int(self.price_l_var.get(), "prix L"),
            },
            "freeShippingThresholdCents": self.parse_int(
                self.free_shipping_threshold_var.get(),
                "seuil livraison offerte",
            ),
        }
        self.config_data["shipping"] = {
            "unsupportedMessage": self.shipping_unsupported_text.get("1.0", "end").strip(),
            "countries": self.parse_shipping_countries(),
        }

    def parse_int(self, raw_value: str, field_label: str) -> int:
        try:
            return int(raw_value.strip() or "0")
        except ValueError as error:
            raise ValueError(f"Valeur invalide pour {field_label}") from error

    def parse_shipping_countries(self) -> list[dict]:
        raw_json = self.shipping_countries_text.get("1.0", "end").strip()
        try:
            parsed = json.loads(raw_json or "[]")
        except json.JSONDecodeError as error:
            raise ValueError(f"JSON livraison invalide : {error}") from error

        if not isinstance(parsed, list):
            raise ValueError("La grille livraison doit etre une liste JSON.")

        return parsed

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

    def load_selected_hero_image(self) -> None:
        selection = self.hero_listbox.curselection()
        if not selection:
            return

        hero_image = self.config_data["heroImages"][selection[0]]
        self.hero_path_var.set(hero_image.get("path", ""))
        self.hero_enabled_var.set(bool(hero_image.get("enabled", True)))

    def apply_hero_changes(self) -> None:
        selection = self.hero_listbox.curselection()
        if not selection:
            return

        hero_image = self.config_data["heroImages"][selection[0]]
        hero_image["path"] = self.hero_path_var.get().strip()
        hero_image["enabled"] = bool(self.hero_enabled_var.get())
        self.refresh_hero_listbox()
        self.hero_listbox.selection_set(selection[0])
        self.load_selected_hero_image()
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

    def remove_hero_image(self) -> None:
        selection = self.hero_listbox.curselection()
        if not selection:
            return

        hero_image = self.config_data["heroImages"].pop(selection[0])
        relative_path = hero_image.get("path", "")
        absolute_path = REPO_ROOT / relative_path
        if absolute_path.is_file() and absolute_path.is_relative_to(HERO_DIR.parent):
            try:
                absolute_path.unlink()
            except OSError:
                pass

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
        self.refresh_hero_listbox()
        self.hero_listbox.selection_clear(0, "end")
        self.hero_listbox.selection_set(target_index)
        self.load_selected_hero_image()

    def reload_from_disk(self) -> None:
        self.config_data = self.load_config()
        self.populate_form()
        self.log("Configuration rechargee depuis le disque")

    def git_status(self) -> None:
        self.run_git_command(["status", "--short"])

    def git_commit(self) -> None:
        self.save_config()
        self.run_git_command(["add", "-A", "public/config/shop-config.json", "public/images/hero", "admin"])
        self.run_git_command(["commit", "-m", self.commit_message_var.get().strip() or "Met a jour la configuration boutique"])

    def git_commit_and_push(self) -> None:
        self.git_commit()
        self.run_git_command(["push", "origin", "main"])

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
