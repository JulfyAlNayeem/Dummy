// src/components/admin/ModeToggle.jsx
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDispatch, useSelector } from "react-redux";
import { setTheme, selectTheme } from "@/redux/slices/uiSlice";

export function ModeToggle() {
  const dispatch = useDispatch();
  const theme = useSelector(selectTheme);

  const handleToggle = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    dispatch(setTheme(newTheme));
  };

  return (
    <Button variant="ghost" size="icon" onClick={handleToggle}>
      {theme === "dark" ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </Button>
  );
}