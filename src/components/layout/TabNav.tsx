import React, { useTransition } from "react";

type TabProps = {
  action: {()};
  children: React.ReactNode;
  isActive: boolean;
};

export const TabNav: React.FC<TabProps> = ({ 
  action, 
  children, 
  isActive, }) => {
  const [isPending, startTransition] = useTransition();

  if (isActive) {
    return <p className="font-bold text-kk-dark-text underline underline-offset-10 decoration-purple-500 decoration-2">{children}</p>
  }
  if (isPending) {
    return <p className="font-bold underline underline-offset-10 decoration-purple-300 decoration-2">{children}</p>;
  }

  return (
    <p
      className="text-kk-dark-text-muted font-medium cursor-pointer"
      onClick={() => {
        startTransition(async () => {
          await action();
        });
      }}
    >
      {children}
    </p>
  )
}