import React from "react";

type ListHeaderProps = {
  icon?: React.ReactNode;
  section?: string;   //top tiny text
  title?: string;     // list title
  subtitle?: string;  // desccriptions
  widthClass?: string;
  right?: React.ReactNode;    // right-side actions (buttons, pills)
};

const ListPageHeader: React.FC<ListHeaderProps> = ({
  icon,
  section,
  title,
  subtitle,
  widthClass = "w-full",
  right,
}) => {
  return (
    <div className={`px-6 pt-4 pb-3 border-b border-kk-dark-border flex items-center justify-between ${widthClass}`}>
      <div className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-wide text-kk-muted">
          {section ?? "Kriss Kross"}
        </span>
        <div className="flex items-center gap-2">
          {icon && <span>{icon}</span>}
          <span className="text-xl font-semibold">
            {title ?? "Untitled"}
          </span>
        </div>
        {subtitle && (
          <span className="text-[13px] text-kk-muted">{subtitle}</span>
        )}
      </div>
      {/* Right-side actions from page (filters, etc.) */}
      <div className="flex items-center gap-2">{right}</div>
    </div>
  )
};

export default ListPageHeader;