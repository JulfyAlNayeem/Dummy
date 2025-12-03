const MenuSection = ({ title, items }) => (
  <div className="mb-6">
    {title && (
      <h3 className="text-gray-100 text-xs font-medium mb-3 px-4 uppercase tracking-wider">
        {title}
      </h3>
    )}
    <div className="space-y-1">
      {items.map((item, index) => (
        <div
          key={index}
          className="flex items-center px-4 py-3 hover:bg-white/10 transition-colors cursor-pointer rounded-xl"
          onClick={item.onClick}
        >
          <item.icon className="h-5 w-5 text-gray-100 mr-4 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-gray-100 text-sm font-medium">
              {item.title}
            </div>
            {item.subtitle && (
              <div className="text-gray-100/80 text-xs">{item.subtitle}</div>
            )}
          </div>
          {item.hasToggle && (
            <div
              className={`size-2 rounded-full ${
                item.isToggleOn ? "bg-blue-500" : "bg-gray-600"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  </div>
);

export default MenuSection;
