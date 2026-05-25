import {
  FileText,
  ChevronRight,
} from "lucide-react";

/**
 * Entry point in the ChatTabSidebar for the Forms feature.
 * Just a menu item that triggers the parent to open the panel.
 */
const FormsItem = ({ onClick }: { onClick: () => void }): JSX.Element => {
  return (
    <div
      className="flex items-center px-4 py-3 hover:bg-white/10 transition-colors cursor-pointer rounded-xl"
      onClick={onClick}
    >
      <FileText className="h-5 w-5 text-gray-100 mr-4 flex-shrink-0" />
      <div className="flex-1">
        <div className="text-gray-100 text-sm font-medium">Assign Task Forms</div>
        <div className="text-gray-100/80 text-xs">
          Create & assign recurring forms
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-gray-100" />
    </div>
  );
};

export default FormsItem;
