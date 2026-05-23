type BottomNavbarItem<T extends string> = {
  tab: T;
  label: string;
  emoji: string;
};

interface BottomNavbarProps<T extends string> {
  items: BottomNavbarItem<T>[];
  activeTab: T;
  onTabChange: (tab: T) => void;
}

export default function BottomNavbar<T extends string>({
  items,
  activeTab,
  onTabChange,
}: BottomNavbarProps<T>) {
  return (
    <nav className="bottom-navbar" aria-label="Bundnavigation">
      {items.map((item) => (
        <button
          key={item.tab}
          type="button"
          onClick={() => onTabChange(item.tab)}
          className={`bottom-navbar__button ${
            activeTab === item.tab ? "bottom-navbar__button--active" : ""
          }`}
          aria-current={activeTab === item.tab ? "page" : undefined}
        >
          <span>{item.emoji}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}