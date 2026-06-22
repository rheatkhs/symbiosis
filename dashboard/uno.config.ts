import {
  defineConfig,
  presetUno,
  presetIcons,
  presetWebFonts,
} from "unocss";

export default defineConfig({
  presets: [
    presetUno(),
    presetIcons({
      scale: 1.2,
      extraProperties: {
        "display": "inline-block",
        "vertical-align": "middle",
      },
    }),
    presetWebFonts({
      provider: "google",
      fonts: {
        sans: "Inter:300,400,500,600,700",
        mono: "Fira Code:400,700",
      },
    }),
  ],
  shortcuts: {
    "glass-card": "bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 shadow-lg",
    "glass-panel": "bg-white/3 backdrop-blur-sm border border-white/5 rounded-xl p-5",
    "btn-primary": "bg-violet-600 hover:bg-violet-500 text-white font-medium py-2 px-4 rounded-lg transition-all duration-150 active:scale-97 cursor-pointer border-none flex items-center justify-center gap-2",
    "btn-secondary": "bg-white/8 hover:bg-white/12 text-white font-medium py-2 px-4 rounded-lg transition-all duration-150 active:scale-97 cursor-pointer border-none flex items-center justify-center gap-2",
    "btn-danger": "bg-red-600/20 hover:bg-red-500 text-white font-medium py-2 px-4 rounded-lg border-1 border-solid border-red-500/30 transition-all duration-150 active:scale-97 cursor-pointer flex items-center justify-center gap-2",
    "input-field": "w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white placeholder-white/30 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all",
  },
  theme: {
    colors: {
      brand: {
        dark: "#050508",
        card: "#0d0d15",
        accent: "#7c3aed",
      },
    },
  },
});
