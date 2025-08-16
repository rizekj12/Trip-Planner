import React from 'react';

export default function TabsBar({ tabs, active, setActive, theme }) {
  return (
    <div className={`no-scrollbar mb-6 flex gap-2 overflow-x-auto rounded-2xl ${theme.tabsBar} p-2 shadow-lg`}>
      {tabs.map((tabItem) => (
        <button
          key={tabItem.key}
          type="button"
          onClick={() => setActive(tabItem.key)}
          title={tabItem.date || ""}
          className={[
            "whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition",
            active === tabItem.key ? theme.tabActive : theme.tabIdle,
          ].join(" ")}
        >
          {tabItem.label}
        </button>
      ))}
    </div>
  );
}
