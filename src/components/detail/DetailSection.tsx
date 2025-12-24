import React from "react";

type DetailSectionProps = {
  title?: string;
  children: React.ReactNode;
};

const DetailSection: React.FC<DetailSectionProps> = ({ title, children }) => (
  <section className="mb-4">
    {title && (
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-kk-muted">
        {title}
      </div>
    )}
    <div className="space-y-3">{children}</div>
  </section>
);

export default DetailSection;
