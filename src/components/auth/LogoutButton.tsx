import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function LogoutButton() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      // Check if logout was successful
      if (response.ok) {
        // Success - redirect to login
        window.location.href = "/auth/login";
      } else {
        // Logout failed - still redirect to login for security
        window.location.href = "/auth/login";
      }
    } catch {
      // Network error - still redirect to login for security
      window.location.href = "/auth/login";
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleLogout}
      disabled={isLoggingOut}
      className="text-muted-foreground hover:text-foreground"
      data-testid="button-logout"
    >
      {isLoggingOut ? "Wylogowywanie..." : "Wyloguj się"}
    </Button>
  );
}
