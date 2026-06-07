import { useEffect, useRef, useState } from "react";
import { Bold, Underline, Highlighter, Palette, Type, Mic, Square } from "lucide-react";

export const DIARY_FONTS = [
  { key: "quicksand", label: "Quicksand", family: "'Quicksand', sans-serif" },
  { key: "caveat", label: "Caveat", family: "'Caveat', cursive" },
  { key: "dancing", label: "Dancing Script", family: "'Dancing Script', cursive" },
  { key: "pacifico", label: "Pacifico", family: "'Pacifico', cursive" },
  { key: "satisfy", label: "Satisfy", family: "'Satisfy', cursive" },
  { key: "comfortaa", label: "Comfortaa", family: "'Comfortaa', sans-serif" },
] as const;

export const TEXT_COLORS = ["#831843", "#DB2777", "#9D5C7E", "#7C3AED", "#0EA5E9", "#059669", "#D97706"];
export const HIGHLIGHT_COLORS = ["#FBCFE8", "#FDE68A", "#BBF7D0", "#DDD6FE", "#BAE6FD", "#FED7AA"];

export function fontFamilyFor(key: string) {
  return DIARY_FONTS.find((f) => f.key === key)?.family ?? DIARY_FONTS[0].family;
}

function getSpeechRecognition(): any {
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

export function DiaryRichEditor({
  html, onChange, fontKey, placeholder,
}: {
  html: string;
  onChange: (html: string) => void;
  fontKey: string;
  placeholder?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [colorOpen, setColorOpen] = useState(false);
  const [highlightOpen, setHighlightOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const speechSupported = useRef(!!getSpeechRecognition());

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== html) {
      ref.current.innerHTML = html;
    }
  }, [html]);

  useEffect(() => {
    return () => {
      try { recognitionRef.current?.stop(); } catch {}
    };
  }, []);

  const exec = (command: string, value?: string) => {
    ref.current?.focus();
    try { document.execCommand(command, false, value); } catch {}
    if (ref.current) onChange(ref.current.innerHTML);
  };

  const toggleMic = () => {
    const Recognition = getSpeechRecognition();
    if (!Recognition) return;

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = navigator.language || "en-US";

    recognition.onresult = (event: any) => {
      let chunk = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) chunk += event.results[i][0].transcript;
      }
      if (chunk.trim()) {
        ref.current?.focus();
        try { document.execCommand("insertText", false, chunk.trim() + " "); } catch {
          if (ref.current) ref.current.innerHTML += chunk.trim() + " ";
        }
        if (ref.current) onChange(ref.current.innerHTML);
      }
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  return (
    <div className="rounded-2xl border border-[#EC4899]/20 bg-[#FFF0F6]/60 overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-[#EC4899]/15 bg-white/60 px-2 py-1.5">
        <ToolbarBtn label="Bold" onClick={() => exec("bold")}><Bold className="h-3.5 w-3.5" /></ToolbarBtn>
        <ToolbarBtn label="Underline" onClick={() => exec("underline")}><Underline className="h-3.5 w-3.5" /></ToolbarBtn>

        <div className="relative">
          <ToolbarBtn label="Highlight" onClick={() => { setHighlightOpen((v) => !v); setColorOpen(false); }}>
            <Highlighter className="h-3.5 w-3.5" />
          </ToolbarBtn>
          {highlightOpen && (
            <SwatchPopover
              colors={HIGHLIGHT_COLORS}
              onPick={(c) => { exec("hiliteColor", c); setHighlightOpen(false); }}
            />
          )}
        </div>

        <div className="relative">
          <ToolbarBtn label="Text color" onClick={() => { setColorOpen((v) => !v); setHighlightOpen(false); }}>
            <Palette className="h-3.5 w-3.5" />
          </ToolbarBtn>
          {colorOpen && (
            <SwatchPopover
              colors={TEXT_COLORS}
              onPick={(c) => { exec("foreColor", c); setColorOpen(false); }}
            />
          )}
        </div>

        <div className="relative inline-flex items-center">
          <Type className="h-3.5 w-3.5 text-[#9D5C7E] mx-1" strokeWidth={1.8} />
          <select
            defaultValue=""
            onChange={(e) => { if (e.target.value) { exec("fontName", e.target.value); e.target.value = ""; } }}
            className="rounded-full border border-[#EC4899]/20 bg-white/80 px-2 py-1 text-[11px] text-[#831843] outline-none cursor-pointer"
          >
            <option value="" disabled>Font for selection…</option>
            {DIARY_FONTS.map((f) => (
              <option key={f.key} value={f.family} style={{ fontFamily: f.family }}>{f.label}</option>
            ))}
          </select>
        </div>

        {speechSupported.current && (
          <button
            type="button"
            onClick={toggleMic}
            title={listening ? "Stop dictation" : "Speak your entry"}
            className={[
              "ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold transition",
              listening ? "bg-magenta text-white animate-pulse" : "bg-hotpink/10 text-hotpink hover:bg-hotpink/20",
            ].join(" ")}
          >
            {listening ? <Square className="h-3 w-3" strokeWidth={2.2} /> : <Mic className="h-3.5 w-3.5" strokeWidth={1.8} />}
            {listening ? "Listening…" : "Speak"}
          </button>
        )}
      </div>

      {/* Editable area */}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={() => { if (ref.current) onChange(ref.current.innerHTML); }}
        data-placeholder={placeholder}
        style={{ fontFamily: fontFamilyFor(fontKey) }}
        className="diary-editable min-h-[140px] max-h-[40vh] overflow-y-auto px-4 py-3 text-sm text-[#831843] leading-relaxed outline-none"
      />

      <style>{`
        .diary-editable:empty::before {
          content: attr(data-placeholder);
          color: #9D5C7E99;
        }
      `}</style>
    </div>
  );
}

function ToolbarBtn({ children, onClick, label }: { children: React.ReactNode; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      title={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="grid h-7 w-7 place-items-center rounded-full text-[#9D5C7E] hover:text-hotpink hover:bg-blush transition"
    >
      {children}
    </button>
  );
}

function SwatchPopover({ colors, onPick }: { colors: string[]; onPick: (c: string) => void }) {
  return (
    <div className="absolute left-0 top-9 z-20 flex flex-wrap gap-1.5 rounded-2xl border border-petal/50 bg-white p-2 shadow-xl shadow-hotpink/20 w-32">
      {colors.map((c) => (
        <button
          type="button"
          key={c}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onPick(c)}
          style={{ backgroundColor: c }}
          className="h-6 w-6 rounded-full border border-white shadow hover:scale-110 transition"
        />
      ))}
    </div>
  );
}
