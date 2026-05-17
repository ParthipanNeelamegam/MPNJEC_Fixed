import { Bell } from "lucide-react";

type NotificationBellProps = {
  count: number;
  onClick: () => void;
};

const NotificationBell = ({ count, onClick }: NotificationBellProps) => {
  return (
    <div className="relative cursor-pointer" onClick={onClick}>
      <Bell size={24} />

      {count > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">
          {count}
        </span>
      )}
    </div>
  );
};

export default NotificationBell;
