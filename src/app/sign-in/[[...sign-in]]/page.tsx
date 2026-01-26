import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-gray-300">Sign in to access Speaker Split</p>
        </div>
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          afterSignInUrl="/"
        />
      </div>
    </div>
  );
}
