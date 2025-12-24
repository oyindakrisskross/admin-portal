import React from "react";

type DetailFieldProps = {
  label: string;
  children?: React.ReactNode;
  value?: React.ReactNode; // convenience
};

const DetailField: React.FC<DetailFieldProps> = ({ label, children, value }) => {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-[11px] uppercase tracking-wide text-kk-muted">
        {label}
      </div>
      <div className="text-sm text-gray-100">
        {children ?? value ?? <span className="text-kk-muted">Empty</span>}
      </div>
    </div>
  );
};

export default DetailField;

