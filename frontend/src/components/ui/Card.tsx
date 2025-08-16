import type { ReactNode } from 'react';

type CardProps = {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export default function Card({ title, actions, children }: CardProps) {
  return (
    <div className="bg-white dark:bg-gridiron-graphite p-6 rounded-lg card-shadow">
      {(title || actions) && (
        <div className="flex items-center justify-between mb-4">
          {title ? <h3 className="text-lg font-semibold">{title}</h3> : <div />}
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}
