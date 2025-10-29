import React, { useState } from "react";
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

      // Regardless of response status, redirect to login
      // This handles both successful logout and cases where endpoint doesn't exist yet
      window.location.href = "/auth/login";
    } catch (err) {
      // On network error, still redirect to login
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
    >
      {isLoggingOut ? "Wylogowywanie..." : "Wyloguj się"}
    </Button>
  );
}
