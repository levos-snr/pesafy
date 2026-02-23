import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CountryCode } from "react-phone-number-input";
import {
  getCountries,
  getCountryCallingCode,
  isPossiblePhoneNumber,
  parsePhoneNumber,
} from "react-phone-number-input";
import en from "react-phone-number-input/locale/en.json";
import { cn } from "@/lib/utils";

function countryFlag(code: CountryCode): string {
  return code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

interface CountryItem {
  code: CountryCode;
  name: string;
  callingCode: string;
  flag: string;
}

const ALL_COUNTRIES: CountryItem[] = getCountries()
  .map((code) => ({
    code,
    name: (en as Record<string, string>)[code] ?? code,
    callingCode: `+${getCountryCallingCode(code)}`,
    flag: countryFlag(code),
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

interface PhoneFieldProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  defaultCountry?: CountryCode;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  showValidation?: boolean;
}

const SIZE = {
  sm: { wrapper: "h-9", input: "text-xs", flag: "text-sm", code: "text-xs" },
  md: { wrapper: "h-10", input: "text-sm", flag: "text-base", code: "text-xs" },
  lg: { wrapper: "h-12", input: "text-sm", flag: "text-lg", code: "text-sm" },
} as const;

export function PhoneField({
  value,
  onChange,
  placeholder = "712 345 678",
  defaultCountry = "KE",
  disabled = false,
  size = "md",
  className,
  showValidation = true,
}: PhoneFieldProps) {
  const s = SIZE[size];

  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(() => {
    if (value) {
      try {
        const p = parsePhoneNumber(value);
        if (p?.country) return p.country;
      } catch {}
    }
    return defaultCountry;
  });

  const [localNumber, setLocalNumber] = useState(() => {
    if (value) {
      try {
        const p = parsePhoneNumber(value);
        return p?.nationalNumber ?? "";
      } catch {}
    }
    return "";
  });

  const prevValueRef = useRef(value);
  useEffect(() => {
    if (value === prevValueRef.current) return;
    prevValueRef.current = value;
    if (!value) {
      setLocalNumber("");
      return;
    }
    try {
      const p = parsePhoneNumber(value);
      if (p) {
        if (p.country) setSelectedCountry(p.country);
        setLocalNumber(p.nationalNumber ?? "");
      }
    } catch {}
  }, [value]);

  const callingCode = `+${getCountryCallingCode(selectedCountry)}`;

  const handleNumberChange = useCallback(
    (raw: string) => {
      const digits = raw.replace(/[^\d]/g, "");
      setLocalNumber(digits);
      if (!digits) {
        onChange(undefined);
        return;
      }
      onChange(`${callingCode}${digits.replace(/^0+/, "")}`);
    },
    [callingCode, onChange]
  );

  const handleCountryChange = useCallback(
    (country: CountryCode) => {
      setSelectedCountry(country);
      if (localNumber) {
        const newCode = `+${getCountryCallingCode(country)}`;
        onChange(`${newCode}${localNumber.replace(/^0+/, "")}`);
      }
    },
    [localNumber, onChange]
  );

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (open) requestAnimationFrame(() => searchRef.current?.focus());
    else setSearch("");
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return ALL_COUNTRIES;
    return ALL_COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.callingCode.includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [search]);

  const selected = ALL_COUNTRIES.find((c) => c.code === selectedCountry)!;
  const isValid = value ? isPossiblePhoneNumber(value) : true;

  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn(
          "flex items-stretch rounded-xl border bg-input transition-all duration-150",
          s.wrapper,
          !value || isValid
            ? "border-border focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20"
            : "border-destructive/50 focus-within:ring-2 focus-within:ring-destructive/20",
          disabled && "opacity-50 pointer-events-none"
        )}
      >
        {/*
          This div is the KEY — it is position:relative with NO overflow:hidden.
          The dropdown is position:absolute inside it, going upward.
          We also set isolation:isolate and a very high z-index so it's on top of everything.
        */}
        <div
          ref={wrapperRef}
          style={{ position: "relative", zIndex: 9999, isolation: "isolate" }}
          className="flex items-stretch shrink-0"
        >
          <button
            type="button"
            disabled={disabled}
            onClick={() => setOpen((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 px-3 border-r border-border",
              "rounded-l-xl bg-muted/40 hover:bg-muted/70",
              "transition-colors duration-150 focus:outline-none",
              "focus-visible:ring-2 focus-visible:ring-primary/30"
            )}
            aria-label="Select country"
            aria-haspopup="listbox"
            aria-expanded={open}
          >
            <span
              className={cn(s.flag, "leading-none select-none")}
              aria-hidden
            >
              {selected.flag}
            </span>
            <span
              className={cn("font-mono font-medium text-foreground", s.code)}
            >
              {selected.callingCode}
            </span>
            <ChevronDown
              className={cn(
                "h-3 w-3 text-muted-foreground transition-transform duration-200",
                open && "rotate-180"
              )}
            />
          </button>

          {/* Dropdown — absolutely positioned ABOVE the button, forced over everything */}
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 4 }}
                transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  position: "absolute",
                  bottom: "calc(100% + 8px)" /* sit above the button */,
                  left: 0,
                  width: 256,
                  zIndex: 99999,
                }}
                className="rounded-xl border border-border bg-card shadow-2xl overflow-hidden"
                role="listbox"
              >
                {/* Search */}
                <div className="p-2 border-b border-border">
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-input px-3 py-1.5">
                    <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <input
                      ref={searchRef}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search country..."
                      className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                    />
                  </div>
                </div>

                {/* List */}
                <div className="max-h-52 overflow-y-auto overscroll-contain">
                  {filtered.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-5">
                      No countries found
                    </p>
                  ) : (
                    filtered.map((c) => {
                      const isActive = c.code === selectedCountry;
                      return (
                        <button
                          key={c.code}
                          type="button"
                          role="option"
                          aria-selected={isActive}
                          onClick={() => {
                            handleCountryChange(c.code);
                            setOpen(false);
                            requestAnimationFrame(() =>
                              inputRef.current?.focus()
                            );
                          }}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors duration-100",
                            isActive
                              ? "bg-primary/10 text-primary"
                              : "text-foreground hover:bg-muted/60"
                          )}
                        >
                          <span className="text-base leading-none select-none shrink-0">
                            {c.flag}
                          </span>
                          <span className="flex-1 text-xs truncate">
                            {c.name}
                          </span>
                          <span className="font-mono text-[11px] text-muted-foreground shrink-0">
                            {c.callingCode}
                          </span>
                          {isActive && (
                            <Check className="h-3 w-3 text-primary shrink-0" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Number input */}
        <input
          ref={inputRef}
          type="tel"
          inputMode="numeric"
          disabled={disabled}
          value={localNumber}
          onChange={(e) => handleNumberChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "flex-1 min-w-0 bg-transparent border-0 outline-none ring-0 px-3",
            "text-foreground placeholder:text-muted-foreground",
            s.input
          )}
        />
      </div>

      {/* Validation */}
      <AnimatePresence>
        {showValidation && value && !isValid && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="text-xs text-destructive mt-1.5"
          >
            Enter a valid phone number
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

export { isPossiblePhoneNumber };
