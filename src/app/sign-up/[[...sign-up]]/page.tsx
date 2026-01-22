"use client";

import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-navy via-navy-light to-navy flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Create Free Account</h1>
          <p className="text-gray-300">Get started with Speaker Split today</p>
        </div>
        <SignUp
          appearance={{
            variables: {
              colorPrimary: "#f59e0b",
              colorBackground: "#ffffff",
              colorText: "#1f2937",
              colorTextSecondary: "#6b7280",
              colorInputBackground: "#ffffff",
              colorInputText: "#1f2937",
            },
            elements: {
              rootBox: {
                margin: "0 auto",
              },
              card: {
                backgroundColor: "#ffffff",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                border: "none",
              },
              headerTitle: {
                color: "#1f2937",
              },
              headerSubtitle: {
                color: "#6b7280",
              },
              socialButtonsBlockButton: {
                backgroundColor: "#ffffff",
                border: "1px solid #d1d5db",
                color: "#374151",
              },
              socialButtonsBlockButtonText: {
                color: "#374151",
              },
              dividerLine: {
                backgroundColor: "#e5e7eb",
              },
              dividerText: {
                color: "#6b7280",
              },
              formFieldLabel: {
                color: "#374151",
              },
              formFieldInput: {
                backgroundColor: "#ffffff",
                border: "1px solid #d1d5db",
                color: "#1f2937",
              },
              formButtonPrimary: {
                backgroundColor: "#f59e0b",
                color: "#ffffff",
              },
              footerActionLink: {
                color: "#d97706",
              },
              footer: {
                color: "#6b7280",
              },
              footerActionText: {
                color: "#6b7280",
              },
            },
          }}
        />
      </div>
    </div>
  );
}
