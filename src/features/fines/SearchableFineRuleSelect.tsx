import { useEffect, useRef, useState } from "react";
import type { FineRule } from "../../types/domain";
import { formatAmount } from "../../lib/utils";

interface SearchableFineRuleSelectProps {
  rules: FineRule[];
  selectedRuleId: string;
  onChange: (ruleId: string) => void;
  disabled?: boolean;
}

// Normalize string for case-insensitive, Danish-character-aware search
function normalizeForSearch(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // Remove diacritics (æ→e, ø→o, å→a)
}

// Extract text for search (remove emoji from title)
function getSearchableText(rule: FineRule): string {
  const titleWithoutEmoji = rule.title.replace(/\p{Emoji}/gu, "").trim();
  return `${titleWithoutEmoji} ${rule.description || ""} ${rule.amount}`;
}

export default function SearchableFineRuleSelect({
  rules,
  selectedRuleId,
  onChange,
  disabled = false,
}: SearchableFineRuleSelectProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedRule = rules.find((rule) => rule.id === selectedRuleId);

  const filteredRules = searchTerm.trim()
    ? rules.filter((rule) => {
        const normalizedSearch = normalizeForSearch(searchTerm);
        const searchableText = normalizeForSearch(getSearchableText(rule));
        return searchableText.includes(normalizedSearch);
      })
    : rules;

  // Handle opening/closing dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm("");
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  // Reset highlighted index when filtered results change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredRules.length]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!listRef.current || !isOpen) return;

    const items = listRef.current.querySelectorAll(
      "[data-rule-id]"
    ) as NodeListOf<HTMLElement>;
    if (items[highlightedIndex]) {
      items[highlightedIndex].scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [highlightedIndex, isOpen]);

  function handleOpen() {
    setIsOpen(true);
    setSearchTerm("");
    searchInputRef.current?.focus();
  }

  function handleSelect(ruleId: string) {
    onChange(ruleId);
    setIsOpen(false);
    setSearchTerm("");
    setHighlightedIndex(0);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleOpen();
      }
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % filteredRules.length);
        break;

      case "ArrowUp":
        event.preventDefault();
        setHighlightedIndex((prev) =>
          prev === 0 ? filteredRules.length - 1 : prev - 1
        );
        break;

      case "Enter":
        event.preventDefault();
        if (filteredRules[highlightedIndex]) {
          handleSelect(filteredRules[highlightedIndex].id);
        }
        break;

      case "Escape":
        event.preventDefault();
        setIsOpen(false);
        setSearchTerm("");
        break;

      default:
        break;
    }
  }

  return (
    <div
      className="searchable-fine-rule-select"
      ref={containerRef}
    >
      <button
        type="button"
        className="searchable-fine-rule-button"
        onClick={handleOpen}
        disabled={disabled || rules.length === 0}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Vælg bødetype"
      >
        <span className="searchable-fine-rule-button__text">
          {selectedRule ? (
            <>
              {selectedRule.emoji && (
                <span className="searchable-fine-rule-button__emoji">
                  {selectedRule.emoji}
                </span>
              )}
              <span>
                {selectedRule.title} ({formatAmount(selectedRule.amount)})
              </span>
            </>
          ) : (
            "Vælg en bødetype..."
          )}
        </span>
        <span className="searchable-fine-rule-button__caret">▼</span>
      </button>

      {isOpen && (
        <div className="searchable-fine-rule-dropdown">
          <input
            ref={searchInputRef}
            type="text"
            className="searchable-fine-rule-input"
            placeholder="Søg i bødetyper..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Søg i bødetyper"
            aria-controls="fine-rules-listbox"
          />

          {filteredRules.length === 0 ? (
            <div className="searchable-fine-rule-empty">
              Ingen regler fundet
            </div>
          ) : (
            <div
              ref={listRef}
              className="searchable-fine-rule-list"
              id="fine-rules-listbox"
              role="listbox"
            >
              {filteredRules.map((rule, index) => (
                <button
                  key={rule.id}
                  type="button"
                  className={`searchable-fine-rule-item ${
                    index === highlightedIndex
                      ? "searchable-fine-rule-item--highlighted"
                      : ""
                  } ${
                    rule.id === selectedRuleId
                      ? "searchable-fine-rule-item--selected"
                      : ""
                  }`}
                  data-rule-id={rule.id}
                  onClick={() => handleSelect(rule.id)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  role="option"
                  aria-selected={rule.id === selectedRuleId}
                >
                  <span className="searchable-fine-rule-item__content">
                    {rule.emoji && (
                      <span className="searchable-fine-rule-item__emoji">
                        {rule.emoji}
                      </span>
                    )}
                    <span className="searchable-fine-rule-item__title">
                      {rule.title}
                    </span>
                    {rule.description && (
                      <span className="searchable-fine-rule-item__description">
                        {rule.description.substring(0, 60)}
                        {rule.description.length > 60 ? "…" : ""}
                      </span>
                    )}
                  </span>
                  <span className="searchable-fine-rule-item__amount">
                    {formatAmount(rule.amount)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
